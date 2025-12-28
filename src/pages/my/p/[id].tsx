import AppLayout from "@/components/layout/app";
import { useRouter } from "next/router";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useCandidateDetail } from "@/hooks/useCandidateDetail";
import { Bookmark, ExternalLink, Link as LinkIcon } from "lucide-react";
import Bookmarkbutton from "@/components/ui/bookmarkbutton";
import Requestbutton from "@/components/ui/requestbutton";
import ItemBox from "./components/ItemBox";
import PublicationBox from "./components/PublicationBox";

const ExperienceCal = (months: number) => {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years} ${years > 1 ? "years" : "year"} ${remainingMonths} ${
    remainingMonths > 1 ? "months" : "month"
  }`;
};

export default function ProfileDetailPage() {
  const router = useRouter();
  const candidId =
    typeof router.query.id === "string" ? router.query.id : undefined;

  const { companyUser } = useCompanyUserStore();
  const userId = companyUser?.user_id;

  const { data, isLoading, error } = useCandidateDetail(userId, candidId);
  console.log(data);

  if (!candidId) return <AppLayout>Loading...</AppLayout>;
  if (!userId) return <AppLayout>Loading...</AppLayout>;
  if (isLoading) return <AppLayout>Loading...</AppLayout>;
  if (error) return <AppLayout>Failed to load.</AppLayout>;
  if (!data) return <AppLayout>Not found.</AppLayout>;

  const c: any = data;

  // 대충: email은 string일 수도 / JSON string일 수도 있어서 try-catch 한 번만
  let emails: string[] = [];
  try {
    emails = Array.isArray(c.email) ? c.email : JSON.parse(c.email || "[]");
  } catch {
    emails = c.email ? [String(c.email)] : [];
  }

  const links: string[] = Array.isArray(c.links) ? c.links : [];

  return (
    <AppLayout>
      <div className="w-full mx-auto px-8 py-10 min-h-screen space-y-9">
        {/* Header */}
        <div className="flex flex-row items-start justify-between w-full">
          <div className="flex items-start gap-6 w-[70%]">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-xlightgray border border-white/5 shrink-0">
              {c.profile_picture ? (
                <img
                  src={c.profile_picture}
                  alt={c.name ?? "profile"}
                  width={92}
                  height={92}
                  className="w-24 h-24 object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-normal">
                  {(c.name ?? "U").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-2xl font-normal">{c.name}</div>
              <div className="text-lg text-xlightgray font-light mt-1">
                {c.headline}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-xgray800 font-light">
                {c.location && (
                  <span className="inline-flex items-center gap-1">
                    {c.location}
                  </span>
                )}
                {typeof c.total_exp_months === "number" && (
                  <span className="text-xgray600">
                    Total exp: {ExperienceCal(c.total_exp_months)}
                  </span>
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

        <div className="text-white flex flex-col gap-2">
          <div className="text-lg font-normal">Summary</div>

          {c.bio && (
            <div className="whitespace-pre-wrap text-base text-xlightgray leading-6 font-light">
              {c.bio}
            </div>
          )}
          {/* Emails + Links */}
          <div className="flex flex-row gap-1 mt-3">
            {links.length === 0 ? (
              <div className="text-sm text-xgray600">No links</div>
            ) : (
              <div className="space-y-1">
                <LinkChips links={links} />
              </div>
            )}
          </div>
        </div>

        {/* Experiences */}
        <Box
          title={`Experiences (${(c.experience_user?.length ?? 0) as number})`}
        >
          <div className="space-y-3">
            {(c.experience_user ?? []).map((e: any, idx: number) => {
              return (
                <ItemBox
                  key={idx}
                  title={e.role}
                  name={e.company_db.name}
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
        <Box title={`Educations (${(c.edu_user?.length ?? 0) as number})`}>
          <div className="space-y-3">
            {(c.edu_user ?? []).map((ed: any, idx: number) => (
              <ItemBox
                key={idx}
                title={`${ed.degree}`}
                name={ed.school}
                start_date={ed.start_date}
                end_date={ed.end_date}
                link={ed.school_url}
                description={ed.field_of_study}
              />
            ))}
          </div>
        </Box>

        {/* Publications */}
        <Box
          title={`Publications (${(c.publications?.length ?? 0) as number})`}
        >
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
      <br />
      <br />
      <br />
    </AppLayout>
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
      <div className="flex items-center gap-2 text-lg font-normal text-white">
        {icon}
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
};

export const BRAND_MAP = [
  {
    match: (h: string) => h.includes("linkedin.com"),
    label: "linkedin.com",
    icon: "https://www.linkedin.com/favicon.ico",
  },
  {
    match: (h: string) => h === "x.com" || h.includes("twitter.com"),
    label: "x.com",
    icon: "https://abs.twimg.com/favicons/twitter.3.ico",
  },
  {
    match: (h: string) => h.includes("instagram.com"),
    label: "instagram.com",
    icon: "https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png",
  },
  {
    match: (h: string) => h.includes("github.com"),
    label: "github.com",
    icon: "/svgs/github_white.svg",
  },
  {
    match: (h: string) => h.includes("scholar.google."),
    label: "scholar.google.com",
    icon: "https://scholar.google.com/favicon.ico",
  },
];

type Props = {
  links: string[];
};

export function LinkChips({ links }: Props) {
  if (!links?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((raw) => {
        const url = raw.startsWith("http") ? raw : `https://${raw}`;
        let host = raw;

        try {
          host = new URL(url).hostname.replace("www.", "");
        } catch {}

        const brand = BRAND_MAP.find((b) => b.match(host)) ?? {
          label: host,
          icon: `/svgs/chain.svg`,
        };

        return (
          <a
            key={raw}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex font-light items-center gap-2 rounded-md bg-white/5 px-2.5 py-1.5 text-sm text-white hover:bg-white/10"
          >
            <img
              src={brand.icon}
              className={`${
                brand.icon.includes("/svgs/chain") ? "h-3.5 w-3.5" : "h-4 w-4 "
              }`}
              alt=""
            />
            {brand.label}
          </a>
        );
      })}
    </div>
  );
}
