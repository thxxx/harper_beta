"use client";

import GridSectionLayout from "@/components/landing/GridSectionLayout";
import { ArrowRight, ChevronRight, LoaderCircle } from "lucide-react";
import router from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { showToast } from "@/components/toast/toast";
import { supabase } from "@/lib/supabase";
import {
  WaitlistExtraInfo,
  WaitlistExtraInfoModal,
} from "@/components/Modal/WaitlistInfoModal";
import { useCountdown } from "@/hooks/useCountDown";

const vcLogos = [
  { key: "yc", src: "/images/logos/yc.svg", width: 136 },
  { key: "a16z", src: "/images/logos/a16z.svg", width: 72 },
  { key: "index", src: "/images/logos/index.png", width: 113 },
  { key: "sequoia", src: "/images/logos/sequoia.png", width: 128 },
];

const vcLogosBottom = [
  { key: "lightspeed", src: "/images/logos/lightspeed.png", width: 125 },
  { key: "nvidia", src: "/images/logos/nvidia.png", width: 64 },
  { key: "bessemer", src: "/images/logos/bessemer.png", width: 88 },
  { key: "general-catalyst", src: "/images/logos/general.svg", width: 164 },
  { key: "founders-fund", src: "/images/logos/foundersfund.svg", width: 180 },
];

export const isValidEmail = (email: string): boolean => {
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
};

