import { useCompanyModalStore } from "@/store/useModalStore";
import { dateToFormat } from "@/utils/textprocess";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import React, { useMemo } from "react";

const ItemBox = ({
  title,
  name,
  isEdu = false,
  months,
  start_date,
  end_date,
  link,
  description,
  logo_url,
  company_id,
}: {
  title: string;
  name: string;
  isEdu?: boolean;
  start_date: string;
  end_date: string;
  link: string;
  description: string;
  logo_url?: string;
  months?: string;
  company_id?: string;
}) => {
  const startDate = useMemo(() => {
    return dateToFormat(start_date);
  }, [start_date]);
  const endDate = useMemo(() => {
    return dateToFormat(end_date);
  }, [end_date]);

  const handleOpenCompany = useCompanyModalStore((s) => s.handleOpenCompany);
  const qc = useQueryClient();

  const onButtonClick = () => {
    handleOpenCompany({
      companyId: company_id ?? "",
      fallbackUrl: link,
      queryClient: qc,
    });
  };

  return (
    <div className="rounded-2xl bg-white/5 px-6 py-4">
      <div className="flex flex-row items-start justify-between">
        <div className="flex flex-row items-start justify-start gap-3">
          {!isEdu && (
            <div>
              {logo_url ? (
                <img
                  src={logo_url}
                  alt={name}
                  className="w-12 h-12 mt-[1px] rounded-sm object-cover border border-white/5"
                />
              ) : (
                <div className="w-12 h-12 mt-[1px] rounded-sm flex items-center justify-center text-lg bg-accenta1/70">
                  {name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col items-start justify-start gap-1 font-normal">
            <div className={`text-base ${isEdu ? "" : ""}`}>
              {title ? title : isEdu ? "Student" : "Employee"}
            </div>
            <div
              className="cursor-pointer hover:underline text-base text-xgray800 flex flex-row gap-2 items-center font-light"
              onClick={() => onButtonClick()}
            >
              {name} {link ? <ExternalLink size={14} /> : null}
            </div>
          </div>
        </div>
        <div className="text-sm text-xgray800 font-light mt-1">
          {startDate}
          <span className="px-1"> - </span>
          {!endDate ? <span className="text-accenta1">Present</span> : endDate}
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
