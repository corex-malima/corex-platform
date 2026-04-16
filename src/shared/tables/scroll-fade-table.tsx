"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function ScrollFadeTable({
  children,
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const hasOverflow = element.scrollWidth > element.clientWidth + 2;
      setShowRightFade(hasOverflow && element.scrollLeft < element.scrollWidth - element.clientWidth - 2);
      setShowLeftFade(hasOverflow && element.scrollLeft > 1);
    };

    update();
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className={cn("relative overflow-hidden rounded-[16px]", className)}>
      <div ref={ref} className={cn("overflow-x-auto show-scrollbar tabular-nums", innerClassName)}>
        {children}
      </div>
      {showLeftFade ? <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent" /> : null}
      {showRightFade ? <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent" /> : null}
    </div>
  );
}
