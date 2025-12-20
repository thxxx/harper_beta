import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CandidateType } from "@/types/database.types";

export type ConnectionTyped = 0 | 1 | 2;

export const connectionsKey = (
  userId?: string,
  typed: ConnectionTyped = 0,
  pageIdx: number = 0,
  pageSize: number = 10
) => ["connections", userId, typed, pageIdx, pageSize] as const;

export function useCandidatesByConnectionTyped(
  userId?: string,
  typed: ConnectionTyped = 0,
  pageIdx: number = 0,
  pageSize: number = 10
) {
  return useQuery({
    queryKey: connectionsKey(userId, typed, pageIdx, pageSize),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId)
        return { items: [] as CandidateType[], hasNext: false, total: 0 };

      const from = pageIdx * pageSize;
      const to = from + pageSize - 1;

      // 1) connection 페이지 단위 + total count
      const {
        data: rows,
        error: e1,
        count,
      } = await supabase
        .from("connection")
        .select("candid_id", { count: "exact" })
        .eq("user_id", userId)
        .eq("typed", typed)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (e1) throw e1;

      const ids = (rows ?? [])
        .map((r: any) => r.candid_id)
        .filter(Boolean) as string[];

      if (ids.length === 0) {
        return {
          items: [] as CandidateType[],
          hasNext: false,
          total: count ?? 0,
        };
      }

      // 2) candid 상세 조회
      const { data: cands, error: e2 } = await supabase
        .from("candid")
        .select(
          `
educations,
experiences,
headline,
id,
linkedin_url,
location,
name,
profile_picture,
connection (
  user_id,
  typed
)`
        )
        .in("id", ids)
        .eq("connection.user_id", userId);

      if (e2) throw e2;

      // ids 순서 유지
      const map = new Map((cands ?? []).map((c: any) => [c.id, c]));
      const items = ids
        .map((id) => map.get(id))
        .filter(Boolean) as CandidateType[];

      const total = count ?? 0;
      const hasNext = to + 1 < total;

      return { items, hasNext, total };
    },
    staleTime: 10_000,
  });
}

// 기존 API 유지하고 싶으면 thin wrapper만 둠
export function useBookmarkedCandidates(
  userId?: string,
  pageIdx = 0,
  pageSize = 10
) {
  return useCandidatesByConnectionTyped(userId, 0, pageIdx, pageSize);
}

export function useRequestedCandidates(
  userId?: string,
  pageIdx = 0,
  pageSize = 10
) {
  return useCandidatesByConnectionTyped(userId, 1, pageIdx, pageSize);
}

export function useConnectedCandidates(
  userId?: string,
  pageIdx = 0,
  pageSize = 10
) {
  return useCandidatesByConnectionTyped(userId, 2, pageIdx, pageSize);
}
