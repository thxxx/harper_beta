import { create } from "zustand";
import { CompanyType } from "@/types/type";

type ModalPayload = {
  company: CompanyType;
  closeOnBackdrop?: boolean;
};

type ModalState = {
  isOpen: boolean;
  payload: ModalPayload | null;
  open: (payload: ModalPayload) => void;
  close: () => void;
};

export const useCompanyModalStore = create<ModalState>((set, get) => ({
  isOpen: false,
  payload: null,

  open: (payload) => set({ isOpen: true, payload }),

  close: () => {
    // Optional: close할 때 payload도 같이 날리기
    const { isOpen } = get();
    if (!isOpen) return;
    set({ isOpen: false, payload: null });
  },
}));
