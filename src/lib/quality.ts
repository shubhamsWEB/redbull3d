"use client";

// Device quality tiers, decided once from the GPU and hardware, then only ever stepped down at runtime.
// 2 = full (post-processing, dense particles), 1 = balanced, 0 = light (weak or software GPU).
import { useMemo, useRef } from "react";
import { create } from "zustand";

export type Tier = 0 | 1 | 2;

const WEAK_GPU = /swiftshader|llvmpipe|softpipe|basic render|microsoft basic|mali-[gt]?[2-7]\d{1,2}\b|adreno[^\d]*[2-5]\d{2}\b|powervr|sgx|intel.*(hd graphics|uhd graphics)\s*(\d{3,4})?\b|gma/i;

function detect(): { tier: Tier; webgl: boolean; gpu: string } {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return { tier: 0, webgl: false, gpu: "none" };
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    const nav = navigator as Navigator & { deviceMemory?: number };
    const touch = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 820;
    let tier: Tier = 2;
    if (touch || (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4) tier = 1;
    if (WEAK_GPU.test(gpu) && !/apple/i.test(gpu)) tier = 0;
    return { tier, webgl: true, gpu };
  } catch {
    return { tier: 0, webgl: false, gpu: "error" };
  }
}

type QualityState = { tier: Tier; webgl: boolean; gpu: string; ready: boolean; init: () => void; downgrade: () => void };

const initial = () => {
  if (typeof window === "undefined") return { tier: 2 as Tier, webgl: true, gpu: "", ready: false };
  const forced = new URLSearchParams(location.search).get("quality"); // ?quality=0|1|2 to test any tier on any device
  const d = detect();
  return { ...d, tier: forced && /^[012]$/.test(forced) ? (Number(forced) as Tier) : d.tier, ready: true };
};

export const useQualityStore = create<QualityState>((set, get) => ({
  ...initial(),
  init: () => {
    if (!get().ready) set(initial());
  },
  // Called by PerformanceMonitor when frame rate drops. Never steps back up within a visit: no flip-flopping.
  downgrade: () => set((s) => ({ tier: Math.max(0, s.tier - 1) as Tier })),
}));

// Pixel ratio that never renders more than ~2.4 megapixels, so 4K and retina screens don't multiply GPU work.
function capped(maxDpr: number) {
  if (typeof window === "undefined") return maxDpr;
  const budget = Math.sqrt(2_400_000 / Math.max(1, innerWidth * innerHeight));
  return Math.max(0.6, Math.min(maxDpr, devicePixelRatio, budget));
}

/**
 * live: dpr and post-processing, which may drop mid-visit without visible rebuilds.
 * dense: geometry and particle density, fixed at mount so a downgrade never re-creates scenes.
 */
export function useQuality() {
  const tier = useQualityStore((s) => s.tier);
  const mountTier = useRef(tier).current;
  return useMemo(
    () => ({
      tier,
      fx: tier === 2,
      dpr: tier === 2 ? capped(1.5) : tier === 1 ? capped(1.25) : capped(0.75),
      lite: mountTier < 2,
      light: mountTier === 0,
      fbo: tier === 2 ? 1 : tier === 1 ? 0.75 : 0.55,
    }),
    [tier, mountTier],
  );
}
