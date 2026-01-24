// components/result/ResultHeader.tsx
import React, { useCallback, useMemo } from "react";
import { Clock, Loader2, Tags, ThumbsDown, ThumbsUp } from "lucide-react";
import { dateToFormatLong } from "@/utils/textprocess";
import { supabase } from "@/lib/supabase";

type Props = {
  queryItem: any;
  isFirst: boolean;
  isLoading: boolean;
  runId: string;
  status: string;
  feedback: number;
};

export default function ResultHeader({
  queryItem,
  isFirst,
  isLoading,
  runId,
  status,
  feedback,
}: Props) {

  const statusMessage = useMemo(() => {
    return status;
  }, [status]);

  // implement like (= runs.feedback = 1)
  const like = useCallback(() => {
    if (!runId) return;
    supabase.from("runs").update({ feedback: feedback === 1 ? 0 : 1 }).eq("id", runId).then(({ error }) => {
      if (error) {
        console.error("Like feedback update failed:", error);
      }
    });
  }, [feedback, runId]);

  // implement dislike (= runs.feedback = -1)
  const dislike = useCallback(() => {
    if (!runId) return;
    supabase.from("runs").update({ feedback: feedback === -1 ? 0 : -1 }).eq("id", runId).then(({ error }) => {
      if (error) {
        console.error("Dislike feedback update failed:", error);
      }
    });

  }, [feedback, runId]);

  if (!queryItem) return null;

  return (
    <>
      <div className="w-full h-full py-2 flex flex-row items-center justify-between px-4">
        <div className="text-sm text-hgray600 font-normal flex flex-row items-center justify-start gap-4">
          <div>
            {queryItem.company_users ? (
              <>By {queryItem.company_users.name}</>
            ) : (
              ""
            )}
          </div>
          {queryItem.created_at ? (
            <div className="flex flex-row items-center justify-start gap-1 text-xs">
              <Clock className="w-3 h-3" />
              {dateToFormatLong(queryItem.created_at)}
            </div>
          ) : (
            ""
          )}
        </div>
        <div className="flex flex-row items-center justify-center gap-4 text-hgray600">
          <button onClick={like} className="p-1.5 rounded-sm hover:bg-white/10 cursor-pointer">
            <ThumbsUp className={`w-3.5 h-3.5`} fill={feedback === 1 ? "rgba(255,255,255,0.9)" : "none"} strokeWidth={1.6} />
          </button>
          <button onClick={dislike} className="p-1.5 rounded-sm hover:bg-white/10 cursor-pointer">
            <ThumbsDown className={`w-3.5 h-3.5`} fill={feedback === -1 ? "rgba(255,255,255,0.9)" : "none"} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="w-full h-full flex flex-col gap-1 items-center justify-center min-h-[80vh]">
          {/* {queryItem.criteria && queryItem.criteria.length > 0 && (
          <div className="flex flex-row items-end justify-between mb-2">
          <div className="text-sm text-hgray900 mt-4 flex flex-col gap-2">
          <div className="font-hedvig flex flex-row items-center justify-start gap-1">
          <Tags className="w-4 h-4" strokeWidth={1.6} /> Criteri
          </div>
          <div className="flex flex-row gap-2 flex-wrap">
          {queryItem.criteria.map((item: string) => (
            <span
            key={item}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-hgray900"
            >
            {item}
            </span>
            ))}
            </div>
            </div>
            </div>
            )} */}

          {isLoading && (
            <div className="text-sm font-light mt-4 text-hgray900 flex flex-row gap-2 items-center">
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              <div className="animate-textGlow">로딩중...</div>
            </div>
          )}
          {isLoading && statusMessage && (
            <div className="text-sm font-light mt-1 text-hgray900 flex flex-row gap-2 items-center">
              <div className="animate-textGlow">{statusMessage}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
