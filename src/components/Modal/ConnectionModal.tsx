// components/common/ConfirmModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useToggleRequest } from "@/hooks/useToggleRequest";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { supabase } from "@/lib/supabase";
import NameProfile from "../NameProfile";

interface ConnectionModalProps {
  open: boolean;
  name?: string;
  headline?: string;
  location?: string;
  profilePicture?: string;
  onClose: () => void;
  candidId: string;
  onConfirm: () => void;
  isRequested: boolean;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  open,
  name,
  headline,
  location,
  profilePicture,
  onClose,
  candidId,
  onConfirm,
  isRequested,
}) => {
  const [text, setText] = useState("");
  const [requestText, setRequestText] = useState("");
  const { companyUser } = useCompanyUserStore.getState();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (isRequested) {
      supabase
        .from("request")
        .select("text")
        .eq("user_id", companyUser.user_id)
        .eq("candid_id", candidId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error("error ", error);
            return;
          }
          setRequestText(data?.text ?? "");
        });
    }
  }, [isRequested]);

  const { mutate: toggleRequestMutation } = useToggleRequest();

  const onConfirmHandler = async () => {
    if (!companyUser?.user_id || !candidId) {
      // optionally, handle the error case here
      return;
    }
    toggleRequestMutation({ userId: companyUser.user_id, candidId });

    if (!isRequested && text) {
      const { error } = await supabase.from("request").insert({
        user_id: companyUser.user_id,
        candid_id: candidId,
        text: text,
      });

      if (error) {
        console.error("error ", error);
        return;
      }
    }

    setText("");
    onConfirm();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 w-full">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-50 w-full max-w-[640px] rounded-[28px] bg-hgray300 p-6 shadow-sm border border-white/10">
        <NameProfile
          id={candidId}
          profile_picture={profilePicture ?? ""}
          name={name ?? ""}
          headline={headline ?? ""}
          location={location ?? ""}
        />

        <div className="flex flex-col items-start justify-start mt-8 gap-1">
          <div className="text-[16px]">Message</div>
          {isRequested ? (
            <div className="w-full mt-2 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brightnavy">
              {requestText}
            </div>
          ) : (
            <textarea
              placeholder={`Hi [${name}], \nI hope this message finds you well.`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full text-white mt-2 rounded-2xl border font-light border-white/10 bg-white/5 p-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          )}
        </div>

        <div className="w-full mt-8 flex flex-row items-end justify-end gap-2">
          <button
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="inline-flex items-center justify-center rounded-xl bg-accenta1 px-6 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onConfirmHandler}
          >
            {isRequested ? "Cancel Request" : "Request Connection"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;
