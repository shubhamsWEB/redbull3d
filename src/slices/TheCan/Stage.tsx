"use client";

import { MutableRefObject, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { Environment, PerformanceMonitor, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

import FloatingCan from "@/components/FloatingCan";
import { Reveal, SodaCan } from "@/components/SodaCan";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useQuality, useQualityStore } from "@/lib/quality";
import WarmSignal from "@/components/WarmSignal";
import { useStore } from "@/hooks/useStore";
import { bell, damp, FRONT, Fx, lerp, Scroll, smoothstep, useSmooth } from "@/slices/Product/worlds/shared";
import Wings from "./Wings";

// Scroll beats. Keep in sync with the copy timing in index.tsx.
const T = { pull: [0.12, 0.2], bulls: [0.17, 0.25], charge: [0.25, 0.42], bang: [0.42, 0.6], form: [0.6, 0.76], solid: [0.74, 0.83], wings: [0.83, 0.93], lift: [0.94, 1] };
const at = (p: number, [a, b]: number[]) => smoothstep(p, a, b);
// Hero can size: full on desktop, narrower on phones so the can and its wings fit the frame.
const canFit = (viewportWidth: number) => 1.42 * Math.min(1, viewportWidth / 2.6);

/* ---------- Soda bubbles: GPU instanced, thousands in one draw call ---------- */
function Fizz({ count, smooth, entered }: { count: number; smooth: any; entered: MutableRefObject<number> }) {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 12, 10);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i += 4) {
      seed[i] = Math.random();
      seed[i + 1] = Math.random();
      seed[i + 2] = Math.random();
      seed[i + 3] = Math.random();
    }
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 4));
    return g;
  }, [count]);
  const uniforms = useMemo(
    () => ({ uT: { value: 0 }, uWobble: { value: 0 }, uFade: { value: 0 }, uPointer: { value: new THREE.Vector2() }, uSuck: { value: 0 } }),
    [],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  const clock = useRef(0);
  const pace = useRef(1);
  useFrame((state, dt) => {
    const { p, push } = smooth.current;
    // Scrolling stirs the drink gently; eased so the pace never jumps.
    pace.current = damp(pace.current, 1 + push * 1.2, 2, dt);
    clock.current += dt * pace.current;
    uniforms.uT.value = clock.current;
    uniforms.uWobble.value = state.clock.elapsedTime;
    uniforms.uFade.value = entered.current * (1 - at(p, [0.17, 0.25]));
    if (mesh.current) mesh.current.visible = uniforms.uFade.value > 0.001;
    uniforms.uSuck.value = at(p, T.pull);
    uniforms.uPointer.value.set(state.pointer.x * (state.viewport.width / 2), state.pointer.y * (state.viewport.height / 2));
  });
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          attribute vec4 aSeed;
          uniform float uT; uniform float uWobble; uniform vec2 uPointer; uniform float uSuck;
          varying vec3 vN; varying vec3 vV;
          void main(){
            float rise = fract(aSeed.w + uT * (0.018 + aSeed.y * 0.04));
            float depth = -5.5 + aSeed.z * 7.0;
            float spread = (5.0 - depth) * 0.72;
            // Column is taller than the frame, so bubbles are born and die off-screen and never pop in view.
            vec3 c = vec3((aSeed.x - 0.5) * spread + sin(uWobble * (0.5 + aSeed.y * 0.5) + aSeed.x * 30.0) * 0.05, (rise - 0.5) * spread * 1.05, depth);
            // Never smaller than a couple of pixels: sub-pixel bubbles shimmer.
            float r = (0.016 + aSeed.y * aSeed.y * 0.05) * (0.6 + rise * 0.5);
            vec2 d = c.xy - uPointer;
            float l = max(length(d), 0.001);
            c.xy += d / l * smoothstep(0.7, 0.0, l) * 0.3;
            c.xy *= 1.0 - uSuck;
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(c + position * r, 1.0);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          uniform float uFade;
          varying vec3 vN; varying vec3 vV;
          void main(){
            // clamp matters: dot() can pass 1.0 by rounding, pow() of the remainder is NaN, and bloom then blurs one NaN pixel across the whole frame (a black flash).
            float f = clamp(1.0 - dot(normalize(vN), normalize(vV)), 0.0, 1.0);
            float rim = pow(f, 2.2);
            float spec = pow(max(dot(normalize(vN), normalize(vec3(-0.45, 0.65, 0.6))), 0.0), 42.0);
            // Stays under the bloom threshold, so highlights can't flare and strobe frame to frame.
            vec3 col = min(mix(vec3(1.0, 0.62, 0.1), vec3(1.0, 0.92, 0.7), rim) + spec * 0.5, vec3(0.9)) * 0.85;
            gl_FragColor = vec4(col, (rim * 0.7 + spec * 0.6 + 0.03) * uFade);
            #include <colorspace_fragment>
          }`}
      />
    </instancedMesh>
  );
}

/* ---------- Particle cloud: logo bulls > galaxy > can, all morphing in the vertex shader ---------- */
async function sampleBulls(n: number) {
  const svg = (await (await fetch("/images/redbulllogo.svg")).text()).replace("<svg ", '<svg width="2250" height="360" ');
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 360;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);
  const { data } = ctx.getImageData(0, 0, 960, 360);
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const side = new Float32Array(n);
  const CX = 473;
  const CY = 180;
  const color = new THREE.Color();
  for (let i = 0, guard = 0; i < n && guard < n * 400; guard++) {
    const x = Math.floor(Math.random() * 960);
    const y = Math.floor(Math.random() * 360);
    const o = (y * 960 + x) * 4;
    if (data[o + 3] < 128) continue;
    const yellow = data[o] > 200 && data[o + 1] > 150 && data[o + 2] < 110;
    side[i] = yellow && Math.hypot(x - CX, y - CY) < 165 ? 0 : x < CX ? -1 : 1;
    pos.set([((x - CX) / CX) * 1.75, ((CY - y) / CX) * 1.75, (Math.random() - 0.5) * 0.09], i * 3);
    color.setRGB(data[o] / 255, data[o + 1] / 255, data[o + 2] / 255, THREE.SRGBColorSpace);
    col.set([color.r, color.g, color.b], i * 3);
    i++;
  }
  return { pos, col, side };
}

const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

async function sampleCan(n: number, nodes: any) {
  const img = new Image();
  img.src = "/labels/energy-drink.webp";
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 824;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, 1024, 824);
  const { data } = ctx.getImageData(0, 0, 1024, 824);
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(flat(nodes.can_label.geometry))).build();
  const lid = new MeshSurfaceSampler(new THREE.Mesh(flat(nodes.can_top.geometry))).build();
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const tint = new THREE.Color();
  const uv = new THREE.Vector2();
  const color = new THREE.Color();
  for (let i = 0; i < n; i++) {
    if (i % 12 === 0) {
      lid.sample(p);
      color.set("#c9d2dc");
    } else {
      sampler.sample(p, nrm, tint, uv);
      const x = Math.min(1023, Math.floor(uv.x * 1024));
      const y = Math.min(823, Math.floor((1 - uv.y) * 824));
      const o = (y * 1024 + x) * 4;
      color.setRGB(data[o] / 255, data[o + 1] / 255, data[o + 2] / 255, THREE.SRGBColorSpace);
    }
    // Same transform SodaCan applies, centred on the can's own middle.
    pos.set([p.x * 0.12, -p.z * 0.12 - 0.775, p.y * 0.12], i * 3);
    col.set([color.r, color.g, color.b], i * 3);
  }
  return { pos, col };
}

const particleVertex = /* glsl */ `
  attribute vec3 aCan; attribute vec3 aColorB; attribute vec3 aColorC; attribute vec4 aSeed;
  uniform float uAppear, uCharge, uBang, uForm, uT, uSize, uFit, uRot, uCanScale, uFlash;
  uniform vec2 uPointer; uniform vec3 uCanPos;
  varying vec3 vC; varying float vA;
  void main(){
    float side = aSeed.x, r1 = aSeed.y, r2 = aSeed.z, r3 = aSeed.w;

    // Bulls: burst out of the point where the cans vanished, then close the gap under charge.
    vec3 bull = position * uFit;
    bull.x += side * (0.62 * (1.0 - uCharge) - 0.03) * uFit;
    bull.y += abs(side) * sin(uT * 14.0 + r1 * 6.0) * 0.012 * uCharge;
    if (side == 0.0) bull *= 0.72 + uCharge * 0.38;
    float a = smoothstep(r1 * 0.55, r1 * 0.55 + 0.45, uAppear);
    vec3 p = mix(vec3((r1 - 0.5) * 0.25, (r2 - 0.5) * 0.25, 0.0), bull, a);

    // Impact: everything spirals out from the collision point.
    float ang = atan(p.y, p.x) + uBang * (1.6 + r2 * 5.2);
    float rad = length(p.xy) * (1.0 - uBang) + uBang * (0.22 + pow(r3, 1.7) * 3.3);
    vec3 galaxy = vec3(cos(ang) * rad, sin(ang) * rad * 0.62, (r1 - 0.5) * uBang * 2.4);
    galaxy.xy += vec2(sin(uT * 0.7 + r2 * 40.0), cos(uT * 0.6 + r3 * 40.0)) * 0.03 * uBang;

    // Condense onto the real can's surface, spinning.
    float f = smoothstep(r3 * 0.5, r3 * 0.5 + 0.5, uForm);
    float c = cos(uRot), s = sin(uRot);
    vec3 can = aCan * uCanScale;
    can = vec3(can.x * c + can.z * s, can.y, -can.x * s + can.z * c) + uCanPos;
    p = mix(galaxy, can, f);

    // The cursor punches a wake through the cloud.
    vec2 d = p.xy - uPointer;
    float l = max(length(d), 0.001);
    float hit = smoothstep(0.3, 0.0, l) * (1.0 - uForm * 0.75);
    p.xy += d / l * hit * 0.12;
    p.z += hit * 0.3;

    vec3 hot = mix(vec3(0.89, 0.04, 0.2), vec3(1.0, 0.72, 0.05), r2);
    hot = mix(hot, vec3(0.9, 0.95, 1.0), step(0.86, r1));
    vC = mix(mix(aColorB * (1.5 + uCharge * 1.3), hot * 1.9, smoothstep(0.0, 0.2, uBang)), aColorC, f);
    vC += hit * 1.2 + uFlash * 2.5;
    vA = a;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.55 + r1) * (1.0 + uFlash) / max(-mv.z, 0.3);
    gl_Position = projectionMatrix * mv;
  }`;

function Cloud({ count, smooth, hero }: { count: number; smooth: any; hero: React.RefObject<THREE.Group> }) {
  const { nodes }: any = useGLTF("/can-red.glb");
  const { viewport, gl } = useThree();
  const points = useRef<THREE.Points>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const uniforms = useMemo(
    () => ({
      uAppear: { value: 0 },
      uCharge: { value: 0 },
      uBang: { value: 0 },
      uForm: { value: 0 },
      uT: { value: 0 },
      uSize: { value: 9 },
      uFit: { value: 1 },
      uRot: { value: 0 },
      uCanScale: { value: 1.42 },
      uFlash: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uCanPos: { value: new THREE.Vector3() },
    }),
    [],
  );
  const warmFrames = useRef(4); // Compile the shader behind the preloader, not at first sight mid-scroll.

  useEffect(() => {
    let live = true;
    Promise.all([sampleBulls(count), sampleCan(count, nodes)]).then(([b, c]) => {
      if (!live) return;
      const g = new THREE.BufferGeometry();
      const seed = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) seed.set([b.side[i], Math.random(), Math.random(), Math.random()], i * 4);
      g.setAttribute("position", new THREE.BufferAttribute(b.pos, 3));
      g.setAttribute("aCan", new THREE.BufferAttribute(c.pos, 3));
      g.setAttribute("aColorB", new THREE.BufferAttribute(b.col, 3));
      g.setAttribute("aColorC", new THREE.BufferAttribute(c.col, 3));
      g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
      setGeometry(g);
    });
    return () => {
      live = false;
    };
  }, [count, nodes]);

  useFrame((state) => {
    const { p } = smooth.current;
    const t = state.clock.elapsedTime;
    uniforms.uT.value = t;
    uniforms.uAppear.value = at(p, T.bulls);
    const c = at(p, T.charge);
    uniforms.uCharge.value = c * c * c; // Slow creep, then full acceleration into the hit.
    const b = Math.max(0, Math.min(1, (p - T.bang[0]) / (T.bang[1] - T.bang[0])));
    uniforms.uBang.value = 1 - Math.pow(1 - b, 4);
    uniforms.uForm.value = at(p, T.form);
    // Locked to the real can's transform, so particles and can are one object through the handover.
    uniforms.uRot.value = FRONT + (hero.current?.rotation.y ?? 0) + (1 - at(p, T.form)) * -6;
    if (hero.current) {
      uniforms.uCanPos.value.copy(hero.current.position);
      uniforms.uCanScale.value = hero.current.scale.x;
    }
    uniforms.uFlash.value = bell(p, 0.415, 0.42, 0.42, 0.46);
    uniforms.uFit.value = Math.min(1, viewport.width / 5);
    uniforms.uSize.value = (viewport.width < 2 ? 5 : 9) * Math.min(gl.getPixelRatio(), 1.5) * (1 - at(p, [0.79, 0.86]));
    uniforms.uPointer.value.set(state.pointer.x * (viewport.width / 2), state.pointer.y * (viewport.height / 2));
    if (points.current) {
      points.current.visible = warmFrames.current > 0 || (p > 0.16 && p < 0.86);
      if (warmFrames.current > 0) warmFrames.current--;
    }
  });

  if (!geometry) return null;
  return (
    <points ref={points} geometry={geometry} frustumCulled={false} visible={false}>
      <shaderMaterial
        depthWrite
        uniforms={uniforms}
        vertexShader={particleVertex}
        fragmentShader={`
          varying vec3 vC; varying float vA;
          void main(){
            if (length(gl_PointCoord - 0.5) > 0.5 || vA < 0.01) discard;
            gl_FragColor = vec4(vC, 1.0);
            #include <colorspace_fragment>
          }`}
      />
    </points>
  );
}

/* ---------- Shockwave ring at the moment of impact ---------- */
function Shock({ smooth }: { smooth: any }) {
  const uniforms = useMemo(() => ({ uR: { value: 0 }, uO: { value: 0 } }), []);
  useFrame(() => {
    const k = at(smooth.current.p, [0.42, 0.5]);
    uniforms.uR.value = k;
    uniforms.uO.value = bell(smooth.current.p, 0.418, 0.424, 0.46, 0.52);
  });
  return (
    <mesh position={[0, 0, -0.5]}>
      <planeGeometry args={[14, 9]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`
          uniform float uR, uO; varying vec2 vP;
          void main(){
            float d = length(vP * vec2(1.0, 1.35));
            float r = uR * 6.5;
            float ring = smoothstep(0.26, 0.0, abs(d - r)) * 2.6;
            float core = smoothstep(1.7, 0.0, d) * (1.0 - uR) * 2.2;
            vec3 c = mix(vec3(1.0, 0.82, 0.3), vec3(0.89, 0.1, 0.3), uR);
            gl_FragColor = vec4(c * (ring + core), (ring + core) * uO);
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  );
}

