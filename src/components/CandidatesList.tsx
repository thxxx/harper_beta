import {
  CandidateTypeWithConnection,
  ExperienceUserType,
} from "@/hooks/useSearchCandidates";
import React, { useEffect, useMemo, useState } from "react";
import { koreaUniversityEnToKo, toKoreanMonth } from "@/utils/language_map";
import { supabase } from "@/lib/supabase";
import { useCompanyModalStore } from "@/store/useModalStore";
import { useQueryClient } from "@tanstack/react-query";
import NameProfile from "./NameProfile";
import Bookmarkbutton from "./ui/bookmarkbutton";
import Requestbutton from "./ui/requestbutton";
import { QueryType } from "@/types/type";

const asArr = (v: any) => (Array.isArray(v) ? v : []);

enum SummaryScore {
  SATISFIED = "만족",
  AMBIGUOUS = "모호",
  UNSATISFIED = "불만족",
}

export default function CandidateCard({
  c,
  userId,
  isMyList = false,
  queryItem = null,
}: {
  c: CandidateTypeWithConnection;
  userId: string;
  isMyList?: boolean;
  queryItem?: QueryType | null;
}) {
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [synthesizedSummary, setSynthesizedSummary] = useState<
    {
      score: string;
      reason: string;
    }[]
  >([]);

  useEffect(() => {
    console.log("c.synthesized_summary ", c.synthesized_summary);
    if (c.synthesized_summary && c.synthesized_summary[0]?.text) {
      const temp = JSON.parse(c.synthesized_summary[0]?.text);
      console.log("temp ", temp);
      const summaries = temp.map((item: any) => {
        const score = item.split(",")[0];
        const reason = item.split(",").slice(1).join(",");
        return { score, reason };
      });
      console.log("summaries ", summaries);
      setSynthesizedSummary(summaries);
    }
  }, [c.synthesized_summary]);

  useEffect(() => {
    if (
      queryItem &&
      c.synthesized_summary &&
      c.synthesized_summary.length === 0
    ) {
      setIsLoadingSummary(true);
      const fetchSummary = async () => {
        const res = await fetch("/api/search/criteria_summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doc: c,
            queryId: queryItem.query_id,
            criteria: queryItem.criteria,
            raw_input_text: queryItem.raw_input_text,
          }),
        });
        if (!res.ok) throw new Error("Make synthesized_summary api failed");
        const data = await res.json();
        console.log("data ", data);
        setSynthesizedSummary(data?.result ?? []);
        setIsLoadingSummary(false);
      };
      fetchSummary();
    }
  }, []);

  const exps = asArr(c.experience_user ?? []);
  const edus = asArr(c.edu_user ?? []);

  const firstCompany = exps[exps.length - 1];
  const latestCompany = exps[0];
  const school = useMemo(() => {
    return edus[0];
    // const school = pickSchool(edus);
    // if (!school) return null;
    // return koreaUniversityEnToKo(school);
  }, [edus]);

  let isOnlyOneCompany = false;
  if (exps.length === 1) {
    isOnlyOneCompany = true;
  }

  return (
    <div
      key={c.id}
      className="w-full rounded-[28px] text-white bg-bgDark500 p-6"
    >
      <div className="flex flex-row flex-1 items-start gap-4">
        <div className="w-[40%]">
          <NameProfile
            id={c.id}
            profile_picture={c.profile_picture ?? ""}
            name={c.name ?? ""}
            headline={c.headline ?? ""}
            location={c.location ?? ""}
          />
        </div>

        <div className="mt-0 flex flex-col gap-3 w-[70%]">
          {!isOnlyOneCompany && latestCompany && (
            <CompanyCard company={latestCompany} text="최근 경력" />
          )}
          {firstCompany && (
            <CompanyCard
              company={firstCompany}
              text={isOnlyOneCompany ? "경력 1개" : "첫 경력"}
            />
          )}
          {school && (
            <div className="flex flex-row items-start justify-start font-normal">
              <div className="text-xgray800 text-sm min-w-24 pt-0.5">학교</div>
              <div className="flex flex-col gap-0.5 text-sm w-full">
                <div className="flex flex-row items-center justify-between">
                  <div
                    className="text-white hover:underline cursor-pointer"
                    // onClick={() => window.open(school.school_url, "_blank")}
                  >
                    {koreaUniversityEnToKo(school.school)}
                    {school.degree && (
                      <span className="text-xgray800">
                        {" "}
                        &nbsp; {school.degree}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 text-white leading-relaxed font-light">
        {isLoadingSummary ? (
          <div className="text-[15px]">Generating summary...</div>
        ) : (
          <div>
            {synthesizedSummary.map((item, index) => (
              <div key={index}>
                <span
                  className={`
                  py-1 px-2 rounded-sm text-[15px] border
                  ${
                    item.score === SummaryScore.SATISFIED
                      ? "border-green-500"
                      : item.score === SummaryScore.AMBIGUOUS
                      ? "border-yellow-500"
                      : "border-red-500"
                  }
                  `}
                >
                  {queryItem?.criteria?.[index]} : {item.score}
                </span>
                <div
                  className="mt-1 text-[15px]"
                  dangerouslySetInnerHTML={{ __html: item.reason }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-row items-center justify-start mt-4 gap-2 w-full">
        <Bookmarkbutton
          userId={userId}
          candidId={c.id}
          connection={c.connection}
          isText={false}
        />
        <Requestbutton c={c} />
      </div>
    </div>
  );
}

export async function fetchCompanyDb(companyId: number) {
  console.log("fetchCompanyDb", companyId);

  const { data, error } = await supabase
    .from("company_db")
    .select("*")
    .eq("id", companyId)
    .maybeSingle(); // 없으면 null

  if (error) throw error;
  return data ?? null;
}

const CompanyCard = ({
  company,
  text,
}: {
  company: ExperienceUserType;
  text: string;
}) => {
  const startDate = useMemo(() => {
    return toKoreanMonth(company.start_date ?? "");
  }, [company.start_date]);
  const endDate = useMemo(() => {
    return toKoreanMonth(company.end_date ?? "");
  }, [company.end_date]);

  const open = useCompanyModalStore((s) => s.open);

  const qc = useQueryClient();

  const openCompany = async () => {
    const companyId = Number(company.company_id);
    console.log("companyId", companyId);
    const queryKey = ["company_db", companyId];

    const state = qc.getQueryState(queryKey);
    console.log("query state:", state);

    if (!Number.isFinite(companyId) || company.company_id === 0) {
      window.open(company.company_db.linkedin_url, "_blank");
      return;
    }

    try {
      const data = await qc.fetchQuery({
        queryKey: ["company_db", companyId],
        queryFn: () => fetchCompanyDb(companyId),
        staleTime: 1000 * 60 * 30, // 30분 동안 fresh (원하는대로)
        gcTime: 1000 * 60 * 60 * 6, // 6시간 캐시 유지
      });

      if (!data) window.open(company.company_db.linkedin_url, "_blank");
      else open({ company: data });
    } catch {
      // 에러면 그냥 링크로 fallback
      window.open(company.company_db.linkedin_url, "_blank");
    }
  };

  return (
    <div className="flex flex-row items-start justify-start font-normal">
      <div className="text-xgray800 text-sm min-w-24 pt-0.5">{text}</div>
      <div className="flex flex-col gap-1 text-sm w-full">
        <div className="flex flex-row items-center justify-between">
          <div
            className="text-white hover:underline cursor-pointer"
            onClick={() => openCompany()}
          >
            {company.company_db.name}
          </div>
          <div className="text-xgray800 text-xs">
            {startDate} -{" "}
            {endDate ? endDate : <span className="text-accenta1">Present</span>}
          </div>
        </div>
        <div className="flex flex-row items-center justify-between text-xgray800">
          <div>{company.role}</div>
        </div>
      </div>
    </div>
  );
};
