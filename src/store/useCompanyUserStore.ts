// stores/useCompanyUserStore.ts
import { supabase } from "@/lib/supabase";
import { create } from "zustand";

type CompanyUser = any; // 너 테이블 타입으로 바꾸면 됨

type S = {
  loading: boolean;
  companyUser: CompanyUser | null;
  load: (userId: string) => Promise<void>;
  clear: () => void;
};

export const useCompanyUserStore = create<S>((set) => ({
  loading: false,
  companyUser: null,

  load: async (userId) => {
    set({ loading: true });
    console.log("load companyUser");
    const { data, error } = await supabase
      .from("company_users")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      set({ loading: false });
      throw error;
    }
    set({ companyUser: data ?? null, loading: false });
  },

  clear: () => set({ companyUser: null, loading: false }),
}));