/* ---------- True-colour pass ----------
   Every real can is drawn after bloom and tone mapping, so nothing can wash out its label.
   Bubbles share this pass so they still drift in front of and behind the cans.
   Wings, particles and the shockwave keep the full cinematic treatment. */
function TrueColourPass({ follow, fxOn, reveal, children }: { follow: React.RefObject<THREE.Group>; fxOn: boolean; reveal: Reveal; children: React.ReactNode }) {
  const { gl, scene, camera, pointer } = useThree();
  const stage = useMemo(() => new THREE.Scene(), []);
  const holder = useRef<THREE.Group>(null);

  useFrame(() => {
    // Priority above 0 turns off R3F's automatic render, so draw the scene ourselves when no composer does.
    if (!fxOn) gl.render(scene, camera);
    const from = follow.current;
    if (holder.current && from) {
      holder.current.visible = from.visible;
      holder.current.position.copy(from.position);
      holder.current.rotation.copy(from.rotation);
      holder.current.scale.copy(from.scale);
    }
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.clearDepth();
    gl.render(stage, camera);
    gl.autoClear = auto;
  }, 2);

  return createPortal(
    <>
      {children}
      <group ref={holder} visible={false}>
        <group position-y={0.225} rotation-y={FRONT}>
          <SodaCan flavor="energy-drink" trueColor reveal={reveal} />
        </group>
      </group>
      <directionalLight intensity={1.6} position={[-2, 3, 4]} />
      <Environment files="/hdr/lobby.hdr" environmentIntensity={0.6} />
    </>,
    stage,
    { pointer } as any,
  );
}

