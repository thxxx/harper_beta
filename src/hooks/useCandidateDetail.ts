import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CandidateType } from "@/types/database.types";

export type CandidateDetail = CandidateType & {
  connection?: { user_id: string; typed: number }[];
};

export const candidateKey = (id?: string, userId?: string) =>
  ["candidate", id, userId] as const;

async function fetchCandidateDetail(id: string, userId?: string) {
  const q = supabase
    .from("candid")
    .select(
      `
      *,
      connection (
        user_id,
        typed
      )
    `
    )
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  // userId가 있으면 connection을 해당 user로만 필터
  const { data, error } = userId
    ? await q.eq("connection.user_id", userId)
    : await q;

  if (error) throw error;
  return data as CandidateDetail | null;
}

export function useCandidateDetail(userId?: string, candidId?: string) {
  return useQuery({
    queryKey: candidateKey(candidId, userId),
    enabled: !!candidId,
    queryFn: () => fetchCandidateDetail(candidId!, userId),
    staleTime: 60_000,
  });
}
