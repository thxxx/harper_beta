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
import { buildSummary, ensureGroupBy } from "@/utils/textprocess";
import { supabase } from "@/lib/supabase";
import { transformSql } from "@/app/api/search/utils";
import { xaiInference } from "@/lib/llm/llm";
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

  //   // (p.title ILIKE '%TTS%' OR p.title ILIKE '%Text-to-Speech%' OR p.title ILIKE '%Speech Synthesis%' OR p.title ILIKE '%Voice Synthesis%' OR p.title ILIKE '%Speech Generation%' OR p.title ILIKE '%Speech-to-Speech%' OR p.title ILIKE '%Vocoder%' OR p.title ILIKE '%WaveNet%' OR p.title ILIKE '%Tacotron%' OR p.title ILIKE '%FastSpeech%')
  //   const testSql = async () => {
  //     console.log("testSql");
  //     const sqlQuery = `
  // WITH params AS (
  //   SELECT to_tsquery('english', '(machine <-> learning) | ML | MLE | (deep <-> learning)') AS tsq
  // ),
  // -- [1단계] 필터링 및 ID 확정 (Phase 1: ID-only Filtering)
  // -- 무거운 컬럼이나 JSON 연산 없이 오직 ID와 정렬 순서만 결정합니다.
  // identified_ids AS (
  //   SELECT
  //     T1.id,
  //     ts_rank(T1.fts, params.tsq) AS fts_rank
  //   FROM candid AS T1
  //   CROSS JOIN params
  //   WHERE
  //     -- 학교 조건 1: 서울과고
  //     EXISTS (
  //       SELECT 1 FROM edu_user e1
  //       WHERE e1.candid_id = T1.id
  //         AND e1.school ILIKE ANY (ARRAY['%서울과학고%', '%서울과학고등학교%', '%Seoul Science High School%', '%SSHS%'])
  //     )
  //     -- 학교 조건 2: KAIST
  //     AND EXISTS (
  //       SELECT 1 FROM edu_user e2
  //       WHERE e2.candid_id = T1.id
  //         AND e2.school ILIKE ANY (ARRAY['%KAIST%', '%카이스트%', '%Korea Advanced Institute of Science and Technology%'])
  //     )
  //     -- 경력 및 키워드 조건
  //     AND EXISTS (
  //       SELECT 1 FROM experience_user ex
  //       WHERE ex.candid_id = T1.id
  //         AND (
  //           ex.role ILIKE ANY (ARRAY['%machine learning%', '%ML%', '%MLE%', '%AI engineer%', '%AI researcher%', '%deep learning%'])
  //           OR T1.headline ILIKE ANY (ARRAY['%machine learning%', '%ML%', '%MLE%', '%AI engineer%', '%AI researcher%', '%deep learning%'])
  //           OR T1.fts @@ params.tsq
  //         )
  //     )
  //   ORDER BY fts_rank DESC, T1.id
  //   LIMIT 100 -- 여기서 100건만 남기고 나머지는 버립니다.
  // )
  // -- [2단계] 확정된 100건에 대해서만 상세 정보 및 JSON 집계 (Phase 2: Hydration)
  // SELECT
  //   to_json(i.id) AS id,
  //   c.name,
  //   c.headline,
  //   c.location,
  //   i.fts_rank,
  //   COALESCE(edu_block.edu_rows, '[]'::jsonb) AS edu_user,
  //   COALESCE(exp_block.experience_rows, '[]'::jsonb) AS experience_user
  // FROM identified_ids i
  // JOIN candid c ON c.id = i.id -- 기본 정보 조인
  // LEFT JOIN LATERAL (
  //   SELECT jsonb_agg(to_jsonb(e)) AS edu_rows
  //   FROM edu_user e
  //   WHERE e.candid_id = i.id
  // ) edu_block ON TRUE
  // LEFT JOIN LATERAL (
  //   SELECT jsonb_agg(
  //     (to_jsonb(ex) || jsonb_build_object('company_db', jsonb_build_object(
  //       'name', comp.name,
  //       'investors', comp.investors,
  //       'short_description', comp.short_description
  //     )))
  //   ) AS experience_rows
  //   FROM experience_user ex
  //   LEFT JOIN company_db comp ON comp.id = ex.company_id
  //   WHERE ex.candid_id = i.id
  // ) exp_block ON TRUE
  // ORDER BY i.fts_rank DESC, i.id
  // `;
  //     const sqlQueryWithGroupBy2 = ensureGroupBy(sqlQuery, "");
  //     console.log("sqlQueryWithGroupBy2 === \n", sqlQueryWithGroupBy2, "\n---\n");

  //     const start_time = performance.now();
  //     const { data, error } = await supabase.rpc(
  //       "set_timeout_and_execute_raw_sql",
  //       {
  //         sql_query: sqlQueryWithGroupBy2,
  //         page_idx: 0,
  //         limit_num: 50,
  //       }
  //     );
  //     const end_time = performance.now();
  //     console.log("time ", end_time - start_time);
  //     console.log("data ", data, "\n\nError : ", error);

  //     // const information = buildSummary(data?.[0]?.[0]);
  //     // console.log("information ", information);
  //   };

  return (
    <AppLayout>
      <main className="flex-1 flex items-center justify-center px-6 w-full">
        <div className="w-full flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl font-medium font-hedvig tracking-tight text-center leading-relaxed">
            {m.system.hello}, {companyUser?.name.split(" ")[0]}
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
                  <Tooltips text="Search by JD file or link">
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
                  </Tooltips>
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
                    <ArrowUp size={20} />
                  </button>
                </div>
              </div>
              <div className="w-full flex flex-row items-start justify-between gap-4 mt-6">
                <ExampleQuery
                  query="국내 과학고 졸업 후 서울대 / KAIST에 진학하여 미국 M7에서 AI / Machine Learning 경험 2년 이하 보유한 사람"
                  onClick={() => setQuery(query)}
                />
                <ExampleQuery
                  query="네카라쿠배 출신 프로덕트 매니저 + 개발 역량 보유"
                  onClick={() => setQuery(query)}
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
  onClick: () => void;
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
      onClick={() => onClick()}
      role="button"
      tabIndex={0}
    >
      {query}
    </div>
  );
};
