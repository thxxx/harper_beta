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
      <div className="min-h-screen w-full">
        {/* Header */}
        <div className="sticky top-0 z-20 w-full bg-bgDark600 backdrop-blur">
          <div className="mx-auto w-full px-4 py-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-2xl font-light tracking-tight text-white">
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
              {/* <div className="inline-flex rounded-2xl border border-bgDark400 bg-bgDark500 p-1"> */}
              <div className="inline-flex rounded-2xl p-1">
                {TABS.map((t) => {
                  const active = t.key === currentPage;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setCurrentPage(t.key)}
                      className={[
                        "relative rounded-2xl px-5 py-3 text-sm font-medium transition",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20",
                        active
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-xgray800 hover:text-white",
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
          <div className="">{page}</div>
        </div>
      </div>
    </AppLayout>
  );
}
