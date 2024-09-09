"use client";

import { Environment } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { Group } from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import FloatingCan from "@/components/FloatingCan";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useThree } from "@react-three/fiber";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = {};

export default function Scene({}: Props) {
  const canRef = useRef<Group>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  const [flavor, setFlavor] = useState('lemonLime');
  const bgColors = ["#fff", "#fff", "#fff"];
  const flavors = ["lemonLime", "watermelon", "blackCherry"];
  const state = useThree();
  const { width, height } = state.viewport;
  useEffect(() => {
    if (!canRef.current) return;

    const sections = gsap.utils.toArray(".alternating-section");

    const scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".alternating-text-view",
        endTrigger: ".alternating-text-container",
        pin: true,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const flavorIndex = Math.round(progress * (flavors.length - 1));
          setFlavor(flavors[flavorIndex]);
        },
      },
    });

    sections.forEach((_, index) => {
      if (!canRef.current) return;
      if (index === 0) return;

      const isOdd = index % 2 !== 0;
      const xPosition = isDesktop ? (isOdd ? "-1" : "1") : 0;
      const yRotation = isDesktop ? (isOdd ? ".4" : "-.4") : 0;

      scrollTl
        .to(canRef.current.position, {
          x: xPosition,
          ease: "circ.inOut",
          delay: 0.5,
        })
        .to(
          canRef.current.rotation,
          {
            y: yRotation,
            ease: "back.inOut",
          },
          "<",
        )
        .to(".alternating-text-container", {
          backgroundColor: gsap.utils.wrap(bgColors, index),
        });
    });
  }, [isDesktop]);
  // const config = useControls("Lights", {
  //   position: { value: [0, -1, 0] },
  //   // rotation:{value:[-Math.PI / 1, 2, 2]}
  // });
  return (
    <group
      ref={canRef}
      position-x={isDesktop ? 1 : 0}
      rotation-y={isDesktop ? -0.3 : 0}
    >
      <FloatingCan flavor={flavor} />
     
      <Environment files={"/hdr/lobby.hdr"} environmentIntensity={1.5} />
    </group>
  );
}
