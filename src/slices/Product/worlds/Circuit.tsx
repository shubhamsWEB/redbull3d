"use client";

// Red Edition: night race. Scroll is the throttle: road, gates and city all share one curving bend.
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

import { Drift, Fx, lerp, smoothstep, useSmooth, WorldCan, WorldProps } from "./shared";

const LENGTH = 130;

const bendGLSL = `uniform float uBend; vec3 bent(vec3 w){ float d = max(5.0 - w.z, 0.0); w.x += uBend * d * d; return w; }`;

const roadShader = {
  transparent: true,
  depthWrite: false,
  vertexShader: `
    ${bendGLSL}
    varying vec2 vP; varying float vD;
    void main(){
      vP = position.xy;
      vec3 w = bent((modelMatrix * vec4(position, 1.0)).xyz);
      vD = 5.0 - w.z;
      gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
    }`,
  fragmentShader: `
    uniform float uTravel; varying vec2 vP; varying float vD;
    float band(float v, float w){ return smoothstep(w, w * 0.45, abs(v)); }
    void main(){
      float y = vP.y + uTravel;
      float x = vP.x;
      vec3 col = vec3(0.012, 0.012, 0.018);
      col += vec3(0.05, 0.002, 0.008) * smoothstep(5.0, 0.0, abs(x));
      col += vec3(3.5) * band(x, 0.05) * step(0.5, fract(y * 0.2));
      col += vec3(4.0, 0.18, 0.2) * band(abs(x) - 3.55, 0.07);
      float kerb = step(0.5, fract(y * 0.45));
      col = mix(col, mix(vec3(2.4, 0.03, 0.05), vec3(1.8), kerb), band(abs(x) - 3.95, 0.23));
      float a = smoothstep(4.25, 4.15, abs(x)) * smoothstep(${LENGTH.toFixed(1)}, 65.0, vD);
      gl_FragColor = vec4(col, a);
      #include <colorspace_fragment>
    }`,
};

