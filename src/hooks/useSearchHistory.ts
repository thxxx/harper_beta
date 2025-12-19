// hooks/useQueriesHistory.ts
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// 쿼리 키
export const queriesHistoryKey = (userId?: string) =>
  ["queriesHistory", userId] as const;

// fetcher
export async function fetchQueriesHistory(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from("queries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// useQuery 훅
export function useQueriesHistory(userId?: string, limit = 10) {
  return useQuery({
    queryKey: queriesHistoryKey(userId),
    queryFn: () => fetchQueriesHistory(userId!, limit),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ✅ "외부에서 업데이트 콜" (invalidate -> 다음 렌더/포커스/요청에 refetch or 즉시 refetch)
export function refreshQueriesHistory(
  queryClient: QueryClient,
  userId: string
) {
  return queryClient.invalidateQueries({
    queryKey: queriesHistoryKey(userId),
  });
}

// (원하면 즉시 당장 가져오게)
export function refetchQueriesHistory(
  queryClient: QueryClient,
  userId: string
) {
  return queryClient.refetchQueries({
    queryKey: queriesHistoryKey(userId),
  });
}
