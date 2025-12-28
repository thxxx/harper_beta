import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CandidateType } from "@/types/type";

export type CandidateDetail = CandidateType & {
  connection?: { user_id: string; typed: number }[];
};

export const synthesizedSummaryKey = (queryId?: string, candidId?: string) =>
  ["synthesizedSummary", queryId, candidId] as const;

async function fetchSynthesizedSummary(queryId: string, candidId: string) {
  const q = supabase
    .from("synthesized_summary")
    .select(`*`)
    .eq("candid_id", candidId)
    .eq("query_id", queryId)
    .limit(1)
    .maybeSingle();

  // userId가 있으면 connection을 해당 user로만 필터
  const { data, error } = await q;

  if (error) throw error;
  return data as CandidateDetail | null;
}

export function useCandidateDetail(queryId?: string, candidId?: string) {
  return useQuery({
    queryKey: synthesizedSummaryKey(queryId, candidId),
    enabled: !!candidId,
    queryFn: () => fetchSynthesizedSummary(queryId!, candidId!),
    staleTime: 60_000,
  });
}