const towerShader = {
  vertexShader: `
    ${bendGLSL}
    varying vec3 vL; varying vec3 vS; varying float vD; varying float vSeed;
    void main(){
      vL = position;
      vS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      vSeed = fract(instanceMatrix[3].y * 0.1 + vS.x * 3.1);
      vec3 w = bent((modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz);
      vD = 5.0 - w.z;
      gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
    }`,
  fragmentShader: `
    varying vec3 vL; varying vec3 vS; varying float vD; varying float vSeed;
    float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
    void main(){
      vec2 uv = vec2((abs(vL.x) > 0.499 ? vL.z * vS.z : vL.x * vS.x), vL.y * vS.y) * 2.2;
      vec2 id = floor(uv);
      vec2 f = fract(uv);
      float lit = step(0.8, h(id + vSeed * 40.0)) * step(0.16, f.x) * step(f.x, 0.84) * step(0.2, f.y) * step(f.y, 0.8);
      vec3 win = mix(vec3(2.2, 1.0, 0.45), vec3(2.5, 0.25, 0.3), step(0.6, h(id * 1.7 + vSeed)));
      vec3 col = vec3(0.012, 0.012, 0.022) + win * lit;
      col *= smoothstep(${LENGTH.toFixed(1)}, 45.0, vD);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
};

export default function Circuit({ can, scroll, reduced, mobile, embedded }: WorldProps) {
  const smooth = useSmooth(scroll);
  const { camera } = useThree();
  const canRef = useRef<THREE.Group>(null);
  const gates = useRef<THREE.InstancedMesh>(null);
  const trails = useRef<THREE.InstancedMesh>(null);
  const towers = useRef<THREE.InstancedMesh>(null);
  const travel = useRef(0);
  const embers = useRef(0);
  const bend = useRef(0);

  const roadU = useMemo(() => ({ uTravel: { value: 0 }, uBend: { value: 0 } }), []);
  const towerU = useMemo(() => ({ uBend: roadU.uBend }), [roadU]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const towerSeeds = useMemo(
    () =>
      Array.from({ length: mobile ? 60 : 130 }, (_, i) => ({
        side: i % 2 ? 1 : -1,
        x: THREE.MathUtils.randFloat(7, 24),
        z: Math.random() * LENGTH,
        w: THREE.MathUtils.randFloat(1.6, 4),
        h: THREE.MathUtils.randFloat(3, 15),
      })),
    [mobile],
  );
  const trailSeeds = useMemo(
    () =>
      Array.from({ length: mobile ? 40 : 90 }, (_, i) => ({
        x: (i % 2 ? 1 : -1) * THREE.MathUtils.randFloat(0.9, 3.2),
        y: THREE.MathUtils.randFloat(-1.1, -0.72),
        z: Math.random() * LENGTH,
        rate: THREE.MathUtils.randFloat(1.25, 2.1),
      })),
    [mobile],
  );

  useFrame((state, dt) => {
    const { p, push } = smooth.current;
    const t = state.clock.elapsedTime;
    const throttle = smoothstep(p, 0.02, 0.85);
    const speed = reduced ? 0 : lerp(0.8, 48, throttle) + push * 40;
    travel.current += speed * dt;
    embers.current += speed * dt * 0.4;
    roadU.uTravel.value = travel.current;

    bend.current = Math.sin(travel.current * 0.016) * 0.0058 * (0.3 + throttle);
    roadU.uBend.value = bend.current;
    const bx = (z: number) => {
      const d = Math.max(5 - z, 0);
      return bend.current * d * d;
    };

    // Speed comes from the lens: field of view opens with the throttle.
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = lerp(34, 58, throttle) + push * 8;
    cam.position.set(Math.sin(t * 41) * push * 0.015, 0.1 + Math.cos(t * 37) * (0.004 + throttle * 0.007), 5);
    cam.lookAt(0, -0.25, -8);
    cam.updateProjectionMatrix();

    if (canRef.current) {
      const x = (mobile ? 0 : 0.55) + state.pointer.x * 0.35;
      canRef.current.position.set(x, lerp(0.22, -0.1, smoothstep(p, 0, 0.2)) + Math.sin(t * 2.4) * 0.03, lerp(-1.6, mobile ? -0.7 : 1.1, smoothstep(p, 0, 0.3)));
      // Lean hard into whichever way the road is about to turn.
      canRef.current.rotation.z = THREE.MathUtils.damp(canRef.current.rotation.z, -bend.current * 60, 3, dt);
      canRef.current.rotation.x = lerp(0, 0.45, throttle);
    }
    if (gates.current) {
      for (let i = 0; i < 12; i++) {
        const z = 5 - ((i * 11 + travel.current) % LENGTH === 0 ? 0 : LENGTH - ((i * 11 + travel.current) % LENGTH));
        dummy.position.set(bx(z), 0.75, z);
        dummy.rotation.set(0, 0, Math.PI / 4);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        gates.current.setMatrixAt(i, dummy.matrix);
      }
      gates.current.instanceMatrix.needsUpdate = true;
    }
    if (trails.current) {
      trailSeeds.forEach((s, i) => {
        const z = 5 - (LENGTH - (s.z + travel.current * s.rate) % LENGTH);
        dummy.position.set(s.x + bx(z), s.y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.012, 0.012, 0.6 + speed * 0.09);
        dummy.updateMatrix();
        trails.current!.setMatrixAt(i, dummy.matrix);
      });
      trails.current.instanceMatrix.needsUpdate = true;
    }
    if (towers.current) {
      towerSeeds.forEach((s, i) => {
        const z = 5 - (LENGTH - (s.z + travel.current) % LENGTH);
        dummy.position.set(s.side * s.x, s.h / 2 - 1.3, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(s.w, s.h, s.w);
        dummy.updateMatrix();
        towers.current!.setMatrixAt(i, dummy.matrix);
      });
      towers.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <color attach="background" args={["#040208"]} />
      <mesh position={[0, -1.3, -LENGTH / 2 + 5]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <planeGeometry args={[9, LENGTH, 4, 120]} />
        <shaderMaterial args={[roadShader]} uniforms={roadU} />
      </mesh>
      <instancedMesh ref={towers} args={[undefined, undefined, towerSeeds.length]} frustumCulled={false}>
        <boxGeometry />
        <shaderMaterial args={[towerShader]} uniforms={towerU} />
      </instancedMesh>
      <instancedMesh ref={gates} args={[undefined, undefined, 12]} frustumCulled={false}>
        <torusGeometry args={[3.5, 0.03, 6, 4]} />
        <meshBasicMaterial color={[9, 0.5, 0.7]} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={trails} args={[undefined, undefined, trailSeeds.length]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color={[6, 0.9, 0.8]} toneMapped={false} />
      </instancedMesh>
      <Drift count={mobile ? 120 : 400} box={[14, 5, 28]} center={[0, 0.4, -9]} dir={[0, 0.03, 1]} color="#ff6b5e" size={16} travel={embers} opacity={0.75} />

      <WorldCan ref={canRef} flavor={can.slug} smooth={smooth} reduced={reduced} steer={0.1} />

      <pointLight intensity={7} position={[0, -0.8, 2.2]} color="#ff2b3d" decay={1.2} />
      <spotLight intensity={16} position={[1.5, 3, 4.2]} angle={0.55} penumbra={0.8} color="#ffe4d0" decay={1.4} />
      <Environment files="/hdr/lobby.hdr" environmentIntensity={0.45} />
      <Fx smooth={smooth} mobile={mobile || !!embedded} bloom={0.85} threshold={1} />
    </>
  );
}
