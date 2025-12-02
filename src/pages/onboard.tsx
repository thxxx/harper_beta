"use client";

import ProgressBar from "@/components/apply/ProgressBar";
import { ArrowRight, CornerDownLeft, LoaderCircle } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import ProfileResume from "@/components/apply/ProfileResume";
import Image from "next/image";
import router from "next/router";
import { useUserProfile } from "@/states/useUserProfile";
import { useUploadProfile } from "@/states/useUploadProfile";
import useProfileStore from "@/store/useProfileStore";

const STEP_KEY = "harper-onboard-step";

const Options = [
  "풀타임 정규직",
  "인턴",
  "파트타임/외주",
  "Expert call",
  "커피챗",
  "해당 없음",
];
// step metadata (title, description 등)
const steps = [
  {
    id: 1,
    title: "Welcome to Harper!",
    description:
      "Let's start with your profile. Fill out a few quick details to get discovered by top employers.",
  },
  {
    id: 2,
    title: "",
    description: "",
  },
  {
    id: 3,
    title: "Contact preference",
    description:
      "How can companies or Harper contact you? You can update this anytime later.",
  },
  {
    id: 4,
    title: "이력서 제출",
    description:
      "지원 절차를 시작하기 위해 이력서를 업로드해주세요. 이력서를 제출하면 자동으로 아래의 항목들이 채워집니다.",
  },
  {
    id: 5,
    title: "Confirm & finish",
    description:
      "Check your information. When you're ready, submit to start getting matched.",
  },
];

