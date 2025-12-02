import React from "react";
import router from "next/router";

const Header = ({ page }: { page: "company" | "candidate" }) => {
  return (
    <header className="flex items-center justify-between px-4 lg:px-8 py-4 text-sm">
      <div className="text-lg font-light font-garamond w-[10%]">harper</div>

      <nav className="flex items-center justify-end sm:justify-center gap-8 text-sm sm:text-sm w-[60%] sm:w-[40%]">
        {/* <div
          className="font-light cursor-pointer opacity-60 hover:opacity-75"
          onClick={() =>
            router.push(page === "company" ? "/cand" : "/companies")
          }
        >
          {page === "company" ? "For candidates" : "For companies"}
        </div> */}
      </nav>
      <div className="w-[10%] hidden sm:block text-right">
        <div
          className="font-light cursor-pointer opacity-60 hover:opacity-75"
          onClick={() =>
            router.push(page === "company" ? "/cand" : "/companies")
          }
        >
          {page === "company" ? "For candidates" : "For companies"}
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);
