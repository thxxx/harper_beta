"use client"; // app router면 필요, pages router면 없어도 됨

import HarperCircle from "@/components/call/HarperCircle";
import {
  ArrowUpFromLine,
  AudioLines,
  Mic,
  MicOff,
  PhoneOff,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@/hooks/useConversation";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/states/useUserProfile";
import router from "next/router";

const Call: React.FC = () => {
  const [isScriptVisible, setIsScriptVisible] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [script, setScript] = useState<string>("");
  const [callTime, setCallTime] = useState<number>(0);

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
  } = useConversation();

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
      }, 2000);
      return () => clearTimeout(sto);
    }

    if (!isRecording) {
      setMessage("");
    }
  }, [isRecording]);

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

        {/* Right side: Script + Controls */}
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
            {callStatus === "idle" ? (
              <div className="flex flex-col gap-2 w-full">
                <button
                  className="cursor-pointer hover:opacity-90 rounded-lg bg-brightnavy text-white py-4 w-full"
                  onClick={startCall}
                >
                  Start Call
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Call;
