// hooks/useSearchChatCandidates.ts
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CandidateType, EduUserType, ExpUserType } from "@/types/type";
import { useCredits } from "./useCredit";
import { useCallback } from "react";
import { logger } from "@/utils/logger";
import { UI_END, UI_START } from "./chat/useChatSession";

export type ExperienceUserType = ExpUserType & {
  company_db: {
    name: string;
    logo: string;
    linkedin_url: string;
    investors?: any;
    short_description?: string;
  };
};

export type CandidateTypeWithConnection = CandidateType & {
  edu_user: EduUserType[];
  experience_user: ExperienceUserType[];
  connection: { user_id: string; typed: number }[];
  publications?: { title: string; published_at: string }[];
  synthesized_summary?: { text: string }[];
};

function extractUiJsonFromMessage(content: string): any | null {
  if (!content) return null;

  const start = content.lastIndexOf(UI_START);
  const end = content.lastIndexOf(UI_END);

  if (start === -1 || end === -1 || end <= start) return null;

  const jsonText = content.slice(start + UI_START.length, end).trim();
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    logger.log("UI JSON parse failed:", e);
    return null;
  }
}

/**
 * 서버가 run/page별로 검색 id를 관리하는 전제:
 * POST /api/search
 * body: { queryId, runId, pageIdx }
 * resp: { results: string[], isNewSearch?: boolean }
 */
