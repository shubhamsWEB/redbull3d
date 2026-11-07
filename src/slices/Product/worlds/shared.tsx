"use client";

import { forwardRef, MutableRefObject, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";

import { SodaCan } from "@/components/SodaCan";
import { Can } from "@/data/cans";

export type Scroll = MutableRefObject<{ progress: number; velocity: number }>;
export type WorldProps = { can: Can; scroll: Scroll; reduced: boolean; mobile: boolean; embedded?: boolean };
export type Smooth = MutableRefObject<{ p: number; push: number; velocity: number }>;

export const { damp, lerp, smoothstep } = THREE.MathUtils;
export const FRONT = -0.45; // Turns the wrap's front panel towards camera.
export const bell = (v: number, a: number, b: number, c: number, d: number) => smoothstep(v, a, b) * (1 - smoothstep(v, c, d));

// One source of eased progress and scroll energy per world.
export function useSmooth(scroll: Scroll): Smooth {
  const s = useRef({ p: 0, push: 0, velocity: 0 });
  useFrame((_, dt) => {
    const c = scroll.current;
    c.velocity = damp(c.velocity, 0, 3, dt);
    s.current.p = damp(s.current.p, c.progress, 5, dt);
    s.current.velocity = c.velocity;
    s.current.push = Math.min(Math.abs(c.velocity) / 2500, 1);
  }, -1);
  return s;
}

// Can centred on its own axis: whips round on scroll, settles facing front, leans to the pointer.
export const WorldCan = forwardRef<THREE.Group, { flavor: string; smooth: Smooth; reduced: boolean; steer?: number }>(
  ({ flavor, smooth, reduced, steer = 0.35 }, ref) => {
    const spinner = useRef<THREE.Group>(null);
    const spin = useRef(0);
    useFrame((state, dt) => {
      if (!spinner.current || reduced) return;
      const { push } = smooth.current;
      spin.current =
        push > 0.04
          ? spin.current + dt * push * 14
          : damp(spin.current, Math.round(spin.current / (Math.PI * 2)) * Math.PI * 2, 2.5, dt);
      const g = spinner.current;
      g.rotation.y = FRONT + spin.current + Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      g.rotation.z = damp(g.rotation.z, -state.pointer.x * steer, 4, dt);
      g.rotation.x = damp(g.rotation.x, -state.pointer.y * steer * 0.6, 4, dt);
    });
    return (
      <group ref={ref}>
        <group ref={spinner}>
          <group position-y={0.225}>
            <SodaCan flavor={flavor} />
          </group>
        </group>
      </group>
    );
  },
);
WorldCan.displayName = "WorldCan";

// Bloom and speed fringing are desktop-only: post-processing is the first cost to drop on phones.
export function Fx({ smooth, mobile, bloom = 0.7, threshold = 0.82, tone = true }: { smooth: Smooth; mobile: boolean; bloom?: number; threshold?: number; tone?: boolean }) {
  const offset = useMemo(() => new THREE.Vector2(), []);
  useFrame(() => offset.setScalar(smooth.current.push * 0.005));
  if (mobile) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.2} />
      <ChromaticAberration offset={offset} radialModulation={false} modulationOffset={0} />
      <Vignette offset={0.25} darkness={0.65} />
      {tone ? <ToneMapping mode={ToneMappingMode.ACES_FILMIC} /> : <></>}
    </EffectComposer>
  );
}

// Vertical gradient backdrop, follows the camera so it never clips.
export function SkyDome({ top, bottom, sun }: { top: string; bottom: string; sun?: [number, number, number] }) {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(top) },
      uBottom: { value: new THREE.Color(bottom) },
      uSun: { value: new THREE.Vector3(...(sun ?? [0, 0, -1])).normalize() },
      uSunOn: { value: sun ? 1 : 0 },
    }),
    [top, bottom, sun],
  );
  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[80, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`
          uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uSun; uniform float uSunOn; varying vec3 vDir;
          void main(){
            vec3 d = normalize(vDir);
            vec3 c = mix(uBottom, uTop, smoothstep(-0.05, 0.42, d.y));
            float s = max(dot(d, uSun), 0.0);
            c += uSunOn * (smoothstep(0.9975, 0.9985, s) * vec3(3.0, 2.5, 1.8) + pow(s, 60.0) * vec3(0.9, 0.5, 0.3));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  );
}

// GPU-wrapped particles: positions wrap in the vertex shader, so thousands cost one draw call and no JS per frame.
export function Drift({
  count,
  box,
  center = [0, 0, 0],
  dir,
  color,
  size = 40,
  travel,
  opacity = 0.9,
}: {
  count: number;
  box: [number, number, number];
  center?: [number, number, number];
  dir: [number, number, number];
  color: string;
  size?: number;
  travel: MutableRefObject<number>;
  opacity?: number;
}) {
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      a[i] = Math.random() * box[0];
      a[i + 1] = Math.random() * box[1];
      a[i + 2] = Math.random() * box[2];
    }
    return a;
  }, [count, box]);
  const uniforms = useMemo(
    () => ({
      uT: { value: 0 },
      uBox: { value: new THREE.Vector3(...box) },
      uCenter: { value: new THREE.Vector3(...center) },
      uDir: { value: new THREE.Vector3(...dir) },
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uOpacity: { value: opacity },
    }),
    [box, center, dir, color, size, opacity],
  );
  useFrame(() => {
    uniforms.uT.value = travel.current;
  });
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uT; uniform vec3 uBox; uniform vec3 uCenter; uniform vec3 uDir; uniform float uSize;
          void main(){
            vec3 p = mod(position + uDir * uT, uBox) - uBox * 0.5 + uCenter;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uSize / max(-mv.z, 0.5);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          uniform vec3 uColor; uniform float uOpacity;
          void main(){
            float a = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
            gl_FragColor = vec4(uColor, a * uOpacity);
            #include <colorspace_fragment>
          }`}
      />
    </points>
  );
}

export const NOISE = /* glsl */ `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + 11.0; a *= 0.5; } return v; }
`;
