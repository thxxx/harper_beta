import AppLayout from "@/components/layout/app";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import CandidateCard from "@/components/CandidatesList";
import { QueryType } from "@/types/type";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ✅ infiniteQuery 버전 훅으로 바꿔서 import
import {
  CandidateTypeWithConnection,
  useSearchCandidates,
} from "@/hooks/useSearchCandidates";
import { useQueryDetail } from "@/hooks/useQueryDetail";

type QueryTypeWithCompanyUser = QueryType & {
  company_users: {
    user_id: string;
    name: string;
  };
};

export default function Result() {
  const router = useRouter();
  const { id } = router.query;

  const { companyUser } = useCompanyUserStore();
  const userId = companyUser?.user_id;
  const queryId = typeof id === "string" ? id : undefined;
  const [pageIdx, setPageIdx] = useState(0);

  const { data: queryItem, isLoading: isQueryDetailLoading } =
    useQueryDetail(queryId);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSearchCandidates(userId, queryId);

  if (!userId) return <AppLayout>Loading...</AppLayout>;
  if (!queryId) return <AppLayout>Loading...</AppLayout>;

  const pages = data?.pages ?? [];
  const current = pages[pageIdx];
  const items = current?.items ?? [];

  const canPrev = pageIdx > 0;

  // 다음 페이지로 "이동" 가능 조건:
  // 1) 이미 받아둔 다음 페이지가 있음  OR
  // 2) 아직 없지만 서버에 다음 페이지가 있고(fetchNextPage 가능)
  const canNext = pageIdx + 1 < pages.length || !!hasNextPage;

  const nextPage = async () => {
    // 이미 로드된 다음 페이지가 있으면 그냥 이동
    if (pageIdx + 1 < pages.length) {
      setPageIdx((p) => p + 1);
      window.scrollTo({ top: 0 });
      return;
    }

    // 아직 로드 안 됐으면 fetchNextPage로 받아온 뒤 이동
    if (!hasNextPage || isFetchingNextPage) return;

    const res = await fetchNextPage();
    const newPagesCount = res.data?.pages?.length ?? pages.length;

    if (newPagesCount > pages.length) {
      setPageIdx((p) => p + 1);
      window.scrollTo({ top: 0 });
    }
  };

  const prevPage = () => {
    if (!canPrev) return;
    setPageIdx((p) => Math.max(0, p - 1));
    window.scrollTo({ top: 0 });
  };

  return (
    <AppLayout>
      {queryItem && (
        <div className="w-full px-4 py-10">
          <div className="text-2xl font-normal">{queryItem.query_keyword}</div>
          <div className="text-lg font-normal text-xgray600">
            {queryItem.raw_input_text}
          </div>
          <div className="text-sm text-xgray500 mt-2">
            <span>
              {queryItem.company_users ? (
                <>
                  by {queryItem.company_users.name}
                  <span> - </span>
                </>
              ) : (
                ""
              )}
            </span>
            <span>
              {queryItem.created_at
                ? new Date(queryItem.created_at).toLocaleDateString()
                : ""}
            </span>
          </div>
        </div>
      )}

      {!isLoading ? (
        <div className="w-full px-4 space-y-2">
          <div className="space-y-4">
            {items.map((c) => (
              <CandidateCard
                key={c.id}
                c={c as CandidateTypeWithConnection}
                userId={userId}
                queryItem={queryItem}
              />
            ))}
          </div>

          {/* (선택) 페이지가 비어있을 때 */}
          {items.length === 0 && (
            <div className="py-10 text-sm text-xgray600">No results.</div>
          )}
        </div>
      ) : (
        <div>Loading...</div>
      )}

      <div className="flex items-center justify-center w-full py-16 flex-col">
        <div className="text-sm text-xgray700">
          Page {pageIdx + 1}
          {isFetchingNextPage ? " (loading...)" : ""}
        </div>

        <div className="flex items-center justify-center gap-1 flex-row mt-2">
          <button
            type="button"
            onClick={prevPage}
            disabled={!canPrev}
            className={`p-1 rounded-sm border border-xgray400 hover:bg-xlightgray ${
              canPrev ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
            }`}
          >
            <ChevronLeft size={20} className="text-xgray600" />
          </button>

          <button
            type="button"
            onClick={nextPage}
            disabled={!canNext || isFetchingNextPage}
            className={`p-1 rounded-sm border border-xgray400 hover:bg-xlightgray ${
              canNext && !isFetchingNextPage
                ? "cursor-pointer"
                : "opacity-40 cursor-not-allowed"
            }`}
          >
            <ChevronRight size={20} className="text-xgray600" />
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
