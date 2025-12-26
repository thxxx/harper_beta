import { locationEnToKo } from "@/utils/language_map";
import { useRouter } from "next/router";
import React from "react";

const NameProfile = ({
  id,
  profile_picture,
  name,
  headline,
  location,
}: {
  id: string;
  profile_picture: string;
  name: string;
  headline: string;
  location: string;
}) => {
  const router = useRouter();
  return (
    <div className="flex flex-row flex-1 items-start gap-4">
      <Avatar url={profile_picture} name={name} size="lg" />

      <div className="flex flex-col items-start justify-between">
        <div className="flex flex-col gap-0">
          <div
            className="truncate font-medium text-lg hover:underline cursor-pointer"
            onClick={() => router.push(`/my/p/${id}`)}
          >
            {name ?? id}
          </div>

          {headline && (
            <div className="mt-1 font-light text-base text-xgray200">
              {headline}
            </div>
          )}
          {location && (
            <div className="mt-1 text-sm text-xgray800">
              {locationEnToKo(location)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NameProfile;

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
  lg: "w-20 h-20 text-base",
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
