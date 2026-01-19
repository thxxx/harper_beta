// pages/result/[id].tsx
import AppLayout from "@/components/layout/app";
import NotExistingPage from "@/components/layout/NotExistingPage";
import ResultHeader from "./ResultHeader";
import ResultBody from "./ResultBody";
import ChatPanel from "@/components/chat/ChatPanel";

import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useQueryDetail } from "@/hooks/useQueryDetail";
import { useSearchCandidates } from "@/hooks/useSearchCandidates";
import { useSettingStore } from "@/store/useSettingStore";
import { logger } from "@/utils/logger";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const MAX_PREFETCH_PAGES = 20;

export default function ResultPage() {
  const router = useRouter();
  const { id, page } = router.query;
  const queryId = typeof id === "string" ? id : undefined;

  const { companyUser } = useCompanyUserStore();
  const userId = companyUser?.user_id;

  const { viewType } = useSettingStore();

  const [isFirst, setIsFirst] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);

  const { data: queryItem, isLoading: isQueryDetailLoading } =
    useQueryDetail(queryId);

  const ready = !!userId && !!queryId && !!queryItem?.query_id;

  // URL에서 page 읽기 (0-based)
  const pageIdxRaw = useMemo(() => {
    const raw = Array.isArray(page) ? page[0] : page;
    const n = raw == null ? 0 : parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : 0;
  }, [page]);

  const pageIdx = useMemo(() => {
    const normalized = pageIdxRaw >= 0 ? pageIdxRaw : 0;
    return clamp(normalized, 0, MAX_PREFETCH_PAGES);
  }, [pageIdxRaw]);

  const scrollToTop = useCallback(() => {
    const el = document.getElementById("app-scroll");
    if (el) el.scrollTo({ top: 0, left: 0, behavior: "auto" });
    else window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const setPageInUrl = useCallback(
    (nextIdx: number, mode: "push" | "replace" = "push") => {
      const method = mode === "push" ? router.push : router.replace;
      scrollToTop();

      method(
        {
          pathname: router.pathname,
          query: { ...router.query, page: String(nextIdx) },
        },
        undefined,
        { shallow: true, scroll: false }
      );
    },
    [router, scrollToTop]
  );

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    runMoreSearch,
    runNormalSearch,
  } = useSearchCandidates(userId, queryId, ready && searchEnabled);

  useEffect(() => {
    if (
      queryItem &&
      queryItem.raw_input_text &&
      !queryItem.thinking &&
      !queryItem.status
    ) {
      setIsFirst(true);
    }
  }, [queryItem]);

  const pages = data?.pages ?? [];
  const current = pages[pageIdx];
  const items = current?.items ?? [];

  const canPrev = pageIdx > 0;
  const canNext = pageIdx + 1 < pages.length || !!hasNextPage;

  const prevPage = () => {
    if (!canPrev) return;
    setPageInUrl(pageIdx - 1, "push");
  };

  const nextPage = async () => {
    if (pageIdx + 1 < pages.length) {
      setPageInUrl(pageIdx + 1, "push");
      return;
    }
    if (!hasNextPage || isFetchingNextPage) return;

    const res = await fetchNextPage();
    const newCount = res.data?.pages?.length ?? pages.length;
    if (newCount > pages.length) setPageInUrl(pageIdx + 1, "push");
  };

  // Ensure target page loaded by sequentially fetching until we have it (or can't)
  const ensuringRef = useRef(false);
  const ensurePageLoaded = useCallback(
    async (targetIdx: number) => {
      let len = data?.pages?.length ?? 0;
      if (len > targetIdx) return;

      while (len <= targetIdx) {
        if (!hasNextPage) break;

        const res = await fetchNextPage();
        const nextLen = res.data?.pages?.length ?? len;
        if (nextLen <= len) break;
        len = nextLen;
      }
    },
    [data?.pages?.length, fetchNextPage, hasNextPage]
  );

  useEffect(() => {
    if (!ready) return;
    if (pageIdx <= 0) return;
    if (ensuringRef.current) return;

    ensuringRef.current = true;
    ensurePageLoaded(pageIdx).finally(() => {
      ensuringRef.current = false;
    });
  }, [ready, pageIdx, ensurePageLoaded]);

  /**
   * 최종 검색은 여길 수정해야 한다.
   */
  const onSearchFromConversation = useCallback(
    async (messageId: string | number) => {
      if (!queryId || !userId) return;
      logger.log("\n queryId, userId, messageId: ", queryId, userId, messageId);

      setSearchEnabled(true);
      await runNormalSearch();
      setPageInUrl(0, "replace");
    },
    [queryId, userId, runNormalSearch, setPageInUrl]
  );

  if (!queryId) return <AppLayout>Loading...</AppLayout>;

  return (
    <AppLayout initialCollapse={true}>
      <div className="w-full flex flex-row min-h-screen items-start justify-between">
        <ChatPanel
          title={queryItem?.query_keyword ?? ""}
          queryId={queryId}
          userId={userId}
          onSearchFromConversation={onSearchFromConversation}
        />

        <div
          className={`w-full lg:w-[70%] ${
            viewType === "table" ? "px-0" : "px-0"
          } transition-all duration-200`}
        >
          {queryItem && (
            <>
              <ResultHeader
                queryItem={queryItem}
                isFirst={isFirst}
                isLoading={isLoading}
              />
            </>
          )}

          <ResultBody
            searchEnabled={searchEnabled}
            items={items}
            userId={userId}
            queryItem={queryItem}
            isLoading={isLoading}
            isQueryDetailLoading={isQueryDetailLoading}
            pageIdx={pageIdx}
            pageIdxRaw={pageIdxRaw}
            maxPrefetchPages={MAX_PREFETCH_PAGES}
            canPrev={canPrev}
            canNext={canNext}
            isFetchingNextPage={isFetchingNextPage}
            onRunMoreSearch={runMoreSearch}
            onPrevPage={prevPage}
            onNextPage={nextPage}
          />
        </div>
      </div>
    </AppLayout>
  );
}
