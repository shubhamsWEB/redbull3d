"use client";

import { ComponentType, MutableRefObject, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, useFBO } from "@react-three/drei";
import * as THREE from "three";

import { CANS, World } from "@/data/cans";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useStore } from "@/hooks/useStore";
import Stratosphere from "@/slices/Product/worlds/Stratosphere";
import Ice from "@/slices/Product/worlds/Ice";
import Circuit from "@/slices/Product/worlds/Circuit";
import River from "@/slices/Product/worlds/River";
import Gap from "@/slices/Product/worlds/Gap";
import { NOISE, WorldProps } from "@/slices/Product/worlds/shared";

const WORLDS: Record<World["scape"], ComponentType<WorldProps>> = { earth: Stratosphere, ridge: Ice, road: Circuit, river: River, dusk: Gap };

type Mix = MutableRefObject<{ from: number; to: number; t: number; local: number; velocity: number }>;

const dissolve = {
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tA; uniform sampler2D tB; uniform float uT; uniform float uTime; uniform float uAspect; uniform vec3 uEdge;
    varying vec2 vUv;
    ${NOISE}
    // Field of soda bubbles: the wipe's front is made of them.
    float bubbleLayer(vec2 p, float scale, float speed){
      vec2 g = p * scale; g.y -= uTime * speed;
      vec2 i = floor(g), f = fract(g) - 0.5;
      float on = step(0.62, hash(i + 11.3));
      float r = 0.1 + hash(i) * 0.3;
      float d = length(f + (vec2(hash(i + 3.1), hash(i + 7.7)) - 0.5) * (0.9 - r * 2.0));
      return on * (smoothstep(r, r - 0.035, d) - smoothstep(r - 0.05, r - 0.1, d));
    }
    float bubbles(vec2 p){ return bubbleLayer(p, 19.0, 0.55) + bubbleLayer(p + 4.2, 41.0, 0.9) * 0.7; }
    void main(){
      vec2 c = vUv - 0.5;
      vec2 aspect = vec2(uAspect, 1.0);
      float n = fbm(vUv * aspect * 3.2 + vec2(0.0, -uTime * 0.12));
      // The new world rises up from the bottom, like soda filling the frame.
      float field = (1.0 - vUv.y) * 0.75 + n * 0.55;
      float front = uT * 1.5 - 0.2;
      float m = smoothstep(field - 0.03, field + 0.03, front);
      float edge = smoothstep(0.12, 0.0, abs(field - front)) * step(0.001, uT) * step(uT, 0.999);
      float wet = smoothstep(0.3, 0.0, abs(field - front)) * step(0.001, uT) * step(uT, 0.999);

      vec2 warp = (vec2(fbm(vUv * 6.0 + uTime * 0.3), fbm(vUv * 6.0 - uTime * 0.3)) - 0.45) * edge * 0.09;
      float split = uT * (1.0 - uT) * 0.022;
      vec2 ua = 0.5 + c * (1.0 - uT * 0.16) + warp;
      vec3 a = vec3(texture2D(tA, ua + vec2(split, 0.0)).r, texture2D(tA, ua).g, texture2D(tA, ua - vec2(split, 0.0)).b);
      vec3 b = texture2D(tB, 0.5 + c * (1.1 - uT * 0.1) + warp).rgb;
      vec3 col = mix(a, b, m);
      col += uEdge * (edge * edge * 1.6 + wet * bubbles(vUv * aspect) * 2.2);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

function Worlds({ mix, reduced, mobile, onWarm }: { mix: Mix; reduced: boolean; mobile: boolean; onWarm: () => void }) {
  const { gl, size, pointer } = useThree();
  const scale = mobile ? 0.8 : 1;
  const opts = { type: THREE.HalfFloatType, samples: 0, depth: true };
  const fboA = useFBO(size.width * scale, size.height * scale, opts);
  const fboB = useFBO(size.width * scale, size.height * scale, opts);
  const stages = useMemo(
    () =>
      CANS.map(() => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(32, 1, 0.1, 200),
        scroll: { current: { progress: 0.12, velocity: 0 } },
      })),
    [],
  );
  const uniforms = useMemo(
    () => ({
      tA: { value: null as THREE.Texture | null },
      tB: { value: null as THREE.Texture | null },
      uT: { value: 0 },
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uEdge: { value: new THREE.Color("#ffc62e") },
    }),
    [],
  );

  useEffect(() => {
    stages.forEach((s) => {
      s.camera.position.set(0, 0, 5);
      s.camera.aspect = size.width / size.height;
      s.camera.updateProjectionMatrix();
    });
  }, [stages, size]);

  const warmed = useRef(0);

  useFrame((state) => {
    // One world per frame until each has rendered once: compiling them all here means no stall when they first appear.
    if (warmed.current < stages.length) {
      const stage = stages[warmed.current];
      if (stage.scene.children.length === 0) return; // Still loading.
      gl.setRenderTarget(fboB);
      gl.clear();
      gl.render(stage.scene, stage.camera);
      gl.setRenderTarget(null);
      if (++warmed.current === stages.length) onWarm();
      return;
    }
    const { from, to, t, local, velocity } = mix.current;
    // Only the worlds on screen spend GPU time. Each scrubs its own story while it holds the frame.
    const a = stages[from];
    const b = stages[to];
    a.scroll.current.progress = 0.08 + Math.min(local, 1) * 0.68;
    a.scroll.current.velocity = velocity;
    b.scroll.current.progress = 0.08 + Math.max(0, local - 0.66) * 0.5;
    b.scroll.current.velocity = velocity;

    const render = (stage: (typeof stages)[number], target: THREE.WebGLRenderTarget) => {
      gl.setRenderTarget(target);
      gl.clear();
      gl.render(stage.scene, stage.camera);
    };
    render(a, fboA);
    if (t > 0) render(b, fboB);
    gl.setRenderTarget(null);

    uniforms.tA.value = fboA.texture;
    uniforms.tB.value = fboB.texture;
    uniforms.uT.value = t;
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uAspect.value = size.width / size.height;
  });

  return (
    <>
      {CANS.map((can, i) => {
        const WorldComponent = WORLDS[can.world.scape];
        return createPortal(
          <Suspense fallback={null}>
            <WorldComponent can={can} scroll={stages[i].scroll as any} reduced={reduced} mobile={mobile} embedded />
          </Suspense>,
          stages[i].scene,
          { camera: stages[i].camera, pointer } as any,
        );
      })}
      <mesh frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial args={[dissolve]} uniforms={uniforms} depthTest={false} depthWrite={false} />
      </mesh>
    </>
  );
}

export default function Portals({ mix, reduced, active }: { mix: Mix; reduced: boolean; active: boolean }) {
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  const [low, setLow] = useState(false);
  const [warm, setWarm] = useState(false);
  const setWorldsReady = useStore((s) => s.setWorldsReady);
  return (
    <Canvas frameloop={active || !warm ? "always" : "never"} dpr={low ? 0.75 : [1, isDesktop ? 1.25 : 1]} shadows={isDesktop && !low} gl={{ antialias: false, powerPreference: "high-performance" }}>
      {warm && <PerformanceMonitor onDecline={() => setLow(true)} />}
      <Worlds
        mix={mix}
        reduced={reduced}
        mobile={!isDesktop}
        onWarm={() => {
          setWarm(true);
          setWorldsReady();
        }}
      />
    </Canvas>
  );
}
