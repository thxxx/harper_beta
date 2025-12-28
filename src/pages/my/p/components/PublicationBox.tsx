import { ExternalLink } from "lucide-react";
import React from "react";

const PublicationBox = ({
  title,
  published_at,
  link,
}: {
  title: string;
  published_at: string;
  link: string;
}) => {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <div className="text-base font-light">{title}</div>
      <div className="text-xs text-xgray500 mt-1">{published_at}</div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm text-xgray700 hover:underline"
        >
          <ExternalLink size={16} />
          Open
        </a>
      ) : (
        <div className="mt-2 text-sm text-xgray500">No link</div>
      )}
    </div>
  );
};

export default PublicationBox;
