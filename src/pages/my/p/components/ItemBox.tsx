import { ExternalLink } from "lucide-react";
import React from "react";

const ItemBox = ({
  title,
  name,
  months,
  start_date,
  end_date,
  link,
  description,
  logo_url,
}: {
  title: string;
  name: string;
  start_date: string;
  end_date: string;
  link: string;
  description: string;
  logo_url?: string;
  months?: string;
}) => {
  return (
    <div className="rounded-2xl bg-bgDark500 px-6 py-4">
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-start justify-start gap-2">
          {/* <div>
              {logo_url ? (
                <img
                  src={logo_url}
                  alt={name}
                  className="w-6 h-6 object-cover rounded-lg border border-white/5"
                />
              ) : (
                <div>{title.slice(0, 1).toUpperCase()}</div>
              )}
            </div> */}
          <div className="flex flex-col items-start justify-start gap-1 font-normal">
            <div className="text-base">{title}</div>
            <div className="cursor-pointer hover:underline text-base text-xgray800 flex flex-row gap-2 items-center font-light">
              {name} <ExternalLink size={14} />
            </div>
          </div>
        </div>
        <div className="text-sm text-xgray800">
          {start_date}
          <span className="px-1"> - </span>
          {!end_date ? (
            <span className="text-accenta1">Present</span>
          ) : (
            end_date
          )}
          {typeof months === "number" ? ` (${months}개월) ` : ""}
        </div>
      </div>
      {description && (
        <div className="mt-3 text-sm text-xgray500 font-light whitespace-pre-wrap">
          {description}
        </div>
      )}
    </div>
  );
};

export default React.memo(ItemBox);
