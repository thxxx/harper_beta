import React, { useMemo, useState } from "react";
import type { NextPage } from "next";
import { SendHorizonal } from "lucide-react";
import AppLayout from "@/components/layout/app";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { refreshQueriesHistory } from "@/hooks/useSearchHistory";

const Home: NextPage = () => {
  const [query, setQuery] = useState("");
  const { companyUser } = useCompanyUserStore();
  const canSend = query.trim().length > 0;
  const router = useRouter();

  const qc = useQueryClient();

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;

    // TODO: Replace with your real routing / API call
    console.log("submit:", { query });

    const response = await fetch("/api/search/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queryText: query, userId: companyUser.user_id }),
    });
    console.log("response ", response);
    const data = await response.json();
    console.log("data ", data);
    if (data.error) {
      alert(data.error);
      return;
    }
    const queryId = data.id;
    refreshQueriesHistory(qc, companyUser.user_id);
    router.push(`/my/c/${queryId}`);

    setQuery("");
  };

  return (
    <AppLayout>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-3xl flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 text-center">
            Who are you looking for?
          </h1>

          <form onSubmit={onSubmit} className="mt-8 w-full max-w-xl">
            <div className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white shadow-sm px-5 py-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색어를 입력해주세요."
                className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-neutral-400"
              />
              <button
                type="submit"
                disabled={!canSend}
                className={[
                  "inline-flex items-center justify-center rounded-full",
                  "h-10 w-10 border border-neutral-200",
                  canSend
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "bg-neutral-100 text-neutral-400 cursor-not-allowed",
                  "transition active:scale-[0.98]",
                ].join(" ")}
                aria-label="Send"
              >
                <SendHorizonal size={18} />
              </button>
            </div>

            <div className="mt-3 text-xs text-neutral-400 text-center">
              Tip: try “Senior LLM engineer with Rust + CUDA optimization
              experience”
            </div>
          </form>
        </div>
      </main>
    </AppLayout>
  );
};

export default Home;
