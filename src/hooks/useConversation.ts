"use client";

import { useCallback, useRef, useState } from "react";
import { useMicRecorder } from "./useMicRecorder";
import {
  OpenAIRealtimeClient,
  OpenAIRealtimeCallbacks,
} from "@/lib/stt/createSttSocket";
import { int16ToBase64 } from "@/utils/audio";
import { callGreeting, makeQuestion } from "@/lib/llm/llm";
import { useUserProfile } from "@/states/useUserProfile";

type CallStatus = "idle" | "calling" | "ended";

export const useConversation = () => {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [userTranscripts, setUserTranscripts] = useState<string[]>([]);
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [assistantTexts, setAssistantTexts] = useState<string[]>([]);
  const [isPlayingTts, setIsPlayingTts] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const { data: userProfile } = useUserProfile(userId);

  const { isRecording, setIsRecording, startMicRecording, stopMicCompletely } =
    useMicRecorder();

  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const callScriptRef = useRef<string>("");
  const callStartTimeRef = useRef<number>(0);

  const connectSttSocket = async () => {
    if (clientRef.current) return clientRef.current;

    const callbacks: OpenAIRealtimeCallbacks = {
      onDelta: (text) => {},
      onFinal: (text) => {
        setUserTranscript((prev) => prev + " " + text);
        console.log("onFinal", text);
      },
      onError: (err) => {
        console.error("Realtime STT error:", err);
      },
      onClose: () => {
        console.log("onClose");
      },
    };

    try {
      const client = new OpenAIRealtimeClient({
        token: "",
        callbacks,
      });

      clientRef.current = client;
      console.log("Connected to STT socket", client);
    } catch (err) {
      console.error("Error connecting to STT socket:", err);
    }
  };

  const askQuestion = async () => {
    // llm 요청하고
    // tts로 오디오 출력까지
  };

  const sendAudio = async (pcm16: any) => {
    // pcm16 is Int16Array
    // openai realtime stt expects base64 encoded audio
    if (isMuted) return;

    clientRef.current?.sendAudio(int16ToBase64(pcm16));
  };

  const startMicAndScripting = async () => {
    await connectSttSocket();
    await clientRef.current?.start("ko-KR");
    await startMicRecording(sendAudio);
  };

  const stopMicAndScripting = async () => {
    await clientRef.current?.sendAudioStreamEnd(); // 마지막으로 말하던거는 script 따고 종료
    await stopMicCompletely();
    await clientRef.current?.stop();
  };

  const toggleMute = async () => {
    console.log("toggleMute", isMuted);

    if (isMuted) {
      setIsMuted(false);
      await stopMicAndScripting();
    } else {
      setIsMuted(true);
      await clientRef.current?.sendAudioStreamEnd(); // 마지막으로 말하던거는 script 따고 종료
      await stopMicCompletely(false);
      await clientRef.current?.stop();
    }
    console.log("toggled");
  };

  const playTts = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      setIsPlayingTts(true);

      const startT = performance.now();
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      console.log("TTS fetch time", performance.now() - startT);

      if (!res.ok) {
        console.error("Failed to fetch TTS audio");
        setIsPlayingTts(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // If something is already playing, stop it
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = async () => {
        await startMicAndScripting();
        URL.revokeObjectURL(url);
        setIsPlayingTts(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setIsPlayingTts(false);
      };

      await audio.play();
    } catch (err) {
      console.error("Error playing TTS:", err);
      setIsPlayingTts(false);
    }
  }, []);

  const startCall = async () => {
    // 현재 기준으로는 STT만 WebSocket 연결, 나중엔 전체 프로세스를 처리하는 WebSocket 연결이 될 수 있음.
    callStartTimeRef.current = performance.now();
    setCallStatus("calling");
    // await askQuestion();
    const question = await callGreeting("", "");
    await playTts(question);
    callScriptRef.current += `Harper: ${question}\n`;
    setAssistantTexts((prev) => [...prev, question]);
  };

  const endCall = async () => {
    setCallStatus("ended");
    await stopMicAndScripting();
    if (userTranscript.trim() !== "") {
      callScriptRef.current += `User: ${userTranscript}\n`;
    }
    return {
      script: callScriptRef.current,
      callTime: performance.now() - callStartTimeRef.current,
    };
  };

  const sendAudioCommit = async () => {
    // 현재까지 유저가 말한걸 보내기.
    // audio 끊고
    await stopMicAndScripting();
    if (userTranscript.trim() === "") {
      console.log("userTranscript is empty");
      return;
    }

    setUserTranscripts((prev) => [...prev, userTranscript]);
    setUserTranscript("");
    console.log("callScriptRef.current", userTranscript);
    callScriptRef.current += `User: ${userTranscript}\n`;
    // script는 나와있고
    // llm 요청하고
    const userInfo = `이름: ${userProfile?.name}, 사는 곳 ${userProfile?.location}`;
    const question = await makeQuestion(
      callScriptRef.current,
      userInfo,
      userProfile?.resumes?.[0]?.resume_text ?? ""
    );
    callScriptRef.current += `Harper: ${question}\n`;
    setAssistantTexts((prev) => [...prev, question]);
    // tts로 오디오 출력까지
    await playTts(question);
  };

  return {
    isRecording,
    userTranscripts,
    assistantTexts,
    callStatus,
    startCall,
    sendAudioCommit,
    askQuestion,
    endCall,
    userTranscript,
    toggleMute,
  };
};
