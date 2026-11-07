"use client";

// The formula, literally: real molecules assemble and pour into the can, step by step.
import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Can } from "@/data/cans";
import { ACESULFAME_K, CAFFEINE, GLUCOSE, Molecule, NIACIN, TAURINE } from "@/data/molecules";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Beat } from "./Stage";
import Safe3D, { Still } from "@/components/Safe3D";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Stage = dynamic(() => import("./Stage"), { ssr: false });

const FILL_END = 0.82; // Scroll progress where the last ingredient has landed; the rest seals the can.

type Step = { title: string; valueLabel?: string; value: string; mol: Molecule; note: string; rows: string[] };

function stepsFor(can: Can): Step[] {
  const fact = (name: string) => can.facts.find((f) => f.name === name);
  const vitamins = can.facts.filter((f) => f.name === "Niacin" || f.name.startsWith("Vitamin"));
  const sugars = fact("Sugars");
  return [
    { title: "Caffeine", value: fact("Caffeine")!.value, mol: CAFFEINE, note: "Structure shown without hydrogens", rows: ["Caffeine"] },
    { title: "Taurine", value: fact("Taurine")!.value, mol: TAURINE, note: "Structure shown without hydrogens", rows: ["Taurine"] },
    { title: "B-group vitamins", valueLabel: "Niacin", value: fact("Niacin")!.value, mol: NIACIN, note: "Niacin shown, without hydrogens", rows: vitamins.map((v) => v.name) },
    sugars
      ? { title: "Sugars", value: sugars.value, mol: GLUCOSE, note: "Total sugars. Glucose shown, without hydrogens", rows: ["Sugars"] }
      : { title: "Sweeteners", value: fact("Sweeteners")!.value, mol: ACESULFAME_K, note: "Acesulfame K shown, without hydrogens", rows: ["Sweeteners"] },
  ];
}

// "1000 mg" > [1000, " mg"]; text values such as "Sucralose + Ace K" stay as they are.
const parseValue = (value: string) => {
  const m = value.match(/^([\d.]+)\s*(.*)$/);
  return m ? { n: Number(m[1]), unit: m[2], decimals: m[1].includes(".") ? 1 : 0 } : null;
};

export default function Formula({ can }: { can: Can }) {
  const steps = useMemo(() => stepsFor(can), [can]);
  const root = useRef<HTMLElement>(null);
  const beat = useRef<Beat>({ step: -1, local: 0, p: 0 });
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [sealed, setSealed] = useState(false);
  const [inView, setInView] = useState(false);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", false);

  const current = steps[step];
  const parsed = parseValue(current.value);

  useGSAP(
    () => {
      ScrollTrigger.create({ trigger: root.current, start: "top bottom", end: "bottom top", onToggle: (s) => setInView(s.isActive) });
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          const f = Math.min(p / FILL_END, 0.9999) * steps.length;
          const i = Math.floor(f);
          const local = f - i;
          beat.current = { step: p >= FILL_END ? -1 : i, local, p };
          setStep(i);
          setSealed(p >= FILL_END + 0.04);
          const parsedNow = parseValue(steps[i].value);
          if (counter.current && parsedNow) {
            const shown = parsedNow.n * gsap.parseEase("expo.out")(Math.min(local / 0.26, 1));
            counter.current.textContent = shown.toFixed(parsedNow.decimals);
          }
          if (bar.current) bar.current.style.setProperty("--p", String(Math.round(p * 24)));
        },
      });
    },
    { scope: root, dependencies: [steps], revertOnUpdate: true },
  );

  return (
    <section ref={root} className="formula relative h-[640vh] bg-carbon text-white">
      <div className="sticky top-0 h-svh overflow-hidden">
        <Safe3D fallback={<Still src={can.packshot} alt={can.name} />}>
          <Stage can={can} molecules={steps.map((s) => s.mol)} beat={beat} fillEnd={FILL_END} active={inView} reduced={reduced} />
        </Safe3D>
      </div>

      <div className="pointer-events-none sticky top-0 z-[40] -mt-[100svh] flex h-svh flex-col overflow-hidden">
        <div className="micro flex justify-between border-b border-hairline px-4 pb-3 pt-20 md:px-10">
          <span>{"Formula // Values per 250 ml"}</span>
          <span className="tabular-nums text-sun">{sealed ? "SEALED" : `${String(step + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`}</span>
        </div>

        <div className="flex-1 px-4 pt-6 md:px-10 md:pt-[9vh]">
          {sealed ? (
            <h2 className="display max-w-[12ch] text-5xl motion-safe:animate-[snap-in_.5s_cubic-bezier(.16,1,.3,1)_both] md:text-[6.4vw]">The formula that gives you wiiings</h2>
          ) : (
            <div key={current.title} className="motion-safe:animate-[snap-in_.45s_cubic-bezier(.16,1,.3,1)_both]">
              <h2 className="display text-3xl md:text-[3.4vw]">{current.title}</h2>
              {current.valueLabel && <p className="micro mt-2 text-silver">{current.valueLabel}</p>}
              <p className="display mt-2 text-sun md:mt-4">
                {parsed ? (
                  <>
                    <span ref={counter} className="text-7xl tabular-nums md:text-[11vw]">{parsed.n}</span>
                    <span className="ml-2 text-2xl md:text-[3vw]">{parsed.unit}</span>
                  </>
                ) : (
                  <span className="block max-w-[10ch] text-4xl !leading-[.95] md:text-[3.6vw]">{current.value}</span>
                )}
              </p>
              <p className="micro mt-4 text-white">{current.mol.formula}</p>
              <p className="micro mt-1 text-silver">{current.note}</p>
            </div>
          )}
        </div>

        <dl className="micro grid grid-cols-4 border-t border-hairline bg-carbon/40 backdrop-blur-sm md:grid-cols-[repeat(auto-fit,minmax(0,1fr))] md:[grid-auto-flow:column]">
          {can.facts.map((f) => {
            const active = !sealed && current.rows.includes(f.name);
            const owner = steps.findIndex((s) => s.rows.includes(f.name));
            const filled = sealed || owner < step;
            return (
              <div key={f.name} className={`border-r border-t border-hairline px-2 py-2 last:border-r-0 md:border-t-0 md:px-4 md:py-3 ${active ? "bg-white text-carbon" : filled ? "text-white" : "text-silver/60"}`}>
                <dt className="truncate text-[9px] md:text-[10px]">{f.name}</dt>
                <dd className="mt-1 truncate text-[11px] font-bold tabular-nums md:text-xs">{f.value}</dd>
              </div>
            );
          })}
        </dl>
        <div ref={bar} aria-hidden className="flex gap-[3px] border-t border-hairline px-4 py-2 md:px-10" style={{ "--p": 0 } as React.CSSProperties}>
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} className="h-1.5 flex-1" style={{ background: `color-mix(in srgb, #E21B4D calc(clamp(0, var(--p) - ${i}, 1) * 100%), rgba(255,255,255,.15))` }} />
          ))}
        </div>
      </div>
    </section>
  );
}