const FLOATERS: { flavor: string; pos: [number, number, number]; spin: number }[] = [
  { flavor: "energy-drink", pos: [0.05, -0.05, 0.9], spin: 0.3 },
  { flavor: "red-edition", pos: [-1.55, 0.32, -0.8], spin: -0.5 },
  { flavor: "green-edition", pos: [1.6, 0.42, -1], spin: 0.45 },
  { flavor: "pink-edition", pos: [-0.95, -0.62, -2.2], spin: 0.6 },
  { flavor: "sugarfree", pos: [1.05, -0.58, -2.4], spin: -0.4 },
];

function Scene({ scroll, reduced, mobile, fx, lite, light }: { scroll: Scroll; reduced: boolean; mobile: boolean; fx: boolean; lite: boolean; light: boolean }) {
  const smooth = useSmooth(scroll);
  const { scene, camera } = useThree();
  const entered = useStore((s) => s.entered);
  const enter = useRef(0);
  const floaters = useRef<THREE.Group>(null);
  const hero = useRef<THREE.Group>(null);
  const flap = useRef(0);
  const wingOpen = useRef({ open: 0, flap: 0, warm: true });
  const reveal = useMemo(() => ({ value: 0 }), []);
  const frames = useRef(0);
  const bg = useMemo(
    () => ({
      soda: new THREE.Color("#2a1500"),
      carbon: new THREE.Color("#0B0E14"),
      night: new THREE.Color("#02030a"), // Flies up into the Stratosphere world that follows.
      now: new THREE.Color(),
    }),
    [],
  );

  useFrame((state, dt) => {
    const { p, push } = smooth.current;
    const t = state.clock.elapsedTime;
    enter.current = entered ? damp(enter.current, 1, 2.2, dt) : 0;

    // Amber glow of being inside the drink, snapping to carbon as the bulls appear, then midnight for lift-off.
    bg.now.copy(bg.soda).lerp(bg.carbon, at(p, [0.13, 0.22])).lerp(bg.night, at(p, [0.9, 1]));
    scene.background = bg.now;

    const shake = bell(p, 0.41, 0.42, 0.43, 0.5) * 0.05 + at(p, [0.34, 0.42]) * (1 - at(p, [0.42, 0.43])) * 0.012;
    camera.position.set(
      state.pointer.x * 0.12 + Math.sin(t * 61) * shake,
      state.pointer.y * 0.08 + Math.cos(t * 53) * shake,
      5 - at(p, [0.25, 0.42]) * 0.6 + at(p, [0.42, 0.55]) * 0.6,
    );
    camera.lookAt(0, 0, 0);

    if (floaters.current) {
      const pull = at(p, T.pull);
      floaters.current.visible = p < 0.205;
      floaters.current.children.forEach((c, i) => {
        const f = FLOATERS[i];
        const k = 1 - Math.pow(1 - pull, 3);
        c.position.set(f.pos[0] * (1 - k), f.pos[1] * (1 - k) + (1 - enter.current) * -5 * (i % 2 ? 1 : -1), f.pos[2] * (1 - k));
        c.rotation.y = FRONT + (reduced ? 0 : Math.sin(t * 0.35 + i * 1.7) * f.spin * 0.7) + k * 16;
        c.scale.setScalar(Math.max(0.0001, 1 - pull * pull) * enter.current * Math.min(1, state.viewport.width / 3));
      });
    }

    if (hero.current) {
      const solid = at(p, T.solid);
      const lift = at(p, T.lift);
      reveal.value = solid;
      // First frames render everything once behind the preloader, so nothing compiles mid-scroll.
      const warm = frames.current++ < 4;
      wingOpen.current.warm = warm;
      hero.current.visible = warm || solid > 0.001;
      hero.current.scale.setScalar(canFit(state.viewport.width) * (1 + at(p, T.wings) * -0.12));
      const flapSpeed = 5 + lift * 20 + push * 8;
      flap.current += dt * flapSpeed;
      wingOpen.current.open = at(p, T.wings);
      wingOpen.current.flap = flap.current;
      hero.current.position.set(
        mobile ? 0 : state.pointer.x * 0.12 * (1 - lift),
        Math.sin(flap.current) * 0.05 * wingOpen.current.open + lift * lift * 3.4,
        lift * lift * -1.5,
      );
      hero.current.rotation.set(lift * -0.45, Math.sin(t * 0.6) * 0.14 * solid, Math.sin(t * 0.9) * 0.04);
    }
  });

  return (
    <>
      <Cloud count={light ? 14000 : mobile || lite ? 26000 : 60000} smooth={smooth} hero={hero} />
      <Shock smooth={smooth} />
      <group ref={hero} visible={false}>
        <Wings state={wingOpen} />
      </group>
      <pointLight intensity={14} position={[0, -2.2, 2]} color="#ff9a1f" decay={1.3} />
      <directionalLight intensity={3} position={[-2, 3, 4]} color="#fff1dc" />
      <Environment files="/hdr/lobby.hdr" environmentIntensity={0.85} />
      <TrueColourPass follow={hero} fxOn={!mobile && fx} reveal={reveal}>
        <Fizz count={light ? 300 : mobile || lite ? 650 : 1400} smooth={smooth} entered={enter} />
        <group ref={floaters}>
          {FLOATERS.map((f) => (
            <group key={f.flavor}>
              <FloatingCan flavor={f.flavor} trueColor floatSpeed={1.4} rotationIntensity={0.18} floatIntensity={0.6} />
            </group>
          ))}
        </group>
      </TrueColourPass>
      <Fx smooth={smooth} mobile={mobile || !fx} bloom={1} threshold={0.92} />
    </>
  );
}

export default function Stage({ scroll, active, reduced }: { scroll: Scroll; active: boolean; reduced: boolean }) {
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  const entered = useStore((s) => s.entered);
  const q = useQuality();
  const wiping = useStore((st) => st.wiping);
  const downgrade = useQualityStore((s) => s.downgrade);
  return (
    <Canvas
      frameloop={wiping ? "never" : active ? "always" : "never"}
      dpr={q.dpr}
      camera={{ fov: 32, position: [0, 0, 5], near: 0.1, far: 120 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      {/* Starts after the preloader, so first-load work is not mistaken for a slow GPU. */}
      {entered && <PerformanceMonitor onDecline={downgrade} />}
      <Suspense fallback={null}>
        <Scene scroll={scroll} reduced={reduced} mobile={!isDesktop} fx={q.fx} lite={q.lite} light={q.light} />
        <WarmSignal />
      </Suspense>
    </Canvas>
  );
}
