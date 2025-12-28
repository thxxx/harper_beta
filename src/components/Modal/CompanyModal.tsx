import React, { useEffect } from "react";
import { useCompanyModalStore } from "@/store/useModalStore";

export default function CompanyModalRoot() {
  const { isOpen, payload, close } = useCompanyModalStore();
  const company = payload?.company;
  const closeOnBackdrop = payload?.closeOnBackdrop ?? true;

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  if (!isOpen || !payload || !company) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center font-inter">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (closeOnBackdrop) close();
        }}
      />

      {/* Panel */}
      <div className="relative z-10 w-[min(520px,92vw)] rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 text-lg font-semibold">{company.name}</div>

        <div className="text-sm">{company.name}</div>
        <div className="text-sm">{company.description}</div>
        <div className="text-sm">{company.location}</div>
        <div className="text-sm">{company.specialities?.join(", ")}</div>
        <div className="text-sm">{company.website_url}</div>
        <div className="text-sm">{company.linkedin_url}</div>
        <div className="text-sm">{company.founded_year}</div>
        <div className="text-sm">{company.funding_url}</div>

        <div className="mt-5 flex justify-end">
          <button
            className="rounded-lg px-3 py-2 text-sm hover:bg-zinc-100"
            onClick={close}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
