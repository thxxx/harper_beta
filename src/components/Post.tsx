"use client";

import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Copy, Edit, ThumbsUp, ThumbsDown } from "lucide-react";

/**
 * TweetCard – Twitter/X dark-style tweet UI
 * - Mobile-first, TailwindCSS only
 * - Supports expandable text (Show more)
 * - Action bar (reply / retweet / like / views / share)
 */

export type TweetCardProps = {
  isFirst?: boolean;
  avatarUrl: string;
  author: string;
  handle: string;
  timestamp: string; // e.g., "20h"
  text: string; // raw text with emoji is fine
  imageUrl?: string; // optional media
  stats?: {
    replies?: number;
    retweets?: number;
    likes?: number;
    views?: number;
  };
};

export default function TweetCard({
  avatarUrl,
  author,
  handle,
  timestamp,
  text,
  imageUrl,
  stats = {},
  isFirst = false,
}: TweetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const MAX_CHARS = 180;
  const shouldTruncate = text.length > MAX_CHARS;
  const shownText =
    expanded || !shouldTruncate
      ? text
      : text.slice(0, MAX_CHARS).trimEnd() + "…";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (
        !menuRef.current.contains(e.target as Node) &&
        !moreBtnRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // ESC로 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const up = () => {};

  return (
    <article
      className={`w-full max-w-xl sm:rounded-2xl border-neutral-800 bg-xmain px-4 py-3 text-neutral-100 ${
        isFirst ? "border-b" : "border-y"
      } shadow-sm`}
    >
      <header className="flex items-center gap-3 ">
        <img
          src={avatarUrl}
          alt="avatar"
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{author}</span>
            <span className="truncate text-[14px] text-neutral-500">
              @{handle}
            </span>
            {/* <span className="text-neutral-600">·</span> */}
            {/* <time className="text-[14px] text-neutral-500">{timestamp}</time> */}
            {/* <Sparkles className="ml-1 h-4 w-4 text-neutral-500" aria-hidden /> */}
          </div>
        </div>
        <div className="relative">
          <button
            ref={moreBtnRef}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-900"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {/* Dropdown / Popover */}
          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              aria-label="Tweet options"
              className="absolute right-0 top-9 z-50 w-60 py-2 overflow-hidden rounded-xl border border-neutral-800 bg-xmain shadow-2xl ring-1 ring-black/5"
            >
              <MenuItem
                onClick={async () => {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setMenuOpen(false);
                }}
              >
                <Copy size={14} />
                <div>Copy post</div>
              </MenuItem>
              <MenuItem onClick={() => setMenuOpen(false)}>
                <Edit size={14} />
                <div>Ask to edit</div>
              </MenuItem>
              <MenuSeparator />
              {/* <MenuItem onClick={() => setMenuOpen(false)}>
                Mute @{handle}
              </MenuItem> */}
              <MenuItem danger onClick={() => setMenuOpen(false)}>
                Report post
              </MenuItem>
            </div>
          )}
        </div>
      </header>

      {/* text */}
      <div className="mt-2 whitespace-pre-wrap text-[15px] leading-6 text-neutral-100">
        {shownText}
        {!expanded && shouldTruncate && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="ml-1 rounded px-1 text-[14px] font-medium text-sky-400 hover:underline"
          >
            Show more
          </button>
        )}
      </div>

      {/* media */}
      {imageUrl && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-700">
          <img
            src={imageUrl}
            alt="tweet media"
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      {/* action bar */}
      <footer className="mt-2 text-xgray flex flex-row items-center justify-between py-1">
        <div className="text-sm text-xprimary/80">View Reason</div>
        <div className="flex flex-row gap-2">
          <div onClick={() => up()} className="text-sm px-2">
            <ThumbsUp size={15} />
          </div>
          <div onClick={() => up()} className="text-sm px-2">
            <ThumbsDown size={15} />
          </div>
        </div>
      </footer>
      {/* toast */}
      <div
        className={`pointer-events-none fixed left-1/2 bottom-8 -translate-x-1/2 transition-all duration-300 ${
          copied ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="rounded-full bg-xopp/10 backdrop-blur px-4 py-2 text-sm text-opp/90 border border-xopp/15 shadow-lg">
          Post copied to clipboard
        </div>
      </div>
    </article>
  );
}

// ---------- helpers ----------
function compact(n?: number) {
  if (typeof n !== "number") return undefined;
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K";
  return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
}

// ---------- Example Usage ----------
export function ExampleTweet() {
  return (
    <div className="min-h-[100dvh] w-full bg-[#0a0b0d] p-4">
      <TweetCard
        avatarUrl="https://avatars.githubusercontent.com/u/9919?v=4"
        author="Ori"
        handle="Orimalca"
        timestamp="20h"
        text={
          "🎉 I am excited to present our new paper!\n\n" +
          "Our paper improves personalization of text-to-image models, by adding one special cleaning step on top of existing personalized models. With just a single gradient update (~4 seconds on an NVIDIA H100 GPU) and a single image of the"
        }
        imageUrl="/tweet-sample.jpg" // put your image here
        stats={{ replies: 4, retweets: 8, likes: 14, views: 521 }}
      />
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={[
        "flex flex-row w-full items-center gap-2 px-3 py-2.5 text-left text-[14px]",
        danger
          ? "text-rose-400 hover:bg-rose-500/10"
          : "text-neutral-200 hover:bg-neutral-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function MenuSeparator() {
  return <div className="my-1 h-px w-full bg-neutral-800" />;
}
