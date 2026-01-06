import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CandidateType, EduUserType, ExpUserType } from "@/types/type";
import { useCredits } from "./useCredit";
import { useState } from "react";

export type ExperienceUserType = ExpUserType & {
  company_db: {
    name: string;
    logo: string;
    linkedin_url: string;
  };
};

export type CandidateTypeWithConnection = CandidateType & {
  edu_user: EduUserType[];
} & {
  experience_user: ExperienceUserType[];
} & {
  connection: { user_id: string; typed: number }[];
} & {
  publications?: { title: string; published_at: string }[];
} & {
  synthesized_summary?: { text: string }[];
};

async function fetchSearchIds(queryId: string, pageIdx: number) {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queryId, pageIdx }),
  });
  if (!res.ok) throw new Error("search api failed");
  const data = await res.json();
  console.log("fetchSearchIds ", data);

  return {
    ids: (data?.results ?? []) as string[],
    isNewSearch: data?.isNewSearch ?? false,
  };
}

async function fetchCandidatesByIds(
  ids: string[],
  userId: string,
  queryId: string
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
        bio,
        name,
        profile_picture,
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
        publications (
          title,
          published_at
        ),
        connection (
          user_id,
          typed
        ),
        synthesized_summary ( text )
      `
    )
    .in("id", ids)
    .eq("connection.user_id", userId)
    .eq("synthesized_summary.query_id", queryId);

  console.log("fetchCandidatesByIds ", data, error);
  console.log("fetchCandidatesByIds time ", performance.now() - start_time);

  if (error) throw error;

  const dataById = new Map((data ?? []).map((item) => [item.id, item]));

  const orderedData = ids.map((id) => dataById.get(id)).filter(Boolean);

  return orderedData;
}

export function useSearchCandidates(
  userId?: string,
  queryId?: string,
  enabled: boolean = true
) {
  const { deduct } = useCredits();
  const [isLoading, setIsLoading] = useState(false);

  return useInfiniteQuery({
    queryKey: ["searchCandidates", queryId, userId],
    enabled: enabled && !isLoading,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      setIsLoading(true);
      const pageIdx = pageParam as number;
      const { ids, isNewSearch } = await fetchSearchIds(queryId!, pageIdx);
      if (ids && ids.length > 0) {
        if (isNewSearch) {
          await deduct(ids.length * 3);
        }
        const items = await fetchCandidatesByIds(ids, userId!, queryId!);
        setIsLoading(false);
        return { pageIdx, ids, items };
      }
      return { pageIdx, ids: [], items: [] };
    },
    getNextPageParam: (lastPage) => {
      // 다음 페이지가 더 있는지 판단:
      // 1) /api/search 가 "페이지 사이즈 만큼" 채워서 주는 구조면,
      //    마지막 페이지 ids가 비었거나 너무 적으면 끝.
      if (!lastPage.ids || lastPage.ids.length === 0) return undefined;

      // (선택) pageSize를 정해두고 "덜 차면 끝" 룰을 쓰고 싶으면:
      // const pageSize = 10;
      // if (lastPage.ids.length < pageSize) return undefined;

      return lastPage.pageIdx + 1;
    },
    // 기존 페이지 유지하면서 계속 append
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000, // 30초 정도
    gcTime: 5 * 60_000,
    retry: false,
  });
}
