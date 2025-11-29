import React from "react";

const GridSectionLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col items-center justify-start px-0 md:px-20 w-full bg-white text-black border-t border-xgray300">
      <div className="flex flex-col items-center justify-start border-x border-black w-full h-full text-center">
        {children}
      </div>
    </div>
  );
};

export default React.memo(GridSectionLayout);
