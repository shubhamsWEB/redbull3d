"use client";

// Sugarfree: wingsuit line down an endless procedural Himalayan valley, ice shards shattering round the can.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

import { damp, Drift, Fx, lerp, NOISE, SkyDome, smoothstep, useSmooth, WorldCan, WorldProps } from "./shared";

const FOG = "#c8e8f7";

const terrainShader = {
  vertexShader: `
    uniform float uTravel; varying vec3 vWorld; varying float vH;
    ${NOISE}
    float ridge(vec2 p){ float v = 0.0, a = 0.55; for (int i = 0; i < 6; i++){ v += a * (1.0 - abs(2.0 * vnoise(p) - 1.0)); p = p * 2.05 + 9.0; a *= 0.5; } return v; }
    void main(){
      vec2 q = vec2(position.x, position.y + uTravel);
      float valley = smoothstep(1.2, 13.0, abs(position.x + sin(q.y * 0.08) * 3.0));
      float h = pow(ridge(q * 0.085), 2.1) * 13.0 * valley + fbm(q * 0.3) * 0.5;
      vH = h;
      vec3 p = vec3(position.xy, h);
      vec4 w = modelMatrix * vec4(p, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    uniform vec3 uFog; varying vec3 vWorld; varying float vH;
    void main(){
      vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
      if (n.y < 0.0) n = -n;
      float light = 0.3 + 0.95 * max(dot(n, normalize(vec3(-0.55, 0.62, 0.5))), 0.0);
      vec3 rock = vec3(0.13, 0.2, 0.31);
      vec3 snow = vec3(0.98, 1.0, 1.05);
      vec3 col = mix(rock, snow, smoothstep(0.5, 0.72, n.y));
      col = mix(col, vec3(0.62, 0.86, 1.0), smoothstep(0.7, 0.0, vH) * 0.6);
      col *= light;
      float fog = smoothstep(9.0, 46.0, -vWorld.z + 5.0);
      gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
      #include <colorspace_fragment>
    }`,
};

export default function Ice({ can, scroll, reduced, mobile, embedded }: WorldProps) {
  const smooth = useSmooth(scroll);
  const bank = useRef<THREE.Group>(null);
  const shards = useRef<THREE.InstancedMesh>(null);
  const travel = useRef(0);
  const snow = useRef(0);
  const uniforms = useMemo(() => ({ uTravel: { value: 0 }, uFog: { value: new THREE.Color(FOG) } }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        a: (i / 20) * Math.PI * 2,
        tilt: THREE.MathUtils.randFloat(-0.9, 0.9),
        r: THREE.MathUtils.randFloat(0.58, 0.95),
        s: THREE.MathUtils.randFloat(0.035, 0.12),
        rate: THREE.MathUtils.randFloat(0.3, 0.9),
      })),
    [],
  );

  useFrame((state, dt) => {
    const { p, push } = smooth.current;
    const t = state.clock.elapsedTime;
    const speed = reduced ? 0 : lerp(1.5, 11, smoothstep(p, 0, 0.8)) + push * 26;
    travel.current += speed * dt;
    snow.current += speed * dt * 0.5;
    uniforms.uTravel.value = travel.current;

    if (bank.current) {
      const g = bank.current;
      const prevX = g.position.x;
      const x = damp(prevX, (mobile ? 0 : 0.65) + state.pointer.x * 0.75 + Math.sin(t * 0.45) * 0.14, 2.5, dt);
      g.position.set(x, lerp(0.42, -0.06, smoothstep(p, 0, 0.25)) + Math.sin(t * 0.8) * 0.05, mobile ? -2.3 : -0.45);
      // Bank into the turn like a wingsuit, and nose down as the valley speeds up.
      g.rotation.z = damp(g.rotation.z, (prevX - x) * 28, 5, dt);
      g.rotation.x = lerp(0, 0.55, smoothstep(p, 0.1, 0.5));
    }
    if (shards.current && bank.current) {
      // Crystal cage holds, then blows apart with the scroll.
      const burst = smoothstep(p, 0.2, 0.62);
      seeds.forEach((s, i) => {
        const a = s.a + t * s.rate * 0.35;
        const r = s.r + burst * (2.5 + s.rate * 3);
        dummy.position.set(Math.cos(a) * r, s.tilt * (0.85 + burst * 1.3), Math.sin(a) * r);
        dummy.rotation.set(t * s.rate, t * s.rate * 0.7, a);
        dummy.scale.setScalar(s.s * (1 - burst * 0.3));
        dummy.updateMatrix();
        shards.current!.setMatrixAt(i, dummy.matrix);
      });
      shards.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <fog attach="fog" args={[FOG, 14, 60]} />
      <SkyDome top="#2f84c9" bottom={FOG} sun={[-0.5, 0.42, -0.75]} />
      <mesh position={[0, -2.3, -24]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <planeGeometry args={[70, 66, mobile ? 90 : 220, mobile ? 90 : 220]} />
        <shaderMaterial args={[terrainShader]} uniforms={uniforms} />
      </mesh>

      <Drift count={mobile ? 500 : 1800} box={[12, 8, 16]} center={[0, 0.2, -5]} dir={[0.14, -0.1, 1]} color="#ffffff" size={46} travel={snow} opacity={0.9} />

      <group ref={bank}>
        <WorldCan flavor={can.slug} smooth={smooth} reduced={reduced} steer={0.08} />
        <instancedMesh ref={shards} args={[undefined, undefined, seeds.length]} frustumCulled={false}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#e5f8ff" metalness={0.35} roughness={0.04} flatShading envMapIntensity={2.2} />
        </instancedMesh>
      </group>

      <directionalLight intensity={3.4} position={[-3, 4, 3]} color="#fff6e6" />
      <hemisphereLight intensity={0.8} color="#bfe6ff" groundColor="#3e6d8e" />
      <Environment files="/hdr/field.hdr" environmentIntensity={0.85} />
      <Fx smooth={smooth} mobile={mobile || !!embedded} bloom={0.45} threshold={0.92} />
    </>
  );
}
