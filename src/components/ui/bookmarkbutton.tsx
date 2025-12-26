import { useToggleBookmark } from "@/hooks/useToggleBookmark";
import React, { useState } from "react";
import { showToast } from "../toast/toast";
import { Bookmark } from "lucide-react";

const Bookmarkbutton = ({
  userId,
  candidId,
  connection,
  isText = true,
}: {
  userId: string;
  candidId: string;
  connection: { typed: number }[];
  isText?: boolean;
}) => {
  const [isBookmarked, setIsBookmarked] = useState(
    connection?.map((con) => con.typed).includes(0)
  );
  const { mutate: toggleBookmarkMutation } = useToggleBookmark();

  const toggleBookmark = () => {
    if (isBookmarked)
      showToast({ message: "북마크에서 제거되었습니다.", variant: "white" });
    else showToast({ message: "북마크에 추가되었습니다.", variant: "white" });
    toggleBookmarkMutation({ userId, candidId });
    setIsBookmarked(!isBookmarked);
  };

  return (
    <button
      onClick={toggleBookmark}
      className="cursor-pointer h-10 px-4 rounded-xl bg-white/10 text-white flex flex-row items-center gap-2"
    >
      {isBookmarked ? (
        <Bookmark className="w-4 h-4 text-white" fill="white" />
      ) : (
        <Bookmark className="w-4 h-4 text-white" />
      )}
      {isText && <span>Save</span>}
    </button>
  );
};

export default Bookmarkbutton;
