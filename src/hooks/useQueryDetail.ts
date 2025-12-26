import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { QueryType } from "@/types/type";

type QueryTypeWithCompanyUser = QueryType & {
  company_users: {
    user_id: string;
    name: string;
  };
};

export const queryKey = (id?: string) => ["query", id] as const;

async function fetchQueryDetail(id: string) {
  const q = supabase
    .from("queries")
    .select(
      `
    *,
    company_users (
      user_id,
      name
    )
`
    )
    .eq("query_id", id)
    .single();

  // userId가 있으면 connection을 해당 user로만 필터
  const { data, error } = await q;
  // const { data, error } = userId
  // ? await q.eq("connection.user_id", userId)
  // : await q;

  if (error) throw error;
  return data as QueryTypeWithCompanyUser | null;
}

export function useQueryDetail(queryId?: string) {
  return useQuery({
    queryKey: queryKey(queryId),
    enabled: !!queryId,
    queryFn: () => fetchQueryDetail(queryId!),
    staleTime: 60_000,
  });
}
