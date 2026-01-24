import { logger } from "@/utils/logger";
import { geminiInference, xaiInference } from "@/lib/llm/llm";
import { ensureGroupBy, sqlRefine } from "@/utils/textprocess";
import { expandingSearchPrompt, sqlExistsPrompt, firstSqlPrompt, timeoutHandlePrompt, tsvectorPrompt2 } from "@/lib/prompt";
import { supabase } from "@/lib/supabase";
import { deduplicateCandidates, updateQuery, updateRunStatus } from "./utils";
import { ScoredCandidate } from "./utils";
import { mapWithConcurrency } from "./utils";
import { generateSummary } from "./criteria_summarize/utils";
import { sumScore } from "./utils";
import { ko } from "@/lang/ko";
import { ThinkingLevel } from "@google/genai";
import { rpc_set_timeout_and_execute_raw_sql_via_runs } from "./worker";

export async function makeSqlQuery(
  queryText: string,
  criteria: string[],
  extraInfo: string = ""
): Promise<string | any> {
  logger.log("🔥 시작 makeSqlQuery: ", queryText, criteria, extraInfo);

  try {
    let prompt = `
  ${firstSqlPrompt}
  Natural Language Query: ${queryText}
  Criteria: ${criteria}
  `.trim();

    if (extraInfo) prompt += `Extra Info: ${extraInfo}`;

    const start1 = performance.now();
    let outText = (await geminiInference(
      "gemini-3-flash-preview",
      "You are a head hunting expertand SQL Query parser. Your input is a natural-language request describing criteria for searching job candidates.",
      prompt,
      0.4,
      ThinkingLevel.LOW
    )) as string;
    outText = sqlRefine(outText);
    logger.log(`🔥 First query [${performance.now() - start1}ms] : `, outText);

    const sqlQuery = `
SELECT DISTINCT ON (T1.id)
  to_json(T1.id) AS id,
  T1.name,
  T1.headline,
  T1.location
FROM 
  candid AS T1
${outText}
`;
    const sqlQueryWithGroupBy = ensureGroupBy(sqlQuery, "");

    const refinePrompt =
      sqlExistsPrompt + `\n Input SQL Query: """${sqlQueryWithGroupBy}"""`;

    const start = performance.now();
    const outText2 = (await geminiInference(
      "gemini-3-flash-preview",
      "You are a SQL Query refinement expert, for stable and fast search.",
      refinePrompt,
      0.4,
      ThinkingLevel.LOW
    )) as string;

    const final = sqlRefine(outText2, true);
    logger.log(`🥬 Final query [${performance.now() - start}ms] : `, final, "\n");

    return final;
  } catch (e) {
    logger.log("makeSqlQuery error", e);
    throw e;
  }
}

export const reranking = async ({ candidates, criteria, query_text, review_count_num, runId }: { candidates: any[], criteria: string[], query_text: string, review_count_num: number, runId: string }) => {
  const fullScore = criteria.length * 2;

  const scored: (ScoredCandidate & { summary: string })[] =
    await mapWithConcurrency(
      candidates.slice(0, review_count_num) as any[],
      20,
      async (candidate) => {
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
      }
    );

  logger.log("💠 전체 스코어링 완료: ", scored.length);
  // Bulk upsert synthesized summaries
  // Prefer run_id if the column exists; fallback to query_id if not.
  const upsertData = scored
    .filter((s) => s.summary != null)
    .map((s) => ({
      candid_id: s.id,
      run_id: runId,
      text: s.summary,
    }));

  if (upsertData.length > 0) {
    const { error: upErr } = await supabase
      .from("synthesized_summary")
      .upsert(upsertData as any);
    if (upErr) logger.log("Batch upsert synthesized_summary error:", upErr);
  }

  // Sort by score desc (stable-ish by id)
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  return scored;
}

