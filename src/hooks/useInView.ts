import { useEffect, useRef, type RefObject } from "react";

/**
 * Generic IntersectionObserver hook.
 * Attaches to the returned ref and sets data-visible="true" when element enters viewport.
 * One-shot: does not reset when element leaves.
 *
 * Usage: const ref = useInView<HTMLDivElement>();
 */
export function useInView<T extends HTMLElement = HTMLElement>(threshold = 0.15): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-visible", "true");
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
