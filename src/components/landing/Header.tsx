import React from "react";
import Image from "next/image";
import { isMobile } from "react-device-detect";
import router from "next/router";

const Header = ({ page }: { page: "company" | "candidate" }) => {
  const scrollToPosition = () => {
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const targetPosition = isMobile
      ? documentHeight - windowHeight - 550
      : documentHeight - windowHeight - 250;

    window.scrollTo({
      top: targetPosition > 0 ? targetPosition : 0, // Ensure we don't scroll to a negative position
      behavior: "smooth", // Smooth scrolling
    });
  };

  return (
    <header className="flex items-center justify-between px-4 lg:px-8 py-4 text-sm">
      <div className="text-lg font-light font-garamond w-[10%]">harper</div>

      <nav className="flex items-center justify-center gap-8 text-xs sm:text-sm w-[40%]">
        <div
          className="font-light cursor-pointer opacity-60 hover:opacity-75"
          onClick={() =>
            router.push(page === "company" ? "/cand" : "/companies")
          }
        >
          {page === "company" ? "For candidates" : "For companies"}
        </div>
        <div className="font-light cursor-pointer opacity-60 hover:opacity-75">
          Referral
        </div>
      </nav>
      <div className="w-[10%]"></div>
    </header>
  );
};

export default React.memo(Header);
