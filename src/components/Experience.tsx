"use client";

// Site-wide feel: preloader and entry gate, smooth scroll, page wipes, cursor, film grain.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useProgress } from "@react-three/drei";

import { CANS } from "@/data/cans";
import { useStore } from "@/hooks/useStore";
import { useQualityStore } from "@/lib/quality";
import { createFizzWipe, FizzWipe } from "@/lib/fizzWipe";

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const COLUMNS = [0, 1, 2, 3, 4];
const BUBBLES = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 37) % 100,
  s: 5 + ((i * 13) % 22),
  d: 3 + ((i * 7) % 6),
  o: (i * 11) % 9,
}));
let lenis: Lenis | null = null;

function storage(set?: boolean) {
  try {
    if (set) sessionStorage.setItem("rb-entered", "1");
    return sessionStorage.getItem("rb-entered") === "1";
  } catch {
    return false;
  }
}

// A real can-opening hiss, synthesised: filtered noise burst. Only ever runs from the user's click.
function hiss() {
  try {
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.9, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 3200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    source.onended = () => ctx.close();
  } catch {
    // Sound is a bonus; never block entry on it.
  }
}

function Preloader() {
  const { progress, active, total } = useProgress();
  const pathname = usePathname();
  const enter = useStore((s) => s.enter);
  const busy = useStore((s) => s.busy);
  const busyEver = useStore((s) => s.busyEver);
  const webgl = useQualityStore((s) => s.webgl);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [gate, setGate] = useState(false);
  const [pressure, setPressure] = useState(0);
  const hold = useRef({ v: 0 });
  const root = useRef<HTMLDivElement>(null);
  const tween = useRef({ v: 0 });
  const leaving = useRef(false);

  useEffect(() => {
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    // A slow network must never trap the visitor, and a page with nothing to load must not wait at all.
    const failsafe = setTimeout(() => setLoaded(true), 12000);
    const idle = setTimeout(() => {
      if ((location.pathname !== "/" || !useQualityStore.getState().webgl) && !useProgress.getState().active) setLoaded(true);
    }, useQualityStore.getState().webgl ? 3000 : 400);
    return () => {
      clearTimeout(failsafe);
      clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    gsap.to(tween.current, {
      v: progress,
      duration: 0.7,
      ease: "power2.out",
      overwrite: true,
      onUpdate: () => setCount(Math.round(tween.current.v)),
    });
    // Waits until every 3D scene has compiled, so nothing stalls once the visitor is in.
    // Without WebGL nothing loads at all, so progress never reaches 100: "nothing to load" counts as done.
    const assetsDone = !active && (progress >= 100 || (!webgl && total === 0));
    if (assetsDone && busy === 0 && (busyEver || !webgl || pathname !== "/")) setLoaded(true);
  }, [progress, active, total, busy, busyEver, webgl, pathname]);

  const startHold = () => {
    gsap.to(hold.current, {
      v: 1,
      duration: 1.1 * (1 - hold.current.v),
      ease: "power1.in",
      overwrite: true,
      onUpdate: () => setPressure(hold.current.v),
      onComplete: crack,
    });
  };
  const stopHold = () => {
    if (leaving.current || hold.current.v === 0) return;
    gsap.to(hold.current, { v: 0, duration: 0.5, overwrite: true, onUpdate: () => setPressure(hold.current.v) });
  };
  const crack = () => {
    hiss();
    leave();
  };

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    storage(true);
    const done = () => {
      document.documentElement.style.overflow = "";
      lenis?.start();
      enter();
      ScrollTrigger.refresh();
    };
    if (reducedMotion()) {
      done();
      gsap.set(root.current, { display: "none" });
      return;
    }
    gsap
      .timeline({
        onComplete: () => {
          gsap.set(root.current, { display: "none" });
        },
      })
      .to(root.current!.querySelectorAll(".pl-ui"), { opacity: 0, duration: 0.25 })
      .to(root.current!.querySelectorAll(".pl-col"), { yPercent: -100, duration: 0.9, ease: "power4.inOut", stagger: 0.06 }, 0.1)
      .call(done, undefined, 0.45);
  };

  useEffect(() => {
    if (!loaded) return;
    gsap.to(tween.current, { v: 100, duration: 0.5, overwrite: true, onUpdate: () => setCount(Math.round(tween.current.v)) });
    const timer = setTimeout(() => {
      if (pathname === "/") setGate(true);
      else leave();
    }, 650);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return (
    <div ref={root} className="fixed inset-0 z-[90] overflow-hidden text-white">
      <div className="absolute -inset-x-[12%] inset-y-0 flex -skew-x-12">
        {COLUMNS.map((c) => (
          <div key={c} className="pl-col h-full flex-1 bg-carbon" style={{ marginLeft: c ? -1 : 0 }} />
        ))}
      </div>

      {/* The screen is the can: soda rises with real load progress, then pressure builds as you hold. */}
      <div
        aria-hidden
        className="pl-ui absolute inset-x-0 bottom-0 bg-gradient-to-b from-[#ffc62e] to-[#b85600]"
        style={{ height: `${Math.max(count, pressure * 100)}%`, transition: "height .2s linear" }}
      >
        <span className="absolute inset-x-0 -top-1 h-2 bg-white/80 blur-[2px]" />
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="absolute bottom-0 rounded-full border border-white/70 bg-white/20 motion-safe:animate-[fizz_linear_infinite]"
            style={{ left: `${b.x}%`, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${-b.o}s` }}
          />
        ))}
      </div>

      <div className="pl-ui micro absolute inset-x-0 top-0 flex justify-between border-b border-hairline px-4 py-4 md:px-10">
        <span>{"Sys // Five worlds"}</span>
        <span className="tabular-nums">{`Fill // ${String(count).padStart(3, "0")}%`}</span>
      </div>

      <p className="pl-ui display absolute inset-x-0 top-[36%] px-4 text-center text-5xl [text-shadow:0_2px_24px_rgba(11,14,20,.55)] md:text-8xl" aria-live="polite">
        {gate ? (pressure > 0 ? "Keep holding" : "Ready to crack") : "Filling the can"}
      </p>

      {gate && (
        <div className="pl-ui absolute inset-x-0 top-[54%] grid place-items-center">
          <button
            autoFocus
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) startHold();
            }}
            onKeyUp={stopHold}
            onClick={(e) => {
              // Assistive tech sends a click with no pointer: never make a hold the only way in.
              if (e.detail === 0) crack();
            }}
            className="chamfer select-none touch-none bg-crimson px-10 py-5 font-mono text-xs font-bold uppercase tracking-[0.2em]"
            style={{ transform: `scale(${1 + pressure * 0.2}) translateX(${Math.sin(pressure * 90) * pressure * 5}px)` }}
          >
            Hold to crack the can
          </button>
          <p className="micro mt-4">Plays a short sound</p>
        </div>
      )}
    </div>
  );
}

// Intercepts internal link clicks so every route change gets the same transition, with no per-link wiring.
// Visual: the Five Worlds soda dissolve. Logic: pause the outgoing page, navigate under cover, reveal only once ready.
function PageWipe() {
  const router = useRouter();
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fizz = useRef<FizzWipe | null>(null);
  const anim = useRef({ in: 0, out: 0, color: [0.886, 0.106, 0.302] as [number, number, number] });
  const [label, setLabel] = useState({ text: "", color: "#E21B4D" });
  const waiting = useRef(false);

  // Build the shader at startup, never mid-click. Falls back to a plain colour fill without WebGL2.
  useEffect(() => {
    if (!canvas.current) return;
    try {
      const tier = useQualityStore.getState().tier;
      fizz.current = createFizzWipe(canvas.current, [0.5, 0.8, 1][tier], [14, 28, 42][tier]);
    } catch {
      fizz.current = null;
    }
    const onResize = () => fizz.current?.resize();
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);

  // Redraws every frame while visible, not only while a tween runs, so the drink keeps fizzing while the next page
  // loads instead of freezing into what looks like a loading screen.
  const raf = useRef(0);
  const frame = () => {
    if (fizz.current) fizz.current.draw(anim.current);
    else if (root.current) root.current.style.backgroundColor = anim.current.in > 0.5 && anim.current.out < 0.5 ? label.color : "transparent";
  };
  const startLoop = () => {
    cancelAnimationFrame(raf.current);
    let n = 0;
    const tick = () => {
      // Weak GPUs share the CPU with page loading: while fully covered, fizz at ~15fps so the load finishes sooner.
      const slow = useQualityStore.getState().tier === 0 && root.current?.getAttribute("data-state") === "covered";
      if (!slow || n++ % 4 === 0) frame();
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const stopLoop = () => cancelAnimationFrame(raf.current);
  useEffect(() => stopLoop, []);
  const setState = (state: "moving" | "covered" | "hidden") => root.current?.setAttribute("data-state", state);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a");
      if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      const go = () => router.push(url.pathname + url.hash);
      if (reducedMotion() || waiting.current) return go();
      const can = CANS.find((c) => url.pathname.endsWith(c.slug));
      const color = can ? can.color : "#E21B4D";
      setLabel({ text: can ? can.world.name : "Red Bull", color });
      // Raw sRGB: the shader writes straight to the screen, so no linear conversion.
      const hex = parseInt(color.slice(1), 16);
      anim.current = { in: 0, out: 0, color: [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255] };
      waiting.current = true;
      useStore.getState().setWiping(true);
      gsap.set(root.current, { display: "block" });
      setState("moving");
      startLoop();
      gsap.to(anim.current, {
        in: 1,
        duration: 0.9,
        ease: "power2.inOut",
        onComplete: () => {
          setState("covered");
          go();
        },
      });
      gsap.fromTo(root.current!.querySelector(".pw-label"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.55, ease: "expo.out" });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!waiting.current) return;
    waiting.current = false;
    useStore.getState().setWiping(false); // New page renders behind the cover so it can warm up.
    // Hold the cover until page height settles and the new page's 3D has compiled, so the reveal has nothing left to do.
    let last = -1;
    let steady = 0;
    let ticks = 0;
    const timer = setInterval(() => {
      const height = document.documentElement.scrollHeight;
      steady = height === last ? steady + 1 : 0;
      last = height;
      ticks++;
      if ((steady < 3 || useStore.getState().busy > 0) && ticks < 45) return;
      clearInterval(timer);
      ScrollTrigger.refresh();
      if (!location.hash) {
        if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
        else scrollTo(0, 0);
      } else {
        const target = document.querySelector<HTMLElement>(location.hash);
        if (target) {
          const y = target.getBoundingClientRect().top + scrollY - 64;
          if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
          else scrollTo(0, y);
        }
      }
      setState("moving");
      gsap.to(root.current!.querySelector(".pw-label"), { opacity: 0, duration: 0.2 });
      // The drink drains away from the top, revealing the new page underneath.
      gsap.to(anim.current, {
        out: 1,
        duration: 1,
        ease: "power2.inOut",
        onComplete: () => {
          stopLoop();
          setState("hidden");
          gsap.set(root.current, { display: "none" });
        },
      });
    }, 100);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div ref={root} aria-hidden data-state="hidden" className="pointer-events-none fixed inset-0 z-[80] hidden">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <p className="pw-label display absolute inset-0 grid place-items-center px-4 text-center text-5xl text-white opacity-0 [text-shadow:0_4px_30px_rgba(0,0,0,.35)] motion-safe:animate-[float_3.2s_ease-in-out_infinite] md:text-8xl">
        {label.text}
      </p>
    </div>
  );
}

function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches || reducedMotion() || !ring.current) return;
    const el = ring.current;
    gsap.set(el, { xPercent: -50, yPercent: -50 });
    let shown = false;
    const x = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" });
    const y = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" });
    const onMove = (e: PointerEvent) => {
      if (!shown) {
        // Appears at the pointer on first move rather than flying in from the corner.
        shown = true;
        gsap.set(el, { display: "grid", x: e.clientX, y: e.clientY });
      }
      x(e.clientX);
      y(e.clientY);
      const hit = (e.target as Element).closest?.("a,button") as HTMLElement | null;
      const words = hit ? hit.dataset.cursor ?? "" : "";
      if (text.current && text.current.textContent !== words) text.current.textContent = words;
      gsap.to(el, { scale: hit ? (words ? 5.5 : 3) : 1, duration: 0.3, overwrite: "auto" });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={ring}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[85] hidden size-3 rotate-45 place-items-center bg-white mix-blend-difference"
    >
      <span ref={text} className="-rotate-45 whitespace-nowrap font-mono text-[3px] font-bold uppercase text-black" />
    </div>
  );
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function Experience() {
  useEffect(() => {
    if (reducedMotion()) return;
    const instance = new Lenis({ lerp: 0.09, anchors: true });
    lenis = instance;
    instance.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => instance.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    if (document.documentElement.style.overflow === "hidden") instance.stop();
    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      lenis = null;
    };
  }, []);

  return (
    <>
      <Preloader />
      <PageWipe />
      <Cursor />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[75] opacity-[.06] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </>
  );
}
