import React, { useMemo, useState } from "react";
import type { NextPage } from "next";
import { ArrowUp, Plus, SendHorizonal } from "lucide-react";
import AppLayout from "@/components/layout/app";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { refreshQueriesHistory } from "@/hooks/useSearchHistory";
import { Tooltips } from "@/components/ui/tooltip";
import { useCredits } from "@/hooks/useCredit";
import { MIN_CREDITS_FOR_SEARCH } from "@/utils/constantkeys";
import { showToast } from "@/components/toast/toast";
import { supabase } from "@/lib/supabase";
import { ensureGroupBy } from "@/utils/textprocess";

const Home: NextPage = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { companyUser } = useCompanyUserStore();
  const { credits } = useCredits();
  const router = useRouter();
  const canSend = query.trim().length > 0 && credits && !isLoading;

  const qc = useQueryClient();

  const onSubmit = async (e?: React.FormEvent) => {
    setIsLoading(true);
    e?.preventDefault();
    if (!canSend) {
      setIsLoading(false);
      return;
    }
    if (credits.remain_credit <= MIN_CREDITS_FOR_SEARCH) {
      showToast({
        message: "크레딧이 부족합니다.",
        variant: "white",
      });
      setIsLoading(false);
      return;
    }

    console.log("submit:", { query });

    const response = await fetch("/api/search/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queryText: query, userId: companyUser.user_id }),
    });
    const data = await response.json();
    console.log("data ", data);

    if (data.error) {
      alert(data.error);
      return;
    }
    const queryId = data.id;
    refreshQueriesHistory(qc, companyUser.user_id);
    setIsLoading(false);
    setQuery("");
    router.push(`/my/c/${queryId}`);
  };

  const testSql = async () => {
    console.log("testSql");
    const made = `WHERE((fts @@ to_tsquery('english','((aviation | airplane | aircraft | pilot | flying | aeronautics | avionics | flight <-> simulator ) & (developer | engineer | programmer | software))')) OR (((T2.role ILIKE '%developer%') OR (T2.role ILIKE '%engineer%') OR (T2.role ILIKE '%software%') OR (T1.headline ILIKE '%developer%') OR (T1.headline ILIKE '%engineer%') OR (T1.bio ILIKE '%developer%') OR (T1.bio ILIKE '%engineer%')) AND ((T1.bio ILIKE '%aviation%') OR (T1.bio ILIKE '%airplane%') OR (T1.bio ILIKE '%aircraft%') OR (T1.bio ILIKE '%pilot%') OR (T1.bio ILIKE '%flying%') OR (T2.description ILIKE '%flight simulator%') OR (T2.description ILIKE '%avionics%') OR (T3.specialities ILIKE '%aviation%') OR (T3.name ILIKE '%airline%') OR (T5.title ILIKE '%aviation%') OR (T5.title ILIKE '%flight simulator%') OR (T1.bio ILIKE '%비행기%') OR (T1.bio ILIKE '%항공%') OR (T1.headline ILIKE '%비행기%')))) ORDER BY ts_rank(fts, to_tsquery('english','((aviation | airplane | aircraft | pilot | flying | aeronautics | avionics | "flight simulator" ) & (developer | engineer | programmer | software))')) DESC`;
    const sqlQuery = `
SELECT 
  to_json(T1.id) AS id,
  T1.name,
  T1.headline,
  T1.summary
FROM 
  candid AS T1
LEFT JOIN 
  experience_user AS T2 ON T1.id = T2.candid_id
LEFT JOIN 
  company_db AS T3 ON T2.company_id = T3.id
LEFT JOIN
  edu_user AS T4 ON T1.id = T4.candid_id
LEFT JOIN
  publications AS T5 ON T1.id = T5.candid_id
${made}
`;
    const sqlQueryWithGroupBy = ensureGroupBy(sqlQuery, "GROUP BY T1.id");

    // const { data, error } = await supabase.rpc(
    //   "set_timeout_and_execute_raw_sql",
    //   {
    //     sql_query: sqlQueryWithGroupBy,
    //     page_idx: 0,
    //     limit_num: 10,
    //   }
    // );

    // console.log("data ", data, "\n\nError : ", error);
  };

  return (
    <AppLayout>
      <main className="flex-1 flex items-center justify-center px-6 w-full">
        <div className="w-full flex flex-col items-center">
          <h1
            // onClick={() => testSql()}
            className="text-2xl sm:text-3xl font-semibold font-hedvig tracking-tight text-center leading-relaxed"
          >
            Hello, {companyUser?.name}
            <div className="h-3" />
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
                      "px-4 py-4 text-[15px] leading-6 text-white/95",
                      "placeholder:text-hgray600",
                      "outline-none",
                      "min-h-[140px]",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    ].join(" ")}
                  />
                </div>
                <div className="flex flex-row items-center justify-center gap-2 absolute right-5 bottom-5">
                  <Tooltips text="Search by JD file or link">
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
                  </Tooltips>
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
