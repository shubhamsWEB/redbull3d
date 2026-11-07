"use client";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { CANS } from "@/data/cans";

const LABELS = Object.fromEntries(CANS.map((c) => [c.slug, c.label]));

export function useCanLabel(flavor: string) {
  const labels = useTexture(LABELS) as Record<string, THREE.Texture>;
  const label = labels[flavor];
  label.colorSpace = THREE.SRGBColorSpace;
  label.anisotropy = 8;
  return label;
}

export type Reveal = { value: number };

// Exact label colours with no lights, reflections or tone mapping. Only the edges roll off, to keep it a cylinder.
// Only true when drawn after post-processing: see TrueColourPass in slices/TheCan/Stage.tsx.
function TrueColourLabel({ map, reveal }: { map: THREE.Texture; reveal?: Reveal }) {
  const uniforms = useMemo(() => ({ map: { value: map }, uReveal: reveal ?? { value: 1 } }), [map, reveal]);
  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={`
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          vUv = uv;
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`}
      fragmentShader={`
        uniform sampler2D map; uniform float uReveal;
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          // Fine speckle, so the solid can fills in between the particles instead of switching on.
          float h = fract(sin(dot(floor(vUv * vec2(620.0, 500.0)), vec2(12.9898, 78.233))) * 43758.5453);
          if (h > uReveal) discard;
          float edge = clamp(1.0 - dot(normalize(vN), normalize(vV)), 0.0, 1.0);
          gl_FragColor = vec4(texture2D(map, vUv).rgb * (1.0 - 0.62 * pow(edge, 2.6)), 1.0);
          #include <colorspace_fragment>
        }`}
    />
  );
}

export function SodaCan({ flavor, trueColor = false, reveal, ...props }: any) {
  const { nodes, materials }: any = useGLTF("/can-red.glb");
  const label = useCanLabel(flavor);
  // Own copy of the metal when revealing: stochastic alpha matches the label's speckle, and the shared material stays untouched.
  const metal = useMemo(() => {
    if (!reveal) return materials.m_aluminium;
    const m = materials.m_aluminium.clone();
    m.alphaHash = true;
    m.transparent = false;
    return m;
  }, [reveal, materials]);
  useFrame(() => {
    if (reveal) metal.opacity = reveal.value;
  });

  return (
    <group {...props} position={[0, -1, 0]} dispose={null} scale={0.12} rotation={[Math.PI / 2, 0, 0]}>
      {["bolt", "bottom", "can_top", "hole", "tab", "tab_bevel"].map((name) => (
        <mesh key={name} castShadow receiveShadow geometry={nodes[name].geometry} material={metal} />
      ))}
      <mesh castShadow receiveShadow geometry={nodes.can_label.geometry}>
        {trueColor ? <TrueColourLabel map={label} reveal={reveal} /> : <meshStandardMaterial roughness={0.15} metalness={0.1} map={label} />}
      </mesh>
    </group>
  );
}

useGLTF.preload("/can-red.glb");
