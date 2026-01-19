/**
 * 1) "<lhs> ILIKE '<...|...|...>'" 형태에서 따옴표 내부를 "|"로 분리해
 *    "(lhs ILIKE '%a%' OR lhs ILIKE '%b%' ...)" 로 확장
 *    - 각 토큰은 %로 감싸져있지 않으면 자동으로 %...%로 보정
 *
 * 2) 첫 번째 to_tsquery('english', '<QUERY>') 를 찾아
 *    마지막에 다음을 붙임:
 *      ORDER BY ts_rank(fts, to_tsquery('english', '<QUERY>')) DESC
 *
 * NOTE:
 * - 입력 SQL이 완전한 파서가 아니라 "문자열 기반 변환"입니다.
 * - ILIKE 문자열 리터럴 안에 ' 가 들어가거나(escape), 아주 복잡한 경우는 추가 보강 필요할 수 있어요.
 */

import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

function ensurePercentLike(token: string): string {
  let t = token.trim();
  if (!t.startsWith("%")) t = "%" + t;
  if (!t.endsWith("%")) t = t + "%";
  return t;
}

function expandIlikePipes(sql: string): string {
  // Matches: <lhs> ILIKE '<literal>'
  // lhs: e.g. p.published_at, ex.role, T1.bio ...
  // literal: any chars except single quote
  const ilikeLiteralRe = /([A-Za-z_][\w.]*)\s+ILIKE\s+'([^']*)'/gi;

  return sql.replace(ilikeLiteralRe, (full, lhs: string, lit: string) => {
    if (!lit.includes("|")) return full;

    const parts = lit
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length === 0) return full;

    const ors = parts
      .map((p) => `${lhs} ILIKE '${ensurePercentLike(p)}'`)
      .join(" OR ");

    return `(${ors})`;
  });
}

function extractFirstTsQuery(sql: string): string | null {
  // Find first: to_tsquery('english', '<QUERY>')
  const toTsqueryRe = /to_tsquery\(\s*'english'\s*,\s*'([^']*)'\s*\)/i;

  const m = sql.match(toTsqueryRe);
  return m ? m[1] : null;
}

function appendOrderBy(sql: string, tsQuery: string): string {
  const orderBy = `\nORDER BY T1.id, ts_rank(fts, to_tsquery('english', '${tsQuery}')) DESC`;

  const trimmed = sql.trimEnd();
  if (trimmed.endsWith(";")) {
    return trimmed.slice(0, -1).trimEnd() + orderBy + ";\n";
  }
  return trimmed + orderBy + "\n";
}

export function transformSql(sql: string): string {
  // 1) expand ILIKE pipes
  let out = expandIlikePipes(sql);

  // 2) append ORDER BY based on the first to_tsquery
  const tsQuery = extractFirstTsQuery(out);
  if (!tsQuery) return out;

  out = appendOrderBy(out, tsQuery);
  return out;
}

export type ScoredCandidate = { id: string; score: number };

export function scoreFromLabel(line: string): number {
  const s = (line ?? "").trim();
  if (s.startsWith("만족")) return 2;
  if (s.startsWith("모호")) return 1;
  // "불만족" 또는 그 외
  return 0;
}

export function sumScore(lines: string[]): number {
  if (!Array.isArray(lines)) return 0;
  let total = 0;
  for (const line of lines) total += scoreFromLabel(line);
  return Math.max(Math.min(total, 10), 0);
}

/**
 * Runs async mapper with concurrency limit.
 * Returns results in the same order as input.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/**
 * 중복된 결과를 제거하고, 점수를 높은 순서대로 정렬하는 함수
 */
export function deduplicateAndScore(
  results1: ScoredCandidate[],
  results2: ScoredCandidate[]
) {
  const mergedScores = [...results1, ...results2];
  const deduped = Array.from(
    mergedScores.reduce((map, item) => {
      const prev = map.get(item.id);
      if (!prev || item.score > prev.score) {
        map.set(item.id, item);
      }
      return map;
    }, new Map<string, { id: string; score: number }>())
  ).map(([, value]) => value);
  deduped.sort((a, b) => b.score - a.score);

  return deduped;
}

export const updateRunStatus = async (runId: string, status: string) => {
  logger.log("\n updateRunStatus: ", runId, status);
  await supabase.from("runs").update({ status }).eq("id", runId);
};