async function fetchSearchIds(params: {
  queryId: string;
  runId: string;
  pageIdx: number;
  userId: string;
}) {
  const res = await fetch("/api/search/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("search api failed");
  const data = await res.json();

  return {
    ids: (data?.results ?? []) as string[],
    isNewSearch: data?.isNewSearch ?? false,
  };
}

async function fetchCandidatesByIds(
  ids: string[],
  userId: string,
  runId: string
) {
  if (ids.length === 0) return [];

  const start_time = performance.now();

  const { data, error } = await supabase
    .from("candid")
    .select(
      `
        id,
        headline,
        location,
        name,
        profile_picture,
        links,
        edu_user (
          school,
          degree,
          field,
          start_date,
          end_date
        ),
        experience_user (
          role,
          description,
          start_date,
          end_date,
          company_id,
          company_db (
            name,
            investors,
            short_description
          )
        ),
        connection (
          user_id,
          typed
        ),
        synthesized_summary ( text ),
        reveal ( company_user_id )
      `
    )
    .in("id", ids)
    .eq("connection.user_id", userId)
    .eq("synthesized_summary.run_id", runId)
    .eq("reveal.company_user_id", userId);

  logger.log("fetchCandidatesByIds time ", performance.now() - start_time);
  if (error) throw error;

  const dataById = new Map((data ?? []).map((item: any) => [item.id, item]));
  const ordered = ids.map((id) => dataById.get(id)).filter(Boolean);

  return ordered as CandidateTypeWithConnection[];
}

/**
 * run 생성:
 * body: { queryId, messageId, criteria, queryText }
 * resp: { runId }
 */
async function createRunFromMessage(params: {
  queryId: string;
  messageId: number;
  criteria: any;
  queryText: string;
}) {
  const { queryId, messageId, criteria, queryText } = params;
  console.log("\n createRunFromMessage: ", queryId, messageId, criteria);

  if (!queryId) throw new Error("createRunFromMessage: missing queryId");
  if (!Number.isFinite(messageId))
    throw new Error("createRunFromMessage: invalid messageId");
  if (criteria == null)
    throw new Error("createRunFromMessage: missing criteria");

  // Insert a new run row.
  // Assumes:
  // - runs.id is uuid with default gen_random_uuid() (or uuid_generate_v4())
  // - runs.query_id (uuid), runs.trigger_message_id (int/bigint), runs.criteria (jsonb)
  // - RLS policy allows insert when the user owns the query
  const { data, error } = await supabase
    .from("runs")
    .insert({
      query_id: queryId,
      message_id: messageId,
      criteria,
      query_text: queryText,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `createRunFromMessage: insert failed (${error.code}): ${error.message}`
    );
  }
  if (!data?.id) {
    throw new Error("createRunFromMessage: no run id returned");
  }

  return { runId: data.id as string };
}

/**
 * run 검색 실행 트리거:
 * POST /api/search/run
 * body: { queryId, runId }
 * resp: { ok: true }
 */
async function triggerRunSearch(params: {
  queryId: string;
  runId: string;
  userId: string;
}) {
  const res = await fetch("/api/search/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  logger.log("triggerRunSearch가 끝난 뒤: ", res);
  if (!res.ok) throw new Error("run search trigger api failed");
  return await res.json();
}

export function useChatSearchCandidates(
  userId?: string,
  queryId?: string,
  runId?: string,
  enabled: boolean = true
) {
  const { deduct } = useCredits();
  const queryClient = useQueryClient();

  const infinite = useInfiniteQuery({
    queryKey: ["searchCandidatesByRun", queryId, userId, runId],
    enabled: enabled && !!userId && !!queryId && !!runId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const pageIdx = pageParam as number;

      const { ids, isNewSearch } = await fetchSearchIds({
        queryId: queryId!,
        runId: runId!,
        userId: userId!,
        pageIdx,
      });

      if (ids?.length) {
        if (isNewSearch) await deduct(ids.length * 3);
        const items = await fetchCandidatesByIds(ids, userId!, runId!);
        return { pageIdx, ids, items, isNewSearch };
      }

      return { pageIdx, ids: [], items: [], isNewSearch };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.ids?.length) return undefined;
      return lastPage.pageIdx + 1;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

  /**
   * ✅ messageId를 받아서:
   * 1) messages에서 content 로드
   * 2) <<UI>> JSON 파싱 (criteria)
   * 3) runs row 생성 -> newRunId
   * 4) 검색 트리거 (서버에서 runs_pages / run_results 채움)
   * 5) newRunId 반환 (페이지에서 URL 이동에 사용)
   */
  const runSearch = useCallback(
    async ({ messageId }: { messageId: number }) => {
      if (!queryId || !userId) return null;

      // 1) load message
      const { data, error } = await supabase
        .from("messages")
        .select("id, content")
        .eq("id", messageId)
        .single();

      if (error) {
        logger.log("load message error:", error);
        return null;
      }
      if (!data?.content) return null;

      // 2) parse criteria from UI block
      const inputs = extractUiJsonFromMessage(data.content);
      if (!inputs || !inputs.criteria) {
        logger.log("no criteria parsed from message:", messageId);
        return null;
      }

      // 3) create run
      const { runId: newRunId } = await createRunFromMessage({
        queryId,
        messageId,
        criteria: inputs.criteria,
        queryText: inputs.thinking ?? "",
      });

      if (!newRunId) return null;

      //   // 4) trigger server-side search
      //   await triggerRunSearch({ queryId, runId: newRunId, userId: userId });

      //   // 5) invalidate cache (so page 0 loads immediately when URL switches)
      //   queryClient.invalidateQueries({
      //     queryKey: ["searchCandidatesByRun", queryId, userId, newRunId],
      //   });

      return newRunId;
    },
    [queryId, userId, queryClient]
  );

  const testTriggerRunSearch = useCallback(
    async ({
      queryId,
      runId,
      userId,
    }: {
      queryId: string;
      runId: string;
      userId: string;
    }) => {
      await triggerRunSearch({ queryId, runId, userId: userId });
      // 5) invalidate cache (so page 0 loads immediately when URL switches)
      queryClient.invalidateQueries({
        queryKey: ["searchCandidatesByRun", queryId, userId, runId],
      });
      return runId;
    },
    [queryId, runId, userId]
  );

  return {
    ...infinite,
    runSearch,
  };
}
