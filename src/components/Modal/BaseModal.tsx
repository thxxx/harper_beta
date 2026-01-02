import React from "react";

const BaseModal = ({
  children,
  onClose,
  onConfirm,
  confirmLabel,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 w-full">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-50 w-full max-w-[600px] rounded-[28px] bg-ngray300 p-6 shadow-sm border border-white/10">
        {children}

        <div className="w-full mt-8 flex flex-row items-end justify-end gap-2">
          <button
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="inline-flex items-center justify-center rounded-xl bg-accenta1 px-6 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BaseModal;
