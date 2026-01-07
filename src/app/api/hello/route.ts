// src/app/api/hello/route.ts
import { xaiInference } from "@/lib/llm/llm";
import { NextRequest, NextResponse } from "next/server";

export const makeMessage = async (inputText: string, criteria: string) => {
  const prompt = `
Input text: ${inputText}
Criteria: ${criteria}

현재 위 조건으로 유저가 입력을 했고, 이걸 기반으로 우리 데이터베이스 안에서 SQL 문을 만들어서 사람을 서치 했더니 아무도 나오지 않았어. 이때 결과가 나오지 않았다는 안내와 함께 어떻게 다르게 검색을 해볼 수 있는지 안내해주려고 해.
안내문과 추천하는 input 2개를 각각 담아서 json으로 출력해줘.
검색을 잘못한 유저를 탓하면 안돼.
`;
  // "message": "지금 결과도 출발점으로는 괜찮은데, 수가 좀 적어요. 더 깊게 찾아볼까요?",
  const response = await xaiInference(
    "grok-4-fast-reasoning",
    "You are a helpful assistant",
    prompt
  );
  try {
    const outJson = JSON.parse(response);
    return outJson;
  } catch (error) {
    return null;
  }
};

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: "GET 요청 성공!", response: "hello" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ message: "POST 요청 성공!", data: body });
}
