"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  List,
  Settings,
  ChevronUp,
  ChevronDown,
  PanelLeft,
  PanelLeftOpen,
  Database,
  User,
  LogOut,
} from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useCredits } from "@/hooks/useCredit";
import HistoryItem, { NavItem } from "./HistoryItem";
import { Tooltips } from "../ui/tooltip";
import QueryHistories from "./QueryHistories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { supabase } from "@/lib/supabase";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openHistory, setOpenHistory] = useState(true);
  const { credits, isLoading: isLoadingCredits } = useCredits();

  const { companyUser, loading, initialized } = useCompanyUserStore();

  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    if (!initialized) return; // ✅ 로드 완료 전엔 아무 것도 하지 않음

    if (!companyUser) {
      router.replace("/companies"); // push보다 replace 추천 (뒤로가기로 돌아오는거 방지)
    }
  }, [initialized, companyUser]);

  const pathname = usePathname();
  const isHome = pathname === "/my";
  const isList = pathname === "/my/list";

  const userId = companyUser?.user_id;

  // ✅ /my/c/[queryId] 라면 queryId 읽기 (쿼리스트링 유무 무관)
  const activeQueryId = useMemo(() => {
    // route가 app/my/c/[queryId]/page.tsx 형태라면 params.queryId가 잡힘
    const q = params?.queryId;
    if (typeof q === "string" && q.length > 0) return q;
    if (Array.isArray(q) && q[0]) return q[0];

    // 혹시 파일 구조가 아직 동적 라우트가 아니라면 fallback으로 pathname 파싱
    // /my/c/~~~ 형태에서 ~~~만 추출
    const m = pathname?.match(/^\/my\/c\/([^/?#]+)/);
    return m?.[1] ?? null;
  }, [params, pathname]);

  return (
    <div className="flex h-screen w-full bg-white text-neutral-900 font-roboto overflow-hidden">
      {/* Sidebar */}
      <aside
        className={[
          "relative bg-bgDark900 text-white",
          "shadow-sm h-screen flex flex-col", // flex-col 추가
          collapsed ? "w-[66px]" : "w-[260px]",
          "transition-all duration-300 ease-out flex-shrink-0", // flex-shrink-0 추가
        ].join(" ")}
      >
        {/* 1. Top bar: 고정 */}
        <div className="flex items-center justify-between px-4 pt-4 flex-shrink-0">
          {!collapsed && (
            <div
              className="font-hedvig text-xl font-semibold truncate cursor-pointer"
              onClick={() => router.push("/my")}
            >
              Harper
            </div>
          )}
          <Tooltips text={collapsed ? "Open sidebar" : "Close sidebar"}>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex items-center justify-center rounded-[6px] active:scale-[0.99] transition px-3 py-2 hover:bg-bgDark500"
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeft size={18} />
              )}
            </button>
          </Tooltips>
        </div>

        <div className="flex flex-col mt-4 px-3 gap-1">
          {/* flex-1과 overflow-y-auto를 주어 남은 공간을 차지하고 스크롤 발생 */}
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
            icon={<List size={16} />}
            onClick={() => router.push("/my/list")}
          />
          <div
            onClick={() => setOpenHistory((v) => !v)}
            className={`mt-2 flex-row items-center justify-between px-3 my-2 py-1 text-[12px] text-hgray600 cursor-pointer  ${
              collapsed ? "hidden" : "flex"
            }`}
          >
            <div>History</div>
            <div>
              {openHistory ? (
                <ChevronUp size={16} strokeWidth={1.5} />
              ) : (
                <ChevronDown size={16} strokeWidth={1.5} />
              )}
            </div>
          </div>
        </div>
        {/* 2. Nav & History: 이 영역이 스크롤됨 */}
        <div className="mt-1 px-3 pb-3 gap-1 flex-1 overflow-y-auto">
          {openHistory && userId && (
            <QueryHistories
              collapsed={collapsed}
              userId={userId}
              activeQueryId={activeQueryId}
            />
          )}
        </div>

        {/* 3. Bottom Section: 고정 */}
        <div className="p-3 gap-2 flex flex-col flex-shrink-0 border-t border-white/5">
          <div
            className="cursor-pointer"
            onClick={() => router.push("/my/billing")}
          >
            <div className="rounded-lg p-4 pt-3 flex flex-col gap-2 border border-white/5 transition-color duration-300 ease-out hover:bg-[#FFFFFF12]">
              <div className="w-full flex flex-row items-center justify-between text-[15px]">
                <Database size={14} />
                <div className="w-[65%]">Credits</div>
                <div className="w-[20%] text-right text-xs text-accenta1/80">
                  {credits?.remain_credit ?? 0}
                </div>
              </div>
              <div className="w-full flex relative rounded-full h-1 bg-white/10">
                <div
                  className="absolute left-0 top-0 rounded-full h-1 bg-accenta1 transition-all duration-500 ease-out"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={[
                  "w-full flex text-base font-extralight items-center gap-3 rounded-[6px] px-3 py-2",
                  "transition duration-200 text-white bg-transparent hover:bg-white/10",
                ].join(" ")}
              >
                <div className="shrink-0">
                  <Settings size={18} />
                </div>
                {!collapsed && (
                  <div className="truncate text-[15px] font-normal">
                    {companyUser?.name ?? "Settings"}
                  </div>
                )}

                {/* <NavItem
                  collapsed={collapsed}
                  label={companyUser?.name ?? "Settings"}
                  icon={<Settings size={18} />}
                  onClick={() => {}}
                /> */}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-52 bg-white/5 backdrop-blur-md border-none text-white p-2"
              align="start"
            >
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="flex flex-row gap-1 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push("/my/account");
                  }}
                >
                  <User size={18} />
                  <div>Account</div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex flex-row gap-1 mt-1 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    supabase.auth.signOut();
                    router.push("/companies");
                  }}
                >
                  <LogOut size={18} />
                  <div>Log out</div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        id="app-scroll"
        className="flex-1 h-screen overflow-y-auto bg-hgray200 text-white scroll-smooth"
      >
        {/* overflow-scroll 대신 overflow-y-auto 사용 (필요할 때만 스크롤바 생성) */}
        <div className="max-w-5xl mx-auto px-4 pb-24 min-h-full flex flex-col items-center">
          {!isLoadingCredits && userId && children}
        </div>
      </main>
    </div>
  );
};
export default React.memo(AppLayout);
