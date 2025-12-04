"use client"; // app router면 필요, pages router면 없어도 됨

import HarperCircle from "@/components/call/HarperCircle";
import {
  ArrowUpFromLine,
  AudioLines,
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@/hooks/useConversation";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/states/useUserProfile";
import router from "next/router";
import {
  highlightDifferences,
  highlightDifferences2,
} from "@/utils/textprocess";
import { workerData } from "worker_threads";

const TEST_SCRIPT = "여기저기서 사람들을 모은다는데 나는 이해할 수 없다.";

const Call: React.FC = () => {
  const [isScriptVisible, setIsScriptVisible] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [script, setScript] = useState<string>("");
  const [callTime, setCallTime] = useState<number>(0);
  const [isTest, setIsTest] = useState<boolean>(false);
  const [isTestDone, setIsTestDone] = useState<boolean>(false);
  const [isTestPassed, setIsTestPassed] = useState<boolean>(false);
  const [isTestLoading, setIsTestLoading] = useState<boolean>(false);
  const [textScript, setTextScript] = useState<string>("");
  const [wrongCount, setWrongCount] = useState<number>(0);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const { data: userProfile } = useUserProfile(userId);

  const {
    startCall,
    endCall,
    sendAudioCommit,
    callStatus,
    assistantTexts,
    isRecording,
    userTranscript,
    toggleMute,
    startTest,
    endTest,
  } = useConversation();

  useEffect(() => {
    if (!isTestDone) return;
    const markedScript = highlightDifferences2(TEST_SCRIPT, userTranscript);
    const wrongCounts = (markedScript.match(/<span/g) || []).length;

    setWrongCount(wrongCounts);
    setTextScript(markedScript);
  }, [userTranscript, isTestDone]);

  // const handleSendAudio = useCallback(async () => {
  //   const audioBase64 = stopRecordingAndGetBase64();
  //   if (!audioBase64) return;
  // }, [stopRecordingAndGetBase64]);

  // const handleEndCall = () => {
  //   stopMicCompletely();
  //   setCallStatus("ended");
  // };

  const handleEndCall = async () => {
    const { script: _script, callTime: _callTime } = await endCall();
    setScript(_script);
    setCallTime(_callTime);
    console.log("script", _script);
    console.log("callTime", _callTime);
  };

  const handleSaveCallHistory = async () => {
    const body = {
      user_id: userId,
      script: script,
      total_sesstion_time: callTime,
      resume_id: userProfile?.resume_id,
    };
    const { data, error } = await supabase.from("calls").insert(body);
    console.log("저장 완료!", data);
    alert("저장 완료!");
    router.push("/app");
  };

  useEffect(() => {
    if (isRecording) {
      const sto = setTimeout(() => {
        setMessage("짧게 답변하셔도 괜찮습니다.");
      }, 50000);
      return () => clearTimeout(sto);
    }

    if (!isRecording) {
      setMessage("");
    }
  }, [isRecording]);

  const startTestCall = async () => {
    setIsTestLoading(true);
    setIsTestDone(false);
    setWrongCount(0);
    setTextScript("");
    startTest();
    console.log("startTest");
    setIsTestLoading(false);
    setIsTest(true);
  };

  const checkTestCall = async () => {
    console.log("checkTest");
    setIsTestDone(true);
    endTest();
    // setIsTest(false);
  };

  return (
    <div className="w-full max-w-[100vw] h-[100vh] flex flex-col gap-2 items-center justify-center bg-white text-black font-inter">
      <div className="flex items-stretch justify-center gap-8">
        {/* Left side: Call visuals */}
        <div className="flex flex-row flex-1 items-center justify-center gap-2 md:flex-col w-[440px]">
          <div className="w-full">Call with Harper</div>
          <div className="w-full rounded-lg flex items-center justify-center border border-xlightgray h-[280px] shadow-sm">
            <HarperCircle />
          </div>
          <div className="w-full rounded-lg flex items-center justify-center border border-xgray300/0 h-[320px]"></div>
        </div>

        {callStatus === "ended" && (
          <div className="flex flex-col items-center justify-center">
            <div>
              Recruiter call이 완료되었습니다. 저장 후 진행하시겠습니까?
            </div>
            <button
              className="cursor-pointer hover:opacity-90 rounded-lg bg-brightnavy text-white py-4 w-full"
              onClick={handleSaveCallHistory}
            >
              Save Call History
            </button>
          </div>
        )}

        {callStatus === "idle" && (
          <div className="flex flex-col flex-1 items-center justify-between gap-4 w-[680px]">
            <div className="text-left w-full">
              <div>
                지원자님만을 위한 리크루터 AI 하퍼와의 통화가 시작됩니다.
              </div>
              <div>
                통화를 시작하기에 앞서, 통화하기에 적합한 환경으로 이동한 뒤
                아래 시작버튼을 눌러주세요.
              </div>
              <div>
                주변 소음이 심하다면 말을 잘 못 알아들어 지원자님을 제대로
                이해하지 못할 수 있습니다.
              </div>
              <div>
                현재 환경이 대화하기 적합한지 확인하고 싶다면 아래의 테스트
                버튼을 눌러주세요.
              </div>

              {isTest && (
                <div className="flex flex-col gap-2 w-full mt-12">
                  <div>
                    테스트 중입니다... 아래 텍스트를 읽고, 제출 버튼을
                    눌러주세요.
                  </div>
                  <div className="text-black/80 text-sm px-4 h-12 flex items-center justify-start rounded-lg bg-xlightgray border border-xgray300">
                    {TEST_SCRIPT}
                  </div>
                  {textScript && (
                    <div
                      className="text-blue-800 text-sm px-4 h-12 flex flex-row gap-1 items-center justify-start rounded-lg bg-blue-100 border border-xgray300"
                      dangerouslySetInnerHTML={{ __html: textScript }}
                    ></div>
                  )}
                  {isTestDone && (
                    <>
                      {wrongCount > 0 ? (
                        <div className="text-red-500 text-sm">
                          <div>{wrongCount}개의 오류가 있습니다.</div>
                          <div>1. 좀 더 조용한 곳에서 접속하거나</div>
                          <div>
                            2. 마이크에 잘 들리게 말하여 주시기 바랍니다.
                          </div>
                        </div>
                      ) : (
                        <div className="text-green-500 text-sm">
                          <div>테스트 완료!</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full">
              {(!isTest || isTestLoading || isTestDone) && (
                <button
                  className="cursor-pointer hover:opacity-90 rounded-lg bg-xlightgray border border-xgray300 text-black py-4 w-full"
                  onClick={startTestCall}
                >
                  {isTestDone ? (
                    <>
                      {wrongCount > 0
                        ? "다시 테스트 하기"
                        : "테스트 완료. 다시 테스트 하기"}
                    </>
                  ) : isTestLoading ? (
                    <LoaderCircle className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    "Test"
                  )}
                </button>
              )}
              {isTest && !isTestDone && (
                <button
                  className="cursor-pointer hover:opacity-90 rounded-lg bg-xlightgray border border-xgray300 text-black py-4 w-full"
                  onClick={checkTestCall}
                >
                  제출하기
                </button>
              )}
              <button
                className="cursor-pointer hover:opacity-90 rounded-lg bg-brightnavy text-white py-4 w-full"
                onClick={startCall}
              >
                Start Call
              </button>
            </div>
          </div>
        )}

        {callStatus === "calling" && (
          <div className="flex flex-col flex-1 items-center justify-between gap-4 w-[680px]">
            {/* Script area */}
            <div className="flex flex-col gap-2 w-full">
              <div className="w-full flex items-center justify-end">
                <div
                  className="text-brightnavy cursor-pointer hover:opacity-90"
                  onClick={() => setIsScriptVisible((prev) => !prev)}
                >
                  {isScriptVisible ? "Hide script" : "Show script"}
                </div>
              </div>
              {isScriptVisible && (
                <div className="flex flex-col gap-2 w-full rounded-lg bg-xlightgray min-h-[120px] py-3 px-4 text-sm">
                  <div className="pt-2">
                    <div className="font-medium mb-1">Harper</div>
                    <div className="whitespace-pre-wrap text-black/80">
                      {assistantTexts[assistantTexts.length - 1]}
                    </div>
                    {userTranscript && (
                      <div className="mt-4 text-blue-500">{userTranscript}</div>
                    )}
                  </div>
                </div>
              )}
              {message && (
                <div className="mt-2 text-black/50 text-sm">{message}</div>
              )}
            </div>

            {/* Controls */}
            <div className="w-full flex items-center justify-center">
              <div className="flex flex-row gap-8 items-center justify-end">
                {/* Record / Send */}
                <div className="group inline-flex flex-col items-center gap-2">
                  <button
                    onClick={isRecording ? sendAudioCommit : startCall}
                    className={`cursor-pointer hover:opacity-90 w-16 h-16 rounded-full border-black/30 backdrop-blur border flex items-center justify-center transition active:scale-95
                      ${
                        isRecording
                          ? "bg-xgrayblack"
                          : "bg-white disabled:opacity-40"
                      }`}
                  >
                    {isRecording ? (
                      <ArrowUpFromLine className="w-5 h-5 text-white" />
                    ) : (
                      <AudioLines className="w-5 h-5 text-black/90" />
                    )}
                  </button>
                  <span className="text-base text-black/80 font-light">
                    {isRecording ? "Send" : "Interrupt"}
                  </span>
                </div>

                {/* Mute */}
                <div className="group inline-flex flex-col items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="cursor-pointer hover:opacity-90 w-16 h-16 rounded-full border border-black/30 flex items-center justify-center transition active:scale-95"
                  >
                    {isRecording ? (
                      <MicOff className="w-5 h-5 text-black/90" />
                    ) : (
                      <Mic className="w-5 h-5 text-black/90" />
                    )}
                  </button>
                  <span className="text-base text-black/90 font-light">
                    {isRecording ? "Muted" : "Mute"}
                  </span>
                </div>

                {/* End Call */}
                <div className="group inline-flex flex-col items-center gap-2">
                  <button
                    onClick={handleEndCall}
                    className="cursor-pointer hover:opacity-90 w-16 h-16 rounded-full border border-red-600 bg-red-600/10 flex items-center justify-center transition active:scale-95"
                  >
                    <PhoneOff className="w-5 h-5 text-red-600" />
                  </button>
                  <span className="text-base text-black/90 font-light">
                    End Call
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right side: Script + Controls */}
      </div>
    </div>
  );
};

export default Call;
