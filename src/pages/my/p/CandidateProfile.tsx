import { useRouter } from "next/router";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import {
  CandidateDetail,
  useCandidateDetail,
} from "@/hooks/useCandidateDetail";
import Bookmarkbutton from "@/components/ui/bookmarkbutton";
import Requestbutton from "@/components/ui/requestbutton";
import ItemBox from "./components/ItemBox";
import PublicationBox from "./components/PublicationBox";
import LinkChips from "./components/LinkChips";
import { replaceName } from "@/utils/textprocess";
import { useEffect, useMemo, useState } from "react";
import { useMessages } from "@/i18n/useMessage";
import {
  companyEnToKo,
  degreeEnToKo,
  koreaUniversityEnToKo,
  locationEnToKo,
  majorEnToKo,
} from "@/utils/language_map";
import { logger } from "@/utils/logger";
import { Loader2, MapPin } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const ExperienceCal = (months: number) => {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years > 0 ? `${years}년 ` : ""}${remainingMonths}${
    remainingMonths > 1 ? "개월" : "개월"
  }`;
};

export default function CandidateProfileDetailPage({
  candidId,
  data,
  isLoading,
  error,
}: {
  candidId: string;
  data: CandidateDetail;
  isLoading: boolean;
  error: Error | null;
}) {
  const [requested, setRequested] = useState(false);
  const [isLoadingOneline, setIsLoadingOneline] = useState(false);
  const [oneline, setOneline] = useState<string | null>(null);
  const [isBioOpen, setIsBioOpen] = useState(false);

  const router = useRouter();
  const { m } = useMessages();
  const { companyUser } = useCompanyUserStore();
  const userId = companyUser?.user_id;
  const qc = useQueryClient();

  // const { data, isLoading, error } = useCandidateDetail(userId, candidId);

  const c: any = data;

  const links: string[] = useMemo(() => {
    if (!c?.links) return [];

    const newLinks: string[] = [];
    if (Array.isArray(c.links)) {
      for (const link of c.links) {
        const ll = link.replace(/\/+$/, "");
        if (ll && ll !== "" && !newLinks.includes(ll)) {
          newLinks.push(ll);
        }
      }
      return newLinks;
    }
    return [];
  }, [c]);

  const generateOneLineSummary = async () => {
    setIsLoadingOneline(true);
    const res = await fetch("/api/search/criteria_summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc: c,
        is_one_line: true,
      }),
    });

    const data = await res.json();
    setOneline(data.result);
    // ✅ 서버에서 DB 업데이트 끝났으면 캐시 무효화 → 최신 재조회
    await qc.invalidateQueries({
      queryKey: ["candidate", candidId, userId], // 너 useCandidateDetail의 키랑 반드시 동일해야 함
    });
    setIsLoadingOneline(false);
  };

  useEffect(() => {
    if (isLoading) return;
    if (!c || !userId || !candidId) return;

    const hasSummary = Array.isArray(c.s) && c.s.length > 0;
    if (hasSummary) return;

    // ✅ 같은 세션에서 중복 요청 방지
    if (requested) return;

    setRequested(true);
    generateOneLineSummary().finally(() => {
      // 실패 시 재시도 허용하고 싶으면 false로 돌려도 됨
      // setRequested(false);
    });
  }, [isLoading, c, userId, candidId, requested]);

  if (!candidId || !userId || isLoading || error || !data)
    return <div>Loading...</div>;

  // 대충: email은 string일 수도 / JSON string일 수도 있어서 try-catch 한 번만
  let emails: string[] = [];
  try {
    emails = Array.isArray(c.email) ? c.email : JSON.parse(c.email || "[]");
  } catch {
    emails = c.email ? [String(c.email)] : [];
  }

  logger.log("c ", c);

  return (
    <div className="w-full mx-auto overflow-y-auto h-screen">
      <div className="w-full max-w-[920px] mx-auto px-4 py-10 space-y-12">
        {/* Header */}
        <div className="flex flex-row items-start justify-between w-full">
          <div className="flex items-start gap-8 w-[70%]">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-hgray900 border border-hgray1000/5 shrink-0">
              {c.profile_picture ? (
                <img
                  src={c.profile_picture}
                  alt={c.name ?? "profile"}
                  width={92}
                  height={92}
                  className="w-24 h-24 object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-hgray1000 font-normal">
                  {(c.name ?? "U").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex flex-col flex-1 min-w-0 gap-1">
              <div className="text-2xl font-normal text-hgray1000">
                {c.name}
              </div>
              <div className="text-base text-hgray900 font-light">
                {c.headline}
              </div>

              <div className="flex flex-wrap items-center gap-1 text-sm text-ngray600 font-normal">
                {c.location && (
                  <div className="flex flex-row items-center gap-1">
                    <span className="inline-flex items-center gap-1">
                      {locationEnToKo(c.location)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center text-sm text-ngray600 font-normal">
                {typeof c.total_exp_months === "number" && (
                  <span className="">
                    {m.data.totalexp}: {ExperienceCal(c.total_exp_months)}
                  </span>
                )}
              </div>
              {/* Emails + Links */}
              <div className="flex flex-row gap-1 mt-4">
                {links.length === 0 ? (
                  <div className="text-sm text-xgray600">No links</div>
                ) : (
                  <div className="space-y-1">
                    <LinkChips links={links} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-row items-start justify-end gap-4 w-[30%] font-normal">
            <Bookmarkbutton
              userId={userId}
              candidId={c.id}
              connection={c.connection}
            />
            <Requestbutton c={c} />
          </div>
        </div>

        <div className="text-hgray900 flex flex-col gap-2 mb-2">
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="text-base font-normal">{m.data.summary}</div>
            {c.bio && (
              <div
                className="text-sm text-ngray600 font-normal cursor-pointer hover:text-accenta1 transition-all duration-200"
                onClick={() => setIsBioOpen(!isBioOpen)}
              >
                {isBioOpen ? "접기" : "더보기"}
              </div>
            )}
          </div>
          {c.s && c.s.length > 0 && (
            <div>{replaceName(c.s[0].text, c.name)}</div>
          )}
          {(!c.s || c.s.length === 0) && oneline && (
            <div>{replaceName(oneline, c.name)}</div>
          )}
          {(!c.s || c.s.length === 0) && isLoadingOneline && !oneline && (
            <div className="flex flex-row items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              <div className="animate-textGlow text-sm">
                설명을 작성중입니다...
              </div>
            </div>
          )}

          {c.bio && (
            <div className="text-[15px] text-hgray700 leading-6 font-light mt-1">
              {isBioOpen ? (
                <div className="whitespace-pre-wrap">
                  {replaceName(c.bio, c.name)}
                </div>
              ) : (
                <div className="line-clamp-1">{replaceName(c.bio, c.name)}</div>
              )}
            </div>
          )}
        </div>

        {/* <ExperienceTimeline experiences={c.experience_user ?? []} /> */}

        {/* Experiences */}
        <Box title={`${m.data.experience}`}>
          <div className="space-y-3">
            {(c.experience_user ?? []).map((e: any, idx: number) => {
              return (
                <ItemBox
                  key={idx}
                  title={e.role}
                  company_id={e.company_id}
                  name={companyEnToKo(e.company_db.name)}
                  start_date={e.start_date}
                  end_date={e.end_date}
                  link={e.company_db.linkedin_url}
                  description={e.description}
                  logo_url={e.company_db.logo}
                  months={e.months}
                />
              );
            })}
          </div>
        </Box>

        {/* Educations */}
        <Box title={`${m.data.education}`}>
          <div className="space-y-3">
            {(c.edu_user ?? []).map((ed: any, idx: number) => (
              <ItemBox
                key={idx}
                title={`${koreaUniversityEnToKo(ed.school)}`}
                name={
                  ed.field
                    ? `${majorEnToKo(ed.field)}, ${degreeEnToKo(ed.degree)}`
                    : ed.degree
                }
                start_date={ed.start_date}
                end_date={ed.end_date}
                link={ed.url}
                description={""}
                isEdu={true}
              />
            ))}
          </div>
        </Box>

        {/* Publications */}
        <Box title={`${m.data.publications}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(c.publications ?? []).map((p: any, idx: number) => (
              <PublicationBox
                key={idx}
                title={p.title}
                published_at={p.published_at}
                link={p.link}
              />
            ))}
          </div>
        </Box>
      </div>
    </div>
  );
}

const Box = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="rounded-xl shadow-sm w-full">
      <div className="flex items-center gap-2 text-base font-normal text-hgray900">
        {icon}
        {title}
      </div>
      <div className="mt-[10px]">{children}</div>
    </div>
  );
};
