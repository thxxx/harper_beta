// hooks/chat/useChatSession.ts
import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";
import {
  fetchMessages,
  insertMessage,
  updateMessageContent,
} from "@/lib/message";

const CHAT_MODEL = "grok-4-fast-non-reasoning";

export const UI_START = "<<UI>>";
export const UI_END = "<<END_UI>>";

export type UiSegment =
  | { type: "text"; content: string }
  | { type: "block"; content: any };

export function replaceUiBlockInText(rawText: string, modifiedBlockObj: any) {
  const start = rawText.lastIndexOf(UI_START);
  const end = rawText.lastIndexOf(UI_END);

  if (start === -1 || end === -1 || end <= start) return rawText;

  const before = rawText.slice(0, start + UI_START.length);
  const after = rawText.slice(end); // END_UI 포함해서 유지

  const json = JSON.stringify(modifiedBlockObj);
  return `${before}\n${json}\n${after}`;
}

export function extractUiSegments(text: string): { segments: UiSegment[] } {
  const segments: UiSegment[] = [];

  let cursor = 0;

  while (true) {
    const start = text.indexOf(UI_START, cursor);
    if (start === -1) break;

    // UI_START 이전 텍스트
    const before = text.slice(cursor, start);
    if (before) segments.push({ type: "text", content: before });

    const afterStart = start + UI_START.length;
    const end = text.indexOf(UI_END, afterStart);

    if (end === -1) {
      segments.push({ type: "block", content: { type: "criteria_loading" } });
      return { segments };
    }

    const jsonStr = text.slice(afterStart, end).trim();
    try {
      const obj = JSON.parse(jsonStr);
      segments.push({ type: "block", content: obj });
    } catch {
      segments.push({
        type: "text",
        content: text.slice(start, end + UI_END.length),
      });
    }

    cursor = end + UI_END.length;
  }

  const tail = text.slice(cursor);
  if (tail) segments.push({ type: "text", content: tail });

  return { segments };
}

export function buildConversationText(messages: ChatMessage[]) {
  return messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.rawContent}`)
    .join("\n");
}

export function useChatSessionDB(args: {
  queryId?: string;
  userId?: string;
  apiPath?: string;
  model?: string;
}) {
  const { queryId, userId } = args;
  const apiPath = args.apiPath ?? "/api/chat";
  const model = args.model ?? CHAT_MODEL;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const ready = !!queryId && !!userId;

  const loadHistory = useCallback(async () => {
    if (!ready) return;
    if (isLoadingHistory) return;

    setIsLoadingHistory(true);
    setError(null);
    try {
      const rows = await fetchMessages(queryId!, userId!);
      const hydrated = rows.map((m) => {
        const raw = (m as any).rawContent ?? m.content ?? "";
        const { segments } = extractUiSegments(raw);
        return { ...m, rawContent: raw, segments };
      });
      setMessages(hydrated);
    } catch {
      setError("대화 기록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [ready, queryId, userId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const canSend = useMemo(
    () => ready && !isStreaming && input.trim().length > 0,
    [ready, isStreaming, input]
  );

  const send = useCallback(
    async (content?: string) => {
      if (!ready) return;
      const trimmed = content?.trim() ?? input.trim();
      if (!trimmed) return;
      if (isStreaming) return;

      setError(null);
      setIsStreaming(true);

      try {
        // 1) user msg insert
        const userMsg = await insertMessage({
          queryId: queryId!,
          userId: userId!,
          role: "user",
          content: trimmed,
        });
        if (!content) {
          setMessages((prev) => [
            ...prev,
            { ...userMsg, segments: [{ type: "text", content: trimmed }] },
          ]);
        }
        setInput("");

        // 2) assistant placeholder insert (DB row 확보)
        const assistantPlaceholder = await insertMessage({
          queryId: queryId!,
          userId: userId!,
          role: "assistant",
          content: "",
        });

        setMessages((prev) => [...prev, assistantPlaceholder]);

        // 3) stream response and update placeholder
        const controller = new AbortController();
        abortRef.current = controller;

        const baseMessagesForModel = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        console.log("\n baseMessagesForModel가 뭔데? ", baseMessagesForModel);
        const res = await fetch(apiPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: baseMessagesForModel }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error("chat api failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          assistantText += decoder.decode(value, { stream: true });

          const { segments } = extractUiSegments(assistantText);

          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findIndex(
              (x) => x.id === assistantPlaceholder.id
            );
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                rawContent: assistantText,
                content: assistantText,
                segments,
              };
            }
            return updated;
          });
        }
        await updateMessageContent({
          id: assistantPlaceholder.id!,
          content: assistantText,
        });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError("메시지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [ready, input, isStreaming, queryId, userId, apiPath, model, messages]
  );

  const reload = useCallback(async () => {
    if (!ready) return;
    setError(null);
    try {
      const rows = await fetchMessages(queryId!, userId!);
      const hydrated = rows.map((m) => {
        const raw = (m as any).rawContent ?? m.content ?? "";
        const { segments } = extractUiSegments(raw);
        return { ...m, rawContent: raw, segments };
      });
      console.log("\n hydrated가 뭔데? ", hydrated);

      setMessages(hydrated);
    } catch {
      setError("대화 기록을 새로고침하지 못했습니다.");
    }
  }, [ready, queryId, userId]);

  const addAssistantMessage = useCallback(
    async (content: string) => {
      if (!ready) return null;
      const trimmed = content.trim();
      if (!trimmed) return null;

      const assistantMsg = await insertMessage({
        queryId: queryId!,
        userId: userId!,
        role: "assistant",
        content: trimmed,
      });
      const { segments } = extractUiSegments(trimmed);

      setMessages((prev) => [
        ...prev,
        { ...assistantMsg, rawContent: trimmed, segments },
      ]);

      return assistantMsg;
    },
    [ready, queryId, userId]
  );

  const patchAssistantUiBlock = useCallback(
    async (messageId: number, modifiedBlock: any) => {
      let nextRawForDb = "";

      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((x) => x.id === messageId);
        if (idx < 0) return prev;

        const cur = updated[idx] as any;
        const raw = (cur.rawContent ?? cur.content ?? "") as string;
        const nextRaw = replaceUiBlockInText(raw, modifiedBlock);
        nextRawForDb = nextRaw;

        const { segments } = extractUiSegments(nextRaw);

        updated[idx] = {
          ...cur,
          rawContent: nextRaw,
          segments,
          content: nextRaw,
        };
        return updated;
      });

      if (nextRawForDb) {
        await updateMessageContent({ id: messageId, content: nextRawForDb });
      }
    },
    []
  );

  return {
    ready,
    messages,
    setMessages,
    input,
    setInput,
    isStreaming,
    error,
    isLoadingHistory,
    canSend,
    loadHistory,
    send,
    stop,
    reload,
    addAssistantMessage,
    patchAssistantUiBlock,
  };
}
