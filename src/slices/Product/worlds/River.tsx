"use client";

// Green Edition: whitewater. The can floats on the same wave function the water mesh displaces with.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

import { damp, Drift, Fx, lerp, NOISE, SkyDome, smoothstep, useSmooth, WorldCan, WorldProps } from "./shared";

const FOG = "#b8e08a";

// Keep in sync with waveGLSL below.
const wave = (x: number, z: number, t: number, a: number) =>
  a *
  (0.34 * Math.sin(0.9 * z - 1.9 * t + 0.6 * Math.sin(0.5 * x)) +
    0.2 * Math.sin(1.7 * z + 0.8 * x - 2.8 * t) +
    0.11 * Math.sin(3.1 * z - 1.1 * x - 3.9 * t));

const waveGLSL = `
  float wave(float x, float z, float t, float a){
    return a * (0.34 * sin(0.9 * z - 1.9 * t + 0.6 * sin(0.5 * x))
      + 0.2 * sin(1.7 * z + 0.8 * x - 2.8 * t)
      + 0.11 * sin(3.1 * z - 1.1 * x - 3.9 * t));
  }`;

const waterShader = {
  vertexShader: `
    uniform float uT; uniform float uA; varying vec3 vWorld; varying float vH;
    ${waveGLSL}
    void main(){
      vec4 w = modelMatrix * vec4(position, 1.0);
      vH = wave(w.x, w.z, uT, uA);
      w.y += vH;
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    uniform float uT; uniform float uA; uniform vec3 uFog; varying vec3 vWorld; varying float vH;
    ${NOISE}
    void main(){
      vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
      if (n.y < 0.0) n = -n;
      vec3 v = normalize(cameraPosition - vWorld);
      float fres = pow(clamp(1.0 - dot(n, v), 0.0, 1.0), 3.0);
      vec3 deep = vec3(0.01, 0.12, 0.075), shallow = vec3(0.1, 0.42, 0.2);
      vec3 col = mix(deep, shallow, smoothstep(-0.6, 0.6, vH));
      col = mix(col, vec3(0.8, 0.96, 0.62), fres * 0.85);

      // Foam streaks stretched along the flow, thicker on crests and as the rapids build.
      vec2 q = vec2(vWorld.x * 1.7, vWorld.z * 0.42 - uT * 1.7);
      float streak = fbm(q + fbm(q * 0.7) * 1.3);
      float foam = smoothstep(0.66 - uA * 0.08, 0.76 - uA * 0.08, streak) * 0.65 + smoothstep(0.3 * uA, 0.55 * uA, vH) * streak * 0.9;
      col = mix(col, vec3(1.1, 1.14, 1.05), clamp(foam, 0.0, 1.0));

      vec3 h = normalize(normalize(vec3(-0.35, 0.75, -0.6)) + v);
      col += vec3(2.6, 2.3, 1.5) * pow(max(dot(n, h), 0.0), 90.0);
      float fog = smoothstep(9.0, 33.0, 5.0 - vWorld.z);
      gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
      #include <colorspace_fragment>
    }`,
};

