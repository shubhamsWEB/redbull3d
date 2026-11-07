"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import CanLife from "@/slices/CanLife";
import Reveal from "@/components/Reveal";
import { ATHLETES, COMPANY, EVENTS, FEATURES, photo, STORIES, TV, TV_IMAGE, WORLD } from "@/data/site";

gsap.registerPlugin(useGSAP, ScrollTrigger, Flip);

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

// Official photo with graceful failure: if the CDN refuses, the card's own colour shows through.
function Photo({ src, alt = "", className }: { src: string; alt?: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => (e.currentTarget.style.display = "none")}
      className={className}
    />
  );
}

function Heading({ kicker, title, tone = "text-sun" }: { kicker: string; title: string; tone?: string }) {
  return (
    <div className="mb-10">
      <p className={`micro ${tone}`}>{kicker}</p>
      <Reveal text={title} className="mt-2 display text-balance text-5xl md:text-[8vw]" />
    </div>
  );
}

export function Ticker() {
  const items = [...FEATURES, ...FEATURES];
  return (
    <div className="relative z-[40] overflow-hidden border-y border-hairline bg-carbon py-3 text-white" aria-hidden>
      <div className="flex w-max animate-[slide-left_40s_linear_infinite] micro gap-10 whitespace-nowrap">
        {items.map((f, i) => (
          <span key={i}>
            {f.title} <span className="text-sun">/ {f.tag}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Vertical scroll drives a horizontal gallery on desktop; photos drift inside their frames. Phones get native swipe.
function Features() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const track = root.current!.querySelector<HTMLElement>(".gallery-track")!;
        const move = gsap.to(track, {
          x: () => -(track.scrollWidth - innerWidth),
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true },
        });
        gsap.utils.toArray<HTMLElement>(".gallery-photo").forEach((img) => {
          gsap.fromTo(
            img,
            { xPercent: -9 },
            { xPercent: 9, ease: "none", scrollTrigger: { trigger: img.parentElement, containerAnimation: move, start: "left right", end: "right left", scrub: true } },
          );
        });
        gsap.to(".gallery-bar", { scaleX: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: true } });
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="relative z-[40] carbon text-white md:h-[420vh]">
      <div className="py-20 md:sticky md:top-0 md:flex md:h-svh md:flex-col md:justify-center md:overflow-hidden md:py-0">
        <div className="px-4 md:px-10">
          <Heading kicker="Happening now" title="The world of Red Bull" />
        </div>
        <div className="gallery-track flex w-full snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:w-max md:snap-none md:overflow-visible md:px-10 md:pb-0">
          {FEATURES.map((f, i) => (
            <a
              key={f.title}
              href={f.href}
              {...external}
              data-cursor="Explore"
              className="group relative flex h-[58vh] w-[80vw] shrink-0 snap-start flex-col justify-end overflow-hidden border border-hairline p-6 md:h-[56vh] md:w-[32vw]"
              style={{ backgroundColor: f.tone }}
            >
              <Photo
                src={photo(f.img, 1000, 1200)}
                alt={f.title}
                className="gallery-photo absolute inset-0 h-full w-full scale-[1.25] object-cover transition-transform duration-300 group-hover:!scale-[1.34]"
              />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-carbon/95 via-carbon/10 to-transparent" />
              <span aria-hidden className="display absolute right-4 top-3 text-7xl text-white/25 md:text-8xl">{String(i + 1).padStart(2, "0")}</span>
              <p className="relative micro text-sun">{f.tag}</p>
              <h3 className="relative mt-2 display text-3xl md:text-4xl">{f.title}</h3>
              <p className="relative mt-2 font-normal">{f.kicker}</p>
            </a>
          ))}
        </div>
        <div aria-hidden className="mx-10 mt-8 hidden h-px bg-white/20 md:block">
          <div className="gallery-bar h-full origin-left scale-x-0 bg-sun" />
        </div>
      </div>
    </section>
  );
}

// Departure board, with the event's photo floating at the cursor on desktop.
function Events() {
  const root = useRef<HTMLElement>(null);
  const float = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(-1);
  const mover = useRef<{ x: gsap.QuickToFunc; y: gsap.QuickToFunc } | null>(null);

  useGSAP(
    () => {
      mover.current = {
        x: gsap.quickTo(float.current, "x", { duration: 0.6, ease: "power3" }),
        y: gsap.quickTo(float.current, "y", { duration: 0.6, ease: "power3" }),
      };
      gsap.from(".event-row", {
        clipPath: "inset(0 100% 0 0)",
        duration: 0.7,
        ease: "expo.out",
        stagger: 0.09,
        scrollTrigger: { trigger: ".event-list", start: "top 82%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <section
      id="events"
      ref={root}
      onPointerMove={(e) => {
        const r = root.current!.getBoundingClientRect();
        mover.current?.x(e.clientX - r.left + 28);
        mover.current?.y(e.clientY - r.top - 130);
      }}
      className="relative z-[40] carbon scroll-mt-16 overflow-hidden px-4 py-20 text-white md:px-10 md:py-32"
    >
      <Heading kicker="Next departures" title="Events" />
      <ul className="event-list border-t border-hairline font-mono">
        {EVENTS.map((e, i) => (
          <li key={e.name} className="event-row border-b border-hairline">
            <a
              href={e.href}
              {...external}
              data-cursor="View"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(-1)}
              className="grid gap-3 py-6 hover:bg-sun hover:text-carbon md:grid-cols-[14rem,1fr,16rem,12rem] md:items-center"
            >
              <Photo src={photo(e.img, 800, 450)} className="aspect-video w-full  object-cover md:hidden" />
              <span className="text-sm tabular-nums md:text-base">{e.date}</span>
              <span className="display font-sans text-3xl md:text-5xl">{e.name}</span>
              <span className="text-sm">{e.place}</span>
              <span className="micro w-fit bg-crimson px-2 py-1 text-white">{e.status}</span>
            </a>
          </li>
        ))}
      </ul>
      <a href="https://www.redbull.com/in-en/events" {...external} className="btn-line mt-8">
        View all events
      </a>
      <div
        ref={float}
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 z-10 hidden h-64 w-52 overflow-hidden  transition-[opacity,scale] duration-300 md:block ${hover >= 0 ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
      >
        {EVENTS.map((e, i) => (
          <Photo
            key={e.name}
            src={photo(e.img, 500, 640)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${hover === i ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>
    </section>
  );
}

function Stories() {
  const root = useRef<HTMLElement>(null);
  const [lead, ...rest] = STORIES;
  useGSAP(
    () => {
      gsap.fromTo(".story-lead", { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".story-lead-wrap", start: "top bottom", end: "bottom top", scrub: true } });
      gsap.from(".story-card", { y: 60, opacity: 0, duration: 0.6, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: ".story-grid", start: "top 80%", once: true } });
    },
    { scope: root },
  );
  return (
    <section id="stories" ref={root} className="relative z-[40] scroll-mt-16  bg-paper px-4 py-20 text-carbon  md:px-10 md:py-32">
      <Heading kicker="Read" title="Stories" tone="text-crimson" />
      <div className="story-grid grid gap-4 md:grid-cols-4">
        <a href={lead.href} {...external} data-cursor="Read" className="story-card story-lead-wrap group relative flex min-h-[28rem] flex-col justify-end overflow-hidden border border-hairline bg-carbon p-6 text-white md:col-span-2 md:row-span-2">
          <Photo src={photo(lead.img!, 1200, 1300)} alt="Vijay DK in the Red Bull 64 Bars studio" className="story-lead absolute inset-0 h-full w-full scale-125 object-cover" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-carbon/95 via-carbon/15 to-transparent" />
          <p className="relative micro text-sun">{lead.tag} / {lead.read}</p>
          <h3 className="relative mt-3 display text-4xl md:text-6xl">{lead.title}</h3>
        </a>
        {rest.map((s) => (
          <a key={s.title} href={s.href} {...external} data-cursor="Read" className="story-card group relative flex min-h-[15rem] flex-col justify-between overflow-hidden border border-hairline !border-carbon/15 bg-white p-5 hover:bg-carbon hover:text-white">
            <p className="relative micro text-crimson group-hover:text-sun">{s.tag} / {s.read}</p>
            <span aria-hidden className="absolute -bottom-3 -right-1 whitespace-nowrap text-[4.5rem] font-black uppercase leading-none text-carbon/[.05] transition-transform duration-500 group-hover:-translate-x-6 group-hover:text-white/10">
              {s.tag}
            </span>
            <h3 className="relative text-xl font-black uppercase leading-none">{s.title}</h3>
          </a>
        ))}
      </div>
    </section>
  );
}

function AthleteCard({ a }: { a: (typeof ATHLETES)[number] }) {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <a
      ref={ref}
      href={a.href}
      {...external}
      data-cursor="Meet"
      data-athlete={a.name}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        gsap.to(ref.current, {
          rotateY: ((e.clientX - r.left) / r.width - 0.5) * 16,
          rotateX: -((e.clientY - r.top) / r.height - 0.5) * 16,
          transformPerspective: 800,
          duration: 0.4,
          overwrite: "auto",
        });
      }}
      onPointerLeave={() => gsap.to(ref.current, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "power3.out", overwrite: "auto" })}
      className="athlete group relative flex aspect-[3/4] flex-col justify-end overflow-hidden border border-hairline bg-asphalt p-5 text-white"
    >
      <Photo src={photo(a.img, 700, 934)} alt={a.name} className="absolute inset-0 h-full w-full object-cover grayscale group-hover:scale-105 group-hover:grayscale-0" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-carbon/95 via-transparent to-transparent" />
      <p className="relative micro text-sun">{a.sport} / India</p>
      <h3 className="relative mt-1 display text-2xl md:text-3xl">{a.name}</h3>
    </a>
  );
}

function Athletes() {
  const root = useRef<HTMLElement>(null);
  const sports = useMemo(() => ["All", ...Array.from(new Set(ATHLETES.map((a) => a.sport)))], []);
  const [sport, setSport] = useState("All");
  const flip = useRef<Flip.FlipState | null>(null);

  useGSAP(
    () => {
      if (!flip.current) return;
      Flip.from(flip.current, {
        duration: 0.45,
        ease: "expo.out",
        stagger: 0.02,
        absolute: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.8, duration: 0.3 }),
      });
      flip.current = null;
    },
    { scope: root, dependencies: [sport] },
  );

  return (
    <section id="athletes" ref={root} className="relative z-[40] scroll-mt-16 bg-asphalt px-4 py-20 text-white md:px-10 md:py-32">
      <Heading kicker="Find athlete by interest" title="Athletes" tone="text-crimson" />
      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter athletes by sport">
        {sports.map((s) => (
          <button
            key={s}
            aria-pressed={s === sport}
            onClick={() => {
              flip.current = Flip.getState(root.current!.querySelectorAll(".athlete"));
              setSport(s);
            }}
            className={`btn-line ${s === sport ? "!border-sun bg-sun !text-carbon" : ""}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {ATHLETES.filter((a) => sport === "All" || a.sport === sport).map((a) => (
          <AthleteCard key={a.name} a={a} />
        ))}
      </div>
    </section>
  );
}

// A framed photo opens up to full bleed as you scroll in.
function TvBand() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 } })
        .fromTo(".tv-frame", { clipPath: "inset(24% 26%)" }, { clipPath: "inset(0% 0%)", ease: "power2.inOut", duration: 1 }, 0)
        .fromTo(".tv-photo", { scale: 1.3 }, { scale: 1, ease: "none", duration: 1.3 }, 0)
        .fromTo(".tv-title", { scale: 0.62, y: 40 }, { scale: 1, y: 0, duration: 1 }, 0)
        .to({}, { duration: 0.3 });
    },
    { scope: root },
  );
  return (
    <section id="tv" ref={root} className="relative z-[40] h-[240vh] scroll-mt-16 bg-asphalt text-white">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="tv-frame absolute inset-0 overflow-hidden bg-asphalt">
          <Photo src={photo(TV_IMAGE, 1920, 1200)} className="tv-photo absolute inset-0 h-full w-full object-cover" />
          <span aria-hidden className="absolute inset-0 bg-black/45" />
        </div>
        <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
          <p className="flex items-center gap-2 micro">
            <span className="size-2 bg-crimson motion-safe:animate-pulse" /> On now
          </p>
          <h2 className="tv-title display mt-3 text-6xl md:text-[12vw]">Red Bull TV</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {TV.map((t) => (
              <a key={t.name} href={t.href} {...external} data-cursor="Watch" className="btn-line bg-carbon/30 backdrop-blur">
                {t.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Each word lights up as you read, then three athlete photos drift at different speeds.
export function Company() {
  const root = useRef<HTMLElement>(null);
  const LINE = "Giving wiiings to people & ideas since 1987";
  useGSAP(
    () => {
      gsap.fromTo(
        ".company-word",
        { opacity: 0.15 },
        { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: ".company-line", start: "top 80%", end: "bottom 45%", scrub: true } },
      );
      gsap.utils.toArray<HTMLElement>(".company-card").forEach((card, i) => {
        gsap.fromTo(card, { y: 50 + i * 70 }, { y: -30 - i * 40, ease: "none", scrollTrigger: { trigger: ".company-cards", start: "top bottom", end: "bottom top", scrub: true } });
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="relative z-[40] carbon overflow-hidden px-4 py-24 text-white md:px-10 md:py-40">
      <h2 aria-label={LINE} className="company-line display mx-auto max-w-6xl text-center text-5xl md:text-[7vw]">
        {LINE.split(" ").map((w, i) => (
          <span key={i} aria-hidden className="company-word mr-[.25em] inline-block">{w}</span>
        ))}
      </h2>
      <div className="company-cards mx-auto mt-20 grid max-w-6xl gap-4 pb-16 md:grid-cols-3">
        {COMPANY.map((c) => (
          <figure key={c.name} className="company-card relative aspect-[4/5] overflow-hidden border border-hairline bg-asphalt">
            <Photo src={photo(c.img, 800, 1000)} alt={c.name} className="absolute inset-0 h-full w-full object-cover" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-carbon/90 to-transparent to-50%" />
            <figcaption className="absolute bottom-4 left-5">
              <span className="block micro text-sun">{c.sport}</span>
              <span className="display block text-2xl">{c.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function WorldStrip() {
  const items = [...WORLD, ...WORLD];
  return (
    <section className="relative z-[40] overflow-hidden bg-carbon py-14 text-white">
      <h2 className="sr-only">Also in the World of Red Bull</h2>
      <div className="flex w-max animate-[slide-left_60s_linear_infinite] gap-14 whitespace-nowrap" aria-hidden>
        {items.map(([name, tag], i) => (
          <span key={i} className="display text-3xl md:text-5xl">
            {name} <span className="micro align-middle text-sun">{tag}</span>
          </span>
        ))}
      </div>
      <ul className="sr-only">
        {WORLD.map(([name, tag]) => (
          <li key={name}>{name}: {tag}</li>
        ))}
      </ul>
    </section>
  );
}

export default function Landing() {
  return (
    <>
      <Features />
      <Events />
      <Stories />
      <Athletes />
      <TvBand />
      <Company />
      <CanLife />
      <WorldStrip />
    </>
  );
}
