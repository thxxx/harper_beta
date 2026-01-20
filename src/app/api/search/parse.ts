import { logger } from "@/utils/logger";
import { geminiInference, xaiInference } from "@/lib/llm/llm";
import { ensureGroupBy } from "@/utils/textprocess";
import { sqlExistsPrompt, sqlPrompt2, timeoutHandlePrompt } from "@/lib/prompt";
import { supabase } from "@/lib/supabase";
import { updateRunStatus } from "./utils";
import { ScoredCandidate } from "./utils";
import { mapWithConcurrency } from "./utils";
import { generateSummary } from "./criteria_summarize/utils";
import { sumScore } from "./utils";
import { ko } from "@/lang/ko";
import { ThinkingLevel } from "@google/genai";

export async function parseQueryWithLLM(
  queryText: string,
  criteria: string[],
  extraInfo: string = ""
): Promise<string | any> {
  logger.log("🔥 시작 parseQueryWithLLM: ", queryText, criteria, extraInfo);

  try {
    let prompt = `
  ${sqlPrompt2}
  Natural Language Query: ${queryText}
  Criteria: ${criteria}
  `.trim();

    if (extraInfo) prompt += `Extra Info: ${extraInfo}`;

    const start1 = performance.now();
    let outText = "";
    let count = 0;
    while (outText.trim().length === 0 && count < 2) {
      if (count > 1) {
        const end = performance.now();
        logger.log(`\n\n 🍊 재시도 합니다 재시도!! [${end - start1}ms] \n\n`);
      }
      outText = (await geminiInference(
        "gemini-3-flash-preview",
        "You are a head hunting expertand SQL Query parser. Your input is a natural-language request describing criteria for searching job candidates.",
        prompt,
        0.6,
        ThinkingLevel.MEDIUM
      )) as string;
      count += 1;
    }
    const end1 = performance.now();
    const cleanText = (outText as string).trim().replace(/\n/g, " ").trim();
    logger.log(`🔥 First query [${end1 - start1}ms] : `, cleanText);

    const sqlQuery = `
  SELECT DISTINCT ON (T1.id)
    to_json(T1.id) AS id,
    T1.name,
    T1.headline,
    T1.location
  FROM 
    candid AS T1
  ${cleanText}
  `;
    const sqlQueryWithGroupBy = ensureGroupBy(sqlQuery, "");

    const refinePrompt =
      sqlExistsPrompt + `\n Input SQL Query: """${sqlQueryWithGroupBy}"""`;

    const start = performance.now();
    let outText2 = "";
    count = 0;
    while (outText2.trim().length === 0 && count < 2) {
      if (count > 1) {
        const end = performance.now();
        logger.log(`\n\n 🍊 재시도 합니다 재시도!! [${end - start}ms] \n\n`);
      }
      outText2 = (await geminiInference(
        "gemini-3-flash-preview",
        "You are a SQL Query refinement expert, for stable and fast search.",
        refinePrompt,
        0.7,
        ThinkingLevel.THINKING_LEVEL_UNSPECIFIED
      )) as string;
      count += 1;
    }
    const end = performance.now();
    const cleanedResponse2 = (outText2 as string)
      .trim()
      .replace(/\n/g, " ")
      .trim();
    const sqlQueryWithGroupBy2 = ensureGroupBy(cleanedResponse2, "");
    logger.log(`🥬 Second query [${end - start}ms] : `, sqlQueryWithGroupBy2);

    return sqlQueryWithGroupBy2;
  } catch (e) {
    logger.log("parseQueryWithLLM error", e);
    return e;
  }
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
      additional_prompt = timeoutHandlePrompt;
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
    return {
      data: [],
      status: `검색 도중 에러가 발생했습니다. Error message : ${String(
        error.message || error
      )}`,
    };
  }

  if (!data || !data[0] || data[0].length === 0) {
    await updateRunStatus(run.id, "No data found");
    return {
      data: [],
      status: "no data found",
    };
  }

  await updateRunStatus(run.id, ko.loading.summarizing);

  const fullScore = criteria.length * 2;

  const scored: (ScoredCandidate & { summary: string })[] =
    await mapWithConcurrency(
      data[0].slice(0, 50) as any[],
      17,
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

  return {
    data: scored,
    status: "search done.",
  };
};
