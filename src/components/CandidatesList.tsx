import { CandidateTypeWithConnection } from "@/hooks/useSearchCandidates";
import { useToggleBookmark } from "@/hooks/useToggleBookmark";
import { Bookmark } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "./toast/toast";
import { useRouter } from "next/router";
import ConnectionModal from "./Modal/ConnectionModal";
import {
  koreaUniversityEnToKo,
  locationEnToKo,
  toKoreanMonth,
} from "@/utils/language_map";

const asArr = (v: any) => (Array.isArray(v) ? v : []);

const pickSchool = (edus: any[]) =>
  edus.find((e) => e?.schoolName || e?.school)?.schoolName ||
  edus.find((e) => e?.schoolName || e?.school)?.school ||
  null;

const initials = (name?: string | null) =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

const SIZE_CLASS = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
} as const;

export function Avatar({
  url,
  name,
  size = "md",
}: {
  url?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = SIZE_CLASS[size];

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name ?? "profile"}
      className={`${sizeClass} rounded-full object-cover ring-1 ring-black/10`}
    />
  ) : (
    <div
      className={`${sizeClass} rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-semibold ring-1 ring-black/10`}
    >
      {initials(name)}
    </div>
  );
}

export default function CandidateCard({
  c,
  userId,
  queryId = "",
  isMyList = false,
}: {
  c: CandidateTypeWithConnection;
  userId: string;
  queryId?: string;
  isMyList?: boolean;
}) {
  const router = useRouter();
  const exps = asArr(c.experiences);
  const edus = asArr(c.educations);

  const firstCompany = exps[exps.length - 1];
  const latestCompany = exps[0];
  const school = useMemo(() => {
    const school = pickSchool(edus);
    console.log(school, edus);
    if (!school) return null;
    return koreaUniversityEnToKo(school);
  }, [edus]);

  let isOnlyOneCompany = false;
  if (exps.length === 1) {
    isOnlyOneCompany = true;
  }

  const [isBookmarked, setIsBookmarked] = useState(
    c.connection?.map((c) => c.typed).includes(0)
  );
  const [isRequested, setIsRequested] = useState(
    c.connection?.map((c) => c.typed).includes(1)
  );
  const isConnected = c.connection?.map((c) => c.typed).includes(2);

  const { mutate: toggleBookmarkMutation } = useToggleBookmark();

  const toggleBookmark = () => {
    if (isBookmarked)
      showToast({ message: "북마크에서 제거되었습니다.", variant: "white" });
    else showToast({ message: "북마크에 추가되었습니다.", variant: "white" });
    toggleBookmarkMutation({ userId, candidId: c.id });
    setIsBookmarked(!isBookmarked);
  };

  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);

  const requestConnection = () => {
    setIsConnectionModalOpen(true);
  };

  return (
    <div
      key={c.id}
      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm"
    >
      <ConnectionModal
        candidId={c.id}
        open={isConnectionModalOpen}
        name={c.name ?? ""}
        profilePicture={c.profile_picture ?? ""}
        isRequested={isRequested}
        onClose={() => setIsConnectionModalOpen(false)}
        onConfirm={() => {
          if (isRequested) {
            setIsRequested(false);
          } else {
            setIsRequested(true);
          }
        }}
      />
      <div className="flex items-start gap-3">
        <Avatar url={c.profile_picture} name={c.name} />

        <div className="flex flex-row gap-2 min-w-0 flex-1">
          <div className="flex flex-col items-start justify-between w-[40%]">
            <div className="flex flex-col gap-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <div
                  className="truncate font-semibold text-neutral-900 hover:underline cursor-pointer"
                  onClick={() => router.push(`/my/p/${c.id}`)}
                >
                  {c.name ?? c.id}
                </div>
              </div>

              {c.headline && (
                <div className="mt-1 text-[15px] text-xgray700">
                  {c.headline}
                </div>
              )}
              {c.location && (
                <div className="mt-1 text-xs text-xgray500">
                  {locationEnToKo(c.location)}
                </div>
              )}
            </div>

            <div className="flex flex-row items-center justify-center mt-4 gap-1">
              <button className="cursor-pointer" onClick={toggleBookmark}>
                {isBookmarked ? (
                  <Bookmark className="w-4 h-4 text-xgray500" fill="red-200" />
                ) : (
                  <Bookmark className="w-4 h-4 text-xgray500" />
                )}
              </button>
              <button
                className={`cursor-pointer p-1 text-sm ${
                  isRequested ? "text-red-600" : "text-brightnavy"
                }`}
                onClick={requestConnection}
              >
                {isRequested ? "연결 요청 취소" : "연결 요청"}
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-3 w-[60%]">
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
              <div className="flex flex-row items-start justify-start">
                <div className="text-neutral-500 text-xs min-w-14 pt-0.5">
                  학교
                </div>
                <div className="flex flex-col gap-1 text-sm w-full">
                  <div className="flex flex-row items-center justify-between">
                    <div
                      className="text-xgray700 hover:text-black hover:underline cursor-pointer"
                      // onClick={() => window.open(school.school_url, "_blank")}
                    >
                      {school}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 text-xgray700">
        {c.synthesized_summary?.map((s) => (
          <div
            key={s.id}
            className="text-sm"
            dangerouslySetInnerHTML={{ __html: s.text ?? "" }}
          />
        ))}
      </div>
    </div>
  );
}

// 사용 예시:
// <CandidateList items={data?.items ?? []} />

type CompanyType = {
  company: string;
  company_url: string;
  months: string;
  role: string;
  start_date: string;
  end_date: string;
};

const CompanyCard = ({
  company,
  text,
}: {
  company: CompanyType;
  text: string;
}) => {
  const startDate = useMemo(() => {
    return toKoreanMonth(company.start_date);
  }, [company.start_date]);
  const endDate = useMemo(() => {
    return toKoreanMonth(company.end_date);
  }, [company.end_date]);

  return (
    <div className="flex flex-row items-start justify-start">
      <div className="text-neutral-500 text-xs min-w-14 pt-0.5">{text}</div>
      <div className="flex flex-col gap-1 text-sm w-full">
        <div className="flex flex-row items-center justify-between">
          <div
            className="text-xgray700 hover:text-black hover:underline cursor-pointer"
            onClick={() => window.open(company.company_url, "_blank")}
          >
            {company.company}
          </div>
          <div className="text-neutral-500 text-xs">
            {startDate} - {endDate}
          </div>
        </div>
        <div className="flex flex-row items-center justify-between">
          <div>{company.role}</div>
        </div>
      </div>
    </div>
  );
};
