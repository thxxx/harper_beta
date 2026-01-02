import {
  CandidateTypeWithConnection,
  ExperienceUserType,
} from "@/hooks/useSearchCandidates";
import React, { useMemo } from "react";
import { koreaUniversityEnToKo } from "@/utils/language_map";
import { useCompanyModalStore } from "@/store/useModalStore";
import { useQueryClient } from "@tanstack/react-query";
import NameProfile from "./NameProfile";
import Bookmarkbutton from "./ui/bookmarkbutton";
import Requestbutton from "./ui/requestbutton";
import { QueryType } from "@/types/type";
import { dateToFormat } from "@/utils/textprocess";
import { useSynthesizedSummary } from "@/hooks/useSynthesizedSummary";

const asArr = (v: any) => (Array.isArray(v) ? v : []);

enum SummaryScore {
  SATISFIED = "만족",
  AMBIGUOUS = "모호",
  UNSATISFIED = "불만족",
}

type ParsedSummary = { score: string; reason: string };

function parseSummaryText(
  summaryText: string | null | undefined
): ParsedSummary[] {
  if (!summaryText) return [];
  try {
    const temp = JSON.parse(summaryText);
    if (!Array.isArray(temp)) return [];
    return temp.map((item: any) => {
      // 기존: "만족,이유..." 형태의 string이라고 가정
      const str = String(item ?? "");
      const score = str.split(",")[0] ?? "";
      const reason = str.split(",").slice(1).join(",") ?? "";
      return { score, reason };
    });
  } catch {
    return [];
  }
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
  const queryId = queryItem?.query_id;
  const candidId = c.id;

  const { data: summaryRow, isLoading: isLoadingSummary } =
    useSynthesizedSummary({
      queryId,
      candidId,
      doc: c,
      criteria: queryItem?.criteria ?? [],
      raw_input_text: queryItem?.raw_input_text ?? null,
      enabled: !!queryItem && !!queryItem.criteria?.length,
      text: c.synthesized_summary?.[0]?.text ?? null,
    });

  const synthesizedSummary = useMemo(() => {
    if (summaryRow) return parseSummaryText(summaryRow);
  }, [summaryRow]);

  const exps = asArr(c.experience_user ?? []);
  const edus = asArr(c.edu_user ?? []);

  const firstCompany = exps[exps.length - 1];
  const latestCompany = exps[0];
  const school = useMemo(() => edus[0], [edus]);

  const isOnlyOneCompany = exps.length === 1;

  return (
    <div key={c.id} className="w-full rounded-[28px] text-white bg-white/5 p-6">
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
            <CompanyCard company={latestCompany} text="Prior Experience" />
          )}
          {firstCompany && (
            <CompanyCard
              company={firstCompany}
              text={isOnlyOneCompany ? "Single Experience" : "First Career"}
            />
          )}
          {school && (
            <div className="flex flex-row items-start justify-start font-normal pt-3 border-t border-white/5">
              <div className="text-hgray600 text-sm min-w-24 pt-0.5 font-light">
                Education
              </div>
              <div className="flex flex-col gap-0.5 text-sm w-full">
                <div className="flex flex-row items-center justify-between">
                  <div className="text-white hover:underline cursor-pointer">
                    {koreaUniversityEnToKo(school.school)}
                    {school.degree && (
                      <span className="text-hgray600 font-light">
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

      <div className="mt-8 text-hgray700 leading-relaxed font-light">
        {isLoadingSummary ? (
          <div className="text-[15px]">Generating summary...</div>
        ) : (
          <div>
            {synthesizedSummary?.map((item, index) => (
              <div className="mt-2" key={index}>
                <span
                  className={`
                    py-1.5 px-3 rounded-lg text-[14px] border
                    ${
                      item.score === SummaryScore.SATISFIED
                        ? "border-accenta1/80 text-accenta1"
                        : item.score === SummaryScore.AMBIGUOUS
                        ? "border-orange-500/80 text-orange-500"
                        : "border-red-500/80 text-red-500"
                    }
                  `}
                >
                  {queryItem?.criteria?.[index]}
                </span>
                <div
                  className="mt-2 text-[15px]"
                  dangerouslySetInnerHTML={{
                    __html: item.reason.replace(
                      /strong>/g,
                      'span class="text-white font-normal">'
                    ),
                  }}
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

const CompanyCard = ({
  company,
  text,
}: {
  company: ExperienceUserType;
  text: string;
}) => {
  const startDate = useMemo(
    () => dateToFormat(company.start_date ?? ""),
    [company.start_date]
  );
  const endDate = useMemo(
    () => dateToFormat(company.end_date ?? ""),
    [company.end_date]
  );

  const handleOpenCompany = useCompanyModalStore((s) => s.handleOpenCompany);
  const qc = useQueryClient();

  const onButtonClick = () => {
    handleOpenCompany({
      companyId: company.company_id ?? "",
      fallbackUrl: company.company_db.linkedin_url,
      queryClient: qc,
    });
  };

  return (
    <div className="flex flex-row items-start justify-start font-normal">
      <div className="text-hgray600 text-sm min-w-24 pt-0.5 font-light">
        {text}
      </div>
      <div className="flex flex-col gap-1 text-sm w-full">
        <div className="flex flex-row items-center justify-between">
          <div
            className="text-white font-light text-[15px] hover:underline cursor-pointer"
            onClick={onButtonClick}
          >
            {company.company_db.name}
          </div>
          <div className="text-xgray800 text-[13px] font-light">
            {startDate} -{" "}
            {endDate ? endDate : <span className="text-accenta1">Present</span>}
          </div>
        </div>
        <div className="flex flex-row items-center justify-between text-hgray600 font-light">
          <div>{company.role}</div>
        </div>
      </div>
    </div>
  );
};
