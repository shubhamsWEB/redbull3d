"use client";

// Sustainability as an interaction: scroll takes one can through crush, melt and rebirth.
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Reveal from "@/components/Reveal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Safe3D, { Still } from "@/components/Safe3D";
import { CANS } from "@/data/cans";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Stage = dynamic(() => import("./Stage"), { ssr: false });

const STEPS = [
  { word: "Drink it.", phase: "LIFE 01", from: 0 },
  { word: "Crush it.", phase: "COMPRESSION", from: 0.17 },
  { word: "Recycle it.", phase: "MELT", from: 0.4 },
  { word: "Back as a new can.", phase: "REFORM", from: 0.66 },
];

// Room temperature, up to aluminium's melting point, and back as it cools.
const tempAt = (p: number) => {
  const up = gsap.utils.clamp(0, 1, (p - 0.38) / 0.17);
  const down = gsap.utils.clamp(0, 1, (p - 0.66) / 0.2);
  return Math.round(20 + 640 * up * (1 - down));
};

export default function CanLife() {
  const root = useRef<HTMLElement>(null);
  const scroll = useRef({ progress: 0, velocity: 0 });
  const temp = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [inView, setInView] = useState(false);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", false);

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => setInView(self.isActive),
      });
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          scroll.current.progress = p;
          scroll.current.velocity = self.getVelocity();
          setStep([...STEPS].reverse().findIndex((s) => p >= s.from) * -1 + STEPS.length - 1);
          if (temp.current) temp.current.textContent = String(tempAt(p));
          if (bar.current) bar.current.style.setProperty("--p", String(Math.round(p * 24)));
        },
      });
    },
    { scope: root },
  );

  const hot = step === 2;

  return (
    <section ref={root} className="can-life relative z-[40] h-[640vh] bg-carbon text-white">
      <div className="sticky top-0 h-svh overflow-hidden">
        <Safe3D fallback={<Still src={CANS[0].packshot} alt="Red Bull Energy Drink" />}>
          <Stage scroll={scroll} active={inView} reduced={reduced} />
        </Safe3D>
      </div>

      <div className="pointer-events-none sticky top-0 z-[40] -mt-[100svh] flex h-svh flex-col overflow-hidden">
        <div className="px-4 pt-24 md:px-10">
          <p className="micro text-sun">{"Lifecycle // Aluminium"}</p>
          <Reveal text="A can could have more than one life" className="display mt-3 max-w-[11ch] text-4xl md:text-[5.6vw]" />
        </div>

        <div className="mt-auto px-4 pb-6 md:px-10">
          <ol className="micro mb-5 hidden gap-2 md:grid md:w-[42vw] md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.word} className={`border-t-2 pt-2 ${i === step ? "border-crimson text-white" : i < step ? "border-white/40 text-silver" : "border-hairline text-silver/50"}`}>
                {String(i + 1).padStart(2, "0")}
              </li>
            ))}
          </ol>
          <p key={step} className="display max-w-[90vw] text-5xl motion-safe:animate-[snap-in_.5s_cubic-bezier(.16,1,.3,1)_both] md:max-w-[46vw] md:text-[6vw] [text-shadow:0_2px_20px_rgba(11,14,20,.8)]">
            {STEPS[step].word}
          </p>
        </div>

        <div className="micro grid grid-cols-2 border-t border-hairline bg-carbon/40 backdrop-blur-sm md:grid-cols-4">
          <p className="border-r border-hairline px-4 py-3 md:px-10">{"Phase // "}<span className="text-sun">{STEPS[step].phase}</span></p>
          <p className="px-4 py-3 md:border-r md:border-hairline md:px-6">{"Temp // "}<span ref={temp} className={`tabular-nums ${hot ? "text-crimson" : ""}`}>20</span> °C</p>
          <p className="hidden border-r border-hairline px-6 py-3 md:block">{"Life // "}<span className="tabular-nums text-sun">{step === 3 ? "02" : "01"}</span></p>
          <div ref={bar} className="col-span-2 flex items-center gap-[3px] border-t border-hairline px-4 py-3 md:col-span-1 md:border-t-0 md:px-6" style={{ "--p": 0 } as React.CSSProperties}>
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} className="h-2.5 flex-1" style={{ background: `color-mix(in srgb, #E21B4D calc(clamp(0, var(--p) - ${i}, 1) * 100%), rgba(255,255,255,.15))` }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
