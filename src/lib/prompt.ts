export const criteriaPrompt = `
Your core objective is:
1. To **Rephrase** the user's natural language query into a precise, professional definition to confirm understanding.
2. To professionally interpret the intent to define clear **Search Criteria**.
3. To design and explain the **Thinking Process** of how Harper will find the best talent in a way that is engaging and transparent.
4. criteria와 thinking은 영어 키워드를 제외하면 한글로 작성해야한다.

**Output Format:** JSON (keys: "rephrasing", "thinking", "criteria")
Only return the JSON object, no other text or comments or code block or markdown.

---

### Database Schema

candid : T1
- id (PK), headline, bio, name, location, summary, total_exp_months: 본인의 총 경력 개월수 이지만 대체로 실제보다 더 길게 들어가기 때문에 여유를 둬야한다.

experience_user
- candid_id (FK → candid.id), role : 직무, description : 본인이 한 일에대한 설명, start_date (DATE, format: YYYY-MM-DD), end_date (DATE), company_id (FK → company_db.id)

company_db  
- id (PK)
- name : name of the company
- description : 회사에 대한 설명
- specialities: 회사의 특성 혹은 전문성. ex) Online Accommodation, Leisure Booking & Advertisement, Hotel Property Management System, Interior & Remodeling, Hotelier Recruiting, Travel Tech
- investors: 투자자 목록, 투자회사명(라운드) 형태로 들어가있음. ex) SBVA(Series B)
- start_date (DATE)
- end_date (DATE)

edu_user  
- candid_id (FK → candid.id)
- school : 학교명
- degree : 학위 ex) Bachelor of Science, Master of Science, phd
- field : 전공
- start_date (DATE)
- end_date (DATE)

publications
- candid_id (FK → candid.id)
- title : 논문 혹은 책의 제목
- link
- published_at : 논문 혹은 책이 발행된 곳. 학회, 워크샵 등 + 발행 날짜
---

### [Internal Data Intelligence] (Reference Logic)
Harper matches talent using the following data structure:
- **Basic Info (T1):** Summary, Bio, Location, Headline. (Uses FTS)
- **Experience (experience_user, company_db):** Role, Company Name, Company Specialities, Employee Count, Founded Year.
- **Education (edu_user):** School Name, Degree, Major/Field.
- **Achievements (publications):** Publication Titles, Venues/Dates.

---
[Rephrasing Guide] (의도 명확화)
- rephrasing 필드는 사용자가 가장 먼저 보게 되는 문장으로, 네가 요청의 뉘앙스를 정확히 이해했는지를 확인시켜 줍니다.
- 명확화 & 확장: 줄임말이나 구어체를 전문적인 표현으로 변환합니다 (예: “grad” → “졸업생”, “dev” → “소프트웨어 엔지니어”).
- 맥락 보완: “AI 스타트업”처럼 모호한 표현이 나오면, 비즈니스 관점에서 의미를 구체화합니다 (예: “핵심 AI 기술을 직접 개발하는 기업”).
- 형식: 한 문장으로 간결하고 명확하게 작성합니다.

---

[Thinking Guide] (탐색 로직 설명 · 외부 노출용)
- thinking 필드는 재구성된 요청을 바탕으로 후보를 어떻게 탐색할지에 대한 과정을 설명합니다.
- 전문가 브리핑 톤: 내부 데이터 구조나 기술적 구현 방식은 절대 드러내지 않습니다.
- 데이터베이스 구조에 있는 내용안에서 검색 방법을 설계해야합니다. **직접적으로 schema와 table/column명을 드러내진 않고**, 문장으로 풀어서 작성합니다.
  - ex) 카이스트와 서울대를 다닌적 있는 사람들 중 제목에 "TTS"라는 키워드가 포함된 논문을 작성한 적 있는 사람을 탐색합니다. 혹은 ~~
- 톤: 정중하고 신뢰감 있으며, 사용자를 위해 일하고 있다는 느낌을 줍니다 (약 250자 미만).
- 검색 내용과 직접적으로 연관이 없는 내용이나 목표를 추가하지마. ex) founder를 검색했는데 혁신적인 리더십을 가진 잠재적 창업자를 효과적으로 매칭하겠습니다. 이런 말을 추가하지말고 검색을 어떻게 할지에 대해서만 말해.

---

### [Criteria Output Rules]
- criteria는 최소 1개 이상, 최대 4개 이하여야 한다. 각 기준은 명확히 다르고 겹치지 않아야 한다. 특정 키워드를 제외하고는 한글로 작성해야 한다.
- 가능한 3개 이하로 해보고, 전체 검색 내용을 커버하기 위해 필요하면 4개로 늘려도 좋다.
- criteria는 자연어 입력에 대해서만 세팅되고, thinking/rephrasing 과정의 기준은 반영되지 않아야 한다.
- 각 criteria는 최대 30자 이하여야 한다.
- criteria는 중복되지 않아야 한다. 하나로 묶을 수 있다면 묶어서 하나로 표현해라.
- 검색 query에 기반하는 것이 가장 중요하고, Database의 schema와 별개의 조건이어도 된다. ex) 일을 열심히 하는 편인가, 나이가 2, 30대인가 등.

---

### [Output Example - Good Case]
User Input: "stanford grad working in ai startup"
Output:
{
  "rephrasing": "인공지능을 핵심 제품으로 개발하고 있는 고성장 스타트업에서 현재 근무 중인 스탠퍼드 대학교 졸업생",
  "thinking": "스탠퍼드 대학교 졸업생 중 AI/ML 전문 분야로 분류된 기업들의 현재 재직 정보와 교차 분석하고 있습니다. 특히 임직원 수가 적거나 설립된 지 얼마 되지 않은 기업을 중심으로 선별해 ‘스타트업’을 타겟팅하며, 후보자 정보를 직접 분석해 실제 AI 제품 개발에 적극적으로 관여하고 있는지를 확인하고 있습니다.",
  "criteria": [
    "Stanford 졸업생",
    "AI/ML에 대한 전문성",
    "고성장 스타트업 근무"
  ]
}

---

### Input Starts Here
Natural Language Query:`;

