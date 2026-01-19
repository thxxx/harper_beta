// pages/result/[id].tsx
import AppLayout from "@/components/layout/app";
import ResultHeader from "./ResultHeader";
import ResultBody from "./ResultBody";
import ChatPanel from "@/components/chat/ChatPanel";

import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useQueryDetail } from "@/hooks/useQueryDetail";
import { logger } from "@/utils/logger";
import { useChatSearchCandidates } from "@/hooks/useSearchChatCandidates";
import { MIN_CREDITS_FOR_SEARCH } from "@/utils/constantkeys";
import { useCredits } from "@/hooks/useCredit";
import { showToast } from "@/components/toast/toast";
import CandidateModalRoot from "@/components/Modal/CandidateModal";
import { useCandidateModalStore } from "@/store/useCandidateModalStore";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const MAX_PREFETCH_PAGES = 20;

export default function ResultPage() {
  const [isFirst, setIsFirst] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);

  const router = useRouter();
  const { id, page, run } = router.query;

  const queryId = typeof id === "string" ? id : undefined;
  const runId = typeof run === "string" ? run : undefined; // ✅ runs.id (uuid)

  const { companyUser } = useCompanyUserStore();
  const userId = companyUser?.user_id;

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

  // ✅ runId가 URL에 들어오면 결과 패널은 검색 가능 상태로 전환
  useEffect(() => {
    if (!ready) return;
    if (!runId) return;
    setSearchEnabled(true);
  }, [ready, runId]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    runSearch,
  } = useChatSearchCandidates(userId, queryId, runId, ready && searchEnabled);

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

  useEffect(() => {
    if (!runId && queryItem && queryItem.runs && queryItem.runs.length > 0) {
      logger.log("runId not found, set runId to ", queryItem.runs[0].id);
      router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, run: queryItem.runs[0].id, page: "0" },
        },
        undefined,
        { shallow: true, scroll: false }
      );
    }
  }, [queryItem, runId]);

  const pages = data?.pages ?? [];
  const current = pages[pageIdx];
  const items = current?.items ?? [];
  const { credits } = useCredits();

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

      if (isFetchingNextPage) return;

      while (len <= targetIdx) {
        logger.log("ensurePageLoaded: ", len, targetIdx);
        if (!hasNextPage) break;
        if (isFetchingNextPage) return;

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
    if (!searchEnabled) return;
    if (!runId) return;
    if (pageIdx <= 0) return;
    if (ensuringRef.current) return;

    ensuringRef.current = true;
    ensurePageLoaded(pageIdx).finally(() => {
      ensuringRef.current = false;
    });
  }, [ready, searchEnabled, runId, pageIdx, ensurePageLoaded]);

  /**
   * ✅ ChatPanel에서 confirm 눌렀을 때:
   * - messageId 기반으로 run 생성 + 검색 실행
   * - URL을 newRunId로 이동 (?run=...&page=0)
   */
  const onSearchFromConversation = useCallback(
    async (messageId: number) => {
      if (!queryId || !userId) return;
      if (credits && credits.remain_credit <= MIN_CREDITS_FOR_SEARCH) {
        showToast({
          message: "크레딧이 부족합니다.",
          variant: "white",
        });
        return;
      }

      try {
        logger.log("\n 검색 messageId: ", messageId);
        const newRunId = await runSearch({ messageId: messageId });
        if (!newRunId) return;
        logger.log("\n 검색 newRunId: ", newRunId);

        setSearchEnabled(true);
        router.replace(
          {
            pathname: router.pathname,
            query: { ...router.query, run: newRunId, page: "0" },
          },
          undefined,
          { shallow: true, scroll: false }
        );

        // 여기서 함수 실행
      } catch (e) {
        logger.log("onSearchFromConversation failed:", e);
      }
    },
    [queryId, userId, router, runSearch, credits]
  );

  const isNewSearch = useMemo(() => {
    return data?.pages[0]?.isNewSearch ?? false;
  }, [data]);

  const currentRunCriterias = useMemo(() => {
    if (!queryItem) return [];
    if (!queryItem.runs) return [];

    return queryItem.runs[0].criteria ?? [];
  }, [queryItem]);

  if (!queryId) return <AppLayout>Loading...</AppLayout>;

  return (
    <AppLayout initialCollapse={true}>
      <div className="w-full flex flex-row min-h-screen items-start justify-between">
        <ChatPanel
          title={queryItem?.query_keyword ?? ""}
          queryId={queryId}
          userId={userId}
          onSearchFromConversation={onSearchFromConversation}
          isNewSearch={isNewSearch}
        />
        <div className={`relative w-full min-h-screen overflow-y-hidden`}>
          <CandidateModalRoot />
          <div
            className={`w-full max-h-screen min-h-screen py-2 transition-all duration-200 relative overflow-y-auto`}
          >
            {queryItem && runId && (
              <ResultHeader
                queryItem={queryItem}
                isFirst={isFirst}
                isLoading={isLoading}
                runId={runId}
              />
            )}

            {runId && (
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
                onRunMoreSearch={() => {}}
                onPrevPage={prevPage}
                onNextPage={nextPage}
                runId={runId}
                criterias={currentRunCriterias}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
