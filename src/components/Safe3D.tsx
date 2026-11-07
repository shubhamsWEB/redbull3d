"use client";

// Any 3D scene degrades to a still image: no WebGL, a lost context, or a crash in scene code never blanks the section.
import { Component, ReactNode, useEffect, useState } from "react";
import { useQualityStore } from "@/lib/quality";

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("3D scene failed, showing still image instead", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Still({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-carbon">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} referrerPolicy="no-referrer" className="max-h-[62%] w-auto drop-shadow-[0_30px_50px_rgba(0,0,0,.6)]" />
    </div>
  );
}

export default function Safe3D({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const webgl = useQualityStore((s) => s.webgl);
  // Decided after mount so server and client render the same markup.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (mounted && !webgl) return <>{fallback}</>;
  return <Boundary fallback={fallback}>{children}</Boundary>;
}
