"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitioning, setTransitioning] = useState(false);
  const prevPathRef = useRef(pathname);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      setTransitioning(true);
      // Short fade-out, then swap content and fade-in
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitioning(false);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [pathname, children]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div
      className="h-full overflow-auto"
      style={{
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? "translateY(6px)" : "translateY(0)",
        transition: "opacity 0.15s ease-out, transform 0.2s ease-out",
      }}
    >
      {displayChildren}
    </div>
  );
}