export const sqlPrompt2 = `너의 핵심 목표는:
1. 단순 키워드 매칭을 넘어, 문맥적 동의어까지 포함하는 **확장된 조건**을 AND/OR/Full text search 조합으로 설계하여,
2. **Database에서 최대한 많은 잠재 후보자를 놓치지 않고 찾아내는** 고품질의 SQL WHERE 절을 생성하는 것이다.

---

### Database Schema

candid : T1
- id (PK), headline: 보통 현재 상태에 대한 간략한 설명이다. ex) "Senior Software Engineer at Google", "Research Scientist at Meta", "Co-founder & CEO at a stealth startup" 등, name, location: location은 항상 영어로 들어있다, summary, total_exp_months: 본인의 총 경력 개월수 이지만 대체로 실제보다 더 길게 들어가기 때문에 여유를 둬야한다.
* summary: 본인에 대한 간략한 설명. 최대 500자 이하. 다른 모든 데이터들은 비어있을 수도 있지만, summary는 모든 candid row에 존재한다. summary는 full-text search를 위해 fts 칼럼에 저장되어 있으니, summary를 사용할 때는 fts 칼럼을 사용해야 한다.
사용 예시 : fts @@ to_tsquery('english', 'computer <-> vision | research <-> scientist | researcher')

experience_user
- candid_id (FK → candid.id), role : 직무, description : 본인이 한 일에대한 설명, start_date (DATE, format: YYYY-MM-DD), end_date (DATE), company_id (FK → company_db.id)

company_db
- id (PK)
- name : name of the company
- description : 회사에 대한 설명
- specialities: 회사의 특성 혹은 전문성. ex) Online Accommodation, Leisure Booking & Advertisement, Hotel Property Management System, Interior & Remodeling, Hotelier Recruiting, Travel Tech
- investors: 투자자 목록, 투자회사명(라운드) 형태로 들어가있음. ex) SBVA(Series B)
- start_date (DATE)
- end_date (DATE)

edu_user
- candid_id (FK → candid.id)
- school : 학교명
- degree : 학위 ex) Bachelor of Science, Master of Science, phd
- field : 전공
- start_date (DATE)
- end_date (DATE)

publications
- candid_id (FK → candid.id)
- title : 논문 혹은 책의 제목
- link
- published_at : 논문 혹은 책이 발행된 곳. 학회, 워크샵 등 + 발행 날짜

---

### 출력 규칙 (절대 위반 금지)

1. **출력은 필요한 테이블을 가져오기 위한 JOIN과 WHERE 절이어야 한다. SQL 조건문만 반환한다.
  - '(A OR B) AND (C OR D)' 형태의 괄호 구조 엄수.
  - 오직 'WHERE ...' 본문만 출력하고 필요하다면 앞에 "JOIN ... on ..." 조건을 추가해도 된다. candid는 이미 T1으로 불러와진 상태이다.
  - SELECT, FROM, ORDER BY, LIMIT 사용 금지
  - UPDATE, DELETE, INSERT, DROP는 절대 사용금지
  - In to_tsquery, you must not use quotation marks or plain spaces; every term must be a single lexeme combined explicitly with operators (&, |, !), phrases must use the <-> operator instead of spaces, and grouping must be done with parentheses.

2. **조건 표현 방식**
  - date를 제외한 모든 조건은 반드시 'ILIKE '%keyword%' 형식 혹은 full-text search를 사용하는 형식 사용
  - 기존의 SQL 규칙과 어긋나더라도 같은 테이블과 칼럼에 대하여 여러 키워드 조건을 유사 키워드를 위해 사용할 경우, |를 사용하여 여러 키워드를 한번에 출력해라. ex) %engineer|developer|software engineer|researcher%
  - date는 DATE 타입으로 비교 검색을 해야하고, IS NULL인 경우 현재진행 상태를 의미한다.

3. **언어 규칙**
  - 데이터는 **대부분 영어**로 저장되어 있음
  - 한국어 키워드를 사용할 경우 반드시 대응되는 영어 키워드를 **함께 OR 조건으로 포함**
  - (예: "서울대학교" → "seoul national university", "SNU")

---

### sql_query 전략 가이드 (매우 중요)
- 조건을 **한두 개만 쓰지 말고**, 여러 개의 확장된, 정확한 키워드를 사용하라. 대신 의도와 다른 결과가 잡힐 수 있는 키워드까지 확장하면 안된다.
- 가능하면 다음을 적극 활용하라:
  - 직무 유사어 (engineer / scientist / researcher / developer 등)
  - 전공 유사어 (computer science / software / AI / ML / data 등)
- 검색이 명확한 하나의 조건이라면 sql_query를 짧게 구성해도 되니, 지나치게 길게 작성하지 마라.
- If you use to_tsquery, 마지막에 ORDER BY ts_rank(fts, to_tsquery('english', '<query in to_tsquery>')) DESC 를 추가해라.

---

### 조건 해석 가이드

- 학력 조건 → education_user.school, education_user.degree, education_user.field
- 직무/경력 → experience_user.role, experience_user.description, candid.summary
- 회사 특징 → company_db.name, company_db.description, company_db.specialities
- 개인 키워드 → candid.headline, candid.location, candid.summary
- 논문 혹은 책 → publications.title, publications.published_at

---

### 날짜 조건 (선택적)
- 경력 연차, 최근 근무 여부가 포함된 경우:
  - start_date / end_date에 대해
  - end_date가 NULL이면 현재 진행 상태를 의미.
  - 직접 계산은 하지 말고, **연도 문자열 기반 키워드 검색은 금지**
  - 날짜 조건이 애매하면 **날짜 조건을 생략하고 직무 키워드로 보완**
  - start_date / end_date는 불완전할 수 있으니 필수적인 경우에만 사용해라.

---

### 출력 예시

자연어 입력:
> CVPR이나 ICCV 같은 Top 학회 논문 실적이 있는 컴퓨터 비전 리서치 엔지니어

출력:
JOIN publications p ON p.candid_id = T1.id
JOIN experience_user ex ON ex.candid_id = T1.id
JOIN company_db c ON c.id = ex.company_id
WHERE(
 fts @@ to_tsquery('english', '((computer <-> vision) | vision) & research')
AND (
p.published_at ILIKE '%CVPR|ICCV|ECCV|NeurIPS|ICML|AAAI%'
)) OR ((
ex.role ILIKE '%computer vision|vision engineer|research%'
OR ex.description ILIKE '%segmentation|detection%'
OR T1.headline ILIKE '%researcher%'
)
AND(
p.title ILIKE '%computer vision|object detection|object segmentation|image processing|image generation|video generation|video processing|ViT|GAN|Nerf|Gaussian splatting|Convolution|image classification%'
)
AND(
p.published_at ILIKE '%CVPR|ICCV|ECCV|NeurIPS|ICML|AAAI%'
))

---
자연어 입력 : 서울대/KAIST 출신이고 3년 이상 경력의 컴퓨터 비전 리서치 엔지니어 (CVPR/ICCV급 논문 실적 선호)
출력:
JOIN edu_user T4 ON T4.candid_id = T1.id
JOIN experience_user ex ON ex.candid_id = T1.id
JOIN company_db c ON c.id = ex.company_id
WHERE (
  (
    T4.school ILIKE '%서울대|서울대학교|Seoul National|SNU|연세대|연세대학교|Yonsei|고려대|고려대학교|Korea University|KAIST|카이스트|POSTECH|포스텍%'
    OR T1.summary ILIKE '%SNU|Yonsei|Korea University|KAIST|POSTECH%'
  )

  AND (
    c.name ILIKE '%Google|Alphabet%'
    OR c.name ILIKE '%Meta|Facebook%'
    OR ex.role ILIKE '%Google|Alphabet|Meta|Facebook%'
  )

  AND (
    ex.end_date IS NOT NULL
    AND ex.end_date >= DATE '2023-01-01'
  )

  AND (
    c.name ILIKE '%stealth|stealth mode%'
    AND ex.end_date IS NULL
  )
)

---

짧은 예시

자연어 입력:
> 카카오에서 엔지니어로 일한적 있는 사람

출력:
JOIN experience_user ex ON T1.id = ex.candid_id
JOIN company_db c ON c.id = ex.company_id
WHERE (
c.name ILIKE '%kakao|카카오%'
OR T1.headline ILIKE 'kakao|카카오%'
) AND (
ex.role ILIKE '%engineer|developer|software engineer%'
)

ex.description ILIKE '%kakao%' # 이건 잘못된 출력이다. 본인이 한 일에 대한 설명이기 때문에, 다른 회사나 서비스의 이름이 적혀있을 수 있다.
c.description ILIKE '%kakao%' # 이건 잘못된 출력이다. 회사의 설명에 다른 회사의 이름이 언급될 수 있다.

---
### 마지막 경고
- 설명, 주석, 코드블록, 마크다운 출력 X
- SQL WHERE 절 **본문만** 출력하라
- 한 줄이라도 규칙을 어기면 실패다.
---

### 입력
`;

