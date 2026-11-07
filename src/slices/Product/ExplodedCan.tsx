"use client";

import { MutableRefObject, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { useCanLabel } from "@/components/SodaCan";
import { Can } from "@/data/cans";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const up = THREE.MathUtils.smoothstep;

const FIZZ = 70;

// The drink itself: amber bands rising, bright rim. Unlit so it glows on any can colour.
const liquidShader = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  vertexShader: `
    varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform float uTime; uniform float uOpacity; uniform vec3 uA; uniform vec3 uB;
    varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
    void main() {
      float bands = sin(vUv.y * 22.0 - uTime * 2.4 + sin(vUv.x * 18.8 + uTime) * 1.6) * 0.5 + 0.5;
      vec3 col = mix(uA, uB, bands * vUv.y + 0.2);
      float rim = pow(clamp(1.0 - dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), 2.5);
      gl_FragColor = vec4(col + rim * vec3(1.0, 0.95, 0.75), uOpacity * (0.82 + rim * 0.18));
      #include <colorspace_fragment>
    }`,
};

export default function ExplodedCan({
  can,
  scroll,
}: {
  can: Can;
  scroll: MutableRefObject<{ progress: number; velocity: number }>;
}) {
  const { nodes, materials }: any = useGLTF("/can-red.glb");
  const label = useCanLabel(can.slug);
  const isDesktop = useMediaQuery("(min-width: 768px)", true);

  const spin = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const bottom = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const shellMat = useRef<THREE.MeshStandardMaterial>(null);
  const coreMat = useRef<THREE.ShaderMaterial>(null);
  const fizz = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(() => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uA: { value: new THREE.Color(can.liquid[0]) },
      uB: { value: new THREE.Color(can.liquid[1]) },
    }),
    [can],);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: FIZZ }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: THREE.MathUtils.randFloat(2.3, 4.6),
        offset: Math.random(),
        rate: THREE.MathUtils.randFloat(0.08, 0.25),
        size: THREE.MathUtils.randFloat(0.04, 0.14),
      })),
    [],
  );
  const eased = useRef(0);

  useFrame((state, dt) => {
    if (!spin.current || !top.current || !bottom.current || !shell.current || !shellMat.current || !fizz.current) return;
    eased.current = THREE.MathUtils.damp(eased.current, scroll.current.progress, 6, dt);
    const p = eased.current;
    // Open across the first half, reseal at the very end. Model units: 12.9 tall, axis on -z.
    const open = up(p, 0.08, 0.42) * (1 - up(p, 0.84, 1));
    top.current.position.z = -open * 4.2;
    bottom.current.position.z = open * 4.2;
    const grow = 1 + open * 0.55;
    shell.current.scale.set(grow, grow, 1);
    shellMat.current.opacity = 1 - up(open, 0.15, 0.85) * 0.92;
    shellMat.current.depthWrite = open < 0.5;
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uOpacity.value = up(open, 0.1, 0.7);
    seeds.forEach((s, i) => {
      const rise = (s.offset + t * s.rate) % 1;
      const a = s.angle + t * 0.3;
      dummy.position.set(Math.cos(a) * s.radius, Math.sin(a) * s.radius, -rise * 15 + 1);
      dummy.scale.setScalar(s.size * open * Math.sin(rise * Math.PI));
      dummy.updateMatrix();
      fizz.current!.setMatrixAt(i, dummy.matrix);
    });
    fizz.current.instanceMatrix.needsUpdate = true;
    spin.current.rotation.y = -0.45 + p * Math.PI * 2;
  });

  return (
    <>
      <group position={isDesktop ? [0.55, -0.62, 0] : [0, -0.25, -4]} rotation={[0.08, 0, -0.08]}>
        <group ref={spin} scale={0.1} >
          <group rotation={[Math.PI / 2, 0, 0]}>
            <group ref={top}>
              {["bolt", "can_top", "hole", "tab", "tab_bevel"].map((name) => (
                <mesh key={name} geometry={nodes[name].geometry} material={materials.m_aluminium} />
              ))}
            </group>
            <group ref={bottom}>
              <mesh geometry={nodes.bottom.geometry} material={materials.m_aluminium} />
            </group>
            <mesh ref={shell} geometry={nodes.can_label.geometry}>
              <meshStandardMaterial ref={shellMat} transparent roughness={0.15} metalness={0.1} map={label} />
            </mesh>
            <mesh position={[0, 0, -6.45]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[2.2, 2.2, 11.4, 48]} />
              <shaderMaterial ref={coreMat} args={[liquidShader]} uniforms={uniforms} />
            </mesh>
            <instancedMesh ref={fizz} args={[undefined, undefined, FIZZ]} frustumCulled={false}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color="#fff6d0" toneMapped={false} />
            </instancedMesh>
          </group>
        </group>
      </group>
      <directionalLight intensity={3} position={[1, 2, 3]} />
      <Environment files="/hdr/lobby.hdr" environmentIntensity={1.1} />
    </>
  );
}
