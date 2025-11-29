"use client";

import { useEffect } from "react";
import { supabase } from "@/utils/supabase";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

const providers = [
  { key: "google", label: "Google" as const },
  { key: "apple", label: "Apple" as const },
  { key: "twitter", label: "Twitter" as const }, // X(Twitter)
];

export default function AuthModal({ open, onClose }: AuthModalProps) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const signInWith = async (provider: (typeof providers)[number]["key"]) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/app`,
        skipBrowserRedirect: false,
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-xmain/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-2xl rounded-2xl bg-[#0b0b0b] p-6 shadow-2xl ring-1 ring-white/10"
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-opp">
            Sign in to continue
          </h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-xopp/5 hover:text-opp focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 카드 그리드 (조직 카드 느낌 차용) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Google */}
          <button
            onClick={() => signInWith("google")}
            className="group flex flex-col rounded-2xl border border-xopp/10 bg-xopp/[0.03] p-4 text-left transition hover:border-xopp/20 hover:bg-xopp/[0.06] focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-xopp">
                <div className="h-4 w-4">{googleGlyph}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-opp">Google</div>
                <div className="text-xs text-opp/50">OAuth • fast</div>
              </div>
            </div>
          </button>

          {/* Twitter / X */}
          <button
            onClick={() => signInWith("twitter")}
            className="group flex flex-col rounded-2xl border border-xopp/10 bg-xopp/[0.03] p-4 text-left transition hover:border-xopp/20 hover:bg-xopp/[0.06] focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-xopp/10 text-opp">
                <div className="h-4 w-4">{xGlyph}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-opp">Twitter</div>
                <div className="text-xs text-opp/50">OAuth • social</div>
              </div>
            </div>
          </button>
        </div>

        {/* 하단 안내/닫기 */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-opp/40">
            로그인 시 약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm text-opp/70 hover:bg-xopp/5 hover:text-opp focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Inline SVGs (아이콘) ===== */
const searchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M20 20l-3.5-3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const googleIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path
      fill="currentColor"
      d="M21.35 11.1h-9.18v2.95h5.27c-.23 1.49-1.61 4.37-5.27 4.37-3.17 0-5.76-2.62-5.76-5.84s2.6-5.84 5.76-5.84c1.81 0 3.02.77 3.72 1.43l2.53-2.45C17.39 4.28 15.5 3.4 13.1 3.4 8.38 3.4 4.5 7.31 4.5 12.02S8.38 20.65 13.1 20.65c7.54 0 7.45-6.62 7.45-7.54 0-.66-.08-1.06-.2-2.01z"
    />
  </svg>
);
const googleGlyph = (
  <svg viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.8 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.7 3l5.7-5.7C34.1 6.3 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.2-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.4 16 18.8 12 24 12c3 0 5.7 1.1 7.7 3l5.7-5.7C34.1 6.3 29.3 4 24 4 16.1 4 9.2 8.2 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2C29.4 36 25 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.2 39.8 16.1 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.7 3.2-3.6 6-7.3 6-.9 0-5.3 0-11.3-8l-6.6 5.1C12.2 39.8 17 44 24 44c8.8 0 16-7.2 16-16 0-1.3-.1-2.2-.4-3.5z"
    />
  </svg>
);
const appleGlyph = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.42 2.07-1.27 2.86-.85.79-1.87 1.2-3.04 1.12-.04-1.07.39-2.03 1.23-2.86.85-.85 1.9-1.32 3.08-1.42.03.1.04.2.04.3ZM21.5 18.06c-.38.88-.84 1.68-1.37 2.4-.73 1.02-1.33 1.73-1.8 2.13-.73.68-1.52 1.02-2.38 1.02-.6 0-1.32-.17-2.17-.5-.86-.34-1.65-.5-2.38-.5-.77 0-1.6.17-2.5.5-.9.33-1.63.5-2.18.5-.83 0-1.63-.33-2.4-1-.5-.43-1.12-1.16-1.86-2.2C.76 20.88.17 19.7 0 18.7c-.02-.1-.03-.2-.03-.3 0-.95.2-1.87.62-2.75.41-.87.97-1.57 1.68-2.1.84-.66 1.8-1 2.9-1.04.57 0 1.32.2 2.25.58.92.39 1.52.58 1.79.58.2 0 .85-.24 1.97-.71 1.06-.43 1.95-.61 2.66-.56 1.97.16 3.45.95 4.44 2.38-1.77 1.07-2.65 2.56-2.65 4.46 0 1.63.61 2.98 1.84 4.06.55.52 1.17.92 1.86 1.21-.17.48-.36.95-.58 1.41Z" />
  </svg>
);
const xGlyph = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.146 2H21l-6.507 7.433L22 22h-6.828l-4.47-5.86L5.38 22H2.523l7.04-8.03L2 2h6.915l4.06 5.407L18.146 2Zm-1.19 18.01h1.77L7.12 3.95H5.24l11.717 16.06Z" />
  </svg>
);
