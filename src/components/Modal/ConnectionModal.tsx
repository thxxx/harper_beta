// components/common/ConfirmModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Avatar } from "../CandidatesList";
import { useToggleRequest } from "@/hooks/useToggleRequest";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { supabase } from "@/lib/supabase";

interface ConnectionModalProps {
  open: boolean;
  name?: string;
  profilePicture?: string;
  onClose: () => void;
  candidId: string;
  onConfirm: () => void;
  isRequested: boolean;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  open,
  name,
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-50 w-full max-w-[680px] rounded-md bg-white p-6 shadow-sm">
        <div className="flex flex-row items-center justify-start gap-2">
          <Avatar url={profilePicture} name={name} size="sm" />
          <div className="text-sm font-medium text-gray-600">{name}</div>
        </div>

        <div className="flex flex-col items-start justify-start mt-8">
          <div className="text-sm">Message</div>
          {isRequested ? (
            <div className="w-full mt-2 rounded-md border border-xgray300 px-4 py-3 text-sm bg-xlightgray text-gray-700 focus:outline-none focus:ring-2 focus:ring-brightnavy">
              {requestText}
            </div>
          ) : (
            <textarea
              placeholder="안녕하세요 하퍼입니다. 저희 팀은 ~~ 입니다. 커피챗 괜찮으신가요?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full mt-2 rounded-lg border border-xgray300 p-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brightnavy"
            />
          )}
        </div>

        <div className="w-full mt-8 flex flex-row items-end justify-end gap-2">
          <button
            className="inline-flex items-center justify-center rounded-md border border-xgray300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            닫기
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md bg-black px-6 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onConfirmHandler}
          >
            {isRequested ? "연결 요청 취소" : "연결 요청"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;
