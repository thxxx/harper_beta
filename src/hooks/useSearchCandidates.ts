import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  CandidateType,
  EduUserType,
  ExpUserType,
  SynthesizedSummaryType,
} from "@/types/type";

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
  return (data?.results ?? []) as string[];
}

async function fetchCandidatesByIds(
  ids: string[],
  userId: string,
  queryId: string
) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("candid")
    .select(
      `
        id,
        headline,
        bio,
        linkedin_url,
        location,
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
          start_date,
          end_date,
          company_id,
          company_db (
            name,
            logo,
            linkedin_url
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

  if (error) throw error;

  // // 2) synthesized_summary (queryId + ids)
  // const { data: sums, error: e2 } = await supabase
  //   .from("synthesized_summary")
  //   .select("query_id, candid_id, text")
  //   .eq("query_id", queryId)
  //   .in("candid_id", ids);

  // if (e2) throw e2;

  // // 3) candid_id -> summary[]
  // const sumMap = new Map<string, any[]>();
  // for (const s of sums ?? []) {
  //   const arr = sumMap.get(s.candid_id ?? "") ?? [];
  //   arr.push(s);
  //   sumMap.set(s.candid_id ?? "", arr);
  // }

  // // 4) attach + keep ids order
  // const candMap = new Map((data ?? []).map((c: any) => [c.id, c]));
  // return ids
  //   .map((id) => {
  //     const c: any = candMap.get(id);
  //     if (!c) return null;
  //     return { ...c, synthesized_summary: sumMap.get(id) ?? [] };
  //   })
  //   .filter(Boolean);

  return data ?? [];
}

export function useSearchCandidates(userId?: string, queryId?: string) {
  return useInfiniteQuery({
    queryKey: ["searchCandidates", queryId, userId],
    enabled: !!userId && !!queryId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const pageIdx = pageParam as number;
      const ids = await fetchSearchIds(queryId!, pageIdx);
      const items = await fetchCandidatesByIds(ids, userId!, queryId!);

      return { pageIdx, ids, items };
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
    staleTime: 30_000,
  });
}
