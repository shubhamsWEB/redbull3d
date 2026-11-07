"use client";

import { ComponentType, Suspense, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { View } from "@react-three/drei";

import { CANS, WARNING, World } from "@/data/cans";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { WorldProps } from "./worlds/shared";
import ExplodedCan from "./ExplodedCan";
import Reveal from "@/components/Reveal";
import { Company } from "@/slices/Landing";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const WORLDS: Record<World["scape"], ComponentType<WorldProps>> = {
  earth: dynamic(() => import("./worlds/Stratosphere"), { ssr: false }),
  ridge: dynamic(() => import("./worlds/Ice"), { ssr: false }),
  road: dynamic(() => import("./worlds/Circuit"), { ssr: false }),
  river: dynamic(() => import("./worlds/River"), { ssr: false }),
  dusk: dynamic(() => import("./worlds/Gap"), { ssr: false }),
};

export default function Product({ slug }: { slug: string }) {
  const index = CANS.findIndex((c) => c.slug === slug);
  const can = CANS[index];
  const next = CANS[(index + 1) % CANS.length];
  const { world } = can;

  const root = useRef<HTMLDivElement>(null);
  const hudValue = useRef<HTMLSpanElement>(null);
  const worldScroll = useRef({ progress: 0, velocity: 0 });
  const formulaScroll = useRef({ progress: 0, velocity: 0 });
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  const [worldOn, setWorldOn] = useState(true);
  const WorldComponent = WORLDS[world.scape];

  useGSAP(
    () => {
      window.scrollTo(0, 0);
      const { from, to } = world.hud;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".world",
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onToggle: (self) => setWorldOn(self.isActive || self.progress === 0),
          onUpdate: (self) => {
            worldScroll.current.progress = self.progress;
            worldScroll.current.velocity = self.getVelocity();
            if (hudValue.current) {
              hudValue.current.textContent = Math.round(from + (to - from) * self.progress).toLocaleString("en-IN");
            }
          },
        },
      });
      tl.to(".world-title", { opacity: 0, scale: 1.5, duration: 0.2 }, 0.04).to({}, { duration: 0.76 }, 0.24);
      gsap.utils.toArray<HTMLElement>(".beat").forEach((el, i) => {
        tl.fromTo(el, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.07 }, 0.2 + i * 0.26);
        if (i < 2) tl.to(el, { opacity: 0, y: -50, duration: 0.07 }, 0.38 + i * 0.26);
      });

      const facts = gsap.timeline({
        scrollTrigger: {
          trigger: ".formula",
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => {
            formulaScroll.current.progress = self.progress;
          },
        },
      });
      gsap.fromTo(".packshot", { yPercent: 14, rotate: -5 }, { yPercent: -10, rotate: 5, ease: "none", scrollTrigger: { trigger: ".spec", start: "top bottom", end: "bottom top", scrub: true } });
      facts.from(".fact", { opacity: 0, x: -30, stagger: 0.09, duration: 0.1 }, 0.14).to({}, { duration: 0.3 });
    },
    { scope: root, dependencies: [slug, reduced], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="bg-black text-white">
      {/* The world: scroll drives the fall, the HUD and the can */}
      <section className="world relative h-[600vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          <Canvas
            frameloop={worldOn ? "always" : "never"}
            dpr={[1, isDesktop ? 1.5 : 1.25]}
            shadows={isDesktop}
            camera={{ fov: 32, position: [0, 0, 5], near: 0.1, far: 200 }}
            gl={{ antialias: !isDesktop }}
          >
            <Suspense fallback={null}>
              <WorldComponent can={can} scroll={worldScroll} reduced={reduced} mobile={!isDesktop} />
            </Suspense>
          </Canvas>
        </div>

        {/* Separate sticky layer: the sticky above is a stacking context below the canvas, this one sits over it */}
        <div className="pointer-events-none sticky top-0 z-[40] -mt-[100vh] h-screen overflow-hidden [text-shadow:0_2px_18px_rgba(0,10,40,.55)]">
          <div className="world-title absolute inset-x-4 top-28 z-[40] origin-left md:inset-x-auto md:left-10 md:top-1/2 md:w-[52vw] md:-translate-y-1/2">
            <div>
              <p className="text-lg uppercase tracking-[0.3em] md:text-2xl">{world.name}</p>
              <h1 className="mt-2 text-balance text-5xl font-black uppercase leading-[.9] md:text-[6.5vw]">{can.name}</h1>
              <p className="mt-4 text-xl md:text-3xl">{can.subtitle}</p>
              <p className="mt-6 text-xs uppercase tracking-[0.3em] opacity-80">{world.hint}</p>
            </div>
          </div>

          <div className="absolute inset-x-4 top-28 z-[40] text-center md:inset-x-auto md:left-10 md:top-1/2 md:w-[34vw] md:-translate-y-1/2 md:text-left">
            {world.lines.map((line) => (
              <p key={line} className="beat absolute inset-x-0 text-balance text-4xl font-black uppercase leading-none opacity-0 md:text-6xl">
                {line}
              </p>
            ))}
          </div>

          <div className="absolute bottom-20 left-4 z-[40] font-mono md:bottom-8 md:left-10">
            <p className="text-xs uppercase tracking-[0.3em] opacity-80">{world.hud.label}</p>
            <p className="text-4xl font-black tabular-nums md:text-6xl">
              <span ref={hudValue}>{world.hud.from.toLocaleString("en-IN")}</span>{" "}
              <span className="text-xl">{world.hud.unit}</span>
            </p>
          </div>

          <p className="absolute bottom-4 left-4 right-4 z-[40] text-xs font-normal opacity-90 md:bottom-8 md:left-auto md:right-10 md:w-[26rem] md:text-right">
            {WARNING}
          </p>

        </div>
      </section>

      {/* The formula: can splits open, real numbers come out */}
      <section className="formula relative h-[320vh]" style={{ backgroundColor: can.color }}>
        <div className="sticky top-0 h-screen overflow-hidden">
          <View className="absolute inset-0">
            <ExplodedCan can={can} scroll={formulaScroll} />
          </View>
        </div>
        <div className="pointer-events-none sticky top-0 z-[40] -mt-[100vh] flex h-screen flex-col justify-between p-4 pt-24 md:p-10 md:pt-28">
            <Reveal text="The formula that gives you wiiings" className="max-w-xl text-4xl font-black uppercase leading-none md:text-7xl" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 md:w-[30vw] md:grid-cols-1">
              {can.facts.map((f) => (
                <div key={f.name} className="fact border-b border-white/25 pb-1 md:flex md:items-baseline md:justify-between">
                  <dt className="text-sm uppercase tracking-widest opacity-90">{f.name}</dt>
                  <dd className="text-xl font-black md:text-3xl">{f.value}</dd>
                </div>
              ))}
              <p className="fact col-span-2 pt-1 text-xs font-normal opacity-90 md:col-span-1">Values per 250 ml</p>
            </dl>
        </div>
      </section>

      {/* Product: the real can, the facts, where to buy */}
      <section className="spec relative z-[40] overflow-hidden bg-paper px-4 py-20 text-carbon md:px-10 md:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-[2fr,3fr]">
          <div className="relative grid place-items-center py-6">
            <div aria-hidden className="absolute aspect-square w-[80%] rounded-full opacity-90 blur-2xl" style={{ backgroundColor: can.color }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={can.packshot} alt={can.name} loading="lazy" referrerPolicy="no-referrer" className="packshot relative max-h-[70vh] w-auto drop-shadow-[0_30px_40px_rgba(0,0,0,.35)]" />
          </div>
          <div>
            <p className="micro text-crimson">{can.subtitle}</p>
            <Reveal text={can.name} className="display mt-3 text-5xl md:text-[7vw]" />
            <p className="mt-6 max-w-xl text-xl font-normal md:text-2xl">{can.blurb}</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {can.sizes.map((size) => (
                <li key={size} className="micro border border-carbon px-3 py-1">{size}</li>
              ))}
            </ul>
            <h3 className="micro mt-10">Buy now</h3>
            <ul className="mt-3 flex flex-wrap gap-3">
              {can.buy.map((b) => (
                <li key={b.name}>
                  <a
                    href={b.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="Buy"
                    className="btn-signal chamfer inline-flex"
                  >
                    {b.name} <span aria-hidden>-&gt;</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-xl text-sm font-normal">
              {WARNING} {can.warningExtra}
            </p>
          </div>
        </div>
      </section>

      <Company />

      {/* The rest of the range */}
      <section className="relative z-[40] carbon border-t border-hairline px-4 py-20 text-white md:px-10 md:py-28">
        <Reveal text="Pick your next world" className="display text-4xl md:text-7xl" />
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {CANS.filter((c) => c.slug !== slug).map((c) => (
            <Link
              key={c.slug}
              href={`/energydrink/${c.slug}`}
              data-cursor="Enter"
              className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden border border-hairline p-4"
              style={{ background: `linear-gradient(170deg, ${c.color}, #05081f)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.packshot} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute left-1/2 top-[8%] h-[66%] -translate-x-1/2 transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-3 group-hover:scale-110" />
              <span className="micro relative text-sun">{c.world.name}</span>
              <span className="display relative text-lg md:text-2xl">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <Link
        href={`/energydrink/${next.slug}`}
        data-cursor="Drop in"
        className="group relative z-[40] block overflow-hidden px-4 py-24 text-center md:py-40"
        style={{ backgroundColor: next.color }}
      >
        <span className="micro block">Next world / {next.world.name}</span>
        <span className="display mt-3 block text-5xl transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-4 md:text-[9vw]">{next.name}</span>
      </Link>
    </div>
  );
}