export const sqlExistsPrompt = `
!IMPORTANT! 아래의 Input SQL Query를
1) JOIN 대신 EXISTS 문을  사용한 SQL Query로 변환해줘.
2) %keyword1|keyword2% 형식으로 작성된 내용은 ANY (ARRAY['%keyword1%','%keyword2%']) 형식으로 전부 ANY + ARRAY로 변환해줘.
3) Input SQL Query에서 JOIN 문에 사용된 테이블이 있다면, 그 테이블을 JOIN 해서 리턴되는 데이터에 포함되도록 해줘.
- **중요** DB Search 속도를 위해서는 먼저 조건을 만족하는 candid의 id만 뽑고, 그 다음에 table을 JOIN으로 붙여야 한다.
- experience_user에는 company_db를 함께 조회해서, experience_user에 company_db 정보를 포함하도록 해줘.

모든 검색 조건과 Logic은 그대로 유지하되, 속도가 개선된 SQL Query를 리턴해줘.
예시에는 주석이 있지만, 출력에는 절대 주석을 달면 안돼.

---
OUTPUT EXAMPLE: 
"""
 WITH params AS (
  SELECT to_tsquery('english', '(machine <-> learning) | ML | MLE | (deep <-> learning)') AS tsq
),
-- [1단계] 필터링 및 ID 확정 (Phase 1: ID-only Filtering)
-- 무거운 컬럼이나 JSON 연산 없이 오직 ID와 정렬 순서만 결정합니다.
identified_ids AS (
  SELECT
    T1.id,
    ts_rank(T1.fts, params.tsq) AS fts_rank
  FROM candid AS T1
  CROSS JOIN params
  WHERE
    -- 학교 조건 1: 서울과고
    EXISTS (
      SELECT 1 FROM edu_user e1
      WHERE e1.candid_id = T1.id
        AND e1.school ILIKE ANY (ARRAY['%서울과학고%', '%서울과학고등학교%', '%Seoul Science High School%', '%SSHS%'])
    )
    -- 학교 조건 2: KAIST
    AND EXISTS (
      SELECT 1 FROM edu_user e2
      WHERE e2.candid_id = T1.id
        AND e2.school ILIKE ANY (ARRAY['%KAIST%', '%카이스트%', '%Korea Advanced Institute of Science and Technology%'])
    )
    -- 경력 및 키워드 조건
    AND EXISTS (
      SELECT 1 FROM experience_user ex
      WHERE ex.candid_id = T1.id
        AND (
          ex.role ILIKE ANY (ARRAY['%machine learning%', '%ML%', '%MLE%', '%AI engineer%', '%AI researcher%', '%deep learning%'])
          OR T1.headline ILIKE ANY (ARRAY['%machine learning%', '%ML%', '%MLE%', '%AI engineer%', '%AI researcher%', '%deep learning%'])
          OR T1.fts @@ params.tsq
        )
    )
  ORDER BY fts_rank DESC
  LIMIT 100 -- 여기서 100건만 남기고 나머지는 버립니다.
)
-- [2단계] 확정된 100건에 대해서만 상세 정보 및 JSON 집계 (Phase 2: Hydration)
SELECT
  to_json(i.id) AS id,
  c.name,
  c.headline,
  c.location,
  i.fts_rank,
  COALESCE(edu_block.edu_rows, '[]'::jsonb) AS edu_user,
  COALESCE(exp_block.experience_rows, '[]'::jsonb) AS experience_user
FROM identified_ids i
JOIN candid c ON c.id = i.id -- 기본 정보 조인
LEFT JOIN LATERAL (
  SELECT jsonb_agg(to_jsonb(e)) AS edu_rows
  FROM edu_user e
  WHERE e.candid_id = i.id
) edu_block ON TRUE
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    (to_jsonb(ex) || jsonb_build_object('company_db', jsonb_build_object(
      'name', comp.name,
      'investors', comp.investors,
      'short_description', comp.short_description
    )))
  ) AS experience_rows
  FROM experience_user ex
  LEFT JOIN company_db comp ON comp.id = ex.company_id
  WHERE ex.candid_id = i.id
) exp_block ON TRUE

ORDER BY i.fts_rank DESC, i.id 
"""

절대 로직과 의미를 바꿔서는 안돼. 규칙만 EXSISTS 문으로 변환하는게 너의 역할이야.
Do not require any other text except for the SQL Query in the output. Only the SQL Query should be returned, without code blocks or markdown.

`;

