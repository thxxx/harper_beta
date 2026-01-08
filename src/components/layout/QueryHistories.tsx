import { useQueriesHistory } from "@/hooks/useSearchHistory";
import { supabase } from "@/lib/supabase";
import React from "react";
import HistoryItem from "./HistoryItem";
import { useMessages } from "@/i18n/useMessage";

const QueryHistories = ({
  collapsed,
  userId,
  activeQueryId,
}: {
  collapsed: boolean;
  userId: string;
  activeQueryId: string | null;
}) => {
  const { m } = useMessages();
  // fetchNextPage, hasNextPage, isFetchingNextPage 추가
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useQueriesHistory(userId);

  // 2차원 배열인 data.pages를 1차원 배열로 평탄화
  const queryItems = data?.pages.flatMap((page) => page) ?? [];

  const deleteQueryItem = async (queryId: string) => {
    const { error } = await supabase
      .from("queries")
      .update({ is_deleted: true })
      .eq("query_id", queryId);

    if (error) {
      console.error("Failed to delete queryItem", error);
      return;
    }
    refetch(); // 삭제 후 리프레시
  };

  return (
    <div className={`flex-col gap-2 ${collapsed ? "hidden" : "flex"}`}>
      {queryItems.map((queryItem: any) => (
        <HistoryItem
          key={queryItem.query_id}
          queryItem={queryItem}
          onDelete={deleteQueryItem}
          collapsed={collapsed}
          isActive={activeQueryId === queryItem.query_id}
        />
      ))}

      {/* 무한 스크롤 트리거: 간단하게 버튼으로 구현하거나, 
          추후 Intersection Observer(react-intersection-observer)를 붙이면 좋습니다. */}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="text-xs text-gray-500 py-2 hover:text-white transition-all duration-200"
        >
          {isFetchingNextPage ? "Loading..." : m.system.loadmore}
        </button>
      )}
    </div>
  );
};

export default React.memo(QueryHistories);
