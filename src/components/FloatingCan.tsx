"use client";

import { forwardRef, ReactNode } from "react";
import { Float } from "@react-three/drei";

import { SodaCan } from "@/components/SodaCan";
import { Group } from "three";

type FloatingCanProps = {
  flavor?: string;
  floatSpeed?: number;
  rotationIntensity?: number;
  floatIntensity?: number;
  floatingRange?: [number, number];
  children?: ReactNode;
  trueColor?: boolean;
};

const FloatingCan = forwardRef<Group, FloatingCanProps>(
  (
    {
      flavor = "energy-drink",
      floatSpeed = 1.5,
      rotationIntensity = 1,
      floatIntensity = 1,
      floatingRange = [-0.1, 0.1],
      children,
      trueColor,
      ...props
    },
    ref,
  ) => {
    return (
      <group ref={ref} {...props}>
        <Float
          speed={floatSpeed}
          rotationIntensity={rotationIntensity}
          floatIntensity={floatIntensity}
          floatingRange={floatingRange}
        >
          {children}
          <SodaCan flavor={flavor} trueColor={trueColor} />
        </Float>
      </group>
    );
  },
);

FloatingCan.displayName = "FloatingCan";

export default FloatingCan;
