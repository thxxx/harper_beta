import React, { useState } from "react";
import "../globals.css";
import { Ampersand, LoaderCircle } from "lucide-react";
import { showToast } from "@/components/toast/toast";
import router from "next/router";
import Animate from "@/components/landing/Animate";
import { motion } from "framer-motion";
import Header from "@/components/landing/Header";
import { isValidEmail } from "./cand";
import { supabase } from "@/lib/supabase";

export default function CompanyPage() {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [expect, setExpect] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleContactUs = async () => {
    await navigator.clipboard.writeText("chris@asksonus.com");
    showToast({
      message: "Email copied to clipboard",
      variant: "white",
    });
  };

  const handleJoinWaitlist = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setUploading(true);
    if (!isValidEmail(email)) {
      showToast({
        message: "Please enter a valid email",
        variant: "white",
      });
      setUploading(false);
      return;
    }

    const body = {
      email: email,
      type: 1,
      companyName: companyName,
      expect: expect,
    };
    await supabase.from("harper_waitlist").insert(body);

    showToast({
      message: "등록이 완료되었습니다. 감사합니다.",
      variant: "white",
    });
    setUploading(false);
  };

  return (
    <main className="min-h-screen text-white font-inter">
      {/* Background image + overlay */}
      <div
        className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('/images/company_back.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Header page="company" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 pb-10 sm:pb-16">
          <Animate className="flex flex-row items-center justify-center pl-[2px] py-[2px] pr-[12px] bg-white text-black gap-1.5 rounded-full">
            <div className="w-[24px] h-[24px] bg-black rounded-full flex items-center justify-center">
              <Ampersand className="w-[16px] text-white" />
            </div>
            <div className="text-[12px] font-light">Join waitlist</div>
          </Animate>

          <Animate className="mt-8 max-w-2xl text-center" delay={0.4}>
            <h1 className="text-4xl font-extralight leading-snug">
              최고의 엔지니어/리서처를 발견하세요.
            </h1>

            <p className="mt-4 text-base text-white/50 leading-relaxed font-thin">
              하퍼는 지원자와 직접 이야기하여 알아낸 정보와 이력서, 깃헙, 논문
              등 모든 정보를 사용하여
              <br />
              회사에 가장 적합한 인재를 찾고 연결해줍니다.
            </p>
          </Animate>

          {/* Form card */}
          <div className="mt-10 sm:mt-14 w-full flex justify-center">
            <Animate
              className="w-full max-w-2xl rounded-[20px] bg-white text-black shadow-2xl px-5 py-6"
              delay={0.8}
            >
              <form className="space-y-6">
                {/* Second row: Email / Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="flex flex-col text-xs sm:text-sm">
                    <label className="mb-1 text-xgray700">이메일</label>
                    <input
                      type="email"
                      className="border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col text-xs sm:text-sm">
                    <label className="mb-1 text-xgray700">회사 명</label>
                    <input
                      type="text"
                      className="border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="flex flex-col text-xs sm:text-sm">
                  <label className="mb-1 text-gray-500">
                    어떤 역할을 찾고 계신가요?
                  </label>
                  <textarea
                    rows={3}
                    className="border-b border-gray-200 focus:border-black outline-none py-2 text-sm resize-none"
                  />
                </div>

                {/* CTA button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    onClick={handleJoinWaitlist}
                    className="flex items-center justify-center w-full rounded-[16px] bg-black text-white py-3 text-base font-normal hover:bg-black/90 transition"
                  >
                    {uploading ? (
                      <LoaderCircle className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      "Join waitlist"
                    )}
                  </button>
                </div>
              </form>
            </Animate>
          </div>
        </div>
        <Animate delay={2.2} duration={0.8} isUp={false}>
          <div className="flex flex-row items-center justify-between gap-4 pb-2 px-4 w-full text-white/40">
            <div className="font-garamond text-base font-thin">
              Harper is your team{"'"}s dedicated AI recruiter.
            </div>
            <div
              onClick={handleContactUs}
              className="cursor-pointer font-inter text-sm font-light hover:text-white/75"
            >
              Contact Us
            </div>
          </div>
        </Animate>
      </div>
    </main>
  );
}
