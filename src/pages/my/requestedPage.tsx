import CandidateCard from "@/components/CandidatesList";
import AppLayout from "@/components/layout/app";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useMemo } from "react";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useRequestedCandidates } from "@/hooks/useBookMarkCandidates";

const RequestedPage = () => {
  const { companyUser } = useCompanyUserStore();
  const userId = useMemo(() => companyUser?.user_id, [companyUser]);

  const { data, isLoading, error } = useRequestedCandidates(userId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error</div>;

  return (
    <div>
      <div className="w-full space-y-2">
        {data?.items && (
          <div className="space-y-3">
            {data.items.map((c) => (
              <CandidateCard key={c.id} c={c} userId={userId} />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-center w-full py-8 flex-col">
        <div className="flex items-center justify-center gap-1 flex-row">
          <div className="p-1 rounded-sm border border-xgray400">
            <ChevronLeft size={20} className="text-xgray600" />
          </div>
          <div className="p-1 rounded-sm border border-xgray400">
            <ChevronRight size={20} className="text-xgray600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestedPage;
