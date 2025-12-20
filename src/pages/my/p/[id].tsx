import AppLayout from "@/components/layout/app";
import { useRouter } from "next/router";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useCandidateDetail } from "@/hooks/useCandidateDetail";
import { ExternalLink, MapPin, Mail, Link as LinkIcon } from "lucide-react";

export default function ProfileDetailPage() {
  const router = useRouter();
  const candidId =
    typeof router.query.id === "string" ? router.query.id : undefined;

  const { companyUser } = useCompanyUserStore();
  const userId = companyUser?.user_id;

  const { data, isLoading, error } = useCandidateDetail(userId, candidId);

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

  const ExperienceCal = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years} ${years > 1 ? "years" : "year"} ${remainingMonths} ${
      remainingMonths > 1 ? "months" : "month"
    }`;
  };

  return (
    <AppLayout>
      <div className="w-full mx-auto px-8 py-10 space-y-6 min-h-screen">
        {/* Header */}
        <div className="rounded-3xl border border-xgray200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-3xl overflow-hidden bg-xlightgray border border-xgray200 shrink-0">
              {c.profile_picture ? (
                <img
                  src={c.profile_picture}
                  alt={c.name ?? "profile"}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xgray600 font-semibold">
                  {(c.name ?? "U").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-2xl font-semibold">{c.name}</div>
              <div className="text-sm text-xgray700 mt-1">{c.headline}</div>

              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-xgray600">
                {c.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={16} />
                    {c.location}
                  </span>
                )}
                {typeof c.total_exp_months === "number" && (
                  <span className="text-xgray600">
                    Total exp: {ExperienceCal(c.total_exp_months)}
                  </span>
                )}
                {!!c.connection?.length && (
                  <span className="px-2 py-1 rounded-full border border-xgray200 bg-xlightgray text-xs">
                    Bookmarked
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {c.linkedin_url && (
                  <a
                    href={c.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-xgray200 hover:bg-xlightgray text-sm"
                  >
                    <ExternalLink size={16} />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          {c.bio && (
            <div className="mt-5 whitespace-pre-wrap text-sm text-xgray700 leading-6">
              {c.bio}
            </div>
          )}
        </div>

        {/* Emails + Links */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {/* <Box title="Emails" icon={<Mail size={16} />}>
            {emails.length === 0 ? (
              <div className="text-sm text-xgray600">No emails</div>
            ) : (
              <div className="space-y-1">
                {emails.map((e, i) => (
                  <a
                    key={i}
                    className="block text-sm text-xgray700 hover:underline"
                    href={`mailto:${e}`}
                  >
                    {e}
                  </a>
                ))}
              </div>
            )}
          </Box> */}

          <Box title="Links" icon={<LinkIcon size={16} />}>
            {links.length === 0 ? (
              <div className="text-sm text-xgray600">No links</div>
            ) : (
              <div className="space-y-1">
                {links.map((u, i) => (
                  <a
                    key={i}
                    className="block text-sm text-xgray700 hover:underline truncate"
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    title={u}
                  >
                    {u}
                  </a>
                ))}
              </div>
            )}
          </Box>
        </div>

        {/* Experiences */}
        <Box title={`Experiences (${(c.experiences?.length ?? 0) as number})`}>
          <div className="space-y-3">
            {(c.experiences ?? []).map((e: any, idx: number) => (
              <div key={idx} className="rounded-2xl border border-xgray200 p-4">
                <div className="text-sm font-semibold">{e.role}</div>
                <div className="text-sm text-xgray700 mt-1">{e.company}</div>
                <div className="text-xs text-xgray500 mt-2">
                  {e.start_date} → {e.end_date}
                  {typeof e.months === "number"
                    ? ` · ${ExperienceCal(e.months)}`
                    : ""}
                </div>
                {e.company_url && (
                  <a
                    href={e.company_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-2 rounded-xl border border-xgray200 hover:bg-xlightgray"
                  >
                    <ExternalLink size={14} />
                    Company
                  </a>
                )}
                {e.description && (
                  <div className="mt-3 text-sm text-xgray700 whitespace-pre-wrap">
                    {e.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Box>

        {/* Educations */}
        <Box title={`Educations (${(c.educations?.length ?? 0) as number})`}>
          <div className="space-y-3">
            {(c.educations ?? []).map((ed: any, idx: number) => (
              <div key={idx} className="rounded-2xl border border-xgray200 p-4">
                <div className="text-sm font-semibold">{ed.school}</div>
                <div className="text-sm text-xgray700 mt-1">
                  {ed.degree}
                  {ed.field_of_study ? ` · ${ed.field_of_study}` : ""}
                </div>
                <div className="text-xs text-xgray500 mt-2">
                  {ed.start_date} → {ed.end_date}
                </div>
                {ed.school_url && (
                  <a
                    href={ed.school_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-2 rounded-xl border border-xgray200 hover:bg-xlightgray"
                  >
                    <ExternalLink size={14} />
                    School
                  </a>
                )}
              </div>
            ))}
          </div>
        </Box>

        {/* Publications */}
        <Box
          title={`Publications (${(c.publications?.length ?? 0) as number})`}
        >
          <div className="space-y-2">
            {(c.publications ?? []).map((p: any, idx: number) => (
              <div key={idx} className="rounded-2xl border border-xgray200 p-4">
                <div className="text-sm font-semibold">{p.title}</div>
                <div className="text-xs text-xgray500 mt-1">{p.date}</div>
                {p.link ? (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm text-xgray700 hover:underline"
                  >
                    <ExternalLink size={16} />
                    Open
                  </a>
                ) : (
                  <div className="mt-2 text-sm text-xgray500">No link</div>
                )}
              </div>
            ))}
          </div>
        </Box>
      </div>
    </AppLayout>
  );
}

function Box({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-xgray200 bg-white p-5 shadow-sm w-full">
      <div className="flex items-center gap-2 text-sm font-semibold text-xgray800">
        {icon}
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
