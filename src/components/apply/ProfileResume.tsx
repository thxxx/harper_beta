import { useUploadProfile } from "@/states/useUploadProfile";
import { useUserProfile } from "@/states/useUserProfile";
import { FileText, Loader2, Upload } from "lucide-react";
import React, { useEffect, useState } from "react";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 10MB

const ProfileResume = () => {
  const [univName, setUnivName] = useState("");
  const [univMajor, setUnivMajor] = useState("");
  const [univDegree, setUnivDegree] = useState("");
  const [univGraduation, setUnivGraduation] = useState("");
  const [univIn, setUnivIn] = useState("");
  const [univGpa, setUnivGpa] = useState("");

  const [workExperiences, setWorkExperiences] = useState<
    {
      company: string;
      position: string;
      startDate: string;
      endDate: string;
      description: string;
    }[]
  >([
    {
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      description: "",
    },
  ]);

  const [loadingPdf, setLoadingPdf] = useState(false);
  const [resumeIdState, setResumeIdState] = useState("");
  const [resumeText, setResumeText] = useState("");

  const [files, setFiles] = useState<File | null>(null);
  const [isFileChanged, setIsFileChanged] = useState(false);

  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useUserProfile(userId);

  const uploadProfileMutation = useUploadProfile();

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

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setLoadingPdf(true);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      alert("File size is too large");
      return;
    }

    console.log(selected);
    readPdf(selected);
    setFileName(selected.name);
    setFileSize(selected.size);

    setFiles(selected);
    setIsFileChanged(true);
    setLoadingPdf(false);
  };

  const readPdf = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    // 2. API Route로 전송
    const response = await fetch("/api/pdf", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to extract text");
    }

    const data = await response.json();
    console.log("--- Extracted Text (Client Side) ---");
    console.log(data.text.slice(0, 100), data.length);
    setResumeText(data.text);

    // 내용 뽑아달라고 하기

    // const result = await askGpt(data.text);
    // console.log("result ", result);
  };

  // Add new work experience
  const addWorkExperience = () => {
    setWorkExperiences((prev) => [
      ...prev,
      {
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        description: "",
      },
    ]);
  };

  // Update specific field of work experience
  const updateWorkExperience = (
    index: number,
    field: "company" | "position" | "startDate" | "endDate" | "description",
    value: string
  ) => {
    setWorkExperiences((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp))
    );
  };

  // Remove work experience
  const removeWorkExperience = (index: number) => {
    setWorkExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
      <SectionLayout>
        <div>
          <input
            onChange={handleChangeFile}
            id="resume-upload"
            type="file"
            className="hidden"
            accept="
        application/pdf,
        application/msword,
        application/vnd.openxmlformats-officedocument.wordprocessingml.document,
        .pdf,
      "
          />
          <label
            htmlFor="resume-upload"
            className={`
  cursor-pointer flex flex-col items-center justify-center gap-2 
  w-full py-12 px-4 
  border rounded-[6px]
  ${
    fileName
      ? "border-[1.6px] border-brightnavy bg-white hover:bg-xlightgray"
      : "border-dashed border-xgray300 bg-xlightgray hover:bg-[rgb(242,242,244)] "
  }
`}
          >
            <div className="flex-wrap w-fit p-3 bg-white rounded-full border border-xgray300">
              {loadingPdf && <Loader2 size={20} strokeWidth={1.6} />}
              {!loadingPdf && fileName ? (
                <FileText size={20} strokeWidth={1.6} />
              ) : (
                <Upload size={20} strokeWidth={1.6} />
              )}
            </div>

            <div className="text-[14px] mt-1">
              {fileName
                ? fileName
                : "Click or Drag & drop to upload Resume (Only pdf)"}
            </div>

            <div className="text-[12px] font-light text-xgray500 text-center">
              주민등록번호, 주소 등 민감한 정보는 제거해주세요. 업로드된 파일은
              채용 검토 목적 외에는 사용되지 않습니다.
              <br />
              권장 파일 형식은 PDF이며, 최대 용량은 10MB입니다.
            </div>
          </label>
        </div>
        <div className="text-[12px] font-light text-xgray500">
          Uploading a new resume will also update the resume on your profile.
          <br />
          By uploading your resume, you agree to our Terms and
          Conditions and Privacy Policy.
          <br />
          We will not share your resume with any third parties.
        </div>
      </SectionLayout>
      <SectionLayout>
        <div className="flex flex-row items-center justify-between mb-2">
          <div className="text-[14px] font-medium">Education</div>
        </div>
        <div className="flex flex-row gap-4 w-full">
          <Input
            label="학교"
            value={univName}
            onChange={(e) => setUnivName(e.target.value)}
            placeholder=""
          />
          <Input
            label="전공"
            value={univMajor}
            onChange={(e) => setUnivMajor(e.target.value)}
            placeholder="컴퓨터과학"
          />
        </div>
        <div className="flex flex-row gap-4 w-full">
          <Input
            label="입학"
            value={univIn}
            onChange={(e) => setUnivDegree(e.target.value)}
            placeholder="2020.03"
          />
          <Input
            label="졸업"
            noneText="재학중"
            value={univGraduation}
            onChange={(e) => setUnivGraduation(e.target.value)}
            placeholder="2024.02"
          />
        </div>
        <div className="flex flex-row gap-4 w-full">
          <Input
            label="학위"
            value={univDegree}
            onChange={(e) => setUnivDegree(e.target.value)}
            placeholder="학사"
          />
          <Input
            label="학위"
            value={univGpa}
            onChange={(e) => setUnivGpa(e.target.value)}
            placeholder="N/4.3"
          />
        </div>
      </SectionLayout>
      <SectionLayout>
        <div className="flex flex-row items-center justify-between mb-2">
          <div className="text-[14px] font-medium">Work Experience</div>
        </div>

        <div className="flex flex-col gap-4">
          {workExperiences.map((exp, index) => (
            <div key={index} className="w-full flex flex-col gap-3 bg-white">
              {/* header: title + delete button */}
              <div className="flex flex-row items-center justify-between">
                <div className="text-[13px] font-medium text-xgray700">
                  경력 {index + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removeWorkExperience(index)}
                  className="text-sm text-xgray500 hover:text-red-500"
                >
                  삭제
                </button>
              </div>

              {/* company / position */}
              <div className="flex flex-row gap-4 w-full">
                <Input
                  label="회사"
                  value={exp.company}
                  onChange={(e) =>
                    updateWorkExperience(index, "company", e.target.value)
                  }
                  placeholder="회사명"
                />
                <Input
                  label="직무"
                  value={exp.position}
                  onChange={(e) =>
                    updateWorkExperience(index, "position", e.target.value)
                  }
                  placeholder="예: ML Engineer"
                />
              </div>

              {/* dates */}
              <div className="flex flex-row gap-4 w-full">
                <Input
                  label="입사"
                  value={exp.startDate}
                  onChange={(e) =>
                    updateWorkExperience(index, "startDate", e.target.value)
                  }
                  placeholder="2022.03"
                />
                <Input
                  label="퇴사"
                  noneText="재직중"
                  value={exp.endDate}
                  onChange={(e) =>
                    updateWorkExperience(index, "endDate", e.target.value)
                  }
                  placeholder="2024.02"
                />
              </div>

              {/* description */}
              <div className="flex flex-col gap-1 w-full">
                <div className="flex flex-row justify-between items-center">
                  <div className="text-[14px] font-medium">
                    담당 업무 / 성과
                  </div>
                </div>
                <textarea
                  placeholder="담당했던 일, 성과, 사용 기술 등을 간단히 적어주세요."
                  className="w-full min-h-[80px] px-3 py-2 border border-xgray400 rounded-[5px] text-[13px] font-normal leading-5 focus:ring-1 focus:ring-brightnavy outline-none resize-y"
                  value={exp.description}
                  onChange={(e) =>
                    updateWorkExperience(index, "description", e.target.value)
                  }
                />
              </div>
            </div>
          ))}
          <div className="flex flex-row items-center justify-start">
            <button
              type="button"
              onClick={addWorkExperience}
              className="text-sm px-3 py-1.5 text-brightnavy rounded-[5px] hover:bg-xlightgray"
            >
              + 업무경험 추가
            </button>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
};

