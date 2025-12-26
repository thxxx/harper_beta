import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// const testSql = `
// SELECT
//   to_json(T1.id) AS id,
//   T1.name,
//   T1.headline,
//   T1.location,
//   T1.publications,
//   T1.bio,
//   T1.linkedin_url,
//   T1.total_exp_months,
//   T1.links,
//   T1.profile_picture,
//   jsonb_agg(
//     DISTINCT jsonb_build_object(
//         'experience', jsonb_strip_nulls(to_jsonb(T2.*)),
//         'company', jsonb_strip_nulls(
//             jsonb_build_object(
//                 'logo', T3.logo,
//                 'name', T3.name
//             )
//         )
//     )
//   ) FILTER (WHERE T2.candid_id IS NOT NULL) AS experiences,
//   jsonb_agg(
//       DISTINCT jsonb_strip_nulls(to_jsonb(T4.*))
//   ) FILTER (WHERE T4.candid_id IS NOT NULL) AS educations
// FROM
//   candid AS T1
// INNER JOIN
//   experience_user AS T2 ON T1.id = T2.candid_id
// INNER JOIN
//   company_db AS T3 ON T2.company_id = T3.id
// INNER JOIN
//   edu_user AS T4 ON T1.id = T4.candid_id
// ${parsed_text}

// GROUP BY
//   T1.id
// `

