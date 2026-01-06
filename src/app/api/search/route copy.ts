import { geminiInference, xaiClient, xaiInference } from "@/lib/llm/llm";
import { supabase } from "@/lib/supabase";
import { ensureGroupBy, replaceName } from "@/utils/textprocess";
import { NextRequest, NextResponse } from "next/server";
import { sqlPrompt, criteriaPrompt, sqlPrompt2 } from "./prompt";
import { transformSql } from "./utils";

const rerankByLLM = async (rawinput: string, candidates: any[]) => {
  if (candidates.length === 0) return [];

  const idRemoved = candidates.map((item, index) => {
    return {
      index: index,
      name: item["name"],
      headline: item["headline"],
      summary: replaceName(item["summary"], item["name"]),
      bio: item["bio"],
    };
  });

  console.log("rawinput ", rawinput);
  // console.log("idRemoved ", idRemoved);

  // let sortedIndexes = await xaiInference(
  let sortedIndexes = await geminiInference(
    "gemini-3-flash-preview",
    // "grok-4-fast-reasoning",
    "You are a helpful assistant, relevance selection engine.",
    `
Goal:
Given a user Query and a list of people documents (Docs), evaluate how well each document matches the Query intent.

Input:
- Query: short natural-language query for finding a person.
- Docs: array of people objects with:
  - index (integer)
  - name (string)
  - headline (string)
  - summary (string)

Task:
1) Read the Query and infer intent precisely.
2) You MUST evaluate ALL docs. Do not skip or stop early.
3) For EACH doc, assign a relevance score from 1 to 5 based ONLY on (name, headline, summary, bio).
4) The score must reflect how well the doc satisfies the Query intent.

Scoring Guidance:
- Query와 가장 거리가 먼 사람에게는 1점, 가장 거리가 가까운 사람에게는 5점. 모두 연관이 없거나 모두 연관이 있더라도 최대한 다양하게 분배해줘.

Rules:
- Do NOT invent facts.
- Use ONLY the provided text.
- If the query implies hands-on experience, prioritize direct personal participation.
- You must output EXACTLY one score per input doc.

Output Format (STRICT):
- Output ONLY a JSON array.
- Each element MUST be an object: { "index": number, "score": number }
- Array length MUST equal the number of input docs.
- Do NOT sort.
- No extra text, no markdown.

OUTPUT EXAMPLE:
[
  { "index": 0, "score": 5 },
  { "index": 1, "score": 1 },
  { "index": 2, "score": 3 },
  { "index": 3, "score": 1 },
  { "index": 4, "score": 4 }, 
  ...
]

Input:
Query: ${rawinput}
Docs: ${idRemoved}
`,
    0.5
  );

  const sortedIndexe = JSON.parse(sortedIndexes as string);
  console.log("sortedIndexes ", sortedIndexe);
  type Scored = { index: number; score: number };

  function pickTopK(scored: Scored[], k = 10): number[] {
    return scored
      .slice()
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, k)
      .map((v) => v.index);
  }

  let sortedCandidates = [];
  for (const index of pickTopK(sortedIndexe)) {
    sortedCandidates.push(candidates[index]["id"]);
    // sortedCandidates.push(candidates[parseInt(index)]["id"]);
  }

  return sortedCandidates;
};

async function parseQueryForCriteria(
  queryText: string
): Promise<{ criteria: string[]; rephrasing: string; thinking: string }> {
  const prompt = `
${criteriaPrompt}
${queryText}
`.trim();

  // Responses API + structured outputs (text.format)
  const outText = await xaiInference(
    "grok-4-fast-reasoning",
    "You are a head hunting expert. Your input is a natural-language request describing criteria for searching job candidates.",
    prompt,
    0.5,
    1,
    false,
    "search_query_parser_harper_20260105"
  );

  const cleanedResponse = (outText as string).trim().replace(/\n/g, " ").trim();
  const outJson = JSON.parse(cleanedResponse);
  console.log("outJson ", outJson);

  return outJson as any;
}