export default React.memo(ProfileResume);

const SectionLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col gap-2  border-t border-xgray400 pt-8 mt-8">
      {children}
    </div>
  );
};

const Input = ({
  label,
  value,
  onChange,
  placeholder,
  noneText,
}: {
  label: string;
  value: string;
  onChange: (e: any) => void;
  placeholder: string;
  noneText?: string;
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex flex-row justify-between items-center">
        <div className="text-[14px] font-medium">{label}</div>
        {noneText && (
          <div
            onClick={() => {
              if (value === "default") {
                onChange({ target: { value: "" } });
              } else {
                onChange({ target: { value: "default" } });
              }
            }}
            className="flex flex-row items-center gap-1.5 text-[12px] font-normal text-xgray700 cursor-pointer"
          >
            <div
              className={`w-[14px] h-[14px] border border-xgray400 rounded-[3px] mt-[1px] ${
                value === "default" ? "bg-brightnavy" : "bg-white"
              }`}
            />
            {noneText}
          </div>
        )}
      </div>
      {value !== "default" ? (
        <input
          disabled={value === "default"}
          placeholder={placeholder}
          className={`w-full h-[36px] px-3 py-2 border border-xgray400 rounded-[5px] text-[13px] font-normal leading-5 focus:ring-1 focus:ring-brightnavy outline-none`}
          value={value}
          onChange={onChange}
        />
      ) : (
        <div className="w-full h-[36px] px-3 py-2 border text-xgray700 border-xgray400 bg-xlightgray rounded-[5px] text-[13px] font-normal leading-5">
          {noneText}
        </div>
      )}
    </div>
  );
};
