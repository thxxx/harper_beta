import { useEffect, useState } from "react";

export function useLinkTitlePreview(url: string) {
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setTitle(null);
      return;
    }

    const id = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/linkpreview?url=${encodeURIComponent(url)}`
        );
        const data = await res.json();
        setTitle(data?.title ?? null);
        setDescription(data?.description ?? null);
        setPublishedAt(data?.published_at ?? null);
      } finally {
        setLoading(false);
      }
    }, 700);

    return () => clearTimeout(id);
  }, [url]);

  return { title, description, publishedAt, loading };
}
