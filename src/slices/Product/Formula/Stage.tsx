"use client";

// Empty glass can on a dark stage. Each ingredient's molecule assembles, collapses into a stream and fills the can.
import { MutableRefObject, Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { SodaCan } from "@/components/SodaCan";
import { Can } from "@/data/cans";
import { Molecule } from "@/data/molecules";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { damp, FRONT, Fx, smoothstep, useSmooth } from "@/slices/Product/worlds/shared";

export type Beat = { step: number; local: number; p: number };

const ATOM = { C: { color: "#A5B4C4", r: 0.38 }, N: { color: "#2f7de0", r: 0.4 }, O: { color: "#E21B4D", r: 0.4 }, S: { color: "#FFD100", r: 0.52 }, K: { color: "#9b6bff", r: 0.58 } };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const expoOut = (v: number) => (v >= 1 ? 1 : 1 - Math.pow(2, -10 * v));
const UP = new THREE.Vector3(0, 1, 0);

type Layout = { canX: number; canBase: number; canScale: number; canZ: number; molX: number; molY: number; molScale: number };

/* ---------- One molecule: atoms pop in, hold and turn, then collapse along an arc into the can ---------- */
function MoleculeView({ mol, index, beat, layout, mouth }: { mol: Molecule; index: number; beat: MutableRefObject<Beat>; layout: Layout; mouth: THREE.Vector3 }) {
  const atoms = useRef<THREE.InstancedMesh>(null);
  const bonds = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rods = useMemo(() => mol.bonds.flatMap(([a, b, order]) => (order === 2 ? [{ a, b, off: 0.1 }, { a, b, off: -0.1 }] : [{ a, b, off: 0 }])), [mol]);
  // Keep the structure centred whatever its shape.
  const centred = useMemo(() => {
    const c = new THREE.Vector3();
    mol.atoms.forEach((a) => c.add(new THREE.Vector3(...a.p)));
    c.divideScalar(mol.atoms.length);
    return mol.atoms.map((a) => new THREE.Vector3(...a.p).sub(c));
  }, [mol]);
  const live = useMemo(() => mol.atoms.map(() => ({ p: new THREE.Vector3(), s: 0 })), [mol]);
  const a0 = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const warm = useRef(4);

  useLayoutEffect(() => {
    mol.atoms.forEach((a, i) => atoms.current?.setColorAt(i, new THREE.Color(ATOM[a.el].color)));
    if (atoms.current?.instanceColor) atoms.current.instanceColor.needsUpdate = true;
  }, [mol]);

  useFrame((state) => {
    if (!group.current || !atoms.current || !bonds.current) return;
    const on = beat.current.step === index;
    group.current.visible = on || warm.current > 0;
    if (warm.current > 0) warm.current--;
    if (!on) return;
    const t = beat.current.local;
    const n = mol.atoms.length;
    const scale = layout.molScale;
    euler.set(0.32 + state.pointer.y * 0.2, -0.5 + t * 1.5 + state.pointer.x * 0.35, 0);

    centred.forEach((c, i) => {
      const grow = expoOut(clamp01((t - (i / n) * 0.2) / 0.09));
      const fall = clamp01((t - 0.7 - (i / n) * 0.1) / 0.17);
      const e = fall * fall;
      a0.copy(c).applyEuler(euler).multiplyScalar(scale);
      a0.x += layout.molX;
      a0.y += layout.molY;
      a0.lerp(mouth, e);
      a0.y += Math.sin(e * Math.PI) * 0.38;
      live[i].p.copy(a0);
      live[i].s = grow * (1 - e * 0.85);
      dummy.position.copy(a0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(ATOM[mol.atoms[i].el].r * scale * live[i].s);
      dummy.updateMatrix();
      atoms.current!.setMatrixAt(i, dummy.matrix);
    });
    atoms.current.instanceMatrix.needsUpdate = true;

    rods.forEach((r, i) => {
      const from = live[r.a];
      const to = live[r.b];
      dir.copy(to.p).sub(from.p);
      const len = dir.length();
      // Bonds snap in after their atoms and vanish first when the molecule breaks up.
      const show = clamp01((Math.min(from.s, to.s) - 0.7) / 0.3) * (1 - clamp01((t - 0.7) / 0.04));
      dummy.position.copy(from.p).addScaledVector(dir, 0.5);
      if (r.off) {
        side.crossVectors(dir, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(r.off * scale);
        dummy.position.add(side);
      }
      dummy.quaternion.setFromUnitVectors(UP, dir.normalize());
      dummy.scale.set(0.085 * scale * show, len * (show > 0 ? 1 : 0), 0.085 * scale * show);
      dummy.updateMatrix();
      bonds.current!.setMatrixAt(i, dummy.matrix);
    });
    bonds.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={bonds} args={[undefined, undefined, rods.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshStandardMaterial color="#d8e0ea" metalness={0.65} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={atoms} args={[undefined, undefined, mol.atoms.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 28, 20]} />
        <meshStandardMaterial metalness={0.25} roughness={0.22} envMapIntensity={1.25} />
      </instancedMesh>
    </group>
  );
}

/* ---------- Stream from molecule to can, runs as the molecule collapses ---------- */
function Pour({ from, mouth, color, count, beat }: { from: THREE.Vector3; mouth: THREE.Vector3; color: string; count: number; beat: MutableRefObject<Beat> }) {
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      a[i] = Math.random();
      a[i + 1] = Math.random();
      a[i + 2] = Math.random();
    }
    return a;
  }, [count]);
  const uniforms = useMemo(
    () => ({ uT: { value: 0 }, uOn: { value: 0 }, uA: { value: from }, uB: { value: mouth }, uColor: { value: new THREE.Color(color) } }),
    [from, mouth, color],
  );
  useFrame((state) => {
    uniforms.uT.value = state.clock.elapsedTime;
    const l = beat.current.local;
    uniforms.uOn.value = beat.current.step < 0 ? 0 : smoothstep(l, 0.68, 0.74) * (1 - smoothstep(l, 0.93, 1));
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
          uniform float uT, uOn; uniform vec3 uA, uB; varying float vA;
          void main(){
            float k = fract(position.x + uT * (0.7 + position.y * 0.6));
            vec3 p = mix(uA, uB, k * k);
            p.y += sin(k * 3.14159) * 0.38;
            float spread = (1.0 - k) * 0.42 + 0.018;
            p.xz += (position.yz - 0.5) * spread;
            p.y += (position.z - 0.5) * spread * 0.7;
            vA = uOn * smoothstep(0.0, 0.1, k);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (12.0 + position.y * 20.0) * uOn / max(-mv.z, 0.5);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          uniform vec3 uColor; varying float vA;
          void main(){
            float a = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
            gl_FragColor = vec4(uColor * 1.5, a * vA);
            #include <colorspace_fragment>
          }`}
      />
    </points>
  );
}

/* ---------- The can: glass ghost, rising liquid, lid hovering until the fill is complete ---------- */
function GlassCan({ can, layout, level, reveal, lidOpen }: { can: Can; layout: Layout; level: { value: number }; reveal: { value: number }; lidOpen: { value: number } }) {
  const { nodes, materials }: any = useGLTF("/can-red.glb");
  const lid = useRef<THREE.Group>(null);
  const s = layout.canScale;
  const height = 11.9 * s;
  const radius = 2.34 * s;
  const liquidU = useMemo(
    () => ({ uLevel: level, uT: { value: 0 }, uA: { value: new THREE.Color(can.liquid[0]) }, uB: { value: new THREE.Color(can.liquid[1]) } }),
    [can, level],
  );
  const surface = useRef<THREE.Mesh>(null);
  const fizzGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const a = new Float32Array(150 * 3);
    for (let i = 0; i < a.length; i += 3) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius * 0.92;
      a[i] = Math.cos(ang) * r;
      a[i + 1] = Math.random();
      a[i + 2] = Math.sin(ang) * r;
    }
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    return g;
  }, [radius]);
  useFrame((state) => {
    liquidU.uT.value = state.clock.elapsedTime;
    if (lid.current) lid.current.position.z = -lidOpen.value * 2.6;
    if (surface.current) {
      surface.current.position.y = 0.6 * s + level.value * height;
      surface.current.visible = level.value > 0.005 && reveal.value < 1;
    }
  });
  const ghostU = useMemo(() => ({ uFade: reveal }), [reveal]);

  return (
    <group position={[layout.canX, layout.canBase, layout.canZ]}>
      {/* Liquid column, clipped at the current level */}
      <mesh position-y={0.6 * s + height / 2}>
        <cylinderGeometry args={[radius, radius, height, 48, 1, true]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          uniforms={liquidU}
          vertexShader={`varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
          fragmentShader={`
            uniform float uLevel, uT; uniform vec3 uA, uB; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            void main(){
              float wave = sin(vUv.x * 28.0 + uT * 2.0) * 0.004;
              if (vUv.y > uLevel + wave) discard;
              float f = clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
              vec3 c = mix(uA, uB, vUv.y * 0.7 + pow(f, 2.0) * 0.45);
              gl_FragColor = vec4(c, 0.86);
              #include <colorspace_fragment>
            }`}
        />
      </mesh>
      <mesh ref={surface} rotation-x={-Math.PI / 2} visible={false}>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial color={can.liquid[1]} transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <points geometry={fizzGeo} frustumCulled={false} position-y={0.6 * s}>
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={{ uLevel: level, uT: liquidU.uT, uH: { value: height } }}
          vertexShader={`
            uniform float uLevel, uT, uH; varying float vA;
            void main(){
              float y = fract(position.y + uT * (0.05 + position.y * 0.07)) * uLevel;
              vA = step(0.01, uLevel) * smoothstep(0.0, 0.02, y) * (1.0 - smoothstep(uLevel - 0.03, uLevel, y));
              vec4 mv = modelViewMatrix * vec4(position.x, y * uH, position.z, 1.0);
              gl_PointSize = (7.0 + fract(position.x * 91.0) * 14.0) / max(-mv.z, 0.5);
              gl_Position = projectionMatrix * mv;
            }`}
          fragmentShader={`
            varying float vA;
            void main(){
              float d = length(gl_PointCoord - 0.5);
              float ring = smoothstep(0.5, 0.42, d) - smoothstep(0.34, 0.22, d) * 0.75;
              gl_FragColor = vec4(1.0, 1.0, 0.95, ring * vA * 0.8);
              #include <colorspace_fragment>
            }`}
        />
      </points>

      <group scale={s} rotation={[Math.PI / 2, 0, 0]}>
        {/* Glass wall: only the silhouette catches light, so it reads as a transparent can */}
        <mesh geometry={nodes.can_label.geometry} renderOrder={2}>
          <shaderMaterial
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            uniforms={ghostU}
            vertexShader={`varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
            fragmentShader={`
              uniform float uFade; varying vec3 vN; varying vec3 vV;
              void main(){
                float f = clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
                gl_FragColor = vec4(vec3(0.82, 0.88, 0.96), (pow(f, 2.6) * 0.75 + 0.035) * (1.0 - uFade));
                #include <colorspace_fragment>
              }`}
          />
        </mesh>
        <mesh geometry={nodes.bottom.geometry} material={materials.m_aluminium} />
        <group ref={lid}>
          {["bolt", "can_top", "hole", "tab", "tab_bevel"].map((name) => (
            <mesh key={name} geometry={nodes[name].geometry} material={materials.m_aluminium} />
          ))}
        </group>
      </group>

      {/* The finished can materialises around the liquid once sealed */}
      {/* SodaCan sits at y -1 and scale 0.12 internally; undo both so its base lands on the glass can's base. */}
      <group position-y={s / 0.12} scale={s / 0.12} rotation-y={FRONT}>
        <SodaCan flavor={can.slug} trueColor reveal={reveal} />
      </group>
    </group>
  );
}

function Scene({ can, molecules, beat, fillEnd, mobile, reduced }: { can: Can; molecules: Molecule[]; beat: MutableRefObject<Beat>; fillEnd: number; mobile: boolean; reduced: boolean }) {
  const scroll = useRef({ progress: 0, velocity: 0 });
  const smooth = useSmooth(scroll as any);
  const layout = useMemo<Layout>(
    () =>
      mobile
        ? { canX: 0, canBase: -1.0, canScale: 0.056, canZ: 0, molX: 0, molY: 0.08, molScale: 0.095 }
        : { canX: 1.45, canBase: -0.94, canScale: 0.122, canZ: 0, molX: 0.2, molY: 0.02, molScale: 0.27 },
    [mobile],
  );
  const level = useMemo(() => ({ value: 0 }), []);
  const reveal = useMemo(() => ({ value: 0 }), []);
  const lidOpen = useMemo(() => ({ value: 1 }), []);
  const mouth = useMemo(() => new THREE.Vector3(layout.canX, layout.canBase + 12.9 * layout.canScale + 0.02, layout.canZ), [layout]);
  const pourFrom = useMemo(() => new THREE.Vector3(layout.molX, layout.molY, 0), [layout]);

  useFrame((state, dt) => {
    const { step, local, p } = beat.current;
    scroll.current.progress = p;
    // Each ingredient adds its share; the can is full when the last has landed.
    const done = step < 0 ? 0 : step + smoothstep(local, 0.74, 1);
    const target = Math.min(1, done / molecules.length) * 0.93;
    level.value = damp(level.value, p >= fillEnd ? 0.93 : target, 5, dt);
    lidOpen.value = 1 - smoothstep(p, fillEnd, fillEnd + 0.05);
    reveal.value = smoothstep(p, fillEnd + 0.04, fillEnd + 0.13);
    if (!reduced) state.camera.position.x = damp(state.camera.position.x, state.pointer.x * 0.08, 3, dt);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <color attach="background" args={["#0B0E14"]} />
      {molecules.map((m, i) => (
        <MoleculeView key={m.name} mol={m} index={i} beat={beat} layout={layout} mouth={mouth} />
      ))}
      <Pour from={pourFrom} mouth={mouth} color={can.liquid[1]} count={mobile ? 150 : 420} beat={beat} />
      <GlassCan can={can} layout={layout} level={level} reveal={reveal} lidOpen={lidOpen} />
      <directionalLight intensity={2.4} position={[-2, 3, 4]} />
      <pointLight intensity={8} position={[layout.canX, -0.2, 1.2]} color={can.liquid[1]} decay={1.4} />
      <Environment files="/hdr/lobby.hdr" environmentIntensity={0.8} />
      {/* No tone mapping: the finished label stays true and only bright highlights bloom. */}
      <Fx smooth={smooth} mobile={mobile} bloom={0.45} threshold={1.05} tone={false} />
    </>
  );
}

export default function Stage(props: { can: Can; molecules: Molecule[]; beat: MutableRefObject<Beat>; fillEnd: number; active: boolean; reduced: boolean }) {
  const { active, ...rest } = props;
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  const [warm, setWarm] = useState(false);
  return (
    <Canvas
      frameloop={active || !warm ? "always" : "never"}
      dpr={[1, isDesktop ? 1.5 : 1.25]}
      camera={{ fov: 32, position: [0, 0, 5], near: 0.1, far: 60 }}
      gl={{ antialias: !isDesktop, powerPreference: "high-performance" }}
      onCreated={() => setTimeout(() => setWarm(true), 1500)}
    >
      <Suspense fallback={null}>
        <Scene {...rest} mobile={!isDesktop} />
      </Suspense>
    </Canvas>
  );
}