export type WorkExperience = {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type Education = {
  school: string;
  major: string;
  startDate: string; // 입학
  endDate: string; // 졸업 (재학중이면 "default")
  degree: string;
  gpa: string;
};

const Onboard: React.FC = () => {
  const [step, setStep] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);

  // form states (you can add more later)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [links, setLinks] = useState<string[]>(["", "", ""]);
  const [roles, setRoles] = useState<string[]>([]);

  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([
    {
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      description: "",
    },
  ]);
  const [educations, setEducations] = useState<Education[]>([
    {
      school: "",
      major: "",
      startDate: "",
      endDate: "",
      degree: "",
      gpa: "",
    },
  ]);

  const [isDirty, setIsDirty] = useState(false);

  const isLastStep = useMemo(() => step === steps.length - 1, [step]);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useUserProfile(userId);

  const uploadProfileMutation = useUploadProfile();

  const {
    resumeIdState,
    setResumeIdState,
    resumeText,
    setResumeText,
    files,
    setFiles,
    isFileChanged,
    setIsFileChanged,
    fileName,
    setFileName,
    fileSize,
    setFileSize,
  } = useProfileStore();

  useEffect(() => {
    if (!userProfile) return;
    setResumeIdState(userProfile.resume_id ?? "");

    if (userProfile.resumes && userProfile.resumes.length > 0) {
      const latestResume = userProfile.resumes[0];
      setResumeText(latestResume.resume_text ?? "");
      setFileName(latestResume.file_name ?? "");
      setFileSize(latestResume.file_size ?? 0);
    }
  }, [userProfile]);

  useEffect(() => {
    if (isUserProfileLoading) return;
    localStorage.setItem(STEP_KEY, step.toString());
  }, [step, isUserProfileLoading]);

  useEffect(() => {
    const step = localStorage.getItem(STEP_KEY);
    console.log("step", step);
    if (step) {
      setStep(parseInt(step));
    }
  }, []);

  const classifyLinks = (links: string[] | null | undefined) => {
    const result = ["", "", ""];

    if (!links || links.length === 0) return result;

    links.forEach((linkRaw) => {
      const link = linkRaw.trim();
      if (!link) return;

      if (link.includes("github.com")) {
        result[0] = link;
      } else if (link.includes("linkedin.com")) {
        result[1] = link;
      } else if (link.includes("scholar.google.com")) {
        result[2] = link;
      } else {
        result.push(link);
      }
    });

    return result;
  };

  useEffect(() => {
    if (!userProfile) return;

    setName(userProfile.name ?? "");
    setEmail(userProfile.email ?? "");
    setPhone(userProfile.phone ?? "");
    setCountry(userProfile.country ?? "");
    setCity(userProfile.city ?? "");
    setRoles(userProfile.open_opportunities ?? []);
    setWorkExperiences(userProfile.work_experiences ?? []);
    setEducations(userProfile.educations ?? []);

    const parsed = classifyLinks(userProfile.links);
    setLinks(parsed);
  }, [userProfile]);

  const handleNext = useCallback(() => {
    isNext.current = true;

    if (isDirty || isFileChanged) {
      console.log("Upload profile!");
      uploadProfileMutation.mutate({
        name,
        email,
        phone,
        country,
        city,
        open_opportunities: roles,
        links,
        workExperiences,
        educations: educations,
        files,
        isFileChanged,
        resumeText,
        resumeIdState,
      });
      setIsDirty(false);
    }

    if (isLastStep) {
      setSubmitLoading(true);
      console.log("Submit form");
      setTimeout(() => {
        setSubmitLoading(false);
        setStep(5);
      }, 1000);
      return;
    }

    console.log("Next step", step);
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [
    isLastStep,
    step,
    isDirty,
    uploadProfileMutation,
    name,
    email,
    phone,
    country,
    city,
    roles,
    links,
    userId,
    educations,
    workExperiences,
    files,
    isFileChanged,
    resumeText,
    resumeIdState,
  ]);

  const handlePrev = () => {
    isNext.current = false;

    setStep((prev) => Math.max(prev - 1, 0));
  };

  const lock = useRef(false);
  const isNext = useRef(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (lock.current) return;

      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA") return;

      e.preventDefault();
      console.log("Enter key pressed");

      handleNext();

      lock.current = true;
      setTimeout(() => {
        lock.current = false;
      }, 500);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (lock.current) return;
      if (window.scrollY !== 0) {
        lock.current = true;
        setTimeout(() => {
          lock.current = false;
        }, 800);
        return;
      }

      if (e.deltaY < -75) {
        lock.current = true;
        isNext.current = false;
        setStep((prev) => Math.max(prev - 1, 0));

        setTimeout(() => {
          lock.current = false;
        }, 500);
      } else if (e.deltaY > 75) {
        lock.current = true;
        isNext.current = true;
        setStep((prev) => Math.min(prev + 1, steps.length - 1));

        setTimeout(() => {
          lock.current = false;
        }, 500);
      }
    };

    window.addEventListener("wheel", handleWheel);
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const handleRoleChange = (value: string) => {
    console.log(value);
    if (roles.includes(value)) {
      setRoles((prev) => prev.filter((role) => role !== value));
    } else {
      setRoles((prev) => [...prev, value]);
    }
  };

  const handleChangeLink = (index: number, value: string) => {
    setIsDirty(true);
    setLinks((prev) => prev.map((link, i) => (i === index ? value : link)));
  };

  useEffect(() => {
    document.documentElement.classList.add("noneoverscroll");

    return () => {
      document.documentElement.classList.remove("noneoverscroll");
    };
  }, []);

  const slideVariants = {
    enter: (isNext: boolean) => ({
      opacity: 0,
      y: isNext ? 40 : -40, // ⭐️ forward면 아래→위, backward면 위→아래
    }),
    center: {
      opacity: 1,
      y: 0,
    },
    exit: (isNext: boolean) => ({
      opacity: 0,
      y: isNext ? -40 : 40, // ⭐️ forward면 위로 사라지고, backward면 아래로 사라짐
    }),
  };

  // useEffect(() => {
  //   if (!isDirty) return;

  //   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  //     e.preventDefault();
  //     e.returnValue = "";
  //   };

  //   window.addEventListener("beforeunload", handleBeforeUnload);

  //   return () => {
  //     window.removeEventListener("beforeunload", handleBeforeUnload);
  //   };
  // }, [isDirty]);

  return (
    <main className="flex flex-col justify-center items-center min-h-screen bg-white text-black font-inter">
      {/* Top progress bar */}
      <div className="w-full fixed top-0 left-0 z-20">
        <ProgressBar currentStep={step + 1} totalSteps={steps.length} />
      </div>

      {step === 5 ? (
        <>
          <div className="flex flex-col gap-4 items-center justify-center h-full w-full text-center">
            <div className="text-2xl font-normal">
              Thank you for your submission!
            </div>
            <div className="text-lg font-normal text-xgray700">
              We will get in touch with you on the next step within the next 24
              hours. Please seat back and relax
            </div>
            <button
              onClick={() => {
                router.push("/call");
              }}
              className="bg-brightnavy text-white px-4 h-11 rounded-[4px] text-lg font-medium hover:opacity-90"
            >
              Recruiter call 시작하기
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-row items-start justify-center h-full w-full px-4 pb-20 pt-16">
          <div className="h-full flex items-start justify-center min-w-16 pt-1">
            <div className="flex flex-row items-center gap-1 font-light text-brightnavy">
              {step + 1} <ArrowRight size={16} strokeWidth={2} />
            </div>
          </div>

          <div
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col gap-4 max-w-[800px] w-full"
          >
            <AnimatePresence mode="wait" custom={isNext.current}>
              <motion.div
                key={step}
                initial="enter"
                animate="center"
                exit="exit"
                variants={slideVariants}
                custom={isNext.current}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex flex-col gap-4"
              >
                {/* Title / description */}
                {step < steps.length && steps[step].title ? (
                  <div className="flex text-2xl font-normal">
                    {steps[step].title ?? ""}
                  </div>
                ) : (
                  <></>
                )}
                {step < steps.length && steps[step].description ? (
                  <div className="text-xgray700 text-xl font-normal mb-4">
                    {steps[step].description ?? ""}
                  </div>
                ) : (
                  <></>
                )}

                {/* Step-specific inputs */}
                {step === 0 && (
                  <>
                    <TextInput
                      autoFocus
                      label="Country"
                      placeholder="대한민국"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        setIsDirty(true);
                      }}
                    />
                    <TextInput
                      label="City"
                      placeholder="서울"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </>
                )}

                {step === 1 && (
                  <>
                    <TextInput
                      autoFocus
                      label="이름"
                      placeholder="Enter your name..."
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setIsDirty(true);
                      }}
                    />
                    <TextInput
                      label="이메일"
                      placeholder="Enter your email..."
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsDirty(true);
                      }}
                    />
                    <TextInput
                      label="전화번호"
                      placeholder="Enter your phone number..."
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="flex flex-row gap-2 flex-wrap">
                      {Options.map((option) => (
                        <div
                          key={option}
                          onClick={() => {
                            handleRoleChange(option);
                            setIsDirty(true);
                          }}
                          className={`flex flex-row transition-all duration-200 items-center gap-2 cursor-pointer border border-2 py-2 px-3 min-w-[200px] rounded-[4px]
                            ${
                              roles.includes(option)
                                ? "bg-brightnavy/20  hover:bg-brightnavy/20 border-brightnavy"
                                : "bg-brightnavy/5  hover:bg-brightnavy/30 active:border-brightnavy border-brightnavy/10"
                            }
                            `}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <ProfileResume
                      workExperiences={workExperiences}
                      setWorkExperiences={(e) => {
                        setWorkExperiences(e);
                        setIsDirty(true);
                      }}
                      educations={educations}
                      setEducations={(e) => {
                        setEducations(e);
                        setIsDirty(true);
                      }}
                    />
                  </>
                )}

                {step === 4 && (
                  <>
                    <div className="flex flex-col gap-4">
                      <LinkInput
                        label="Github"
                        value={links[0]}
                        onChange={(e) => handleChangeLink(0, e.target.value)}
                        placeholder="https://github.com/username"
                        imgSrc="/svgs/github.svg"
                      />
                      <LinkInput
                        label="LinkedIn"
                        value={links[1]}
                        onChange={(e) => handleChangeLink(1, e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        imgSrc="/svgs/linkedin.svg"
                      />
                      <LinkInput
                        label="Google Scholar"
                        value={links[2]}
                        onChange={(e) => handleChangeLink(2, e.target.value)}
                        placeholder="https://scholar.google.com/citations?user="
                        imgSrc="/svgs/scholar.svg"
                      />
                      {links.length > 3 && (
                        <>
                          {links.slice(3).map((link, index) => (
                            <div className="relative" key={index}>
                              <div
                                onClick={() => {
                                  setIsDirty(true);
                                  setLinks((prev) => prev.slice(0, -1));
                                }}
                                className="flex rounded-full w-4 h-4 absolute top-[11px] right-[-28px] bg-red-100 text-red-400 items-center justify-center cursor-pointer hover:bg-red-200"
                              >
                                -
                              </div>
                              <LinkInput
                                label="추가 링크"
                                value={link}
                                onChange={(e) =>
                                  handleChangeLink(3 + index, e.target.value)
                                }
                                placeholder="https://"
                                imgSrc="/svgs/house.svg"
                              />
                            </div>
                          ))}
                        </>
                      )}
                      <div className="flex flex-row items-center justify-start">
                        <button
                          type="button"
                          onClick={() => setLinks((prev) => [...prev, ""])}
                          className="text-sm px-3 py-1.5 text-brightnavy rounded-[5px] hover:bg-xlightgray"
                        >
                          + 추가
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Buttons */}
                <div className="flex flex-row items-center gap-3 mt-4">
                  <button
                    onClick={handleNext}
                    className="bg-brightnavy shadow-lg transition-all duration-200 cursor-pointer text-white px-4 h-11 rounded-[4px] text-lg font-medium hover:opacity-90"
                  >
                    {submitLoading ? (
                      <span className="animate-spin">
                        <LoaderCircle className="w-6 h-6 animate-spin text-white" />
                      </span>
                    ) : isLastStep ? (
                      "Submit"
                    ) : (
                      "Next"
                    )}
                  </button>

                  <span className="text-[14px] font-light flex flex-row items-center gap-1">
                    <span className="text-xgray700">press</span>
                    <span className="text-black font-medium">Enter</span>
                    <CornerDownLeft size={14} strokeWidth={2} />
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom-left dev nav (optional) */}
          <div className="flex flex-row items-center gap-2 fixed bottom-4 left-4 text-sm text-xgray600">
            <button
              type="button"
              className="underline hover:text-black"
              onClick={handlePrev}
            >
              Back
            </button>
            <button
              type="button"
              className="underline hover:text-black"
              onClick={handleNext}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Onboard;

type TextInputProps = {
  label: string;
  placeholder: string;
  value: string;
  rows?: number;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  autoFocus?: boolean;
};

const TextInput = ({
  label,
  placeholder,
  value,
  rows,
  onChange,
  autoFocus = false,
}: TextInputProps) => {
  return (
    <div className="w-full group flex flex-col">
      <label className="mb-1 font-medium text-sm">{label}</label>
      {rows ? (
        <textarea
          placeholder={placeholder}
          className="transition-colors duration-200 focus:border-b focus:border-brightnavy w-full px-0.5 py-2 border-b border-xgray400 text-xl font-normal leading-5 focus:outline-none outline-none resize-none"
          value={value}
          onChange={onChange}
          rows={rows}
          autoFocus={autoFocus}
        />
      ) : (
        <input
          placeholder={placeholder}
          className="transition-colors duration-200 focus:border-b focus:border-brightnavy w-full px-0.5 py-2 border-b border-xgray400 text-xl font-normal leading-5 focus:outline-none outline-none"
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
        />
      )}
      <div className="transition-colors duration-200 rounded-full w-full h-[1px] bg-white/0 group-focus-within:bg-brightnavy"></div>
    </div>
  );
};

const LinkInput = ({
  label,
  value,
  onChange,
  placeholder,
  imgSrc,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  imgSrc: string;
}) => {
  return (
    <div className="flex flex-row w-full justify-between items-center">
      <div className="text-[15px] font-medium w-1/3 flex flex-row items-center gap-2">
        <Image src={imgSrc} alt={label} width={16} height={16} />
        <div>{label}</div>
      </div>
      <input
        placeholder={placeholder}
        className="w-full h-[36px] px-3 py-2 border border-xgray400 rounded-[5px] text-[14px] font-light leading-5 focus:ring-1 focus:ring-brightnavy outline-none"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};