async function parseQueryWithLLM(
  queryText: string,
  criteria: string[],
  thinking: string
): Promise<string> {
  const prompt = `
${sqlPrompt2}
Natural Language Query: ${queryText}
Criteria: ${criteria}
`.trim();

  // Responses API + structured outputs (text.format)
  const outText = await geminiInference(
    // "grok-4-fast-reasoning",
    // "grok-4-fast-reasoning",
    "gemini-3-flash-preview",
    "You are a head hunting expertand SQL Query parser. Your input is a natural-language request describing criteria for searching job candidates.",
    prompt,
    0.5
  );

  const cleanedResponse = (outText as string).trim().replace(/\n/g, " ").trim();

  const pp2 = `
${sqlPrompt2}
SQL Query: ${cleanedResponse}
---
Given the prompt above as input, a SQL query has already been generated.
Your task is to analyze this SQL query and determine whether there are any parts that could lead to incorrect or misleading search results, or whether the query is logically sound as-is. If improvements can be made to achieve better candidate matching, explain what should be adjusted and why, then output a revised SQL query.
The focus is not SQL syntax correctness, but whether the query logically retrieves the right people.

In particular, analyze:
- Is the search scope too narrow or too broad?
- Are meaningful synonyms and variations sufficiently covered?
- Are there unnecessary constraints that could exclude valid candidates?
- Are any essential conditions missing?
- Do the AND / OR groupings correctly reflect the intended semantics?
- to_tsquery 안에서는 두개의 단어를 공백이 아니라 <->로 연결해야한다.

If the query is already logically optimal, it does not need to be modified.

Important constraints
- Do not modify the ILIKE keyword structure.
- Keywords inside ILIKE '%%' are intentionally separated using | and must remain unchanged.

OUTPUT Format should be JSON with keys: "analysis" and "fixed_sql_query".
- analysis: string
- fixed_sql_query: string
`;

  const outText2 = await xaiInference(
    "grok-4-fast-reasoning",
    "You are a logical SQL Query refinement expert.",
    pp2,
    0.5,
    1,
    false,
    "search_query_parser_harper_20260105"
  );
  const cleanedResponse2 = (outText2 as string)
    .trim()
    .replace(/\n/g, " ")
    .trim();

  console.log(
    "\n\n-------- ⭐️ cleanedResponse2 ⭐️ ---------\n\n",
    cleanedResponse2,
    "\n\n-------- ⭐️ cleanedResponse2 ⭐️ ---------\n\n"
  );

  const outJson = JSON.parse(cleanedResponse2);

  return outJson.fixed_sql_query;
}

const makeSqlQuery = async (
  queryId: string,
  userId: string,
  rawInputText: string
) => {
  // input query로 SQL문을 만들어뒀는지 아닌지
  try {
    const middleOutput = await parseQueryForCriteria(rawInputText);

    const upsertRes = await supabase.from("queries").upsert({
      query_id: queryId,
      user_id: userId,
      criteria: middleOutput.criteria,
      thinking: middleOutput.rephrasing + "\n" + middleOutput.thinking,
      status: "Thinking how to get the best candidates",
    });

    const sql_query = await parseQueryWithLLM(
      rawInputText,
      middleOutput.criteria,
      middleOutput.rephrasing + "\n" + middleOutput.thinking
    );

    const upsertRes2 = await supabase.from("queries").upsert({
      query_id: queryId,
      user_id: userId,
      query: sql_query,
      status: "Searching Database...",
    });

    console.log("upsertRes ", upsertRes);

    return sql_query;
  } catch (e) {
    console.log("parseQueryWithLLM error ", e);
    return null;
  }
};