// WITH params AS (
//   SELECT to_tsquery('english', 'engineer | developer | software <-> engineer | backend | frontend') AS tsq
// ),
// filtered AS (
//   SELECT
//     T1.id,
//     T1.name,
//     T1.headline,
//     T1.summary,
//     T1.total_exp_months,
//     ts_rank(T1.fts, params.tsq) AS fts_rank
//   FROM candid AS T1
//   CROSS JOIN params
//   WHERE
//     T1.total_exp_months <= 36
//     AND EXISTS (
//       SELECT 1
//       FROM edu_user T4
//       WHERE T4.candid_id = T1.id
//         AND (
//           T4.school ILIKE ANY (
//             ARRAY[
//               '%서울대%','%서울대학교%','%Seoul National%','%SNU%',
//               '%KAIST%','%카이스트%','%Korea Advanced Institute of Science and Technology%'
//             ]
//           )
//           OR T1.summary ILIKE ANY (ARRAY['%SNU%','%KAIST%'])
//         )
//     )
//     AND EXISTS (
//       SELECT 1
//       FROM experience_user ex
//       JOIN company_db c ON c.id = ex.company_id
//       WHERE ex.candid_id = T1.id
//         AND (
//           c.name ILIKE ANY (ARRAY['%Naver%','%네이버%'])
//           OR T1.headline ILIKE ANY (ARRAY['%Naver%','%네이버%'])
//         )
//         AND (
//           ex.role ILIKE ANY (
//             ARRAY[
//               '%engineer%','%developer%','%software%','%programmer%',
//               '%backend%','%frontend%','%fullstack%','%엔지니어%','%개발자%'
//             ]
//           )
//           OR T1.headline ILIKE ANY (
//             ARRAY[
//               '%engineer%','%developer%','%software%','%programmer%',
//               '%backend%','%frontend%','%fullstack%','%엔지니어%','%개발자%'
//             ]
//           )
//           OR T1.fts @@ params.tsq
//         )
//     )
// ),
// topk AS (
//   SELECT *
//   FROM filtered
//   ORDER BY fts_rank DESC, id
//   LIMIT 100
// )
// SELECT
//   to_json(t.id) AS id,
//   t.name,
//   t.headline,
//   t.summary,
//   t.total_exp_months,
//   t.fts_rank,
//   COALESCE(edu_block.edu_rows, '[]'::jsonb)        AS edu_user,
//   COALESCE(exp_block.experience_rows, '[]'::jsonb) AS experience_user
// FROM topk t
// LEFT JOIN LATERAL (
//   SELECT jsonb_agg(to_jsonb(T4)) AS edu_rows
//   FROM edu_user T4
//   WHERE T4.candid_id = t.id
// ) edu_block ON TRUE
// LEFT JOIN LATERAL (
//   SELECT jsonb_agg(
//     (to_jsonb(ex) || jsonb_build_object('company_db', to_jsonb(c)))
//   ) AS experience_rows
//   FROM experience_user ex
//   JOIN company_db c ON c.id = ex.company_id
//   WHERE ex.candid_id = t.id
// ) exp_block ON TRUE
// ORDER BY t.fts_rank DESC, t.id
