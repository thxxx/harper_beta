import React, { useMemo, useState } from "react";
import type { NextPage } from "next";
import { ArrowUp, Plus, SendHorizonal } from "lucide-react";
import AppLayout from "@/components/layout/app";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { refreshQueriesHistory } from "@/hooks/useSearchHistory";
import { supabase } from "@/lib/supabase";

const Home: NextPage = () => {
  const [query, setQuery] = useState("");
  const { companyUser } = useCompanyUserStore();
  const canSend = query.trim().length > 0;
  const router = useRouter();

  const qc = useQueryClient();

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;

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
      <main className="flex-1 flex items-center justify-center px-6 w-full">
        <div className="w-full flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl font-semibold font-hedvig tracking-tight text-center">
            Who are you looking for?
          </h1>

          <form onSubmit={onSubmit} className="mt-8 w-full max-w-[640px]">
            <div className={`w-full`}>
              <div className="relative rounded-3xl p-1 bg-white/5 border border-white/10">
                <div className="rounded-2xl backdrop-blur-xl">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="국내 대학을 졸업하고 미국 M7에서 AI/ML 경험 있는 사람"
                    rows={4}
                    autoFocus={true}
                    className={[
                      "w-full resize-none rounded-2xl bg-transparent",
                      "px-4 py-4 text-[15px] leading-6 text-white/90",
                      "placeholder:text-white/45",
                      "outline-none",
                      "min-h-[140px]",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    ].join(" ")}
                  />
                </div>
                <div className="flex flex-row items-center justify-center gap-2 absolute right-5 bottom-5">
                  <button
                    type="submit"
                    disabled={!canSend}
                    className={[
                      "inline-flex items-center justify-center rounded-full cursor-pointer hover:opacity-90",
                      "h-11 w-11 bg-white/10 text-white",
                      "transition active:scale-[0.98]",
                    ].join(" ")}
                    aria-label="Send"
                  >
                    <Plus size={20} />
                  </button>
                  <button
                    type="submit"
                    disabled={!canSend}
                    className={[
                      "inline-flex items-center justify-center rounded-full cursor-pointer hover:opacity-90",
                      "h-11 w-11",
                      canSend
                        ? "bg-accenta1 text-black cursor-not-allowed"
                        : "bg-accenta1/50 text-black",
                      "transition active:scale-[0.98]",
                    ].join(" ")}
                    aria-label="Send"
                  >
                    <ArrowUp size={20} />
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="flex flex-row items-center gap-2"></div>
        </div>
      </main>
    </AppLayout>
  );
};

export default Home;
