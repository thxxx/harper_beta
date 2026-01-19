import React, { useMemo, useState } from "react";
import type { NextPage } from "next";
import { ArrowUp, Loader2, Plus, SendHorizonal } from "lucide-react";
import AppLayout from "@/components/layout/app";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { refreshQueriesHistory } from "@/hooks/useSearchHistory";
import { useCredits } from "@/hooks/useCredit";
import { MIN_CREDITS_FOR_SEARCH } from "@/utils/constantkeys";
import { showToast } from "@/components/toast/toast";
import { supabase } from "@/lib/supabase";
import { useMessages } from "@/i18n/useMessage";

const Home: NextPage = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { m } = useMessages();

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

    const response = await fetch("/api/search/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queryText: query, userId: companyUser.user_id }),
    });
    const data = await response.json();

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

  const testSqlQuery = async () => {
    const start = performance.now();
    console.log("testSqlQuery start");
    const sql = `SELECT count(*) AS total_count
FROM candid T1
WHERE 
  -- 1. 고등학교 조건 (과학고)
  EXISTS (
    SELECT 1 FROM edu_user ed1
    WHERE ed1.candid_id = T1.id
      AND ed1.school ILIKE ANY (ARRAY['%Science High School%', '%과학고%', '%과학고등학교%'])
  )
  
  -- 2. 대학교 조건 (서울대/KAIST)
  AND EXISTS (
    SELECT 1 FROM edu_user ed2
    WHERE ed2.candid_id = T1.id
      AND ed2.school ILIKE ANY (ARRAY['%Seoul National University%', '%SNU%', '%서울대%', '%서울대학교%', '%KAIST%', '%카이스트%', '%Korea Advanced Institute of Science and Technology%'])
  )
  
  -- 3. 경력 조건 (빅테크 기업 근무 경험)
  AND EXISTS (
    SELECT 1 FROM experience_user ex 
    LEFT JOIN company_db c ON c.id = ex.company_id 
    WHERE ex.candid_id = T1.id 
      AND (
        c.name ILIKE ANY (ARRAY['%Apple%', '%Microsoft%', '%Alphabet%', '%Google%', '%Amazon%', '%Meta%', '%Facebook%', '%NVIDIA%', '%Tesla%']) 
        OR ex.role ILIKE ANY (ARRAY['%Apple%', '%Microsoft%', '%Alphabet%', '%Google%', '%Amazon%', '%Meta%', '%Facebook%', '%NVIDIA%', '%Tesla%'])
      )
  );`;

    const { data: data1, error: error1 } = await supabase.rpc(
      "set_timeout_and_execute_raw_sql",
      {
        sql_query: sql,
        page_idx: 0,
        limit_num: 50,
        offset_num: 0,
      }
    );

    console.log(data1, error1);
    const end = performance.now();
    console.log("testSqlQuery time", end - start);
  };

  return (
    <AppLayout>
      <main className="flex-1 flex font-sans items-center justify-center px-6 w-full">
        <div className="w-full flex flex-col items-center">
          <h1
            className="text-2xl sm:text-3xl font-medium tracking-tight text-center leading-relaxed"
            onClick={testSqlQuery}
          >
            {m.system.hello}, {companyUser?.name.split(" ")[0]}님
            <div className="h-3" />
            {m.system.intro}
          </h1>

          <form className="mt-8 w-full max-w-[640px]">
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
                  {/* <Tooltips text="Search by JD file or link">
                    <button
                      disabled={!canSend}
                      className={[
                        "inline-flex items-center justify-center rounded-full cursor-pointer hover:opacity-90",
                        "h-11 w-11 bg-white/10 text-white",
                        "transition active:scale-[0.98]",
                      ].join(" ")}
                      aria-label="Send"
                    >
                      <Plus size={20} color="white" />
                    </button>
                  </Tooltips> */}
                  <button
                    onClick={onSubmit}
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
                    {isLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <ArrowUp size={20} />
                    )}
                  </button>
                </div>
              </div>
              <div className="w-full flex flex-row items-start justify-between gap-4 mt-6">
                <ExampleQuery
                  query="국내 과학고 졸업 후 서울대 / KAIST에 진학하여 미국 M7에서 AI / Machine Learning 경험 2년 이하 보유한 사람"
                  onClick={(v) => setQuery(v)}
                />
                <ExampleQuery
                  query="네카라쿠배 출신 프로덕트 매니저 + 개발 역량 보유"
                  onClick={(v) => setQuery(v)}
                />
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

const ExampleQuery = ({
  query,
  onClick,
}: {
  query: string;
  onClick: (v: string) => void;
}) => {
  return (
    <div
      className={[
        "group relative w-full cursor-pointer",
        "rounded-2xl py-5 px-6",
        "bg-white/5 text-hgray900 text-sm",
        "border border-white/0",
        "transition-all duration-200 ease-out",
        "hover:border-white/5 hover:-translate-y-[2px]",
        "active:translate-y-[0px] active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
      ].join(" ")}
      onClick={() => onClick(query)}
      role="button"
      tabIndex={0}
    >
      {query}
    </div>
  );
};
