import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import Image from "next/image";
import React from "react";

const vcLogos = [
  { key: "yc", src: "/images/logos/yc.svg", width: 136 },
  { key: "a16z", src: "/images/logos/a16z.svg", width: 72 },
  { key: "index", src: "/images/logos/index.png", width: 113 },
  { key: "sequoia", src: "/images/logos/sequoia.png", width: 128 },
];

const vcLogosBottom = [
  { key: "lightspeed", src: "/images/logos/lightspeed.png", width: 125 },
  { key: "nvidia", src: "/images/logos/nvidia.png", width: 64 },
  { key: "bessemer", src: "/images/logos/bessemer.png", width: 88 },
  { key: "general-catalyst", src: "/images/logos/general.svg", width: 92 },
  { key: "founders-fund", src: "/images/logos/foundersfund.svg", width: 180 },
];

function VCLogos({ borderSoft }: { borderSoft: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;

    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < maxScroll - 10);
  };

  // Attach scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateArrows(); // initial

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll);

    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollRight = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
  };

  const scrollLeft = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
  };

  useEffect(() => {
    if (!scrollRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && scrollRef.current) {
          setTimeout(() => {
            scrollRef.current?.scrollBy({
              left: 300,
              behavior: "smooth",
            });
          }, 500);
        }
      },
      {
        threshold: 0.3, // 30% 보이면 트리거
      }
    );

    observer.observe(scrollRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative w-full">
      {/* LEFT ARROW */}
      {showLeft && (
        <button
          onClick={scrollLeft}
          className="absolute flex items-center justify-center left-1 top-1/2 -translate-y-1/2 w-6 h-6 pl-[2px] rounded-full bg-xlightgray z-20"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
      )}

      {/* RIGHT ARROW */}
      {showRight && (
        <button
          onClick={scrollRight}
          className="absolute flex items-center justify-center right-1 top-1/2 -translate-y-1/2 w-6 h-6 pl-[2px] rounded-full bg-xlightgray z-20"
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex flex-col overflow-x-auto no-scrollbar"
      >
        <div className="flex flex-row">
          {vcLogos.map((vc, index) => (
            <div
              key={vc.key}
              className={`flex h-28 md:h-32 min-w-[150px] border-b items-center justify-center w-full ${
                index === vcLogos.length - 1 ? "border-r-0" : "border-r"
              } ${borderSoft}`}
            >
              <Image
                src={vc.src}
                alt={vc.key}
                width={vc.width - 20}
                height={100}
                className="object-contain"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-row">
          {vcLogosBottom.map((vc) => (
            <div
              key={vc.key}
              className={`flex h-28 md:h-32 min-w-[120px] items-center justify-center w-full border-r ${borderSoft}`}
            >
              <Image
                src={vc.src}
                alt={vc.key}
                width={vc.width - 20}
                height={100}
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(VCLogos);
