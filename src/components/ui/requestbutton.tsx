import React, { useState } from "react";
import ConnectionModal from "../Modal/ConnectionModal";
import { CandidateTypeWithConnection } from "@/hooks/useSearchCandidates";

const Requestbutton = ({ c }: { c: CandidateTypeWithConnection }) => {
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isRequested, setIsRequested] = useState(
    c.connection?.map((con) => con.typed).includes(1)
  );

  return (
    <>
      <ConnectionModal
        candidId={c.id}
        open={isConnectionModalOpen}
        name={c.name ?? ""}
        headline={c.headline ?? ""}
        location={c.location ?? ""}
        profilePicture={c.profile_picture ?? ""}
        isRequested={isRequested}
        onClose={() => setIsConnectionModalOpen(false)}
        onConfirm={() => {
          if (isRequested) {
            setIsRequested(false);
          } else {
            setIsRequested(true);
          }
        }}
      />
      <div
        onClick={() => setIsConnectionModalOpen(true)}
        className="cursor-pointer items-center justify-center flex h-10 px-4 rounded-xl text-sm bg-accenta1/20 text-accenta1"
      >
        Request Connection
      </div>
    </>
  );
};

export default Requestbutton;
