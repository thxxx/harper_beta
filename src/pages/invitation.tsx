"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";

export default function LoginSuccess() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState("코드를 입력해주세요.");
  const [isShake, setIsShake] = useState(false);

  useEffect(() => {
    if (isShake) {
      setTimeout(() => {
        setIsShake(false);
      }, 300);
    }
  }, [isShake]);

  const checkCode = async () => {
    setIsLoading(true);
    if (!code) {
      setIsShake(true);
      setInvalidMessage("초대 코드를 입력해주세요.");
    }
    if (code.length !== 6) {
      setIsShake(true);
      setInvalidMessage("초대 코드는 6자리입니다.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-black font-inter text-neutral-50 flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center max-w-xl w-full space-y-10">
        {/* Logo */}
        <div className="w-9 h-9 rounded-full">
          <Image src="/images/logo.png" alt="Harper" width={36} height={36} />
        </div>

        {/* Heading */}
        <div className="">
          <h1 className="text-2xl md:text-4xl font-normal tracking-tight">
            코드를 입력해주세요.
          </h1>
          <p className="text-sm md:text-base font-light text-xgray500 leading-relaxed mt-8">
            하퍼는 현재 비공개 베타 중입니다. 초대 코드를 입력해주세요.
            <br />
            초대코드가 필요하신분은 대기목록에 등록해주세요.
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-lg">
          <div
            className={`rounded-3xl bg-neutral-900/60 border border-neutral-800/80 shadow-xl px-6 py-8 md:px-8 md:py-8 ${
              isShake ? "animate-shake" : ""
            }`}
          >
            {/* Invite code + continue */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                checkCode();
              }}
              className="flex flex-col relative md:flex-row gap-3 md:gap-4 items-stretch"
            >
              <input
                type="text"
                placeholder="초대 코드"
                className="flex-1 rounded-3xl w-full bg-transparent border border-neutral-800/80 px-4 py-4 text-sm md:text-sm
                transition-all duration-200 hover:border-xgray700
                text-neutral-50 placeholder:text-neutral-500 focus:outline-none font-light focus:ring-0.5 focus:ring-xgray600 focus:border-xgray600"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-[7px] flex items-center justify-center rounded-full bg-white/90 hover:bg-white/80 text-xgrayblack active:scale-95 transition-all duration-200 w-20 h-10 text-sm font-normal"
              >
                {isLoading ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  "입력하기"
                )}
              </button>
            </form>

            {invalidMessage && (
              <div className="text-sm text-red-500/90 mt-2">
                {invalidMessage}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4 mt-10 mb-9">
              <div className="h-px flex-1 bg-neutral-800" />
              <span className="text-xs text-neutral-500">또는</span>
              <div className="h-px flex-1 bg-neutral-800" />
            </div>

            {/* Waitlist button */}
            <button className="w-full rounded-full bg-neutral-50 text-black py-3.5 text-sm md:text-base font-medium hover:bg-neutral-200 transition-colors">
              Join waitlist
            </button>

            {/* Logout */}
            <button className="mt-8 w-full text-xs md:text-sm text-neutral-500 hover:text-neutral-400 mb-4">
              문의하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
