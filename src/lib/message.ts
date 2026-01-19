// lib/messages.ts
import { supabase } from "@/lib/supabase";
import type { ChatMessage } from "@/types/chat";

const ID_ROLE = ["user", "assistant"] as const;
const ROLE_ID = {
  user: 0 as const,
  assistant: 1 as const,
} as const;

export async function fetchMessages(queryId: string, userId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("query_id", queryId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const mapped: ChatMessage[] =
    data?.map((r: any) => {
      const role = ID_ROLE[r.role ?? 0];
      const raw = r.content ?? "";

      // ✅ assistant만 파싱해서 blocks 복원
      if (role === "assistant") {
        return {
          id: r.id,
          role,
          content: raw,
          createdAt: r.created_at,
        };
      }

      return {
        id: r.id,
        role,
        content: raw,
        createdAt: r.created_at,
      };
    }) ?? [];

  return mapped;
}

export async function insertMessage(args: {
  queryId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      query_id: args.queryId,
      user_id: args.userId,
      role: ROLE_ID[args.role],
      content: args.content,
    })
    .select("id, role, content, created_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    role: ID_ROLE[data.role ?? 0],
    content: data.content ?? "",
    createdAt: data.created_at,
  } satisfies ChatMessage;
}

export async function updateMessageContent(args: {
  id: string | number;
  content: string;
}) {
  const { error } = await supabase
    .from("messages")
    .update({ content: args.content })
    .eq("id", args.id);

  if (error) throw error;
}