export type RunRow = {
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
export const searchDatabase = async ({
  query_text,
  criteria,
  pageIdx,
  run,
  sql_query,
  limit = 50,
  offset = 0,
  review_count = 50
}: {
  query_text: string;
  criteria: string[];
  pageIdx: number;
  run: RunRow;
  sql_query: string;
  limit?: number;
  offset?: number;
  review_count?: number;
}) => {
  await updateRunStatus(run.id, ko.loading.searching_candidates);
  let limit_num = limit;
  let review_count_num = review_count;

  const start_time = performance.now();

  let data: any[] | null = [];
  let error: any;

  const { data: data1, error: error1 } = await rpc_set_timeout_and_execute_raw_sql_via_runs({
    runId: run.id,
    queryId: run.query_id,
    sql_query,
    page_idx: pageIdx,
    limit_num: limit_num,
    offset_num: offset,
  });

  data = data1;
  error = error1;

  logger.log("time for fetching data:", performance.now() - start_time, "\nFirst query results : ", data, error);

  let candidates = data?.[0] ?? [];

  // Fix query on error (timeout or syntax)
  if (error || candidates.length < 10) {
    logger.log("First sql query error [error || candidates.length < 10] => ", error, data?.[0]?.length);
    // case 1) timeout
    // case 2) 너무 좁게 검색해서 결과가 잡히지 않음.
    let additional_prompt = "";
    if (error && String(error.message || "").includes("timeout"))
      additional_prompt = timeoutHandlePrompt;

    if (candidates.length < 10)
      additional_prompt = expandingSearchPrompt;

    if (error)
      additional_prompt += `\n\n [ERROR]\n ${error.message}\n`;

    if (error)
      await updateRunStatus(run.id, ko.loading.retrying_error)

    if (!error && candidates.length < 10)
      await updateRunStatus(run.id, `${candidates.length}명의 후보자를 찾았습니다. 더 많은 후보자를 찾기 위해 검색 조건을 확장하겠습니다. ` + ko.loading.expanding_search);

    const fixed_query = await geminiInference(
      "gemini-3-flash-preview",
      "You are a specialized SQL query fixing assistant. Fix errors and return a single SQL statement only.",
      `You are an expert PostgreSQL SQL fixer for a recruitment candidate search system.
${additional_prompt}

[Input for search from user]
criteria: ${criteria}
input text for searching: ${query_text}

[Original SQL]
${sql_query}
`,
      0.5,
      ThinkingLevel.LOW
    );
    const sqlQueryWithGroupBy2 = ensureGroupBy(fixed_query as string, "");
    await updateQuery({ sql: sqlQueryWithGroupBy2 as string, runId: run.id });

    const { data: data2, error: error2 } = await rpc_set_timeout_and_execute_raw_sql_via_runs({
      runId: run.id,
      queryId: run.query_id,
      sql_query: sqlQueryWithGroupBy2 as string,
      page_idx: pageIdx,
      limit_num: limit_num,
      offset_num: offset,
    });

    data = data2;
    if (data && data[0]) {
      candidates = deduplicateCandidates([...candidates, ...data[0]]);
    }
    error = error2;
    logger.log(" 🔥 Second sql query error => try fix:", sqlQueryWithGroupBy2);
  }


  // 🍭 🍭 2차 시도 실패 시: Harper 최후의 보루 모드
  if (candidates.length < 5 || error) {
    logger.log("🚨 [Harper Search] Falling back to Broad Keyword Mode due to low results/error.", error, data?.[0]?.length, "\n\n");

    // 유저에게 상황을 친절하게 알림
    if (!error) {
      await updateRunStatus(
        run.id,
        candidates.length + "명의 후보자를 찾았습니다. 더 많은 후보자를 찾기 위해 광범위 검색으로 전환합니다..."
      );
    } else
      await updateRunStatus(
        run.id,
        "검색 조건을 확장하여 더 많은 후보자를 찾기 위해 광범위 검색으로 전환합니다..."
      );

    let fallback_sql = '';

    fallback_sql = await xaiInference(
      "grok-4-fast-reasoning",
      "You are a recruitment search expert for 'Harper'. Your goal is to maximize candidate recall using broad FTS keywords.",
      tsvectorPrompt2 + `
[Input for search from user]
criteria: ${criteria}
input text for searching: ${query_text}

`,
      0.5, // 유의어 확장을 위해 온도를 약간 올림
      1, false, "tsvectorPrompt2"
    )

    const out = JSON.parse(fallback_sql);
    const finalQuery = sqlRefine(out.sql as string, false);
    logger.log(" 🦕 Third sql query : ", finalQuery, "\n\n");

    const final = `
WITH identified_ids AS (
${finalQuery}
)
SELECT
  to_json(c.id) AS id,
  c.name,
  i.fts_rank_cd
FROM identified_ids i
JOIN candid c ON c.id = i.id
ORDER BY i.fts_rank_cd DESC`;
    await updateQuery({ sql: final as string, runId: run.id });

    limit_num = limit + 50;
    review_count_num = review_count_num + 50;

    const { data: finalData, error: finalError } = await rpc_set_timeout_and_execute_raw_sql_via_runs({
      runId: run.id,
      queryId: run.query_id,
      sql_query: final,
      page_idx: pageIdx,
      limit_num: limit_num,
      offset_num: offset,
    });

    data = finalData;
    if (data && data[0])
      candidates = deduplicateCandidates([...candidates, ...data[0]]);
    error = finalError;

    if (data && data[0]) {
      logger.log(`✅ [Harper Search] Fallback successful. Found ${data[0].length} potential candidates.`);
    }
  }

  if (error) {
    throw error;
  }

  if (candidates.length === 0) {
    await updateRunStatus(run.id, "done");
    return {
      data: [],
      status: "no data found",
    };
  }

  await updateRunStatus(run.id, candidates.length + "명의 " + ko.loading.summarizing);

  const scored = await reranking({ candidates, criteria, query_text, review_count_num, runId: run.id });

  await updateRunStatus(run.id, "done");

  return {
    data: scored,
    status: "search done.",
  };
};
