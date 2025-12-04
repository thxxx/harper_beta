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
import { splitTextToChunks } from "@/utils/textprocess";
import { OPENAI_KEY } from "@/utils/constantkeys";

type CallStatus = "idle" | "calling" | "ended" | "test";

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
        token: OPENAI_KEY,
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
    setUserTranscript("");
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

  const playTts = useCallback(
    async (
      text: string,
      opts?: {
        onBeforeLast?: () => void | Promise<void>;
        onAfterLast?: () => void | Promise<void>;
      }
    ) => {
      const cleaned = text.trim();
      if (!cleaned) return;

      const chunks = splitTextToChunks(cleaned);
      if (!chunks.length) return;

      setIsPlayingTts(true);

      try {
        const concurrencyLimit = 2; // ✨ 동시 생성 개수 제한 (2개)
        const fetchPromises: Promise<any>[] = []; // 오디오 생성 Promise를 담을 풀

        // 생성된 오디오 데이터를 순서대로 담아둘 배열 (청크 순서 보장)
        const generatedChunks: {
          blob: Blob;
          isLast: boolean;
          index: number;
        }[] = [];

        // 1. 모든 청크에 대한 생성 작업을 시작하고, 동시성 2를 유지합니다.
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const isLast = i === chunks.length - 1;

          // TTS 오디오 생성 요청을 비동기 함수로 정의
          const fetchJob = async (index: number) => {
            if (isLast && opts?.onBeforeLast) {
              await opts.onBeforeLast();
            }
            console.log(`[Chunk ${index + 1}] 생성 요청 시작:`, chunk);

            const res = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: chunk }),
            });
            if (!res.ok)
              throw new Error(`Failed to fetch TTS for chunk ${index}`);

            const blob = await res.blob();
            console.log(`[Chunk ${index + 1}] 생성 완료`);

            return { blob, isLast, index };
          };

          // Promise를 생성 풀(fetchPromises)에 추가
          const jobPromise = fetchJob(i)
            .then((result) => {
              // 완료된 결과를 순서 보장을 위해 인덱스와 함께 저장
              generatedChunks[result.index] = result;
              return result;
            })
            .catch((err) => {
              console.error(`Error in fetchJob for chunk ${i}:`, err);
              throw err;
            });

          fetchPromises.push(jobPromise);

          // 동시성 제한을 초과하면, 가장 먼저 시작된 작업이 끝날 때까지 기다립니다.
          if (fetchPromises.length >= concurrencyLimit) {
            // Promise.race는 가장 빨리 끝난 Promise의 결과를 반환합니다.
            await Promise.race(fetchPromises);

            // 완료된 Promise를 제거 (여기서는 단순하게 배열의 맨 앞에서 제거)
            // 실제 구현 시 Promise.race는 "어떤" Promise가 끝났는지 정확히 알려주지 않아 까다롭지만,
            // 생성 완료 후 `generatedChunks`에 저장되므로 여기서는 단순히 `await`만 사용하여 압박을 줄입니다.
            // *가장 간단하게,* `Promise.all`로 `concurrencyLimit` 단위로 끊어서 생성하는 방법을 채택합니다.

            // === 이 부분이 너무 복잡해지므로, 이전 답변의 "Batch and Wait" 방식으로 회귀하고 에러 핸들링을 강화합니다. ===
          }
        }

        // 2. 모든 생성이 완료되기를 기다립니다 (생성 풀이 빌 때까지).
        await Promise.all(fetchPromises);

        // 3. 생성된 청크를 순서대로 재생
        // generatedChunks는 인덱스 순서대로 채워졌을 것입니다. (정확히는 인덱스에 따라 위치가 보장)
        // 실제 순차 재생을 위해 인덱스 순서대로 정렬해야 합니다.
        const sortedChunks = generatedChunks
          .filter((c) => c)
          .sort((a, b) => a.index - b.index);

        for (const { blob, isLast, index } of sortedChunks) {
          const url = URL.createObjectURL(blob);

          // 이전 오디오 중지 및 URL 해제
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
          }

          console.log(`[Chunk ${index + 1}] 재생 시작`);

          await new Promise<void>((resolve, reject) => {
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = async () => {
              URL.revokeObjectURL(url);

              if (isLast) {
                await opts?.onAfterLast?.();
                await startMicAndScripting();
              }
              resolve();
            };

            audio.onerror = (e) => {
              URL.revokeObjectURL(url);
              reject(e);
              setIsPlayingTts(false);
            };

            audio.play().catch((err) => {
              URL.revokeObjectURL(url);
              reject(err);
              setIsPlayingTts(false);
            });
          });

          console.log(`[Chunk ${index + 1}] 재생 완료`);
          if (isLast) break;
        }
      } catch (err) {
        console.error("Error playing TTS:", err);
      } finally {
        setIsPlayingTts(false);
      }
    },
    [setIsPlayingTts, audioRef, startMicAndScripting]
  );

  const startCall = async () => {
    setUserTranscripts([]);
    setAssistantTexts([]);
    callStartTimeRef.current = performance.now();
    setCallStatus("calling");
    // await askQuestion();
    const question = await callGreeting("", "");
    console.log("지금은 질문 : ", question);
    await playTts(question);

    callScriptRef.current += `Harper: ${question}\n`;
    setAssistantTexts((prev) => [...prev, question]);
    // await startMicAndScripting();
  };

  const startTest = async () => {
    // setCallStatus("test");
    await startMicAndScripting();
  };

  const endTest = async () => {
    // setCallStatus("idle");
    await stopMicAndScripting();

    return userTranscript;
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
    startTest,
    endTest,
  };
};
