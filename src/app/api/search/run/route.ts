import { geminiInference, xaiInference } from "@/lib/llm/llm";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { deduplicateAndScore, UI_END, UI_START } from "../utils";
import { ko } from "@/lang/ko";
import { logger } from "@/utils/logger";
import { updateRunStatus } from "../utils";
import { parseQueryWithLLM } from "../parse";
import { searchDatabase } from "../parse";

type RunRow = {
  id: string;
  query_id: string;
  criteria?: any | null; // jsonb
  sql_query?: string | null;
  query_text?: string | null;
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { queryId, runId, pageIdx, userId } = body as {
    queryId?: string;
    runId?: string;
    pageIdx?: number;
    userId?: string;
  };
  logger.log("\n우선 여기서 호출 : ", body, "\n\n");

  if (!queryId || !runId) {
    return NextResponse.json(
      { error: "Missing queryId/runId" },
      { status: 400 }
    );
  }

  const page = Number.isFinite(pageIdx) ? (pageIdx as number) : 0;
  const nextPageIdx = page + 1;

  // 1) Check cached page in runs_pages
  const { data: cachedPages, error: cpErr } = await supabase
    .from("runs_pages")
    .select("*")
    .eq("run_id", runId)
    .eq("page_idx", page)
    .order("created_at", { ascending: false });

  if (cpErr) {
    logger.log("runs_pages load error:", cpErr);
  }

  const cached = cachedPages?.[0];
  if (cached && cached.candidate_ids) {
    const candidateIds = cached.candidate_ids
      .slice(0, 10)
      .map((r: any) => r.id);
    return NextResponse.json(
      { nextPageIdx, results: candidateIds },
      { status: 200 }
    );
  }

  // 2) If no cached results and page > 0, check previous page to decide if we can "slice" without new search
  let offset = 0;
  let cachedCandidates: any[] = [];

  if (page > 0) {
    const { data: prevPages } = await supabase
      .from("runs_pages")
      .select("*")
      .eq("run_id", runId)
      .eq("page_idx", page - 1)
      .order("created_at", { ascending: false });

    const prev = prevPages?.[0];

    if (!prev || !prev.candidate_ids || prev.candidate_ids.length === 0) {
      return NextResponse.json({ nextPageIdx, results: [] }, { status: 200 });
    }

    const isLoadMore = (prev.candidate_ids.length + page * 10) % 50 === 0;

    if (!isLoadMore) {
      // Just slice next 10 from prev cached candidates
      const rest = prev.candidate_ids.slice(10);

      await supabase.from("runs_pages").insert({
        run_id: runId,
        page_idx: page,
        candidate_ids: rest,
      });

      return NextResponse.json(
        { nextPageIdx, results: rest.slice(0, 10).map((r: any) => r.id) },
        { status: 200 }
      );
    } else {
      // It's a 50 boundary - decide if we can still slice or need new search
      const rest = prev.candidate_ids.slice(10);
      const scoreSum = rest
        .slice(0, 10)
        .reduce((acc: number, curr: any) => acc + curr.score, 0);

      if (scoreSum >= 10) {
        await supabase.from("runs_pages").insert({
          run_id: runId,
          page_idx: page,
          candidate_ids: rest,
        });

        return NextResponse.json(
          { nextPageIdx, results: rest.slice(0, 10).map((r: any) => r.id) },
          { status: 200 }
        );
      } else {
        offset = 50;
        cachedCandidates = rest;
      }
    }
  }

  // 3) Load run (source of truth for raw_input_text / criteria / sql_query)
  const { data: run, error: rErr } = await supabase
    .from("runs")
    .select("id, query_id, query_text, criteria, sql_query")
    .eq("id", runId)
    .eq("query_id", queryId)
    .single();

  if (rErr || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  let query_text = run.query_text ?? "";
  // 5) Ensure criteria/sql_query exist on the run (create if missing)
  let criteria: string[] = Array.isArray(run.criteria)
    ? (run.criteria as any)
    : [];
  let sql_query: string | null = run.sql_query ?? null;

  // If criteria is stored as object {criteria:[],...} in jsonb, normalize here
  // Example: run.criteria = { criteria: [...], thinking: "...", rephrasing: "..." }
  if (!criteria.length && run.criteria && typeof run.criteria === "object") {
    const maybe = (run.criteria as any)?.criteria;
    if (Array.isArray(maybe)) criteria = maybe;
  }

  if (!sql_query) {
    await updateRunStatus(run.id, ko.loading.making_query);

    const parsedQuery = await parseQueryWithLLM(query_text, criteria, "");
    if (typeof parsedQuery !== "string") {
      await updateRunStatus(run.id, JSON.stringify(parsedQuery));
      return NextResponse.json(parsedQuery, { status: 404 });
    }

    sql_query = parsedQuery;
    await supabase
      .from("runs")
      .update({
        sql_query: sql_query,
      })
      .eq("id", run.id);
  }

  // 6) Run search
  const searchResults = await searchDatabase(
    query_text,
    criteria,
    page,
    run as RunRow,
    sql_query,
    50,
    offset
  );

  const oneScoreCount = searchResults.filter((r: any) => r.score === 1).length;
  const merged = deduplicateAndScore(searchResults, cachedCandidates);

  const defaultMsg = `전체 후보자들 중 ${searchResults.length}명을 선정하고, 기준을 만족하는지 검사했습니다. ${oneScoreCount}명이 모든 기준을 만족했습니다.
${UI_START}{"type": "search_result", "text": "검색 결과", "run_id": "${runId}"}${UI_END}`;

  const msg = await xaiInference(
    "grok-4-fast-reasoning",
    "You are a helpful assistant.",
    `찾으려는 사람은 ${run.query_text}입니다.
  지금 1) 검색 조건에 걸린 사람은 ${merged.length}명, 기준은 ${criteria?.join(
      ", "
    )}인데 각 사람의 정보를 읽어보았을 때, 2) 모든 기준을 만족하는 사람은 ${oneScoreCount}명입니다.
  1) 검색 조건은 검색에 맞는 SQL 쿼리를 LLM이 생성한 뒤 DB에 사용했을 때 출력된 결과로, 최대 50명으로 제한했습니다. 2) 모든 기준을 만족하는 사람은 각 사람별로 디테일한 정보를 가져온 후, 직접 assistant가 읽어보고 판단한 결과입니다.
  이 때, 유저에게 출력할 안내메세지를 짧게 작성하세요.

  정보: SQL 쿼리는 LLM이 작성하기 때문에 해당 부분에서 오류가 발생했을 수도 있다. limit을 50으로 걸었기 때문에 검색 조건에 걸린게 50명이라는 뜻은, 실제로 DB에는 해당 쿼리를 만족하는게 50명 이상이라는 뜻이다. 
위 정보를 항상 유저에게 말하라는건 아니고, 혹시 필요하면 참고해도 됨.
아래 기본 출력 메세지는 항상 유저에게 리턴되는 값으로, 이 뒤에 추가로 출력할 내용만 작성하세요. 절대 기본 출력 메세지를 반복하지 마세요.

기본 출력 메세지: ${defaultMsg}`,
    0.7,
    1
  );
  logger.log("msg ======================== ", msg);

  const res1 = await supabase.from("messages").insert({
    query_id: queryId,
    user_id: userId,
    role: 1,
    content: defaultMsg + "\n" + msg,
  });
  logger.log("res1 ", res1);

  // 7) Cache candidates for this page into runs_pages
  const candidatesForCache = merged.map((r: any) => ({
    score: r.score,
    id: r.id,
  }));

  const { error: insErr } = await supabase.from("runs_pages").insert({
    run_id: runId,
    page_idx: page,
    candidate_ids: candidatesForCache,
  });

  if (insErr) logger.log("runs_pages insert error:", insErr);

  const candidateIds = candidatesForCache.slice(0, 10).map((r: any) => r.id);

  if (
    page === 0 &&
    (candidateIds.length === 0 ||
      candidateIds.length < 10 ||
      candidateIds.length >= 50 ||
      oneScoreCount <= 5)
  ) {
    // const message = await makeMessage(
    //   query_text,
    //   criteria?.join(", ") ?? "",
    //   candidateIds.length === 0
    //     ? "no"
    //     : candidateIds.length < 10
    //     ? "less"
    //     : "more"
    // );
  }

  // 9) Slack notify if nothing found on first page
  // if (page === 0 && candidateIds.length === 0) {
  //   await notifyToSlack(
  //     `🔍 *Search Result Not Found! 검색 결과가 없어요!*\n\n` +
  //       `• *Query*: ${query_text}\n` +
  //       `• *Criteria*: ${criteria?.join(", ")}\n` +
  //       `• *Run ID*: ${runId}\n` +
  //       `• *Time(Standard Korea Time)*: ${new Date().toLocaleString("ko-KR")}`
  //   );
  // }

  return NextResponse.json(
    { nextPageIdx, results: candidateIds, isNewSearch: true },
    { status: 200 }
  );
}
