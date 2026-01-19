import { geminiInference, xaiInference } from "@/lib/llm/llm";
import { supabase } from "@/lib/supabase";
import { ensureGroupBy } from "@/utils/textprocess";
import { NextRequest, NextResponse } from "next/server";
import { generateSummary } from "../criteria_summarize/utils";
import {
  deduplicateAndScore,
  mapWithConcurrency,
  ScoredCandidate,
  sumScore,
} from "../utils";
import { ko } from "@/lang/ko";
import { logger } from "@/utils/logger";
import { updateRunStatus } from "../utils";
import { parseQueryWithLLM } from "../parse";

export const UI_START = "<<UI>>";
export const UI_END = "<<END_UI>>";

type RunRow = {
  id: string;
  query_id: string;
  criteria?: any | null; // jsonb
  sql_query?: string | null;
  query_text?: string | null;
};

/**
 * Search the database and return scored candidates.
 * - Stores synthesized summaries in bulk.
 * - Does NOT write runs_pages here; caller decides how to chunk/cache.
 */
export const searchDatabase = async (
  query_text: string,
  criteria: string[],
  pageIdx: number,
  run: RunRow,
  sql_query: string,
  limit: number = 50,
  offset: number = 0
) => {
  await updateRunStatus(run.id, ko.loading.searching_candidates);

  const start_time = performance.now();

  let data: any[] | null = [];
  let error: any;

  const { data: data1, error: error1 } = await supabase.rpc(
    "set_timeout_and_execute_raw_sql",
    {
      sql_query,
      page_idx: pageIdx,
      limit_num: limit,
      offset_num: offset,
    }
  );

  data = data1;
  error = error1;

  logger.log("time for fetching data:", performance.now() - start_time, error);

  // Retry once on timeout
  if (error && String(error.message || "").includes("timeout")) {
    await updateRunStatus(run.id, ko.loading.searching_again);

    const { data: data2, error: error2 } = await supabase.rpc(
      "set_timeout_and_execute_raw_sql",
      {
        sql_query,
        page_idx: pageIdx,
        limit_num: limit,
        offset_num: offset,
      }
    );

    data = data2;
    error = error2;
  }

  // Fix query on error (timeout or syntax)
  if (error) {
    logger.log("First sql query error => try fix:", error);

    await updateRunStatus(run.id, ko.loading.retrying_error);

    let additional_prompt = "";
    if (String(error.message || "").includes("timeout")) {
      additional_prompt = `
If the error indicates a timeout, treat it as a performance-fix task rather than a syntax-fix task.

TIMEOUT rules:
- Preserve meaning/rows as much as possible; restructure only for speed.
- Prefer two-phase approach: select only T1.id with restrictive filters + LIMIT, then join to fetch final columns.
- Do NOT add new tables/filters or change ranking semantics.
- Replace JOIN-based filtering with EXISTS when joins are only for filtering.
- Push down WHERE filters into phase-1 id CTE.
- Output MUST be a single valid SQL statement only.
`;
    }

    const fixed_query = await xaiInference(
      "grok-4-fast-reasoning",
      "You are a specialized SQL query fixing assistant. Fix errors and return a single SQL statement only.",
      `You are an expert PostgreSQL SQL fixer for a recruitment candidate search system.

Rules:
- Fix ONLY what is necessary.
- Preserve original intent/meaning.
- Do NOT add new tables/filters unless required to fix the error.
- Keep tsvector logic in place.
- Output MUST be a single valid SQL statement only. No explanations.

${additional_prompt}

[SQL]
${sql_query}

[ERROR]
${error.message}
`,
      0.2,
      1
    );

    const sqlQueryWithGroupBy2 = ensureGroupBy(fixed_query as string, "");

    // Save fixed SQL to the run (optional)
    await supabase
      .from("runs")
      .update({ sql_query: fixed_query as string })
      .eq("id", run.id);

    const { data: data2, error: error2 } = await supabase.rpc(
      "set_timeout_and_execute_raw_sql",
      {
        sql_query: sqlQueryWithGroupBy2,
        page_idx: pageIdx,
        limit_num: limit,
        offset_num: offset,
      }
    );

    data = data2;
    error = error2;
  }

  if (error) {
    await updateRunStatus(
      run.id,
      `Error: ${String(error.message || error)}` || "Error"
    );
    return [];
  }

  if (!data || !data[0] || data[0].length === 0) {
    await updateRunStatus(run.id, "No data found");
    return [];
  }

  await updateRunStatus(run.id, ko.loading.summarizing);

  const fullScore = criteria.length * 2;

  const scored: (ScoredCandidate & { summary: string })[] =
    await mapWithConcurrency(data[0] as any[], 17, async (candidate) => {
      const id = candidate.id as string;

      let summary = "";
      let lines: string[] = [];
      try {
        summary = (await generateSummary(
          candidate,
          criteria,
          query_text
        )) as string;
        lines = JSON.parse(summary);
      } catch {
        summary = "";
        lines = [];
      }

      const score = sumScore(lines);

      return {
        id,
        score:
          fullScore !== 0 ? Math.round((score / fullScore) * 100) / 100 : 1,
        summary,
      };
    });

  logger.log("💠 전체 스코어링 완료: ", scored);
  // Bulk upsert synthesized summaries
  // Prefer run_id if the column exists; fallback to query_id if not.
  const upsertData = scored
    .filter((s) => s.summary != null)
    .map((s) => ({
      candid_id: s.id,
      run_id: run.id, // <-- recommended column\
      text: s.summary,
    }));

  if (upsertData.length > 0) {
    // If your synthesized_summary table does NOT have run_id yet,
    // remove run_id from upsertData above and keep only query_id.
    const { error: upErr } = await supabase
      .from("synthesized_summary")
      .upsert(upsertData as any);
    if (upErr) logger.log("Batch upsert synthesized_summary error:", upErr);
  }

  // Sort by score desc (stable-ish by id)
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  await updateRunStatus(run.id, "Done");

  return scored;
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
