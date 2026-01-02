import { geminiInference, xaiClient, xaiInference } from "@/lib/llm/llm";
import { supabase } from "@/lib/supabase";
import { ensureGroupBy, replaceName } from "@/utils/textprocess";
import { NextRequest, NextResponse } from "next/server";

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

async function parseQueryWithLLM(
  queryText: string
): Promise<{ criteria: string[]; sql_query: string; thinking: string }> {
  const prompt = `
너의 핵심 목표는:
1. 사용자의 의도를 파악하여 **검색 기준(Criteria)**을 명확히 정의하고,
2. 단순 키워드 매칭을 넘어, 문맥적 동의어까지 포함하는 **확장된 조건**을 AND/OR/Full text search 조합으로 설계하여,
3. **Database에서 최대한 많은 잠재 후보자를 놓치지 않고 찾아내는** 고품질의 SQL WHERE 절을 생성하는 것이다.

---

### 📦 Database Schema

- T1: candid  
- id (PK), headline, bio, name, location, summary
* summary: 본인에 대한 간략한 설명. 최대 500자 이하. 다른 모든 데이터들은 비어있을 수도 있지만, summary는 모든 candid row에 존재한다. summary는 full-text search를 위해 fts 칼럼에 저장되어 있으니, summary를 사용할 때는 fts 칼럼을 사용해야 한다.

- T2: experience_user
- candid_id (FK → candid.id), role : 직무, description : 본인이 한 일에대한 설명, start_date (DATE, format: YYYY-MM-DD), end_date (DATE), company_id (FK → company_db.id)

- T3: company_db  
- id (PK)
- name : 회사명
- description : 회사에 대한 설명
- specialities: 회사의 특성 혹은 전문성. 한 회사의 예시) Online Accommodation, Leisure Booking & Advertisement, Hotel Property Management System, Interior & Remodeling, Hotelier Recruiting, Travel Tech
- employee_count_range
- founded_year
- website_url
  - start_date (DATE)
  - end_date (DATE)

- T4: education_user  
  - candid_id (FK → candid.id)
  - school : 학교명
  - degree
  - field : 전공
  - start_date (DATE)
  - end_date (DATE)

- T5: publications
  - candid_id (FK → candid.id)
  - title : 논문 혹은 책의 제목
  - link
  - published_at : 논문 혹은 책이 발행된 곳. 학회, 워크샵 등 + 발행 날짜

---

### 🧠 Thinking 가이드 (Deep Reasoning 필수)
**"thinking" 필드는 단순한 계획 나열이 아니라, 너의 '논리적 추론 과정'을 서술해야 한다.**
다음 3단계 사고 과정을 거쳐 작성하라:

1.  **Intent Analysis (의도 파악)**: 사용자가 말한 조건의 이면에 숨겨진 의도는 무엇인가? (예: "잘하는 개발자" → 단순히 스킬셋 매칭이 아니라, 주요 IT 기업 출신이나 리드급 직책을 의미할 수 있음)
2.  **Ambiguity Resolution (모호성 해결)**: 모호한 표현(예: "최근", "Top 대학", "스타트업", "취미")을 DB 검색 가능한 구체적인 전략으로 어떻게 변환할 것인가? experience, company, educations, publications 등을 고려해라.
3.  **Expansion Strategy (확장 전략)**: Recall(검색되는 수)을 높이기 위해 어떤 키워드를 OR/AND 조건으로 추가할 것인가?

---

### 🚨 출력 규칙 (절대 위반 금지)

1. **출력은 세가지 key를 가지는 json이어야 한다.
a. **"thinking"**: 위 가이드에 따른 **추론 과정**을 서술형으로 작성 (300자 내외).
  - *Bad Example*: "서울대를 검색하고 자바를 검색한다."
  - *Good Example*: "사용자가 '메이저 금융권'을 원하므로, 단순히 'Finance' 키워드만 쓸 것이 아니라 KB, 신한 같은 구체적인 은행명과 핀테크 키워드를 혼합해야 한다. 또한 '자바 전문가'는 Spring Boot 경험이 필수적이므로 기술 스택에 이를 포함시켜 검색 범위를 넓힌다."
b. **"criteria"**: 검색 결과 판단 기준 (List[String], 1~3개). 검색에 기반해서 각 사람을 판단하는데 사용되어야 하는 조건들을 담고 있는 리스트. 항상 최소 1개 이상, 최대 3개 이하여야 한다. 가장 중요한 조건만을 포함해라.
  - 예시: ["AI 리서처인지", "자율주행 관련 연구를 한적 있는지"]
  - 예시: ["IVY League 출신인지", "박사과정을 밟았는가", "비행기를 좋아하는가"]
c. "sql_query": 반드시 WHERE 로 시작하는 SQL 조건문만 반환한다. criteria와 별개로 여러가지 추가적인 조건을 담아도 된다.
  - '(A OR B) AND (C OR D)' 형태의 괄호 구조 엄수.
  - 오직 'WHERE ...' 본문만 출력하라
  - SELECT, FROM, JOIN, ORDER BY, LIMIT 사용 금지
  - UPDATE, DELETE, INSERT, DROP는 절대 사용금지
  - 만약 full-text search를 사용한다면, 마지막에 rank를 항상 같은 조건아래 추가해야한다. 형태 : ORDER BY ts_rank(fts, to_tsquery('english', ~~~)) DESC;
  - In to_tsquery, you must not use quotation marks or plain spaces; every term must be a single lexeme combined explicitly with operators (&, |, !), phrases must use the <-> operator instead of spaces, and grouping must be done with parentheses.

2. **조건 표현 방식**
  - date를 제외한 모든 조건은 반드시 'ILIKE '%keyword%'' 형식 혹은 full-text search를 사용하는 형식 사용
  - date는 DATE 타입으로 비교 검색을 해야하고, IS NULL인 경우 현재진행 상태를 의미한다.

3. **언어 규칙**
  - 데이터는 **대부분 영어**로 저장되어 있음
  - 한국어 키워드를 사용할 경우 반드시 대응되는 영어 키워드를 **함께 OR 조건으로 포함**
  - (예: "서울대학교" → "seoul national university", "SNU")

---

### sql_query 전략 가이드 (매우 중요)
- criteria와 무관하게, Natural Language Query에 기반하여 sql_query를 작성하라
- 조건을 **한두 개만 쓰지 말고**, 여러 개의 확장된, 정확한 키워드를 사용하라. 대신 의도와 다른 결과가 잡힐 수 있는 키워드까지 확장하면 안된다.
- 가능하면 다음을 적극 활용하라:
  - 직무 유사어 (engineer / scientist / researcher / developer 등)
  - 전공 유사어 (computer science / software / AI / ML / data 등)
  - 회사 설명(description) 기반 검색
- 검색이 명확한 하나의 조건이라면 sql_query를 짧게 구성해도 되니, 지나치게 길게 작성하지 마라.

---

### criteria 전략 가이드
- criteria는 최소 1개 이상, 최대 3개 이하여야 한다. 각 기준은 명확히 다르고 겹치지 않아야 한다. 영어로 작성해야 한다.
- criteria는 자연어 입력에 대해서만 세팅되고, thinking 과정의 기준은 반영되지 않아야 한다.
- 각 criteria는 최대 30자 이하여야 한다.
- criteria는 중복되지 않아야 한다. 하나로 묶을 수 있다면 묶어서 하나로 표현해라.
- 검색 query에 기반하는 것이 가장 중요하고, Database의 schema와 별개의 조건이어도 된다. ex) 일을 열심히 하는 편인가, 나이가 2, 30대인가 등.

---

### 🧠 조건 해석 가이드

- 학력 조건 → T4.school, T4.degree, T4.field
- 직무/경력 → T2.role, T2.description, T1.summary
- 회사 특징 → T3.name, T3.description, T3.specialities
- 개인 키워드 → T1.headline, T1.bio, T1.location, T1.summary
- 논문 혹은 책 → T5.title, T5.published_at

---

### 날짜 조건 (선택적)

- 경력 연차, 최근 근무 여부가 포함된 경우:
  - start_date / end_date에 대해
  - 직접 계산은 하지 말고, **연도 문자열 기반 키워드 검색은 금지**
  - 날짜 조건이 애매하면 **날짜 조건을 생략하고 직무 키워드로 보완**

---

### ✅ 출력 예시

자연어 입력:
> CVPR이나 ICCV 같은 Top 학회 논문 실적이 있는 컴퓨터 비전 리서치 엔지니어

출력:
{ "thinking": "1) 의도 파악: 사용자는 단순 엔지니어가 아니라, 최신 연구 트렌드를 이해하고 구현할 수 있는 'R&D 인재'를 찾고 있다. '논문 실적'은 핵심 필터링 조건이다. 2) 키워드 확장 (Domain): '컴퓨터 비전'은 'Computer Vision', 'CV', 'Image Processing' 뿐만 아니라 'Object Detection', 'Segmentation' 같은 세부 과업명으로 확장해야 매칭률을 높일 수 있다. 3) 키워드 확장 (Publication): 사용자가 언급한 'CVPR', 'ICCV' 외에도 'ECCV', 'NeurIPS', 'ICML' 등 인접한 Top-tier 학회명을 T5(논문)와 T1(소개), T2(경력)에서 모두 검색해야 한다. 직무명은 'Researcher'와 'Engineer'가 혼용되므로 'Research Engineer', 'Scientist', 'AI Researcher'를 모두 포괄한다. 석사/박사 과정이라도 리서치 엔지니어로 분류할 수 있으니 회사 직무 조건은 OR로 추가한다.", 
 "criteria": [ "Expertise in computer vision", "Publications in major AI/vision conferences" ],
 "sql_query": "WHERE(
 fts @@ to_tsquery('english', '((computer <-> vision) | vision) & research')
AND (
T5.published_at ILIKE '%CVPR%'
OR T5.published_at ILIKE '%ICCV%'
OR T5.published_at ILIKE '%ECCV%'
OR T5.published_at ILIKE '%NeurIPS%'
OR T5.published_at ILIKE '%ICML%'
OR T5.published_at ILIKE '%AAAI%'
)) OR ((
T2.role ILIKE '%computer vision%'
OR T2.role ILIKE '%vision engineer%'
OR T2.role ILIKE '%research%'
OR T2.description ILIKE '%segmentation%'
OR T2.description ILIKE '%detection%'
OR T1.headline ILIKE '%researcher%'
OR T1.bio ILIKE '%computer vision%'
OR T1.bio ILIKE '%research%'
)
AND
(
T5.title ILIKE '%computer vision%'
OR T5.title ILIKE '%object detection%'
OR T5.title ILIKE '%object segmentation%'
OR T5.title ILIKE '%image processing%'
OR T5.title ILIKE '%image generation%'
OR T5.title ILIKE '%video generation%'
OR T5.title ILIKE '%video processing%'
OR T5.title ILIKE '%ViT%'
OR T5.title ILIKE '%GAN %'
OR T5.title ILIKE '%Nerf%'
OR T5.title ILIKE '%Gaussian splatting%'
OR T5.title ILIKE '%Convolution%'
OR T5.title ILIKE '%image classification%'
)
AND
(
T5.published_at ILIKE '%CVPR%'
OR T5.published_at ILIKE '%ICCV%'
OR T5.published_at ILIKE '%ECCV%'
OR T5.published_at ILIKE '%NeurIPS%'
OR T5.published_at ILIKE '%ICML%'
OR T5.published_at ILIKE '%AAAI%'
OR T1.bio ILIKE '%accepted at%'
))
ORDER BY ts_rank(fts, to_tsquery('english', '((computer <-> vision) | vision) & research')) DESC
" }

---

짧은 예시

자연어 입력:
> 카카오에서 일한적 있는 사람

"thinking": "한글로 카카오에서 일한 사람이라고 한다면, Kakao라는 회사를 다닌 적 있는 사람을 의미하기 때문에 직접적으로 회사명을 검색하는 조건을 최대한 사용해야 한다.",
"criteria": [ "Worked at Kakao" ],
"sql_qeury":"WHERE (
T3.name ILIKE '%kakao%'
OR T3.name ILIKE '%카카오%'
OR T1.bio ILIKE '%worked at 카카오%'
OR T1.bio ILIKE '%worked at kakao%'
)"

T2.description ILIKE '%kakao%' # 이건 잘못된 예시이다. 본인이 한 일에 대한 설명이기 때문에, 다른 회사나 서비스의 이름이 적혀있을 수 있다.
T3.description ILIKE '%kakao%' # 이건 잘못된 예시이다. 회사의 설명에 다른 회사의 이름이 언급될 수 있다.

---

❌ sql_query의 잘못된 예 (직접적으로 관련 없는 너무 많은 사람이 나올 수 있음. AND를 더 많이 섞어야 함. bio에 "거래" 라고 넣으면 마켓플레이스 전문가가 아니더라도 다른 이유로 우연히 사람이 검색될 수 있으니 쓰면 안된다. 포괄적인 검색도 추가하고 싶다면 포괄적인 키워드들 끼리 따로 AND 안에 그룹어 검색해야한다.)

자연어 입력:
> e-commerce 관련 경험이 있는 마켓플레이스 전문가

"thinking": 생략,
"criteria":["Interest in airplanes","Aviation hobby"], # 두 criteria는 한가지로 묶을 수 있기 때문에 잘못되었음. 비슷한 경우 하나로 합쳐서 출력할 것.
"sql_qeury":
WHERE (
T2.role ILIKE '%marketplace%'
OR T2.role ILIKE '%platform%'
OR T2.role ILIKE '%commerce%'
OR T2.role ILIKE '%e-commerce%'
OR T2.description ILIKE '%플랫폼%' # 지나치게 포괄적인 키워드는 쓰면 안된다.
OR T2.description ILIKE '%payment%'
~~ # 및 기타 지나치게 많은 OR 문으로 확실한 검색 성능이 떨어지는 경우.
)

수정된 예시:
~~
fts @@ to_tsquery('english', 'marketplace | e-commerce | market-place')
OR((
T3.name ILIKE '%eBay%'
OR T3.name ILIKE '%Amazon%'
OR T3.specialities ILIKE '%marketplace%'
OR T3.specialities ILIKE '%e-commerce%'
)
AND (
T2.role ILIKE '%marketplace%'
OR T2.role ILIKE '%e-commerce%'
OR T1.headline ILIKE '%marketplace%'
OR T1.headline ILIKE '%e-commerce%'
OR T1.bio ILIKE '%marketplace%'
))
ORDER BY ts_rank(fts, to_tsquery('english', 'marketplace | e-commerce | market-place')) DESC

~~

---

### ⚠️ 마지막 경고
- 설명, 주석, 코드블록, 마크다운 출력 X
- SQL WHERE 절 **본문만** 출력하라
- 한 줄이라도 규칙을 어기면 실패다.
---

### 입력

Natural Language Query:
${queryText}
`.trim();

  // Responses API + structured outputs (text.format)
  const outText = await geminiInference(
    // "grok-4-fast-reasoning",
    // "grok-4-fast-reasoning",
    "gemini-3-flash-preview",
    "You are a specialized SQL query parser for recruitment candidate search. Your input is a natural-language request describing criteria for searching job candidates.",
    prompt,
    0.4
  );

  // // Responses API + structured outputs (text.format)
  // const resp = await xaiClient.responses.create({
  //   // const resp = await xaiClient.responses.create({
  //   // model: "grok-4-fast-reasoning",
  //   model: "grok-4-fast-reasoning",
  //   input: prompt,
  //   prompt_cache_key: "search_query_parser_harper_20251228",
  // });

  const cleanedResponse = (outText as string).trim().replace(/\n/g, " ").trim();
  const outJson = JSON.parse(cleanedResponse);

  return outJson as any;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { queryId, pageIdx } = body;

  if (!queryId)
    return NextResponse.json({ error: "Missing queryId" }, { status: 400 });

  const { data: results, error: lpErr } = await supabase
    .from("query_pages")
    .select("*")
    .eq("query_id", queryId)
    .eq("page_idx", pageIdx)
    .maybeSingle();

  console.log(pageIdx, "쿼리와 results ", results);
  if (lpErr)
    return NextResponse.json({ error: lpErr.message }, { status: 500 });

  const nextPageIdx = pageIdx + 1;

  if (results) {
    return NextResponse.json(
      { nextPageIdx, results: results.candidate_ids },
      { status: 200 }
    );
  }

  const { data: q, error: qErr } = await supabase
    .from("queries")
    .select("query_id,user_id,raw_input_text,query,criteria")
    .eq("query_id", queryId)
    .single();

  console.log("일단 쿼리 확인 : ", q);

  if (qErr || !q || !q.raw_input_text)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  // 저장되어있는 결과가 없다면 새롭게 검색해야한다는 뜻.
  if (!results) {
    let parsed_query = q.query;
    let parsed_criteria = q.criteria;

    if (!parsed_query) {
      try {
        const res = await parseQueryWithLLM(q.raw_input_text);
        console.log("parsed_text ", res);
        console.log("parsed_text ", res["criteria"]);
        console.log("parsed_text ", res["thinking"]);
        console.log("parsed_text ", res["sql_query"]);

        const upsertRes = await supabase.from("queries").upsert({
          query_id: queryId,
          user_id: q.user_id,
          query: res.sql_query,
          criteria: res.criteria,
          thinking: res.thinking,
        });

        console.log("upsertRes ", upsertRes);

        parsed_query = res.sql_query;
        parsed_criteria = res.criteria;
      } catch (e) {
        console.log("parseQueryWithLLM error ", e);
      }
    }

    // LLM이 생성해야 하는 안전한 SQL 쿼리 (예시)
    const sqlQuery = `
SELECT 
  to_json(T1.id) AS id,
  T1.name,
  T1.headline,
  T1.summary,
  T1.bio
FROM 
  candid AS T1
LEFT JOIN 
  experience_user AS T2 ON T1.id = T2.candid_id
LEFT JOIN 
  company_db AS T3 ON T2.company_id = T3.id
LEFT JOIN
  edu_user AS T4 ON T1.id = T4.candid_id
LEFT JOIN
  publications AS T5 ON T1.id = T5.candid_id
${parsed_query}
`;
    const sqlQueryWithGroupBy = ensureGroupBy(sqlQuery, "GROUP BY T1.id");
    console.log("sqlQueryWithGroupBy === \n", sqlQueryWithGroupBy, "\n---\n");

    const limit = 50;
    let data: any[] | null = [];
    let error = "";
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

    // console.log("data ", data, "\n\nError : ", error);

    if (!data || !data[0])
      return NextResponse.json(
        { page_idx: pageIdx, results: [] },
        { status: 500 }
      );

    if (data[0].length < 12) {
      return NextResponse.json(
        {
          page_idx: nextPageIdx,
          results:
            (data[0] as Array<any>)?.slice(0, 10).map((r: any) => r.id) ?? [],
        },
        { status: 200 }
      );
    }

    const candidateIds = await rerankByLLM(
      q.criteria?.join(", ") ?? "",
      data[0] as any[]
    );
    console.log("candidateIds ", candidateIds);

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
}
