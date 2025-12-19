"use client";
import React, { useEffect, useState } from "react";
import { Menu, Search, List, Settings, ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useQueriesHistory } from "@/hooks/useSearchHistory";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { companyUser } = useCompanyUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/my";
  const isList = pathname === "/my/list";

  const userId = companyUser?.user_id;

  const { data: queryItems = [], isLoading } = useQueriesHistory(userId);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-inter">
      <div className="flex max-h-screen">
        {/* Sidebar */}
        <aside
          className={[
            "relative bg-neutral-100/80 border-r border-neutral-200",
            "shadow-sm overflow-hidden h-screen",
            collapsed ? "w-[86px]" : "w-[260px]",
            "transition-all duration-300 ease-out",
          ].join(" ")}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-4">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white/80 hover:bg-white active:scale-[0.99] transition px-3 py-2"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* {!collapsed && (
              <div className="text-sm font-medium text-neutral-500 pr-1">
                Main · Home
              </div>
            )} */}
          </div>

          {/* Nav */}
          <div className="mt-4 px-3 pb-3">
            <NavItem
              collapsed={collapsed}
              active={isHome}
              label="Search"
              icon={<Search size={18} />}
              onClick={() => router.push("/my")}
            />
            <NavItem
              collapsed={collapsed}
              active={isList}
              label="Activity / List"
              icon={<List size={18} />}
              onClick={() => router.push("/my/list")}
            />

            <div className="flex flex-col gap-2 mt-4">
              {queryItems.map((queryItem) => (
                <div
                  className="px-2 py-1 hover:bg-xgray300/50 text-xgray700 text-sm cursor-pointer rounded-md gap-1"
                  key={queryItem.query_id}
                  onClick={() => router.push(`/my/c/${queryItem.query_id}`)}
                >
                  <div className="text-sm font-medium truncate">
                    {queryItem.query}
                  </div>
                  {!collapsed && (
                    <div className="text-xs text-xgray500">
                      {new Date(queryItem.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="h-px bg-neutral-200 mb-3" />
            <NavItem
              collapsed={collapsed}
              label="Settings"
              icon={<Settings size={18} />}
              onClick={() => {}}
            />
          </div>
        </aside>

        <div className="flex flex-col flex-1 overflow-y-auto overflow-scroll items-center justify-start min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;

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
        "w-full flex items-center gap-3 rounded-2xl px-4 py-3",
        "transition border",
        active
          ? "bg-white border-neutral-200 text-neutral-900 shadow-sm"
          : "bg-transparent border-transparent text-neutral-700 hover:bg-white/60 hover:border-neutral-200",
      ].join(" ")}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && (
        <div className="text-sm font-medium truncate">{label}</div>
      )}
    </button>
  );
}