export default function River({ can, scroll, reduced, mobile, embedded, lite, fx = true }: WorldProps) {
  const low = mobile || !!lite; // Geometry and particle density.
  const smooth = useSmooth(scroll);
  const canRef = useRef<THREE.Group>(null);
  const rocks = useRef<THREE.InstancedMesh>(null);
  const trees = useRef<THREE.InstancedMesh>(null);
  const spray = useRef<THREE.Points>(null);
  const flow = useRef(0);
  const time = useRef(0);
  const mist = useRef(0);
  const uniforms = useMemo(() => ({ uT: { value: 0 }, uA: { value: 0.3 }, uFog: { value: new THREE.Color(FOG) } }), []);
  const sprayU = useMemo(
    () => ({ uT: { value: 0 }, uA: { value: 0.3 }, uO: { value: new THREE.Vector3() } }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rockSeeds = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        x: THREE.MathUtils.randFloat(-5.5, 5.5),
        z: Math.random() * 36,
        s: THREE.MathUtils.randFloat(0.25, 0.75),
        r: Math.random() * 6,
      })),
    [],
  );
  const treeSeeds = useMemo(
    () =>
      Array.from({ length: low ? 70 : 170 }, (_, i) => ({
        side: i % 2 ? 1 : -1,
        x: THREE.MathUtils.randFloat(7.5, 18),
        z: Math.random() * 40,
        h: THREE.MathUtils.randFloat(4, 11),
      })),
    [low],
  );
  const sprayData = useMemo(() => {
    const n = low ? 180 : 500;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i += 3) {
      a[i] = (Math.random() - 0.5) * 2;
      a[i + 1] = Math.random();
      a[i + 2] = Math.random();
    }
    return a;
  }, [low]);

  useFrame((state, dt) => {
    const { p, push } = smooth.current;
    const rapids = smoothstep(p, 0.03, 0.8);
    const amp = lerp(0.28, 0.72, rapids) + push * 0.2;
    const rate = reduced ? 0 : lerp(0.6, 1.5, rapids) + push * 1.6;
    time.current += dt * rate;
    flow.current += dt * rate * 5;
    mist.current += dt * rate;
    uniforms.uT.value = time.current;
    uniforms.uA.value = amp;
    sprayU.uT.value = time.current;
    sprayU.uA.value = amp;

    if (canRef.current) {
      const x = damp(canRef.current.position.x, (mobile ? 0 : 0.6) + state.pointer.x * 1.5, 3, dt);
      const z = mobile ? -2.3 : -0.2;
      const y = wave(x, z, time.current, amp);
      canRef.current.position.set(x, -0.95 + y + 0.74, z);
      // Pitch and roll follow the surface slope.
      const e = 0.15;
      const dz = (wave(x, z + e, time.current, amp) - y) / e;
      const dx = (wave(x + e, z, time.current, amp) - y) / e;
      canRef.current.rotation.x = damp(canRef.current.rotation.x, dz * 0.55 + 0.1, 8, dt);
      canRef.current.rotation.z = damp(canRef.current.rotation.z, -dx * 0.55, 8, dt);
      sprayU.uO.value.set(x, -0.95 + y, z);
    }
    if (rocks.current) {
      rockSeeds.forEach((s, i) => {
        const z = 5 - (36 - (s.z + flow.current) % 36);
        dummy.position.set(s.x, -1.0, z);
        dummy.rotation.set(s.r, s.r * 1.7, s.r * 0.4);
        dummy.scale.set(s.s * 1.3, s.s, s.s);
        dummy.updateMatrix();
        rocks.current!.setMatrixAt(i, dummy.matrix);
      });
      rocks.current.instanceMatrix.needsUpdate = true;
    }
    if (trees.current) {
      treeSeeds.forEach((s, i) => {
        const z = 5 - (40 - (s.z + flow.current * 0.8) % 40);
        dummy.position.set(s.side * s.x, s.h / 2 - 1.2, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(s.h * 0.24, s.h, s.h * 0.24);
        dummy.updateMatrix();
        trees.current!.setMatrixAt(i, dummy.matrix);
      });
      trees.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <fog attach="fog" args={[FOG, 15, 46]} />
      <SkyDome top="#3e8f3a" bottom={FOG} sun={[-0.35, 0.34, -0.85]} />

      <mesh position={[0, -0.95, -15]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <planeGeometry args={[44, 42, low ? 90 : 240, low ? 90 : 240]} />
        <shaderMaterial args={[waterShader]} uniforms={uniforms} />
      </mesh>

      <instancedMesh ref={trees} args={[undefined, undefined, treeSeeds.length]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color="#154d22" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={rocks} args={[undefined, undefined, rockSeeds.length]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#39423a" roughness={0.75} flatShading />
      </instancedMesh>

      {!reduced && (
        <points ref={spray} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[sprayData, 3]} />
          </bufferGeometry>
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={sprayU}
            vertexShader={`
              uniform float uT; uniform float uA; uniform vec3 uO; varying float vLife;
              void main(){
                float life = fract(position.y + uT * (0.5 + position.z * 0.6));
                vLife = life;
                float ang = position.x * 3.14;
                vec3 p = uO + vec3(cos(ang) * (0.28 + life * 1.3 * uA), (life * 2.4 - life * life * 2.2) * uA * 1.5, sin(ang) * (0.28 + life * uA) + life * 0.5);
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_PointSize = (24.0 + position.z * 34.0) / max(-mv.z, 0.5);
                gl_Position = projectionMatrix * mv;
              }`}
            fragmentShader={`
              varying float vLife;
              void main(){
                float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * (1.0 - vLife);
                gl_FragColor = vec4(vec3(1.0, 1.05, 0.95), a * 0.85);
                #include <colorspace_fragment>
              }`}
          />
        </points>
      )}
      <Drift count={low ? 150 : 500} box={[20, 7, 24]} center={[0, 1.6, -9]} dir={[0, -0.05, 1]} color="#f4ffd6" size={22} travel={mist} opacity={0.5} />

      <group ref={canRef}>
        <WorldCan flavor={can.slug} smooth={smooth} reduced={reduced} steer={0} />
      </group>

      <directionalLight intensity={3.2} position={[-3, 5, 2]} color="#fff4d0" />
      <hemisphereLight intensity={0.8} color="#dfffb5" groundColor="#16462a" />
      <Environment files="/hdr/field.hdr" environmentIntensity={0.7} />
      <Fx smooth={smooth} mobile={mobile || !!embedded || !fx} bloom={0.5} threshold={0.95} />
    </>
  );
}
