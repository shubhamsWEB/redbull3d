"use client";

// Mount inside a Canvas, after the scene, in the same Suspense: reports busy until the scene has rendered a few frames
// (shaders compiled, textures uploaded). Page wipes and the preloader wait on this so nothing compiles in view.
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "@/hooks/useStore";

export default function WarmSignal({ frames = 6 }: { frames?: number }) {
  const count = useRef(0);
  const done = useRef(false);
  useEffect(() => {
    const { addBusy, doneBusy } = useStore.getState();
    addBusy();
    return () => {
      if (!done.current) doneBusy();
    };
  }, []);
  useFrame(() => {
    if (done.current || ++count.current < frames) return;
    done.current = true;
    useStore.getState().doneBusy();
  });
  return null;
}