async function parseQueryWithLLM(queryText: string): Promise<string> {
  const prompt = `
너는 채용 후보자 검색을 위한 **전문 SQL Query Parser**다.
입력은 자연어로 작성된 채용 후보자 검색 요청이다.

너의 목표는:
- 실제 데이터베이스에서 **후보자가 충분히 많이 매칭되도록**
- 조건을 **너무 좁히지 말고**, 합리적으로 **확장된 OR 조건**을 사용하여
- 검색 품질이 좋은 WHERE 절을 생성하는 것이다.

---

### 📦 Database Schema

- T1: candid  
  - id (PK)
  - headline
  - bio
  - name
  - location

- T2: experience_user  
  - candid_id (FK → candid.id)
  - role
  - description : 본인이 한 일에대한 설명
  - start_date (DATE, format: YYYY-MM-DD)
  - end_date (DATE)
  - company_id (FK → company_db.id)

- T3: company_db  
  - id (PK)
  - name
  - description : 회사에 대한 설명
  - employee_count_range
  - founded_year
  - website_url

- T4: education_user  
  - candid_id (FK → candid.id)
  - school
  - degree
  - field
  - start_date (DATE)
  - end_date (DATE)

---

### 🚨 출력 규칙 (절대 위반 금지)

1. **출력은 반드시 WHERE 로 시작하는 SQL 조건문만 반환한다**
   - SELECT, FROM, JOIN, ORDER BY, LIMIT 포함 No
   - 오직 'WHERE ...' 본문만 출력

2. **절대 사용 금지 SQL**
   - UPDATE No
   - DELETE No
   - INSERT No
   - DROP No

3. **조건 표현 방식**
   - 모든 조건은 반드시 'ILIKE '%keyword%'' 형식 사용
   - 정확 일치('='), 정규식('~'), full-text search No
   - 반드시 'OR / AND' 조합으로 작성

4. **언어 규칙**
   - 데이터는 **대부분 영어**로 저장되어 있음
   - 한국어 키워드를 사용할 경우:
     - 반드시 대응되는 영어 키워드를 **함께 OR 조건으로 포함**
     - (예: "서울대학교" → "seoul national university", "SNU")

---

### 🎯 검색 전략 가이드 (매우 중요)

- 조건을 **한두 개만 쓰지 말고**, 반드시 **여러 개의 확장된 키워드**를 사용하라
- 너무 타이트한 AND 조건을 남발하지 말 것
- 가능하면 다음을 적극 활용하라:
  - 직무 유사어 (engineer / scientist / researcher / developer 등)
  - 전공 유사어 (computer science / software / AI / ML / data 등)
  - 회사 설명(description) 기반 검색
  - headline / bio / publications 활용

---

### 🧠 조건 해석 가이드

- 학력 조건 → T4.school, T4.degree, T4.field
- 직무/경력 → T2.role, T2.description
- 회사 특징 → T3.name, T3.description
- 개인 키워드 → T1.headline, T1.bio, T1.publications, T1.location

---

### 📅 날짜 조건 (선택적)

- 경력 연차, 최근 근무 여부가 포함된 경우:
  - start_date / end_date에 대해
  - 직접 계산은 하지 말고, **연도 문자열 기반 키워드 검색은 금지**
  - 날짜 조건이 애매하면 **날짜 조건을 생략하고 직무 키워드로 보완**

---

### ✅ 출력 예시

자연어 입력:
> 한국 Top 대학 출신이면서 AI 리서처 또는 머신러닝 엔지니어

출력:
WHERE
(
  T4.school ILIKE '%seoul national university%'
  OR T4.school ILIKE '%SNU%'
  OR T4.school ILIKE '%서울대학교%'
  OR T4.school ILIKE '%yonsei university%'
  OR T4.school ILIKE '%연세대학교%'
  OR T4.school ILIKE '%korea university%'
  OR T4.school ILIKE '%고려대학교%'
  OR T4.school ILIKE '%KAIST%'
  OR T4.school ILIKE '%postech%'
)
AND
(
  T4.field ILIKE '%computer%'
  OR T4.field ILIKE '%software%'
  OR T4.field ILIKE '%artificial intelligence%'
  OR T4.field ILIKE '%machine learning%'
)
OR
(
  T2.role ILIKE '%research%'
  OR T2.role ILIKE '%machine learning engineer%'
  OR T2.role ILIKE '%ml engineer%'
  OR T2.role ILIKE '%ai engineer%'
  OR T1.headline ILIKE '%research%'
)

---

### 📥 입력

Natural Language Query:
${queryText}

---

### ⚠️ 마지막 경고

- 설명, 주석, 코드블록, 마크다운 출력 X
- SQL WHERE 절 **본문만** 출력하라
- 한 줄이라도 규칙을 어기면 실패다
`.trim();

  // Responses API + structured outputs (text.format)
  const resp = await openai.responses.create({
    model: "gpt-4.1", // 너 환경에 맞게 조정
    input: prompt,
  });

  // SDK가 반환하는 구조는 버전에 따라 다를 수 있어,
  // 아래는 "최종 텍스트(JSON)"를 꺼내는 보수적인 방식.
  const outText =
    resp.output_text ?? (resp as any).output?.[0]?.content?.[0]?.text ?? "";

  return outText;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { queryId, pageIdx } = body;
  console.log("진입 확인 : ", queryId, pageIdx);

  if (!queryId)
    return NextResponse.json({ error: "Missing queryId" }, { status: 400 });

  const { data: q, error: qErr } = await supabase
    .from("queries")
    .select("query_id,user_id,raw_input_text,query")
    .eq("query_id", queryId)
    .single();

  console.log("일단 쿼리 확인 : ", q);

  if (qErr || !q || !q.raw_input_text)
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

  // 저장되어있는 결과가 없다면 새롭게 검색해야한다는 뜻.
  if (!results) {
    let parsed_query = q.query;
    if (!parsed_query) {
      parsed_query = await parseQueryWithLLM(q.raw_input_text);
      console.log("parsed_text ", parsed_query);

      const upsertRes = await supabase
        .from("queries")
        .upsert({ query_id: queryId, user_id: q.user_id, query: parsed_query });
      console.log("upsertRes ", upsertRes);
    }

    // LLM이 생성해야 하는 안전한 SQL 쿼리 (예시)
    const testSql = `
SELECT 
  to_json(T1.id) AS id,
  T1.name,
  T1.headline,
  T1.location,
  T1.publications,
  T1.bio,
  T1.linkedin_url,
  T1.total_exp_months,
  T1.links,
  T1.profile_picture,
  jsonb_agg(
    DISTINCT jsonb_build_object(
        'experience', jsonb_strip_nulls(to_jsonb(T2.*)),
        'company', jsonb_strip_nulls(
            jsonb_build_object(
                'logo', T3.logo,
                'name', T3.name
            )
        )
    )
  ) FILTER (WHERE T2.candid_id IS NOT NULL) AS experiences,
  jsonb_agg(
      DISTINCT jsonb_strip_nulls(to_jsonb(T4.*))
  ) FILTER (WHERE T4.candid_id IS NOT NULL) AS educations
FROM 
  candid AS T1
INNER JOIN 
  experience_user AS T2 ON T1.id = T2.candid_id
INNER JOIN 
  company_db AS T3 ON T2.company_id = T3.id
INNER JOIN
  edu_user AS T4 ON T1.id = T4.candid_id
${parsed_query}

GROUP BY 
  T1.id
`;

    const limit = 10;
    const { data, error } = await supabase.rpc(
      "set_timeout_and_execute_raw_sql",
      {
        sql_query: testSql,
        page_idx: pageIdx,
        limit_num: limit,
      }
    );

    console.log("그래서 검색한게 뭔데? data ", data, error);
    if (!data)
      return NextResponse.json(
        { page_idx: pageIdx, results: [] },
        { status: 500 }
      );

    const buildSummary = (doc: any) => {
      const exps = doc.experiences?.map((exp: any) => {
        let expText = `Role: ${exp.role}, Company: ${exp.company.name}`;
        if (exp.start_date) {
          expText += `, Start Date: ${exp.start_date}`;
        }
        if (exp.end_date) {
          expText += `, End Date: ${exp.end_date}`;
        }

        return expText;
      });

      const educations = doc.educations?.map((edu: any) => {
        let eduText = `School: ${edu.school}, Degree: ${edu.degree}, Field: ${edu.field}`;
        if (edu.start_date) {
          eduText += `, Start Date: ${edu.start_date}`;
        }
        if (edu.end_date) {
          eduText += `, End Date: ${edu.end_date}`;
        }
        return eduText;
      });

      const publications = doc.publications
        ? JSON.stringify(doc.publications.slice(0, 5))
        : "";

      const bio = doc.bio ? doc.bio : "";
      return `
${doc.name} is a ${doc.location} based.
About: ${bio}
Headline: ${doc.headline}
Experiences: ${exps}
Educations: ${educations}
Publications: ${publications}`;
    };

    (data[0] as Array<any>)?.forEach(async (doc: any, index: number) => {
      const res_check = await supabase
        .from("synthesized_summary")
        .select("*")
        .eq("candid_id", doc.id)
        .eq("query_id", queryId)
        .maybeSingle();

      console.log("res_check ", res_check);

      if (!res_check.data) {
        const information = buildSummary(doc);

        const res = await openai.chat.completions.create({
          model: "gpt-4.1-nano",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant. Given a search query and a candidate profile, generate a relevance-focused summary explaining why this candidate matches the query. Use exactly three sentences. Highlight especially important skills, experiences, or keywords by wrapping them with <strong> tags. 영어 단어가 들어가는건 상관없는데, 한글로 대답해줘.",
            },
            {
              role: "user",
              content: `Search Query : ${q.raw_input_text} \n\n Information : ${information}`,
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
      } else {
      }

      // if (index === data[0].length - 1) {
      // }
    });

    const candidateIds = (data[0] as Array<any>)?.map((r: any) => r.id) ?? [];
    console.log("검색 결과 candidateIds ", candidateIds);

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
