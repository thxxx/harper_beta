"use client";

import React from "react";
import { Sparkles, Feather, Hash, TrendingUp, Timer } from "lucide-react";

/**
 * IndefiniteTweetLoading – mobile-first, Twitter-dark inspired loading UI
 * - No fixed ETA or percentage; loops with subtle motions
 * - Rotates through messages (stages/tips)
 * - Optional tweet skeletons with shimmer
 *
 * Props:
 * - phrases: rotating messages (defaults provided)
 * - tips: rotating subtle hints
 * - rotateMs: interval for phrase/tip rotation
 * - showSkeletons: show tweet skeleton previews
 */

export type IndefiniteTweetLoadingProps = {
  phrases?: string[];
  tips?: string[];
  rotateMs?: number;
  showSkeletons?: boolean;
};

export default function IndefiniteTweetLoading({
  phrases = [
    "Scanning your topics",
    "Exploring fresh angles",
    "Drafting hooks",
    "Collecting examples",
    "Polishing tone & tags",
  ],
  tips = [
    "Lead with the takeaway—hook first.",
    "One idea per tweet. Keep it tight.",
    "Use 1–2 hashtags, max.",
    "Numbers outperform adjectives.",
    "Ask a question to invite replies.",
  ],
  rotateMs = 1600,
  showSkeletons = true,
}: IndefiniteTweetLoadingProps) {
  const [i, setI] = React.useState(0);
  const [j, setJ] = React.useState(0);

  React.useEffect(() => {
    const t1 = setInterval(
      () => setI((v) => (v + 1) % phrases.length),
      rotateMs
    );
    const t2 = setInterval(
      () => setJ((v) => (v + 1) % tips.length),
      rotateMs * 1.8
    );
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [phrases.length, tips.length, rotateMs]);

  return (
    <main className="bg-[#0a0b0d] text-neutral-100">
      <div className="mx-auto w-full max-w-md p-4">
        {/* Header */}
        <header className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-xmain">
            <Sparkles className="h-5 w-5 animate-pulse text-neutral-300" />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold">
              Generating tweet ideas…
            </h1>
            <p className="text-[12px] text-neutral-400">
              We’re shaping something your audience will care about.
            </p>
          </div>
        </header>

        {/* Indeterminate bar */}
        <section aria-label="loading" className="mb-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-900">
            <div className="indeterminate-bar h-full w-1/3 rounded-full bg-neutral-200" />
          </div>
          <div className="mt-2 flex items-center gap-2 text-[12px] text-neutral-500">
            <Timer className="h-3.5 w-3.5" />
            <span className="transition-opacity duration-300">
              {phrases[i]}
            </span>
          </div>
        </section>

        {/* Skeleton previews */}
        {showSkeletons && (
          <section className="space-y-3" aria-label="tweet previews">
            <TweetSkeleton lines={2} withImage />
          </section>
        )}

        {/* Rotating tips */}
        <section className="mt-5" aria-label="tips">
          {/* <TipCard>
            <Feather className="h-4 w-4" />
            <span className="text-[13px] text-neutral-300">{tips[j]}</span>
          </TipCard> */}
          <div className="flex flex-wrap gap-2 text-[11px] text-neutral-400">
            <Pill icon={<TrendingUp className="h-3.5 w-3.5" />}>
              Trends evolve hourly
            </Pill>
            <Pill icon={<Hash className="h-3.5 w-3.5" />}>
              Keep tags minimal
            </Pill>
          </div>
        </section>
      </div>
    </main>
  );
}

// ---------- Subcomponents ----------
function TweetSkeleton({
  lines = 3,
  withImage = false,
}: {
  lines?: number;
  withImage?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-neutral-800 bg-xmain p-3">
      <div className="flex gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-900" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3.5 w-8 animate-shimmer rounded bg-neutral-900" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className="h-3.5 w-full animate-shimmer rounded bg-neutral-900"
              />
            ))}
          </div>
          {withImage && (
            <div className="mt-3 h-36 w-full animate-shimmer rounded-xl bg-neutral-900" />
          )}
        </div>
      </div>
    </article>
  );
}

function TipCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-xmain/30 px-3 py-2">
      {children}
    </div>
  );
}

function Pill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-800 bg-xmain/20 px-2.5 py-1">
      {icon}
      {children}
    </span>
  );
}

// ---------- Tailwind animations (add to globals.css) ----------
// .animate-shimmer {
//   background-image: linear-gradient(90deg, rgba(255,255,255,0)_0%, rgba(255,255,255,.06)_50%, rgba(255,255,255,0)_100%);
//   background-size: 200% 100%;
//   animation: shimmer 1.4s infinite linear;
// }
// @keyframes shimmer {
//   from { background-position: 200% 0; }
//   to { background-position: -200% 0; }
// }
// .indeterminate-bar {
//   animation: indeterminate 1.4s infinite ease-in-out;
// }
// @keyframes indeterminate {
//   0% { transform: translateX(-100%); }
//   50% { transform: translateX(120%); }
//   100% { transform: translateX(300%); }
// }
