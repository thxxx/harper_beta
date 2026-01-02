"use client";
import React, { useEffect, useState } from "react";
import {
  Menu,
  Search,
  List,
  Settings,
  ChevronLeft,
  MoreHorizontal,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  PanelLeft,
  PanelLeftOpen,
  DatabaseBackup,
  Database,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useQueriesHistory } from "@/hooks/useSearchHistory";
import { supabase } from "@/lib/supabase";
import { useCredits } from "@/hooks/useCredit";
import HistoryItem, { NavItem } from "./HistoryItem";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openHistory, setOpenHistory] = useState(true);
  const { credits, isLoading: isLoadingCredits } = useCredits();

  const { companyUser } = useCompanyUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/my";
  const isList = pathname === "/my/list";

  const userId = companyUser?.user_id;

  const { data: queryItems = [], refetch } = useQueriesHistory(userId);

  const deleteQueryItem = async (queryId: string) => {
    const { data, error } = await supabase
      .from("queries")
      .update({ is_deleted: true })
      .eq("query_id", queryId)
      .select();
    if (error) {
      console.error("Failed to delete queryItem", error);
      return;
    }
    refetch();
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-roboto">
      <div className="flex max-h-screen">
        {/* Sidebar */}
        <aside
          className={[
            "relative bg-bgDark900 text-white",
            "shadow-sm overflow-hidden h-screen",
            collapsed ? "w-[66px]" : "w-[260px]",
            "transition-all duration-300 ease-out",
          ].join(" ")}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-4">
            {!collapsed && (
              <div className="font-hedvig text-xl font-semibold truncate">
                Harper
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex items-center justify-center rounded-[6px] active:scale-[0.99] transition px-3 py-2 hover:bg-bgDark500"
              aria-label="Toggle sidebar"
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeft size={18} />
              )}
            </button>

            {/* {!collapsed && (
              <div className="text-sm font-medium text-neutral-500 pr-1">
                Main · Home
              </div>
            )} */}
          </div>

          {/* Nav */}
          <div className="mt-4 px-3 pb-3 gap-1 flex flex-col">
            <NavItem
              collapsed={collapsed}
              active={isHome}
              label="Search"
              icon={<Search size={16} />}
              onClick={() => router.push("/my")}
            />
            <NavItem
              collapsed={collapsed}
              active={isList}
              label="Activity / List"
              icon={<List size={18} />}
              onClick={() => router.push("/my/list")}
            />

            <div
              onClick={() => setOpenHistory((v) => !v)}
              className={`mt-2 flex-row items-center justify-between px-2 my-2 py-1 text-[13px] text-hgray600 cursor-pointer ${
                collapsed ? "hidden" : "flex"
              }`}
            >
              <div>History</div>
              <div>
                {openHistory ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </div>
            </div>
            {openHistory && (
              <div
                className={`flex-col gap-2 ${collapsed ? "hidden" : "flex"}`}
              >
                {queryItems.map((queryItem) => (
                  <HistoryItem
                    key={queryItem.query_id}
                    queryItem={queryItem}
                    onDelete={deleteQueryItem}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3 gap-2 flex flex-col">
            <div
              className="cursor-pointer"
              onClick={() => router.push("/my/billing")}
            >
              <div className="rounded-xl p-4 pt-3 flex flex-col gap-2 bg-white/5 border border-white/10 transition-color duration-300 ease-out cursor-pointer hover:bg-[#FFFFFF12]">
                <div className="w-full flex flex-row items-center justify-between text-[15px]">
                  <Database size={14} />
                  <div className="w-[65%]">Credits</div>
                  <div className="w-[20%] text-right text-xs text-accenta1/80">
                    {credits?.remain_credit ?? 0}
                  </div>
                </div>
                <div className="w-full flex relative rounded-full h-1 bg-white/10">
                  <div
                    className="w-full flex absolute left-0 top-0 rounded-full h-1 bg-accenta1 transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(
                        ((credits?.remain_credit ?? 0) /
                          (credits?.charged_credit ?? 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <NavItem
              collapsed={collapsed}
              label="Settings"
              icon={<Settings size={18} />}
              onClick={() => {}}
            />
          </div>
        </aside>

        <div className="flex flex-col flex-1 px-4 overflow-y-auto overflow-scroll items-center justify-start min-h-screen bg-hgray200 text-white">
          {!isLoadingCredits && children}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AppLayout);
