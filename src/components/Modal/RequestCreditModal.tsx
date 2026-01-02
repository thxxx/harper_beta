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

interface RequestCreditModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (credit_num: number) => void;
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

  if (!open) return null;
  return (
    <BaseModal
      onClose={onClose}
      onConfirm={() => onConfirm(selectedCredit)}
      confirmLabel="Submit Request"
    >
      <div className="flex flex-col items-start justify-center gap-4">
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
      </div>
    </BaseModal>
  );
};

export default RequestCreditModal;
