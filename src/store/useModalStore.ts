import { create } from "zustand";
import { CompanyType } from "@/types/type";
import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export async function fetchCompanyDb(companyId: number) {
  console.log("fetchCompanyDb", companyId);

  const { data, error } = await supabase
    .from("company_db")
    .select("*")
    .eq("id", companyId)
    .maybeSingle(); // 없으면 null

  if (error) throw error;
  return data ?? null;
}

type ModalPayload = {
  company: CompanyType;
  closeOnBackdrop?: boolean;
};

type ModalState = {
  isOpen: boolean;
  payload: ModalPayload | null;
  open: (payload: ModalPayload) => void;
  close: () => void;
  // 새로 추가될 액션
  handleOpenCompany: (params: {
    companyId: number | string;
    fallbackUrl: string;
    queryClient: QueryClient;
  }) => Promise<void>;
};

export const useCompanyModalStore = create<ModalState>((set, get) => ({
  isOpen: false,
  payload: null,

  open: (payload) => set({ isOpen: true, payload }),

  close: () => {
    const { isOpen } = get();
    if (!isOpen) return;
    set({ isOpen: false, payload: null });
  },

  // 로직을 스토어 안으로 이동
  handleOpenCompany: async ({ companyId, fallbackUrl, queryClient }) => {
    const id = Number(companyId);

    // 1. 유효성 검사 및 Fallback 처리
    if (!Number.isFinite(id) || id === 0) {
      window.open(fallbackUrl, "_blank");
      return;
    }

    try {
      // 2. Query Fetch (이미 있으면 캐시 사용, 없으면 fetch)
      const data = await queryClient.fetchQuery({
        queryKey: ["company_db", id],
        queryFn: () => fetchCompanyDb(id),
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60 * 6,
      });

      // 3. 결과에 따른 분기
      if (data) {
        get().open({ company: data });
      } else {
        window.open(fallbackUrl, "_blank");
      }
    } catch (error) {
      console.error("Failed to fetch company data:", error);
      window.open(fallbackUrl, "_blank");
    }
  },
}));
