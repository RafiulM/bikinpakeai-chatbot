import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const NEAR_END_PX = 160;

function nearEnd() {
  const page = document.documentElement;
  return page.scrollHeight - window.scrollY - window.innerHeight < NEAR_END_PX;
}

/**
 * Keeps the page at the latest message, like any chat app. New content is
 * followed only while the reader is at the end or just sent something;
 * otherwise their place is kept and `hasNew` offers a jump down.
 *
 * @param tailKey changes whenever something lands at the end.
 * @param force follow even when scrolled up (e.g. the reader just sent).
 */
export function useFollowLatest(tailKey: string, force: boolean) {
  const reduceMotion = useReducedMotion();
  const following = useRef(true);
  const mounted = useRef(false);
  const [hasNew, setHasNew] = useState(false);

  const scrollToEnd = useCallback(
    (smooth: boolean) => {
      // A hidden tab never runs a smooth scroll, so jump instead.
      const animate =
        smooth && !reduceMotion && document.visibilityState === "visible";
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: animate ? "smooth" : "auto",
      });
      following.current = true;
      setHasNew(false);
    },
    [reduceMotion],
  );

  // Open at the latest message, or at the one the address points to. Wait a
  // frame so the router's own scroll reset has already run.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = window.location.hash.slice(1);
      const node = target ? document.getElementById(target) : null;
      if (node) {
        following.current = false;
        node.scrollIntoView({ block: "start" });
      } else scrollToEnd(false);
      mounted.current = true;
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only scrolling up stops the following. A smooth scroll toward a new
  // message passes positions above the end and must not stop it.
  useEffect(() => {
    let last = window.scrollY;
    function handleScroll() {
      const movedUp = window.scrollY < last;
      last = window.scrollY;
      if (nearEnd()) {
        following.current = true;
        setHasNew(false);
      } else if (movedUp) following.current = false;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mounted.current) return;
    if (following.current || force) scrollToEnd(true);
    else setHasNew(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailKey]);

  return { hasNew, scrollToEnd };
}
