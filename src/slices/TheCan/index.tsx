"use client";

// Landing opener, one unbroken scroll-driven shot with a single transforming subject:
// inside the soda > cans pulled together > two bulls charge > impact > galaxy > can > wiiings > lift-off.
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useMediaQuery } from "@/hooks/useMediaQuery";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Stage = dynamic(() => import("./Stage"), { ssr: false });

// [fade in, fade out] in scroll progress. Keep in sync with T in Stage.tsx.
const BEATS = [
  { text: "Gives you wiiings", size: "text-6xl md:text-[10.5vw]", at: [-1, 0.12] },
  { text: "Two bulls.", size: "low text-6xl md:text-[10vw]", at: [0.21, 0.3] },
  { text: "Full charge.", size: "low text-6xl md:text-[10vw]", at: [0.31, 0.4] },
  { text: "Impact.", size: "text-7xl md:text-[15vw]", at: [0.42, 0.5] },
  { text: "One can.", size: "low text-6xl md:text-[10vw]", at: [0.66, 0.76] },
  { text: "Wiiings.", size: "low text-7xl md:text-[12vw]", at: [0.84, 0.96] },
];

const PHASES: [number, string][] = [
  [0, "CARBONATION"],
  [0.17, "CONTACT"],
  [0.42, "IMPACT"],
  [0.6, "CONDENSE"],
  [0.83, "WIIINGS"],
  [0.94, "LIFT-OFF"],
];

export default function TheCan() {
  const root = useRef<HTMLElement>(null);
  const scroll = useRef({ progress: 0, velocity: 0 });
  const alt = useRef<HTMLSpanElement>(null);
  const g = useRef<HTMLSpanElement>(null);
  const phase = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const [inView, setInView] = useState(true);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          onToggle: (self) => setInView(self.isActive || self.progress === 0),
          onUpdate: (self) => {
            const p = self.progress;
            scroll.current.progress = p;
            scroll.current.velocity = self.getVelocity();
            if (alt.current) alt.current.textContent = Math.round(p * 39000).toLocaleString("en-IN");
            if (g.current) g.current.textContent = (1 + Math.min(Math.abs(self.getVelocity()) / 700, 8)).toFixed(1);
            if (phase.current) phase.current.textContent = [...PHASES].reverse().find(([at]) => p >= at)![1];
            if (bar.current) bar.current.style.setProperty("--p", String(Math.round(p * 24)));
          },
        },
      });
      gsap.utils.toArray<HTMLElement>(".beat-line").forEach((el, i) => {
        const [show, hide] = BEATS[i].at;
        if (show >= 0) tl.fromTo(el, { opacity: 0, scale: 1.3, skewX: -8 }, { opacity: 1, scale: 1, skewX: 0, ease: "expo.out", duration: 0.03 }, show);
        tl.to(el, { opacity: 0, scale: 0.9, ease: "expo.in", duration: 0.02 }, hide);
      });
      tl.to(".scroll-cue", { opacity: 0, duration: 0.02 }, 0.02);
      tl.fromTo(".can-fade", { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.96);
      tl.to({}, { duration: 0.001 }, 1);
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative h-[900vh] bg-carbon text-white" aria-label="Gives you wiiings">
      <div className="sticky top-0 h-screen overflow-hidden">
        <Stage scroll={scroll} active={inView} reduced={reduced} />
        <div aria-hidden className="can-fade pointer-events-none absolute inset-0 bg-[#02030a] opacity-0" />
      </div>

      <div className="pointer-events-none sticky top-0 z-[40] -mt-[100vh] h-screen overflow-hidden">
        <div className="grid h-full place-items-center px-4 text-center">
          {BEATS.map((b, i) => (
            <h2 key={b.text} className={`beat-line display col-start-1 row-start-1 ${b.size.replace("low ", "")} ${b.size.startsWith("low") ? "self-end pb-20" : ""} ${i ? "opacity-0" : ""}`}>
              {b.text}
            </h2>
          ))}
        </div>

        {/* Crosshair frame */}
        <div aria-hidden className="absolute inset-x-4 top-20 bottom-20 md:inset-x-10">
          {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
            <span key={c} className={`absolute size-5 border-white/50 ${c}`} />
          ))}
        </div>

        <p className="scroll-cue micro absolute inset-x-0 bottom-24 text-center">{"Move through the fizz // Scroll to go"}</p>

        {/* Bottom HUD bar: live scroll telemetry */}
        <div className="micro absolute inset-x-0 bottom-0 grid grid-cols-2 border-t border-hairline bg-carbon/40 backdrop-blur-sm md:grid-cols-4">
          <p className="border-r border-hairline px-4 py-3 md:px-10">{"Phase // "}<span ref={phase} className="text-sun">CARBONATION</span></p>
          <p className="px-4 py-3 md:border-r md:border-hairline md:px-6">{"Alt // "}<span ref={alt} className="tabular-nums">0</span> M</p>
          <p className="hidden border-r border-hairline px-6 py-3 md:block">{"G-force // "}<span ref={g} className="tabular-nums">1.0</span> G</p>
          <div ref={bar} className="col-span-2 flex items-center gap-[3px] border-t border-hairline px-4 py-3 md:col-span-1 md:border-t-0 md:px-6" style={{ "--p": 0 } as React.CSSProperties}>
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} className="h-2.5 flex-1 bg-white/15" style={{ background: `color-mix(in srgb, #E21B4D calc(clamp(0, var(--p) - ${i}, 1) * 100%), rgba(255,255,255,.15))` }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
