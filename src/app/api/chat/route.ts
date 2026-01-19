import { NextRequest, NextResponse } from "next/server";
import { xaiClient } from "@/lib/llm/llm";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `
너는 채용 담당자를 돕는 AI 어시스턴트 Harper야.
너의 목표는 "사람 검색"을 위한 criteria(검색 기준)를 충분히 명확히 만드는 것이다.

내부 데이터베이스가 있으며, 유저와의 대화를 통해 얻어낸 정보를 바탕으로 어떤 기준으로 사람을 찾을지 정의하는 것이 네 역할이야. 

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

###
응답 규칙(매우 중요):
1) 유저에게 보여줄 일반 답변 텍스트를 먼저 작성한다. (자연스러운 한국어)
2) 네가 "지금 검색을 실행해도 된다"고 판단하면, 마지막 줄에 아래 형식으로 UI 블록을 정확히 1번만 출력한다.
- 절대 UI 블록을 여러 번 출력하지 말 것
- JSON은 한 줄로(줄바꿈 없이) 출력할 것
- Format: <<UI>>{"type":"criteria_card","thinking":"...","criteria":["...","..."]}<<END_UI>>
3) 아직 정보가 부족하면 질문만 하고 UI 블록은 출력하지 않는다.
4) thinking은 유저에게서 받은 정보를 이용해 어떤 사람을 찾을지를 re-paraphrase한다. 관련없는 정보를 추가하거나, 중요한 정보를 빼놓지 말고.

예시: 유저가 "y combinator 투자한 회사 대표, 한국인"이라고 했을 때,
{
  "thinking": "Y combinator가 투자한 회사의 founder이자 한국인을 찾습니다.",
  "criteria": ["Y combinator 투자한 회사의 founder인가", "한국인인가"]
}
`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = (await req.json()) as {
    model?: string;
    messages?: ChatMessage[];
  };

  const model = "grok-4-fast-non-reasoning";

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  // 이건 임의의 함수입니다.
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  if (lastUser.includes("조건")) {
    const shouldShowUI =
      lastUser.includes("검색") ||
      lastUser.includes("찾아") ||
      lastUser.includes("실행");

    const TEXT_ONLY = `좋아요. 검색 기준을 만들기 위해 몇 가지만 더 알려주세요. 어떤 직무인지, 경력, 지역, 필수 스킬이 있으면 좋아요.`;
    const TEXT_WITH_UI = `좋아요. ㄱㄱ`;
    const UI_BLOCK = `<<UI>>{"type":"criteria_card","thinking":"기본적인 검색 조건이 명확합니다.","criteria":["AI/ML 관련 경력","한국 근무 가능","스타트업 경험 선호"],"ready":true}<<END_UI>>`;

    const fullText = shouldShowUI
      ? TEXT_WITH_UI + "\n" + UI_BLOCK + "\n 이거면 되겠죠?"
      : TEXT_ONLY;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // 👉 스트리밍 흉내 (글자 단위로 쪼갬)
        for (const ch of fullText) {
          controller.enqueue(encoder.encode(ch));
          await sleep(20); // 너무 느리면 5~10ms로 줄여도 됨
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
    //
  }

  console.log("LLM이 호출됩니다. ");
  const stream = await xaiClient.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
    temperature: 0.7,
    stream: true,
  });

  const encoder = new TextEncoder();
  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