const search = async () => {};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { queryId, pageIdx } = body;

  if (!queryId)
    return NextResponse.json({ error: "Missing queryId" }, { status: 400 });

  // 검색 후 저장해둔 사용자 검색 결과가 있는지 찾기
  const { data: resultsPages, error: lpErr } = await supabase
    .from("query_pages")
    .select("*")
    .eq("query_id", queryId)
    .eq("page_idx", pageIdx);

  const results = resultsPages?.[0];

  console.log(pageIdx, "쿼리와 results ", results, lpErr);
  if (lpErr)
    return NextResponse.json({ error: lpErr.message }, { status: 500 });

  const nextPageIdx = pageIdx + 1;
  // 이미 검색한 결과가 있다면 그대로 리턴
  if (results) {
    return NextResponse.json(
      { nextPageIdx, results: results.candidate_ids },
      { status: 200 }
    );
  }

  // 저장되어있는 결과가 없다면 새롭게 검색해야한다는 뜻.
  const { data: q, error: qErr } = await supabase
    .from("queries")
    .select("query_id,user_id,raw_input_text,query,criteria")
    .eq("query_id", queryId)
    .single();

  console.log("일단 쿼리 확인 : ", q);

  if (qErr || !q || !q.raw_input_text)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  // 저장되어있는 결과가 없다면 새롭게 검색해야한다는 뜻.
  let parsed_query = q.query;

  // input query로 SQL문을 만들어뒀는지 아닌지
  if (!parsed_query) {
    parsed_query = await makeSqlQuery(queryId, q.user_id, q.raw_input_text);
    if (!parsed_query)
      return NextResponse.json(
        { error: "Failed to make SQL query" },
        { status: 500 }
      );
  }

  // LLM이 생성해야 하는 안전한 SQL 쿼리 (예시)
  const transformedSqlQuery = transformSql(parsed_query);
  const sqlQuery = `
SELECT DISTINCT ON (T1.id)
  to_json(T1.id) AS id,
  T1.name,
  T1.headline,
  T1.summary
FROM 
  candid AS T1
${transformedSqlQuery}
`;
  const sqlQueryWithGroupBy = ensureGroupBy(sqlQuery, "GROUP BY T1.id");
  console.log("sqlQueryWithGroupBy === \n", sqlQueryWithGroupBy, "\n---\n");

  const limit = 50;
  let data: any[] | null = [];
  let error;
  try {
    const { data: data1, error: error1 } = await supabase.rpc(
      "set_timeout_and_execute_raw_sql",
      {
        sql_query: sqlQueryWithGroupBy,
        page_idx: pageIdx,
        limit_num: limit,
      }
    );
    data = data1;
    error = error1;
  } catch (err) {
    console.log("First sql query error ", err, "== try second ==");
    let fixed_query = await xaiInference(
      "grok-4-fast-reasoning",
      "You are a specialized SQL query fixing assistant. If there are any errors in the SQL query, fix them and return the fixed SQL query.",
      `You are an expert PostgreSQL SQL fixer for a recruitment candidate search system.

Goal:
Given (1) a PostgreSQL SQL query that failed and (2) the database error message, produce a corrected SQL query.

Critical rules:
- Fix ONLY what is necessary to resolve the SQL error.
- Do not change or fix the meaning of the query.
- Preserve the original intent and structure as much as possible (do not redesign the query).
- Do NOT add new tables, new joins, or new filters unless required to fix the error.
- Keep the tsvector search logic in place (tsvector column, to_tsquery/plainto_tsquery/websearch_to_tsquery, @@ operator).
- Keep the WHERE clause logic in place; only correct syntax/typing/aliasing/parentheses/quoting issues.
- If the error is caused by tsquery syntax, fix the query string minimally (escaping, removing illegal operators, using websearch_to_tsquery, etc.).
- If the error is caused by ambiguous columns/aliases, qualify with table aliases instead of changing logic.
- If the error is caused by type mismatch, cast minimally.
- Output MUST be a single valid SQL statement only. No explanations, no markdown, no comments.
- always start with "WHERE"

Inputs:
[SQL]
${sqlQueryWithGroupBy},

[ERROR]
${err}

Return:
A corrected SQL query.`,
      0.2,
      1
    );

    console.log("⚠️ ==== fixed_query ==== \n\n", fixed_query);

    const { data: data2, error: error2 } = await supabase.rpc(
      "set_timeout_and_execute_raw_sql",
      {
        sql_query: fixed_query as string,
        page_idx: pageIdx,
        limit_num: limit,
      }
    );
    data = data2;
  }

  console.log("data ", data, "\n\nError : ", error);
  supabase.from("queries").upsert({
    query_id: queryId,
    user_id: q.user_id,
    status: "Got candidates! Identifying suitable candidates.",
  });

  try {
    if (!data || !data[0] || data[0].length === 0) {
      const { error: insErr } = await supabase.from("query_pages").insert({
        query_id: queryId,
        page_idx: pageIdx,
        candidate_ids: [],
      });
      console.log("data is empty", insErr);
      return NextResponse.json(
        { page_idx: pageIdx, results: [] },
        { status: 500 }
      );
    }

    if (data[0].length < 12) {
      const cids =
        (data[0] as Array<any>)?.slice(0, 10).map((r: any) => r.id) ?? [];

      const { error: insErr } = await supabase.from("query_pages").insert({
        query_id: queryId,
        page_idx: pageIdx,
        candidate_ids: cids,
      });
      console.log("data is less than 12", insErr);
      return NextResponse.json(
        {
          page_idx: nextPageIdx,
          results: cids,
        },
        { status: 200 }
      );
    }
  } catch (e: any) {
    console.log("error in after parsing ", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const candidateIds = await rerankByLLM(
    q.criteria?.join(", ") ?? "",
    data[0] as any[]
  );
  console.log("candidateIds ", candidateIds);

  supabase.from("queries").upsert({
    query_id: queryId,
    user_id: q.user_id,
    status: "Got Best 10 Candidates. Now organizing results.",
  });

  const { error: insErr } = await supabase.from("query_pages").insert({
    query_id: queryId,
    page_idx: pageIdx,
    candidate_ids: candidateIds.slice(0, 10),
  });

  if (insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json(
    { nextPageIdx, results: candidateIds.slice(0, 10), isNewSearch: true },
    { status: 200 }
  );
}
