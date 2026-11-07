"use client";

import { ElementType, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Words rise out of a mask as the heading scrolls in. Text stays real and readable to assistive tech.
export default function Reveal({ text, as: Tag = "h2", className }: { text: string; as?: ElementType; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".reveal-word", {
        yPercent: 115,
        duration: 0.7,
        ease: "expo.out",
        stagger: 0.04,
        scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
      });
    },
    { scope: ref, dependencies: [text], revertOnUpdate: true },
  );
  return (
    <Tag ref={ref} aria-label={text} className={className}>
      {text.split(" ").map((word, i) => (
        <span key={i} aria-hidden className="mr-[.22em] inline-block overflow-hidden pb-[.08em] align-bottom">
          <span className="reveal-word inline-block">{word}</span>
        </span>
      ))}
    </Tag>
  );
}
