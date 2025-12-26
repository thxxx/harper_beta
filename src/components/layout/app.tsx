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
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useQueriesHistory } from "@/hooks/useSearchHistory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { supabase } from "@/lib/supabase";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openHistory, setOpenHistory] = useState(true);

  const { companyUser } = useCompanyUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/my";
  const isList = pathname === "/my/list";

  const userId = companyUser?.user_id;

  const { data: queryItems = [], refetch } = useQueriesHistory(userId);

  const deleteQueryItem = async (queryId: string) => {
    console.log("delete queryItem", queryId);

    const { data, error } = await supabase
      .from("queries")
      .delete()
      .eq("query_id", queryId);
    if (error) {
      console.error("Failed to delete queryItem", error);
    } else {
      refetch();
      console.log("queryItem deleted");
    }
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
              className={`mt-2 flex-row items-center justify-between px-2 my-2 py-1 text-[12px] text-xgray800 cursor-pointer ${
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
                  <div
                    className="group relative flex flex-row items-center justify-between px-2.5 py-1.5 text-white font-normal cursor-pointer rounded-lg gap-1 hover:bg-white/5"
                    key={queryItem.query_id}
                    onClick={() => router.push(`/my/c/${queryItem.query_id}`)}
                  >
                    <div className="flex flex-col items-start w-full">
                      <div className="truncate text-[15px]">
                        {queryItem.query_keyword ?? queryItem.raw_input_text}
                      </div>
                      {!collapsed && (
                        <div className="mt-0.5 text-[13px] text-xgray800">
                          {new Date(queryItem.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-sm hover:bg-bgDark500 h-7 w-7 flex items-center justify-center focus:outline-white/5 focus:ring-white/10"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-40 bg-bgDark400 border-none"
                        align="start"
                      >
                        {/* <DropdownMenuGroup>
                          <DropdownMenuItem>
                            Profile
                            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                          </DropdownMenuItem> */}
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            className="text-red-500 cursor-pointer p-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("delete queryItem", queryItem);
                              deleteQueryItem(queryItem.query_id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <NavItem
              collapsed={collapsed}
              label="Settings"
              icon={<Settings size={18} />}
              onClick={() => {}}
            />
          </div>
        </aside>

        <div className="flex flex-col flex-1 px-4 overflow-y-auto overflow-scroll items-center justify-start min-h-screen bg-bgDark600 text-white">
          {children}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AppLayout);

function NavItem({
  collapsed,
  active = false,
  label,
  icon,
  onClick,
}: {
  collapsed: boolean;
  active?: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex text-base font-extralight items-center gap-3 rounded-[6px] px-3 py-2",
        "transition text-white",
        active ? "bg-bgDark500  shadow-sm" : "bg-transparent hover:bg-white/5",
      ].join(" ")}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && <div className="truncate">{label}</div>}
    </button>
  );
}
