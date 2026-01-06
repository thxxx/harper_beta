import { Loader2 } from "lucide-react";
import React from "react";

const BaseModal = ({
  children,
  onClose,
  onConfirm,
  confirmLabel,
  isCloseButton = true,
  isLoading = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  isCloseButton?: boolean;
  isLoading?: boolean;
}) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 w-full
  `}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        className={`relative z-50 w-full max-w-[600px] rounded-[28px] bg-ngray300 p-6 shadow-sm border border-white/10
  transition-[max-width,padding] duration-300 ease-in-out
  ${isCloseButton ? "max-w-[600px] p-6" : "max-w-[520px] p-6"}`}
      >
        {children}

        <div className="w-full mt-8 flex flex-row items-end justify-end gap-2">
          {isCloseButton && (
            <button
              className={`transition-colors duration-200 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium text-white hover:bg-white/5 
                ${
                  isCloseButton
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }
              `}
              onClick={onClose}
            >
              Close
            </button>
          )}
          <button
            className="transition-colors duration-200 inline-flex items-center justify-center rounded-xl bg-accenta1 px-6 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BaseModal;
