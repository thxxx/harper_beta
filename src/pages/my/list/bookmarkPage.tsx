import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useBookmarkedCandidates } from "@/hooks/useBookMarkCandidates";
import CandidateCard from "@/components/CandidatesList";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import PrevNextButtons from "./components/PrevNextButtons";

export default function BookmarksPage() {
  const { companyUser } = useCompanyUserStore();
  const userId = useMemo(() => companyUser?.user_id, [companyUser]);

  const { data, isLoading, error } = useBookmarkedCandidates(userId);

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
      <PrevNextButtons />
    </div>
  );
}
