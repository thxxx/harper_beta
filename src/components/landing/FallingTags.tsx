"use client";

import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";

type Tag = {
  label: string;
  color: string;
  x: number;
  y: number;
  rotate: number;
};

const TAGS: Tag[] = [
  {
    label: "TTS Researchers",
    color: "bg-sky-500",
    x: -120,
    y: 40,
    rotate: -14,
  },
  {
    label: "Agent Engineer",
    color: "bg-indigo-500",
    x: -40,
    y: -10,
    rotate: -10,
  },
  {
    label: "LLM optimization experts",
    color: "bg-white text-neutral-900",
    x: -25,
    y: 50,
    rotate: -4,
  },
  {
    label: "Exp 4+ years machine learning engineer",
    color: "bg-blue-500",
    x: 40,
    y: 5,
    rotate: 6,
  },
  {
    label: "Ex Founder  / CTO Backend Engineer",
    color: "bg-pink-500",
    x: 10,
    y: -35,
    rotate: 20,
  },
  {
    label: "IVY League CS ms degree",
    color: "bg-lime-500",
    x: 80,
    y: 40,
    rotate: 30,
  },
  {
    label: "C++ expert and hacker style",
    color: "bg-amber-400",
    x: 140,
    y: 20,
    rotate: 10,
  },
];

export const FallingTags: React.FC = () => {
  const [start, setStart] = useState(false);

  // ⏱️ 1.5초 뒤에 애니메이션 시작
  useEffect(() => {
    const t = setTimeout(() => setStart(true), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex w-full justify-center overflow-visible">
      {TAGS.map((tag, index) => (
        <motion.div
          key={tag.label}
          className="absolute"
          initial={{
            y: -220,
            x: 0,
            rotate: 0,
            opacity: 0,
            scale: 0.8,
          }}
          animate={
            start
              ? {
                  x: tag.x,
                  y: tag.y,
                  rotate: tag.rotate,
                  opacity: 1,
                  scale: 1,
                }
              : {
                  // 시작 전 상태 그대로 유지
                  y: -220,
                  opacity: 0,
                }
          }
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 22,
            mass: 0.8,
            delay: index * 0.12,
          }}
        >
          <motion.div
            className={
              "select-none rounded-lg pl-2 pr-4 py-2 text-xs font-medium shadow-xl flex flex-row items-center justify-start gap-1.5 cursor-grab active:cursor-grabbing border bg-gray-500/10 border-white/10 backdrop-blur-sm"
            }
            drag
            dragElastic={0.25}
            dragMomentum
            dragSnapToOrigin
            whileDrag={{ scale: 1.05, zIndex: 50 }}
          >
            <Search size={12} />
            <span>{tag.label}</span>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
};
