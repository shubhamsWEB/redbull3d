"use client";

// Five live can worlds running full-screen, dissolving into each other through fizz as you scroll.
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { CANS } from "@/data/cans";
import { useMediaQuery } from "@/hooks/useMediaQuery";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Portals = dynamic(() => import("./Portals"), { ssr: false });

export default function FiveWorlds() {
  const root = useRef<HTMLElement>(null);
  const mix = useRef({ from: 0, to: 0, t: 0, local: 0, velocity: 0 });
  const [index, setIndex] = useState(0);
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
          const f = self.progress * (CANS.length - 1);
          const from = Math.min(Math.floor(f), CANS.length - 2);
          const local = f - from;
          // Hold each world, then a sharp dissolve in the last third of its stretch.
          const t = gsap.utils.clamp(0, 1, (local - 0.66) / 0.34);
          mix.current = { from, to: from + 1, t, local, velocity: self.getVelocity() };
          setIndex(t > 0.5 ? from + 1 : from);
        },
      });
    },
    { scope: root },
  );

  const can = CANS[index];

  return (
    <section id="cans" ref={root} className="relative scroll-mt-0 bg-carbon text-white" style={{ height: `${CANS.length * 170}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <Portals mix={mix} reduced={reduced} active={inView} />
      </div>

      <div className="pointer-events-none sticky top-0 z-[40] -mt-[100vh] flex h-screen flex-col justify-between">
        <div className="micro flex justify-between border-b border-hairline px-4 pb-3 pt-20 md:px-10">
          <span>{"Five cans // Five worlds"}</span>
          <span className="tabular-nums text-sun">{String(index + 1).padStart(2, "0")} / {String(CANS.length).padStart(2, "0")}</span>
        </div>

        <div className="px-4 md:px-10">
          <div key={can.slug} className="motion-safe:animate-[snap-in_.6s_cubic-bezier(.16,1,.3,1)_both]">
            <p className="micro text-sun">{`${can.world.name} // ${can.subtitle}`}</p>
            <h2 className="display mt-3 max-w-[60vw] text-5xl [text-shadow:0_3px_24px_rgba(0,0,0,.5)] md:text-[7.5vw]">{can.name}</h2>
            <Link href={`/energydrink/${can.slug}`} data-cursor="Drop in" className="btn-signal chamfer pointer-events-auto mt-6 inline-flex">
              Enter this world <span aria-hidden>-&gt;</span>
            </Link>
          </div>
        </div>

        <div className="micro grid grid-cols-5 border-t border-hairline bg-carbon/40 backdrop-blur-sm">
          {CANS.map((c, i) => (
            <span key={c.slug} className={`truncate border-r border-hairline px-2 py-3 last:border-r-0 md:px-6 ${i === index ? "bg-white text-carbon" : ""}`}>
              {c.world.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
