import {
  CandidateTypeWithConnection,
  ExperienceUserType,
} from "@/hooks/useSearchCandidates";
import React, { useMemo } from "react";
import {
  companyEnToKo,
  degreeEnToKo,
  koreaUniversityEnToKo,
} from "@/utils/language_map";
import { useCompanyModalStore } from "@/store/useModalStore";
import { useQueryClient } from "@tanstack/react-query";
import NameProfile from "./NameProfile";
import Bookmarkbutton from "./ui/bookmarkbutton";
import Requestbutton from "./ui/requestbutton";
import { QueryType } from "@/types/type";
import { dateToFormat } from "@/utils/textprocess";
import { useSynthesizedSummary } from "@/hooks/useSynthesizedSummary";
import { Tooltips } from "./ui/tooltip";
import { Check, Dot, X } from "lucide-react";
import { useMessages } from "@/i18n/useMessage";

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
  const { m } = useMessages();
  const queryId = queryItem?.query_id;
  const candidId = c.id;
  const synthesizedSummary =
    JSON.parse(c.synthesized_summary?.[0]?.text ?? "[]").map((item: any) => {
      return {
        reason: item,
        score: item.split(",")[0] ?? "",
      };
    }) ?? null;
  // logger.log("summaryText ", synthesizedSummary);
  // const { data: summaryRow, isLoading: isLoadingSummary } =
  //   useSynthesizedSummary({
  //     queryId,
  //     candidId,
  //     doc: c,
  //     criteria: queryItem?.criteria ?? [],
  //     raw_input_text: queryItem?.raw_input_text ?? null,
  //     enabled: !!queryItem && !!queryItem.criteria?.length,
  //     text: c.synthesized_summary?.[0]?.text ?? null,
  //   });

  // const synthesizedSummary = useMemo(() => {
  //   if (summaryRow) return parseSummaryText(summaryRow);
  // }, [summaryRow]);

  const exps = asArr(c.experience_user ?? []);
  const edus = asArr(c.edu_user ?? []);

  const firstCompany = exps[exps.length - 1];
  const latestCompany = exps[0];
  const school = useMemo(() => edus[0], [edus]);

  const isOnlyOneCompany = exps.length === 1;

  return (
    <div
      key={c.id}
      className="w-full rounded-[28px] max-w-[980px] text-white bg-white/5 p-6"
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
          {/* {!isOnlyOneCompany && latestCompany && ( */}
          {latestCompany && (
            <CompanyCard
              company={latestCompany}
              text={m.data.currentExperience}
            />
          )}
          {/* )} */}
          {/* {firstCompany && (
            <CompanyCard
              company={firstCompany}
              text={isOnlyOneCompany ? "Single Experience" : "First Career"}
            />
          )} */}
          {school && (
            <div className="flex flex-row items-start justify-start font-normal pt-3 border-t border-white/5">
              <div className="text-hgray600 text-sm w-24 pt-0.5 font-normal">
                {m.data.education}
              </div>
              <div className="flex flex-col gap-0.5 text-sm w-full">
                <div className="flex flex-row items-center justify-between">
                  <div className="text-white">
                    {koreaUniversityEnToKo(school.school)}
                    {school.degree && (
                      <span className="text-hgray600 font-light">
                        {" "}
                        &nbsp; {degreeEnToKo(school.degree)}
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
        {!synthesizedSummary || synthesizedSummary.length === 0 ? (
          <>{/* <div className="text-[15px]">{m.data.generating}</div> */}</>
        ) : (
          <div>
            {synthesizedSummary?.map((item: any, index: number) => (
              <MemoizedSummaryBox
                key={index}
                reason={item.reason}
                criteria={queryItem?.criteria?.[index] ?? ""}
                score={item.score}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-row items-center justify-start mt-6 gap-2 w-full">
        <Bookmarkbutton
          userId={userId}
          candidId={c.id}
          connection={c.connection}
          isText={false}
        />
        <Requestbutton c={c} isBeta={true} />
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

  //
  const handleOpenCompany = useCompanyModalStore((s) => s.handleOpenCompany);
  const qc = useQueryClient();

  const onButtonClick = () => {
    handleOpenCompany({
      companyId: company.company_id ?? "",
      queryClient: qc,
    });
  };

  return (
    <div className="flex flex-row items-start justify-start font-normal">
      <div className="text-hgray600 text-sm w-24 pt-0.5 font-normal">
        {text}
      </div>
      <div className="flex flex-col gap-1 text-sm w-full">
        <div className="flex flex-row items-center justify-between">
          <div
            className="text-white font-normal text-[15px] hover:underline cursor-pointer"
            onClick={onButtonClick}
          >
            {companyEnToKo(company.company_db.name)}
          </div>
          <div className="text-xgray800 text-[13px] font-light">
            {startDate} -{" "}
            {endDate ? endDate : <span className="text-accenta1">현재</span>}
          </div>
        </div>
        <div className="flex flex-row items-center justify-between text-hgray600 font-light">
          <div>{company.role}</div>
        </div>
      </div>
    </div>
  );
};

const CriteriaBox = ({
  reason,
  criteria,
  score,
}: {
  reason: string;
  criteria: string;
  score: string;
}) => {
  const badeStyle = useMemo(() => {
    if (score === SummaryScore.SATISFIED) return "text-accenta1";
    if (score === SummaryScore.AMBIGUOUS) return "text-hgray900";
    if (score === SummaryScore.UNSATISFIED) return "text-hgray900";
    return "";
  }, [score]);

  const badgeIcon = useMemo(() => {
    if (score === SummaryScore.SATISFIED)
      return <Check className="w-3 h-3 text-accenta1" strokeWidth={2} />;
    if (score === SummaryScore.AMBIGUOUS)
      return <Dot className="w-3 h-3 text-hgray700" strokeWidth={2} />;
    if (score === SummaryScore.UNSATISFIED)
      return <X className="w-3 h-3 text-red-700" strokeWidth={2} />;
    return null;
  }, [score]);

  const tooltipText = useMemo(() => {
    if (score === SummaryScore.SATISFIED) return "Matches your criteria";
    if (score === SummaryScore.AMBIGUOUS)
      return "Not enough information to decide";
    if (score === SummaryScore.UNSATISFIED)
      return "Does not match this criterion";
    return "";
  }, [score]);

  return (
    <div className="mt-5">
      <Tooltips text={tooltipText}>
        <div
          className={`flex-row inline-flex items-center font-normal gap-1 py-1.5 px-2 rounded-md text-[12px] bg-white/5 cursor-default ${badeStyle}`}
        >
          {badgeIcon}
          <span>{criteria}</span>
        </div>
      </Tooltips>
      {/* </Tooltips> */}
      {reason && (
        <div
          className="mt-2 text-[14px] font-normal"
          dangerouslySetInnerHTML={{
            __html: reason.replace(
              /strong>/g,
              'span class="text-white font-normal">'
            ),
          }}
        />
      )}
    </div>
  );
};

const MemoizedSummaryBox = React.memo(CriteriaBox);
