import { xaiInference } from "@/lib/llm/llm";
import { supabase } from "@/lib/supabase";
import { buildSummary } from "@/utils/textprocess";
import { NextRequest, NextResponse } from "next/server";

export const generateSummary = async (
  doc: string,
  criteria: string[],
  raw_input_text: string
) => {
  const information = buildSummary(doc);

  const systemPrompt = `You are a helpful assistant. Given a search query and criteria, generate a relevance-focused summary explaining whether this candidate matches the query or not.
Highlight especially important skills, experiences, or keywords by wrapping them with <strong> tags. 영어 단어가 들어가는건 상관없는데, 한글로 대답해줘.
List of string의 형태로 criteria의 순서에 맞게, 검색된 사람이 각 조건을 만족하는지/안하는지 이유를 대답해줘.`;

  const userPrompt = `
## 필수 : 출력은 criteria와 길이가 같고, 순서도 일치하는 List of string 이어야 한다.
리스트의 각 string은 항상 만족/모호/불만족 중 하나로 시작하고 뒤에 이유 혹은 추측을 붙여줘.

## 예시
search query: 생략
criteria: ["컴퓨터공학 전공자이며 석사 이상의 학위가 있는가", "대규모 트래픽 처리 경험이 있는가"]
information: 생략
output: ["만족, <strong>서울대학교 컴퓨터공학부</strong>를 졸업하고 동 대학원에서 <strong>석사 학위</strong>를 취득했습니다.", "모호, 직접적으로 설명이 적혀있지는 않지만 <strong>카카오 메신저 서버 개발 팀</strong>에서 근무했으며 카카오는 B2C 메신저로, 대규모 트래픽 처리를 필요로 하는 서비스입니다."]

## 예시
search query: 생략
criteria: ["자율주행 관련 학위가 있는가", "실제 자율주행 관련 업무 경험이 있는가"]
information: 생략
output: [만족, 자율주행 인지 분야의 TOP 학회인 CVPR에 'Self-driving like a human driver' 논문 및 기타 학회에 자율주행 관련 논문 3편을 작성했습니다.", "만족, 테슬라 오토파일럿 팀에서 인턴으로 근무하며 데이터 파이프라인 구축에 참여했습니다. 직접 자율주행 핵심 알고리즘을 개발한지는 모르지만, 자율주행 관련 회사의 관련 팀에서 일한 적이 있습니다."]

## 입력
Search Query : ${raw_input_text},
Criteria : ${JSON.stringify(criteria)},
Information : ${information}
Output: 
`;

  const summary = await xaiInference(
    "grok-4-fast-reasoning",
    systemPrompt,
    userPrompt
  );

  return summary;
};

export async function POST(req: NextRequest) {
  if (req.method !== "POST")
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });

  const body = await req.json();
  const { doc, queryId, criteria, raw_input_text } = body as {
    doc: any;
    queryId: string;
    criteria: string[];
    raw_input_text: string;
  };

  if (!doc || !criteria || !raw_input_text)
    return NextResponse.json(
      { error: "Missing userId or queryText" },
      { status: 400 }
    );

  const summary = await generateSummary(doc, criteria, raw_input_text);
  // logger.log("summary ", summary);

  try {
    const jsonoutput = JSON.parse(summary as string);
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  const { error: insErr } = await supabase.from("synthesized_summary").insert({
    candid_id: doc.id,
    query_id: queryId,
    text: summary as string,
  });

  if (insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ result: summary, success: true }, { status: 200 });
}
