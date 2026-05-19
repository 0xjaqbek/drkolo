import { useEffect } from "react";

export function useNoIndex() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const prev = meta?.getAttribute("content") ?? "index, follow";
    meta?.setAttribute("content", "noindex, nofollow");
    return () => {
      meta?.setAttribute("content", prev);
    };
  }, []);
}
