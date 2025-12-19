import AppLayout from "@/components/layout/app";
import { useMemo, useState } from "react";
import ConnectedPage from "./connectedPage";
import BookmarkPage from "./bookmarkPage";
import RequestedPage from "./requestedPage";

type PageKey = "bookmark" | "request" | "connected";

const TABS: { key: PageKey; label: string }[] = [
  { key: "bookmark", label: "북마크" },
  { key: "request", label: "연결 요청" },
  { key: "connected", label: "연결 완료" },
];

export default function MyPage() {
  const [currentPage, setCurrentPage] = useState<PageKey>("bookmark");

  const title = useMemo(() => {
    return TABS.find((t) => t.key === currentPage)?.label ?? "마이페이지";
  }, [currentPage]);

  const page = useMemo(() => {
    switch (currentPage) {
      case "bookmark":
        return <BookmarkPage />;
      case "request":
        return <RequestedPage />;
      case "connected":
        return <ConnectedPage />;
    }
  }, [currentPage]);

  return (
    <AppLayout>
      <div className="min-h-screen w-full bg-white">
        {/* Header */}
        <div className="sticky top-0 z-20 w-full border-b border-neutral-200 bg-white/80 backdrop-blur">
          <div className="mx-auto w-full px-4 py-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xl font-semibold tracking-tight text-xgray700">
                  {title}
                </div>
              </div>

              {/* (Optional) Right side action slot */}
              {/* <button className="rounded-xl border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
                설정
              </button> */}
            </div>

            {/* Tabs */}
            <div className="mt-5">
              <div className="inline-flex rounded-2xl border border-neutral-200 bg-neutral-50 p-1">
                {TABS.map((t) => {
                  const active = t.key === currentPage;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setCurrentPage(t.key)}
                      className={[
                        "relative rounded-2xl px-4 py-2 text-sm font-medium transition",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20",
                        active
                          ? "bg-white text-neutral-900 shadow-sm"
                          : "text-neutral-500 hover:text-neutral-800",
                      ].join(" ")}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto w-full px-4 py-8">
          <div className="p-4 sm:p-6">{page}</div>
        </div>
      </div>
    </AppLayout>
  );
}
