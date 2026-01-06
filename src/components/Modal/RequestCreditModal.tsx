import React, { useState } from "react";
import BaseModal from "./BaseModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { showToast } from "../toast/toast";

interface RequestCreditModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (credit_num: number) => Promise<boolean>;
}

const CREDIT_OPTIONS = [
  {
    label: "100 credits",
    value: 100,
  },
  {
    label: "500 credits",
    value: 500,
  },
  {
    label: "1000 credits",
    value: 1000,
  },
];

const RequestCreditModal = ({
  open,
  onClose,
  onConfirm,
}: RequestCreditModalProps) => {
  const [selectedCredit, setSelectedCredit] = useState(100);
  const [sentRequest, setSentRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!open) return null;

  return (
    <BaseModal
      onClose={onClose}
      onConfirm={async () => {
        if (sentRequest) {
          setSentRequest(false);
          showToast({ message: "Credit request submitted.", variant: "white" });
          onClose();
        } else {
          setIsLoading(true);
          const result = await onConfirm(selectedCredit);
          if (result) {
            setIsLoading(false);
            setSentRequest(true);
          }
        }
      }}
      isLoading={isLoading}
      confirmLabel={sentRequest ? "Confirm" : "Submit Request"}
      isCloseButton={!sentRequest}
    >
      <div className="flex flex-col items-start justify-center gap-4">
        {sentRequest ? (
          <div className="text-base text-hgray900 font-light">
            <div className="text-lg font-normal mb-2">
              Your request has been submitted
            </div>
            <div>
              Thank you for requesting! Your credit increase is being reviewed,
              and a decision will be made soon. If opted in, you’ll receive
              updates on the status via email.
            </div>
          </div>
        ) : (
          <>
            <div className="text-lg text-hgray900 font-normal">
              Request More Credit
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={[
                    "flex flex-row px-4 transition-all duration-300 text-hgray900 rounded-2xl h-14 w-full bg-white/5 border border-white/10 items-center justify-between",
                    "hover:bg-white/10 focus:outline-white/5 focus:ring-white/10",
                  ].join(" ")}
                >
                  <div>{selectedCredit} Credits</div>
                  <div>
                    <ChevronDown size={24} strokeWidth={1} />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="rounded-2xl w-[var(--radix-popper-anchor-width)] p-1 backdrop-blur-sm bg-ngray300/50"
              >
                <DropdownMenuGroup>
                  {CREDIT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      className="w-full font-light rounded-xl hover:border-none hover:outline-none hover:bg-white/10 cursor-pointer p-3 mt-1"
                      onClick={(e) => {
                        setSelectedCredit(option.value);
                      }}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default RequestCreditModal;
