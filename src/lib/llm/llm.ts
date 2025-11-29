import { OpenAI } from "openai";
export type GPTStreamChunkHandler = (chunk: string) => void;

export enum OpenAIResponse {
  DELTA = "response.output_text.delta",
  DONE = "response.content_part.done",
}

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const client = new OpenAI({
  apiKey: "",
  dangerouslyAllowBrowser: true,
});

export type OnToken = (token: string) => void;

const inference = async (
  model: "gpt-4.1-nano" | "gpt-4.1-mini",
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  const response = await client.chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  console.log("response ", response.usage);

  const content = response.choices[0]?.message?.content;
  return content ?? "";
};

export const makeQuestion = async (
  conversationHistory: string,
  userInfo: string,
  resumeText: string
): Promise<string> => {
  const userPrompt = `
아래는 지금까지의 통화 기록, 지원자 정보, 그리고 지원자의 이력서 전문입니다.  
이 세 가지를 종합해서, 다음 턴에 Harper(당신)가 지원자에게 물어볼 “가장 자연스럽고 적절한 한 문장 질문”을 만들어 주세요.

- 반드시 한국어로 말하세요.
- 너무 길거나 복잡하지 않게 자연스러운 면접 질문으로 만들어주세요.
- 한 번에 질문 하나만 출력합니다.
- 지원자의 관심 분야, 경력, 목표 등에 가장 맞는 질문을 선택하세요.
- 이전 질문과 중복되거나 너무 비슷한 내용은 피하세요.

----
[대화 기록]
${conversationHistory}

[지원자 정보]
${userInfo}
----

---
[예시 질문과 순서. 가능하면 이런 흐름으로 진행해주세요.]
1. 현재 next step에 대해서 어떻게 생각하고 계시나요?
2. 현재 회사에서 하고 계신 역할을 소개해주세요.
3. 다음 기회에 선호하는 역할이나 선호하는 팀이 있으신가요?
4, 5. 이력서에 기반해서 면접 본다고 생각하고 꼭 해야하는 질문 2개만 하기.
---

위 내용을 참고하여, Harper가 이어서 물을 다음 질문 한 문장을 출력하세요. 혹은 직전 User의 답변에 맞는 말을 하세요. 대신 마지막은 질문으로 끝나야 합니다.
원하는 답변이 아니거나 너무 짧게 말하면 한번 더 디테일하게 질문해봐.
유저의 답변을 짧게 re-phrase하고 다음 질문해도 돼.
발화 내용만 출력하세요. 

Recruiter call은 총 4단계로 진행됩니다. [Context/Preference 파악, 이력/역량 질문, Constraints, Ending]
`;
  console.log("userPrompt", userPrompt);

  return await inference(
    "gpt-4.1-mini",
    "You are a helpful assistant. Your name is Harper, voice-based AI recruiter for user. Use korean language. But it's okay to use english words if it is specific terms.",
    userPrompt
  );
};

export const callGreeting = async (
  userInfo: string,
  resumeText: string
): Promise<string> => {
  // return await inference(
  //   "gpt-4.1-nano",
  //   "You are a helpful assistant. Your name is Harper, voice-based AI recruiter for user. Use only korean language.",
  //   "지금 유저가 새롭게 통화세 참여했어."
  // );
  // return "하퍼입니다. 저희는 모든 지원자 분들을 한분한분 정성스럽게 관리합니다. 이제 짧게 통화가 시작될 예정인데, 가능하면 조용한 곳에서 진행해 주세요. 오디오나 마이크는 괜찮으신가요?";
  return "하퍼입니다. 오디오나 마이크는 괜찮으신가요?";
};

// 한 번 호출해서 문자열로 답만 받아오는 헬퍼
export async function askGpt(resumeText: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4.1-nano",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: `
Read below resume and extract the following information:
- Name
- Email
- Phone
- Links
- Summary

Return json format with the following keys:
- name
- email
- phone
- links
- summary

if there is no information, return empty string for the key.

Example:
{
  "name": "John Doe",
  "email": "",
  "phone": "123-456-7890",
  "links": ["https://github.com/john-doe", "https://linkedin.com/in/john-doe"],
  "summary": "John Doe is a software engineer with 10 years of experience in the industry."
}

Resume:
${resumeText}

`,
      },
    ],
  });

  console.log("response ", response.usage);

  const content = response.choices[0]?.message?.content;
  return content ?? "";
}