const CandidatePage = () => {
  const [email, setEmail] = useState("");
  const [isBelow, setIsBelow] = useState(false);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      if (!isBelow && currentY > window.innerHeight - 100) {
        setIsBelow(true);
      }

      if (isBelow && currentY <= window.innerHeight - 100) {
        setIsBelow(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isBelow]);

  const upScroll = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContactUs = async () => {
    await navigator.clipboard.writeText("chris@asksonus.com");
    showToast({
      message: "Email copied to clipboard",
      variant: "white",
    });
  };

  const joinWaitlist = async () => {
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
      type: 0,
    };
    await supabase.from("harper_waitlist").insert(body);

    setIsOpenModal(true);
    setUploading(false);
  };

  const handleSubmit = async (data: WaitlistExtraInfo) => {
    const body = {
      email: email,
      type: 0,
      role: data.currentRole,
      expect: data.interests,
      links: data.profileUrl,
    };
    await supabase.from("harper_waitlist").upsert(body);

    showToast({
      message: "등록이 완료되었습니다. 감사합니다.",
      variant: "white",
    });
  };

  const date = new Date();
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const remain = useCountdown("2025-12-20T00:00:00");

  return (
    <main className="min-h-screen text-black font-inter">
      <WaitlistExtraInfoModal
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
        onSubmit={handleSubmit}
      />
      <header
        className={`fixed top-0 left-0 w-full flex items-center border-b justify-between px-0 lg:px-20 h-14 text-sm
          ${
            isBelow
              ? "border-b-xlightgray text-black bg-white/80 backdrop-blur"
              : "border-b-white text-white bg-black"
          } transition-all duration-300
          `}
      >
        <div
          className={`flex items-center justify-between w-full px-8 border-x ${
            isBelow ? "border-black" : "border-white"
          } h-full`}
        >
          <div
            className={`text-xl font-garamond w-[10%] ${
              isBelow ? "font-bold text-xdarknavy" : "font-light text-white"
            }`}
          >
            harper
          </div>
          <nav className="flex items-center justify-center gap-8 text-xs sm:text-sm w-[40%]">
            <div
              className="font-light cursor-pointer opacity-80 hover:opacity-95"
              onClick={() => router.push("companies")}
            >
              For companies
            </div>
            <div className="font-light cursor-pointer opacity-80 hover:opacity-95">
              Referral
            </div>
          </nav>
          <div className="w-[10%]">
            <button
              onClick={upScroll}
              className="font-light cursor-pointer py-2 px-4"
            >
              Join Waitlist
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center px-0 md:px-20 w-full bg-black text-white h-screen">
        <div className="flex flex-col items-center justify-center border-x border-white w-full h-full text-center">
          {/* <div className="mb-4 flex flex-row items-center justify-center pl-[2px] py-[2px] pr-[12px] bg-white text-black gap-1.5 rounded-full">
            <div className="w-[24px] h-[24px] bg-black rounded-full flex items-center justify-center">
              <Building className="w-[14px] text-white" />
            </div>
            <div className="text-[12px] font-normal">
              팀의 50% 이상이 미국에 오피스를 두고 있습니다.
            </div>
          </div> */}
          <div className="text-4xl font-medium leading-snug">
            Harper : AI/ML 리서처·엔지니어를 <br />
            세계 수준의 테크 스타트업과 연결합니다.
          </div>
          <div className="text-lg font-light mt-8">
            이력서를 업로드하고, AI Recruiter와 통화하세요.
            <br /> 그 다음부터는 Harper가 최적의 팀에게서 먼저 제안받으실 수
            있게 합니다.
          </div>
          <div className="relative mt-24">
            <input
              type="email"
              className={`min-w-[310px] py-3 px-5 font-light text-sm border text-white bg-white/10 border-[rgba(255,255,255,0.16)] rounded-full transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/50`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Example@gmail.com"
            />
            <div
              onClick={joinWaitlist}
              className="absolute flex flex-row items-center justify-center gap-1 group cursor-pointer right-1 top-1/2 -translate-y-1/2 text-[13px] bg-white text-black px-4 py-2.5 rounded-full transition-all duration-300"
            >
              {uploading ? (
                <div className="flex flex-row items-center justify-center gap-1">
                  <LoaderCircle className="w-4 h-4 animate-spin text-black" />
                </div>
              ) : (
                <>
                  <span>Join waitlist</span>
                  <ArrowRight
                    size={16}
                    strokeWidth={2.2}
                    className="text-black group-hover:w-[12px] w-0 transition-all duration-300"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <GridSectionLayout>
        <div className="bg-xlightgray gap-2 w-full text-left py-10 px-6">
          <h2 className="text-base font-medium text-neutral-900 md:text-lg">
            하퍼는 최고의 회사와 인재에 집중하고 있습니다.
          </h2>
          <p className="text-sm text-xgray700">
            아래의 글로벌 탑티어 VC에게 투자받은 빠르게 성장하는
            스타트업들에게서 제안을 받아보세요.
          </p>
        </div>
      </GridSectionLayout>
      <GridSectionLayout>
        <div className="flex flex-col w-full">
          <div className="flex flex-row border-b border-xgray300">
            {vcLogos.map((vc, index) => (
              <div
                key={vc.key}
                className={`flex h-32 items-center justify-center w-full ${
                  index === vcLogos.length - 1 ? "border-r-0" : "border-r"
                } border-xgray300`}
              >
                <Image
                  src={vc.src}
                  alt={vc.key}
                  width={vc.width}
                  height={100}
                  className="object-contain"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-row">
            {vcLogosBottom.map((vc) => (
              <div
                key={vc.key}
                className="flex h-32 items-center justify-center w-full border-r border-xgray300"
              >
                <Image
                  src={vc.src}
                  alt={vc.key}
                  width={vc.width}
                  height={100}
                  className="object-contain"
                />
              </div>
            ))}
          </div>

          {/* 하단 통계 영역 */}
          <div className="flex flex-col items-center justify-center gap-2 font-light border-t border-xgray300 px-7 py-12">
            <div className="flex items-center">
              <div className="flex relative items-baseline gap-1 text-black font-normal">
                <div className="absolute bottom-0 left-0 w-full h-[60%] bg-brightnavy/20"></div>
                500+ in the waitlist : AI/ML Engineer 41% / Researcher 28% /
                Software Engineer 21% / 기타 10%
              </div>
              {/* <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full border border-white bg-neutral-300" />
                <div className="h-7 w-7 rounded-full border border-white bg-neutral-300" />
                <div className="h-7 w-7 rounded-full border border-white bg-neutral-300" />
              </div> */}
            </div>
            <div className="text-xgray700">~ {formattedDate}</div>

            {/* <div className="flex flex-col items-end gap-1 text-sm">
              <div className="text-xgray700">
                현재 등록된 비율 :{" "}
                <span>
                  Engineer 42% / Researcher 33% / Backend 15% / 기타 10%
                </span>
              </div>
              <div className="text-black">~ {formattedDate}</div>
            </div> */}
          </div>
        </div>
      </GridSectionLayout>

      <GridSectionLayout>
        <div className="flex h-5 bg-black w-full"></div>
      </GridSectionLayout>
      <FeatureSection />
      <GridSectionLayout>
        <div className="py-6 text-lg font-light italic">Why harper?</div>
      </GridSectionLayout>
      <GridSectionLayout>
        <div className="flex flex-row items-stretch">
          <WhyImageSection
            title="글로벌 시장에서 성장 중인 스타트업들과 함께합니다."
            desc="하퍼에서는 AI/ML Researcher/Engineer분들이 선호할만한 빠르게 성장중인 테크 스타트업들이 참여하여 인재를 찾고 있습니다. 50% 이상이 미국에 법인 혹은 오피스를 두고 있습니다."
            imageSrc="/images/why1.png"
            index={0}
          />
          <WhyImageSection
            title="지원자님의 선호와 역량을 이해합니다."
            desc="하퍼는 대화를 통해 지원자님의 선호와 상황을 이해하고 깃헙, 논문, 이력서, 블로그 등 비정형 정보를 전부 매칭에 반영합니다. 이를 기반으로 모든 공고와 회사를 탐색하고, 최적의 기회들만 찾아 전달합니다."
            imageSrc="/images/why2.png"
            index={1}
          />
        </div>
      </GridSectionLayout>
      <GridSectionLayout>
        <div className="flex flex-col items-start w-full gap-4 pt-8 pb-16 px-8">
          <div className="text-base font-medium italic">Our Values</div>
          <div className="text-sm text-left leading-6 font-normal text-xgray600">
            하퍼는 올라왔다 사라지는 공고들, 반복적인 지원 및 1차 인터뷰, <br />
            그리고 지원자의 역량과 역량과 니즈를 제대로 이해하지 못한 채
            이루어지는 리크루터의 연락 등 비효율적인 채용 프로세스를 개선하고자
            합니다. <br />
            한번의 등록만으로, 모든 Researcher와 Engineer들이 최고의 팀에서 일할
            수 있게 되기를 희망합니다.
            <br />
            <br />
            from Chris, Harper
          </div>
        </div>
      </GridSectionLayout>
      <GridSectionLayout>
        <div className="w-full flex flex-col items-center justify-center bg-black">
          <div className="flex flex-col items-center justify-center w-full lg:w-[94%] border-b border-xgray700 py-32 text-white">
            <div className="text-5xl font-light font-hedvig">
              Join Waitlist.
            </div>
            <div className="text-base font-light text-white/80 mt-6 leading-6">
              서비스는 아직 오픈 준비 중입니다.
              <br />
              런칭까지 <span className="text-white font-normal">
                {remain}
              </span>{" "}
              남았습니다.
              <br />
              <br />
              메일을 남겨주시면 출시와 함께 가장 먼저 안내드릴게요.
            </div>
            <div className="relative mt-12">
              <input
                type="email"
                className="py-3 px-5 font-light text-sm border text-white bg-white/10 border-[rgba(255,255,255,0.16)] rounded-full min-w-[300px] transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Example@gmail.com"
              />
              <div
                onClick={joinWaitlist}
                className="absolute flex flex-row items-center justify-center gap-1 group cursor-pointer right-1 top-1/2 -translate-y-1/2 text-[13px] bg-white text-black px-4 py-2.5 rounded-full transition-all duration-300"
              >
                <span>Join waitlist</span>
                <ArrowRight
                  size={16}
                  strokeWidth={2.2}
                  className="text-black group-hover:w-[12px] w-0 transition-all duration-300"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center w-full pt-10">
            <div className="w-full flex flex-col items-center justify-center">
              <div className="text-lg font-light text-white/80">
                Question Answers
              </div>
              <div className="flex flex-row items-start justify-start text-white/70 font-thin w-[80%] mt-8">
                <QuestionAnswer
                  question="누가 제 프로필을 볼 수 있나요"
                  answer="직접 검증한 회사들만 볼 수 있습니다. 지원자분의 이전 회사에는 공개되지 않도록 합니다."
                />
                <QuestionAnswer
                  question="당장 구직/이직 의사가 없더라도 등록해둘 수 있나요?"
                  answer="현재 학생/연구원이거나 이직 의사가 없더라도 등록해둘 수 있습니다. 편하게 제안을 받고, 그 다음 결정하세요."
                />
                <QuestionAnswer
                  question="어떤 회사들에게서 제안이 오나요?"
                  answer="글로벌에서 성장 중인 테크 스타트업들을 모십니다. 지원자 분들에 맞는 회사를 찾아 가입을 요청하여, 모든 지원자분들이 최소 한번 이상의 제안을 받으실 수 있게 합니다."
                />
              </div>
            </div>
            <div className="flex flex-row items-center justify-between w-full px-4 py-4 text-white/60">
              <div className="font-garamond text-lg">harper</div>
              <div
                onClick={handleContactUs}
                className="font-thin cursor-pointer hover:text-white/75"
              >
                contact us
              </div>
            </div>
          </div>
        </div>
      </GridSectionLayout>
    </main>
  );
};

export default CandidatePage;

const QuestionAnswer = ({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-start justify-start w-[33%] min-h-[240px] px-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`cursor-pointer flex w-full transition-all duration-500 items-center text-left focus:outline-none ${
          open ? "text-white" : "text-white/70"
        }`}
      >
        <span
          className={`mr-1 text-sm transition-all duration-500 ${
            open ? "transform rotate-90" : ""
          }`}
        >
          <ChevronRight size={18} strokeWidth={1} />
        </span>
        <span className="text-sm font-thin"> {question}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden text-left"
          >
            <div className="pt-2 text-sm leading-5 text-white/60">{answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FeatureSection = () => {
  return (
    <GridSectionLayout>
      <div className="flex flex-col items-center justify-center w-full">
        <div className="py-10 w-[34%] text-base font-normal border-x border-xgray300">
          하퍼는 이렇게 진행돼요
        </div>
      </div>
      <div className="flex flex-row items-stretch w-full">
        <ImageSection
          title="간단하게 가입하세요."
          desc="이력서를 올리고, AI recruiter와 대화하며 어떤 기회를 탐색중이고 어떤 팀을 선호하는지 알려주세요. 언제 어디서든 원할 때 진행 가능하고, 모든 정보는 철저히 보호됩니다."
          imageSrc="/images/feat1.png"
          index={0}
        />
        <ImageSection
          title="적합한 기회만 찾아서 알려드려요."
          desc="전체 공고들 중 주요 기술 스택, 회사 분위기, 보상 조건 등 복잡한 조건들도 고려해 최적의 역할만 찾아 알려드립니다.
"
          imageSrc="/images/feat2.png"
          index={1}
        />
        <ImageSection
          title="회사에게서 직접 제안 받으세요."
          desc="지원자님의 선호와 역량을 바탕으로
인재를 필요로하는 회사에게 지원자님을 추천하고,
회사에서 먼저 제안받으실 수 있게 합니다."
          imageSrc="/images/feat3.png"
          index={2}
        />
      </div>
    </GridSectionLayout>
  );
};

const ImageSection = ({
  title,
  desc,
  imageSrc,
  index,
}: {
  title: string;
  desc: string;
  imageSrc: string;
  index: number;
}) => {
  return (
    <div
      className={`flex flex-1 flex-col border-xgray300 ${
        index !== 2 ? "border-r" : "border-r-0"
      } ${index === 1 ? "w-[34%]" : "w-[33%]"}`}
    >
      <div className="h-[280px] w-full overflow-hidden flex justify-end items-end border-y border-xgray300">
        <Image
          src={imageSrc}
          alt={title}
          width={600}
          height={400}
          style={{ height: "100%", width: "auto" }}
          className="object-center max-w-none"
        />
      </div>
      <div className="flex flex-col items-start justify-start w-full px-7 gap-3 py-6 pb-14 text-left">
        <div className="text-md font-normal">{title}</div>
        <div className="text-sm leading-6 font-light text-xgray700">{desc}</div>
      </div>
    </div>
  );
};

const WhyImageSection = ({
  title,
  desc,
  imageSrc,
  index,
}: {
  title: string;
  desc: string;
  imageSrc: string;
  index: number;
}) => {
  return (
    <div
      className={`flex flex-1 flex-col border-xgray300 max-w-full ${
        index !== 1 ? "border-r" : "border-r-0"
      }`}
    >
      <div className="flex flex-col items-start justify-start w-full px-7 gap-3 py-8 pb-14 text-left">
        <div className="text-lg font-normal">{title}</div>
        <div className="text-sm leading-6 font-light text-xgray700">{desc}</div>
      </div>
      <div className="h-[400px] w-full overflow-hidden flex justify-center items-center border-y border-xgray300">
        <Image
          src={imageSrc}
          alt={title}
          width={600}
          height={400}
          style={{ width: "100%", height: "auto" }}
          className="object-center max-w-none"
        />
      </div>
    </div>
  );
};
