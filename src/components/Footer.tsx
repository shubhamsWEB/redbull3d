"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Footer() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.from(".foot-word", {
        xPercent: -12,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: true },
      });
    },
    { scope: root },
  );
  return (
    <footer ref={root} className="relative z-[40] overflow-hidden carbon border-t border-hairline text-white">
      <div className="flex flex-col justify-between gap-8 px-4 pt-14 md:flex-row md:px-10">
        <Link href="/" aria-label="Home" className="shrink-0">
          <Image src="/images/redbulllogo.svg" alt="Red Bull" width={225} height={36} />
        </Link>
        <p className="max-w-xl text-xs font-normal text-silver">
          Unofficial concept created by Shubham Agrawal as a design pitch. Not affiliated with, endorsed by or sponsored by
          Red Bull GmbH. Red Bull names, marks and photography belong to their owners and are shown from redbull.com/in-en for
          presentation only; can wraps in 3D and &ldquo;world&rdquo; copy are concept recreations.
        </p>
      </div>
      <p aria-hidden className="foot-word display mt-8 whitespace-nowrap text-center text-[27vw] !leading-[.78] text-sun">
        Wiiings
      </p>
    </footer>
  );
}
