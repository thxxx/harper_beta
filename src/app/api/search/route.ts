import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "",
});

type ParsedQuery = {
  must: string[];
  should: string[];
  must_not: string[];
};

function normalizeTerms(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x ?? "").trim())
    .filter((s) => s.length > 0)
    .slice(0, 25); // 과도한 길이 방지
}

async function parseQueryWithLLM(queryText: string): Promise<ParsedQuery> {
  // Structured Outputs (JSON Schema)
  const schema = {
    name: "ParsedQuery",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        must: { type: "array", items: { type: "string" } },
        should: { type: "array", items: { type: "string" } },
        must_not: { type: "array", items: { type: "string" } },
      },
      required: ["must", "should", "must_not"],
    },
    strict: true,
  };

  const prompt = `
너는 채용 후보자 검색을 위한 "쿼리 파서"다.
입력은 자연어 요청이다. 출력은 아래 규칙을 지켜서 must/should/must_not 키워드 배열로 분해한다.

규칙:
- must: 반드시 포함되어야 할 핵심 조건(회사명/학교명/역할/기술/도메인)을 1~3개
- should: 있으면 좋을 조건(동의어/관련 컨퍼런스/관련 기술스택/표현 변형)을 0~7개
- must_not: 제외하고 싶은 조건(인턴, 학생 등)이 있으면 0~10개
- 가능한 한 "검색 가능한 문자열"로 쪼개라 (예: "LLM 서빙", "vLLM", "Triton", "Kubernetes")
- 너무 긴 문장은 금지. 키워드/짧은 구절 단위로만.
- return only in english

입력:
${queryText}

`.trim();

  // Responses API + structured outputs (text.format)
  const resp = await openai.responses.create({
    model: "gpt-4.1-mini", // 너 환경에 맞게 조정
    input: prompt,
  });

  // SDK가 반환하는 구조는 버전에 따라 다를 수 있어,
  // 아래는 "최종 텍스트(JSON)"를 꺼내는 보수적인 방식.
  const outText =
    resp.output_text ?? (resp as any).output?.[0]?.content?.[0]?.text ?? "";

  const obj = JSON.parse(outText);

  return {
    must: normalizeTerms(obj.must),
    should: normalizeTerms(obj.should),
    must_not: normalizeTerms(obj.must_not),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { queryId, pageIdx } = body;

  if (!queryId)
    return NextResponse.json({ error: "Missing queryId" }, { status: 400 });

  const { data: q, error: qErr } = await supabase
    .from("queries")
    .select("query_id,user_id,query")
    .eq("query_id", queryId)
    .single();

  if (qErr || !q || !q.query)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  const { data: results, error: lpErr } = await supabase
    .from("query_pages")
    .select("*")
    .eq("query_id", queryId)
    .eq("page_idx", pageIdx)
    .maybeSingle();

  console.log(pageIdx, "쿼리와 results ", results, q);

  if (lpErr)
    return NextResponse.json({ error: lpErr.message }, { status: 500 });

  const nextPageIdx = pageIdx + 1;

  if (!results) {
    // 1) LLM 파싱 (옵션)
    const parsed: ParsedQuery = await parseQueryWithLLM(q.query);
    console.log("parsed ", parsed.must);
    // { must: [q], should: [], must_not: [] };

    // 안전장치: must가 비면 원문을 must로
    if (parsed.must.length === 0) parsed.must = [q.query];

    const limit = 10;
    const { data, error } = await supabase
      .from("candid")
      .select("id,experiences,educations,publications,bio,name,location")
      .or([`search_text.ilike.%${q.query}%`].join(","))
      .range(pageIdx * limit, (pageIdx + 1) * limit - 1);
    console.log("그래서 검색한게 뭔데? data ", data, error);

    // // 2) RPC 검색 (id만)
    // const { data, error } = await supabase.rpc("search_candid_ids_v2", {
    //   must: parsed.must,
    //   should: parsed.should,
    //   must_not: parsed.must_not,
    //   lim: 10,
    //   off: pageIdx * 10,
    // });
    // const candidateIds: string[] = data?.map((r) => r.id) ?? [];

    const buildSummary = (doc: any) => {
      const exps = doc.experiences ? JSON.stringify(doc.experiences) : "";
      const educations = doc.educations ? JSON.stringify(doc.educations) : "";
      const publications = doc.publications
        ? JSON.stringify(doc.publications.slice(0, 5))
        : "";
      const bio = doc.bio ? doc.bio : "";
      return `
      ${doc.name} is a ${doc.location} based ${exps} and ${educations} and ${publications} and ${bio}`;
    };

    data?.map(async (doc) => {
      const res_check = await supabase
        .from("synthesized_summary")
        .select("*")
        .eq("candid_id", doc.id)
        .eq("query_id", queryId)
        .maybeSingle();
      console.log("res_check ", res_check);
      if (!res_check.data) {
        // 하나 만든다.
        const information = buildSummary(doc);
        // console.log("만들어 봅시다. summary ", information);

        const res = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant. Given a search query and a candidate profile, generate a relevance-focused summary explaining why this candidate matches the query. Use exactly three sentences. Highlight especially important skills, experiences, or keywords by wrapping them with <strong> tags.",
            },
            {
              role: "user",
              content: `Search Query : ${q.query} \n\n Information : ${information}`,
            },
          ],
        });
        const summary = res.choices[0].message.content;
        console.log("summary ", summary);

        const { error: insErr } = await supabase
          .from("synthesized_summary")
          .insert({
            candid_id: doc.id,
            query_id: queryId,
            text: summary,
          });
        return doc.id;
      } else {
        return doc.id;
      }
    });
    const candidateIds = data?.map((r) => r.id) ?? [];
    console.log("검색 결과 candidateIds ", candidateIds);

    // const { candidateIds } = await runCandidateSearch({
    //   queryText: q.query,
    //   pageIdx: pageIdx,
    //   limit: 10,
    // });

    const { error: insErr } = await supabase.from("query_pages").insert({
      query_id: queryId,
      page_idx: pageIdx,
      candidate_ids: candidateIds,
    });

    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json(
      { nextPageIdx, results: candidateIds },
      { status: 200 }
    );
  } else {
    return NextResponse.json(
      { nextPageIdx, results: results.candidate_ids },
      { status: 200 }
    );
  }
}
