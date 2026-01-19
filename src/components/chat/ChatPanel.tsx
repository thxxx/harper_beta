// components/chat/ChatPanel.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatComposer from "@/components/chat/ChatComposer";
import { useChatSessionDB } from "@/hooks/chat/useChatSession"; // ✅ useChatSessionDB
import { ArrowDown, ArrowLeft, Loader2, ScreenShareIcon } from "lucide-react";
import { logger } from "@/utils/logger";
import { useCandidateModalStore } from "@/store/useCandidateModalStore";

type Props = {
  title: string;
  queryId?: string;
  userId?: string;
  onSearchFromConversation: (messageId: number) => Promise<void>;
  disabled?: boolean;
  isNewSearch?: boolean;
};

const BOTTOM_THRESHOLD_PX = 120;
const AUTO_SCROLL_THROTTLE_MS = 120;

export default function ChatPanel({
  title,
  queryId,
  userId,
  onSearchFromConversation,
  disabled,
  isNewSearch,
}: Props) {
  const [isSearchSyncing, setIsSearchSyncing] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const { isOpen, payload, close } = useCandidateModalStore();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const chat = useChatSessionDB({ queryId, userId });
  // ✅ auto-start if there is only one user message
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (autoStartedRef.current) return;

    // history 아직 로딩 중이면 대기
    if (!chat.ready) return;
    if (chat.isLoadingHistory) return;

    // 이미 스트리밍/검색 중이면 대기
    if (chat.isStreaming) return;
    if (isSearchSyncing) return;

    // 메시지가 1개이고, 그게 user라면 자동 시작
    if (chat.messages.length !== 1) return;
    if (chat.messages[0]?.role !== "user") return;

    logger.log("\n 자동 시작 메시지: ", chat.messages[0]);

    autoStartedRef.current = true;
    void chat.send(chat.messages[0].content ?? "");
  }, [
    chat.ready,
    chat.isLoadingHistory,
    chat.isStreaming,
    chat.messages,
    isSearchSyncing,
    chat.send,
  ]);

  useEffect(() => {
    chat.reload();
  }, [isNewSearch]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const recomputeStickiness = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceToBottom <= BOTTOM_THRESHOLD_PX;

    setStickToBottom(atBottom);
    setShowJumpToBottom(!atBottom);
  }, []);

  // ✅ load history once when ready
  useEffect(() => {
    if (!chat.ready) return;
    void chat.loadHistory();
  }, [chat.ready, chat.loadHistory]);

  // ✅ attach scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => recomputeStickiness();
    el.addEventListener("scroll", onScroll, { passive: true });

    recomputeStickiness();
    return () => el.removeEventListener("scroll", onScroll);
  }, [recomputeStickiness]);

  // ✅ 자연스러운 auto-follow (only if pinned)
  const lastAutoScrollTsRef = useRef(0);
  useEffect(() => {
    if (!stickToBottom) return;

    const now = Date.now();
    if (now - lastAutoScrollTsRef.current < AUTO_SCROLL_THROTTLE_MS) return;
    lastAutoScrollTsRef.current = now;

    const id = requestAnimationFrame(() => {
      // streaming 중 smooth는 멀미/읽기 방해될 때가 많아서 auto 권장
      scrollToBottom(chat.isStreaming ? "auto" : "smooth");
    });
    return () => cancelAnimationFrame(id);
  }, [chat.messages, chat.isStreaming, stickToBottom, scrollToBottom]);

  // ✅ initial load: jump to bottom once (instant)
  const initialScrollDone = useRef(false);
  useEffect(() => {
    if (initialScrollDone.current) return;
    if (chat.isLoadingHistory) return;
    if (chat.messages.length === 0) return;

    initialScrollDone.current = true;
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [chat.isLoadingHistory, chat.messages.length, scrollToBottom]);

  // 현재 검색 가능한 상태인지 아닌지
  const canSearch = useMemo(() => {
    if (disabled) return false;
    if (!queryId || !userId) return false;
    if (isSearchSyncing || chat.isStreaming) return false;

    return (
      chat.messages.length > 0 && chat.messages.some((m) => m.role === "user")
    );
  }, [
    disabled,
    isSearchSyncing,
    chat.isStreaming,
    chat.messages,
    queryId,
    userId,
  ]);

  const onClickSearch = async (messageId: string | number) => {
    if (!canSearch) return;
    if (!messageId) return;

    setIsSearchSyncing(true);
    try {
      await chat.addAssistantMessage(
        "검색을 시작하겠습니다. 최대 1~2분이 소요될 수 있습니다."
      );
      await onSearchFromConversation(messageId as number);
    } finally {
      setIsSearchSyncing(false);
    }
  };

  return (
    <div className="w-full min-w-[360px] max-w-[440px] lg:w-[30%] border-r border-white/10 flex flex-col min-h-0 h-full">
      {/* Header (fixed) */}
      <div className="flex items-center justify-between flex-none h-14 px-4 text-hgray900">
        <div className="text-sm font-medium flex items-center gap-1.5 hover:gap-2 cursor-pointer hover:text-hgray900 transition-all duration-200">
          <ArrowLeft className="w-3.5 h-3.5 text-hgray600" />
          <div>{title}</div>
        </div>
        <div>
          <ScreenShareIcon
            className="w-3.5 h-3.5 text-hgray600"
            strokeWidth={1.4}
          />
        </div>
      </div>

      {/* Messages (scroll only here) */}
      <div className="flex-1 min-h-0 relative">
        <div ref={scrollRef} className="h-full overflow-y-auto pr-2 px-4 pt-4">
          {chat.isLoadingHistory && (
            <div className="text-xs text-hgray600 flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              대화 기록 불러오는 중...
            </div>
          )}

          <ChatMessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            error={chat.error}
            onConfirmCriteriaCard={onClickSearch}
            onChangeCriteriaCard={(args) => {
              logger.log("\n onChangeCriteriaCard in ChatPanel", args);
              void chat.patchAssistantUiBlock(
                args.messageId,
                args.modifiedBlock
              );
            }}
          />
          <br />
        </div>

        {showJumpToBottom && (
          <button
            type="button"
            onClick={() => {
              scrollToBottom("smooth");
              setStickToBottom(true);
              setShowJumpToBottom(false);
            }}
            className="absolute bottom-3 right-3 flex items-center gap-1 cursor-pointer rounded-full bg-white/5 hover:bg-white/10 px-2 py-2 text-xs text-hgray900"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && payload && (
        <div className="px-2 py-1 bg-blue-600 text-white">
          <div className="text-xs font-medium">
            {payload.name}님에 대해서 질문합니다. (이거 아직 구현 안했어요. UI도
            수정 예정. 대화해도 효과 없음)
          </div>
        </div>
      )}

      {/* Composer (fixed) */}
      <ChatComposer
        value={chat.input}
        onChange={chat.setInput}
        onSend={() => void chat.send()}
        onStop={chat.stop}
        onRetry={() => void chat.reload()}
        disabledSend={!chat.canSend || disabled || isSearchSyncing}
        isStreaming={chat.isStreaming}
      />
    </div>
  );
}
