// components/result/ResultHeader.tsx
import React, { useMemo } from "react";
import { Clock, Loader2, Tags, ThumbsDown, ThumbsUp } from "lucide-react";
import { dateToFormatLong } from "@/utils/textprocess";
import { useRunDetail } from "@/hooks/useRunDetail";

type Props = {
  queryItem: any;
  isFirst: boolean;
  isLoading: boolean;
  runId: string;
};

export default function ResultHeader({
  queryItem,
  isFirst,
  isLoading,
  runId,
}: Props) {
  const q = useRunDetail(runId);

  const statusMessage = useMemo(() => {
    return q.data?.status;
  }, [q.data]);

  if (!queryItem) return null;

  return (
    <>
      <div className="w-full py-2 flex flex-row items-center justify-between px-4">
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
          <button>
            <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.6} />
          </button>
          <button>
            <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div className="w-full flex flex-col gap-1">
        {/* {queryItem.criteria && queryItem.criteria.length > 0 && (
          <div className="flex flex-row items-end justify-between mb-2">
            <div className="text-sm text-hgray900 mt-4 flex flex-col gap-2">
              <div className="font-hedvig flex flex-row items-center justify-start gap-1">
                <Tags className="w-4 h-4" strokeWidth={1.6} /> Criteria
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
          <div className="text-sm font-light mt-4 text-hgray900 flex flex-row gap-2 items-center">
            <div className="animate-textGlow">{statusMessage}</div>
          </div>
        )}
      </div>
    </>
  );
}
