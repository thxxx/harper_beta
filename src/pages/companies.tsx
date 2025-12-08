import React, { useEffect, useRef, useState } from "react";
import "../globals.css";
import { ArrowRight, Building, Inbox, LoaderCircle } from "lucide-react";
import { showToast } from "@/components/toast/toast";
import Animate from "@/components/landing/Animate";
import { supabase } from "@/lib/supabase";
import Head from "next/head";
import router from "next/router";
import { v4 } from "uuid";
import { useIsMobile } from "@/hooks/useIsMobile";
import { FallingTags } from "@/components/landing/FallingTags";

export const isValidCompanyEmail = (email: string): boolean => {
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return false;

  const personalDomains = [
    "gmail.com",
    "naver.com",
    "daum.net",
    "daum.com",
    "hanmail.net",
    "yahoo.com",
    "outlook.com",
    "icloud.com",
    "proton.me",
  ];

  const domain = trimmed.split("@")[1].toLowerCase();

  // 3. 개인용 이메일인지 체크
  if (personalDomains.includes(domain)) return false;

  return true;
};

export default function CompanyPage() {
  const [landingId, setLandingId] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    const localId = localStorage.getItem("harper_landing_id");
    if (!localId) {
      const newId = v4();
      localStorage.setItem("harper_landing_id", newId);
      setLandingId(newId);
      const body = {
        local_id: landingId,
        action: "enter_company",
        is_mobile: isMobile,
      };
      supabase.from("landing_logs").insert(body);
    } else {
      setLandingId(localId as string);
    }
  }, []);

  const handleContactUs = async () => {
    await navigator.clipboard.writeText("chris@asksonus.com");
    showToast({
      message: "Email copied to clipboard",
    });
  };

  const ref = useRef<HTMLDivElement | null>(null);

  // target: 실제 마우스 위치, current: CSS에 쓰는 (느리게 따라가는) 위치
  const targetPos = useRef({ x: 50, y: 40 });
  const currentPos = useRef({ x: 50, y: 40 });
  const frameId = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // 마우스는 즉시 갱신 (타겟만)
    targetPos.current.x = x;
    targetPos.current.y = y;
  };

  useEffect(() => {
    const animate = () => {
      const el = ref.current;
      if (el) {
        // lerp: current += (target - current) * k
        const k = 0.08; // 작을수록 더 느리게 따라옴
        currentPos.current.x +=
          (targetPos.current.x - currentPos.current.x) * k;
        currentPos.current.y +=
          (targetPos.current.y - currentPos.current.y) * k;

        el.style.setProperty("--mouse-x", `${currentPos.current.x}%`);
        el.style.setProperty("--mouse-y", `${currentPos.current.y}%`);
      }

      frameId.current = requestAnimationFrame(animate);
    };

    frameId.current = requestAnimationFrame(animate);
    return () => {
      if (frameId.current != null) cancelAnimationFrame(frameId.current);
    };
  }, []);

  const interactiveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interBubble = interactiveRef.current;
    if (!interBubble) return;

    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;
    let animationId = 0;

    const move = () => {
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;
      interBubble.style.transform = `translate(${Math.round(
        curX
      )}px, ${Math.round(curY)}px)`;
      animationId = window.requestAnimationFrame(move);
    };

    const handleMouseMove = (event: MouseEvent) => {
      tgX = event.clientX;
      tgY = event.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);
    move();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <main
      onMouseMove={handleMouseMove}
      className="
      min-h-screen text-white font-inter
      flex flex-col items-center justify-center
    "
    >
      <Head>
        <title>Harper | AI Recruiter</title>
        <meta
          name="description"
          content="Harper is your team's dedicated AI recruiter."
        />
      </Head>
      {/* Background image + overlay */}
      <div className="relative min-h-screen w-full flex flex-col">
        <header className="z-20 flex items-center justify-between px-4 lg:px-8 py-4 text-sm bg-black/0">
          <div className="text-lg font-light text-white/50 font-garamond w-[10%]">
            harper
          </div>

          <nav className="flex items-center justify-end sm:justify-center gap-8 text-sm sm:text-sm w-[60%] sm:w-[40%]"></nav>
          <div className="w-[40%] sm:w-[10%] text-right">
            {/* <div
              className="font-light cursor-pointer opacity-60 hover:opacity-75"
              onClick={() => {
                const body = {
                  local_id: landingId,
                  action: "click_candidates",
                  is_mobile: isMobile,
                };
                supabase.from("landing_logs").insert(body);
                router.push("/");
              }}
            >
              For candidates
            </div> */}
          </div>
        </header>
        <div className="absolute bg-black/80 top-0 left-0 w-full h-full inset-0 z-10"></div>
        <div className="gradient-bg absolute top-0 left-0 w-full h-full inset-0 z-0">
          {/* goo 필터 정의용 SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" className="svgBlur">
            <defs>
              <filter id="goo">
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="10"
                  result="blur"
                />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
                  result="goo"
                />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
            </defs>
          </svg>

          <div className="gradients-container">
            <div className="g1" />
            <div className="g2" />
            <div className="g3" />
            <div className="g4" />
            <div className="g5" />
            <div className="interactive" ref={interactiveRef} />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-between px-4 sm:px-8 pt-12 md:pt-28 z-20">
          <div className="flex-1 flex flex-col items-center justify-start">
            <Animate
              className="max-w-4xl text-center flex flex-col items-center justify-center"
              delay={0.4}
              triggerOnce={true}
            >
              <h1 className="text-5xl font-light tracking-tighter leading-tight">
                Find the best AI Engineer/Researcher.
              </h1>

              <p className="mt-6 text-[32px] text-white font-extralight tracking-tighter">
                Find, track, and hire the best researchers.
              </p>

              <p className="mt-4 text-[18px] text-white/60 leading-relaxed font-extralight max-w-[620px]">
                Research talent is a competitive advantage, and we{"'"}re here
                to help you win that advantage.
              </p>
            </Animate>

            <Animate
              delay={0.8}
              triggerOnce={true}
              className="flex flex-row items-center justify-center gap-4 mt-12 sm:mt-14 "
            >
              <div
                onClick={() => {
                  const body = {
                    local_id: landingId,
                    action: "click_join",
                    is_mobile: isMobile,
                  };
                  supabase.from("landing_logs").insert(body);
                  router.push("/invitation");
                }}
                className="group flex rounded-full h-16 px-10 items-center justify-center font-medium text-lg
            cursor-pointer text-black bg-white transition-all duration-300 gap-2 active:scale-95"
              >
                <span className="text-center">Get started</span>
                <ArrowRight
                  strokeWidth={2.2}
                  className="group-hover:w-[16px] w-0 transition-all duration-300"
                />
              </div>
              <div
                onClick={handleContactUs}
                className="flex rounded-full px-8 h-16 items-center justify-center font-light text-base
            cursor-pointer text-white border border-white/15 bg-white/0 transition-all duration-300 gap-2 hover:bg-white/5 active:scale-95"
              >
                Contact Us
              </div>
            </Animate>
          </div>

          <div className="z-20 w-full bg-red-200/50 mb-32">
            <FallingTags />
          </div>
        </div>
        {/* <Animate
          delay={2.2}
          duration={0.8}
          isUp={false}
          className="z-20 absolute bottom-0 left-0 w-full"
        >
          <div className="flex flex-row items-center justify-between gap-4 pb-2 px-4 w-full text-white/40">
            <div className="font-garamond text-base font-thin">
              Harper is your team{"'"}s
              <br className="block sm:hidden" />
              dedicated AI recruiter.
            </div>
            <div className="cursor-pointer font-inter text-xs md:text-sm font-light hover:text-white/75"></div>
          </div>
        </Animate> */}
      </div>
    </main>
  );
}
