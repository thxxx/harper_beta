import AppLayout from "@/components/layout/app";
import { useRouter } from "next/router";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { useCandidateDetail } from "@/hooks/useCandidateDetail";
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
import CandidateProfileDetailPage from "./CandidateProfile";

export const ExperienceCal = (months: number) => {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years > 0 ? `${years}년 ` : ""}${remainingMonths}${
    remainingMonths > 1 ? "개월" : "개월"
  }`;
};

export default function ProfileDetailPage() {
  const router = useRouter();
  const candidId =
    typeof router.query.id === "string" ? router.query.id : undefined;

  return (
    <AppLayout>
      {candidId && <CandidateProfileDetailPage candidId={candidId} />}
      {!candidId && <div>로딩중입니다.</div>}
    </AppLayout>
  );
}
