"use client";

// One can, one continuous deformation driven by scroll: whole > crushed > molten > reformed > relabelled.
// All deformation runs in the vertex shader on the real can geometry.
import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { useCanLabel } from "@/components/SodaCan";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { bell, Drift, FRONT, Fx, lerp, NOISE, Scroll, smoothstep, useSmooth } from "@/slices/Product/worlds/shared";

export const BEATS = { slam: [0.2, 0.3], release: [0.34, 0.43], heat: [0.38, 0.5], melt: [0.44, 0.62], form: [0.64, 0.84], print: [0.82, 0.95] };
const at = (p: number, [a, b]: number[]) => smoothstep(p, a, b);
const HEIGHT = 1.29; // World height of the can at scale 0.1.
const BASE = -0.66;

const canVertex = /* glsl */ `
  uniform float uCrush, uMelt, uForm, uT;
  varying vec2 vUv; varying vec3 vView; varying float vH; varying float vF;
  ${NOISE}
  void main(){
    vUv = uv;
    // Model space: can axis runs along -z, 12.9 units tall.
    float h = clamp(-position.z / 12.9, 0.0, 1.0);
    float r = length(position.xy);
    float theta = atan(position.y, position.x);

    // Crush: height collapses, the wall buckles into accordion folds and dents.
    float dent = vnoise(vec2(theta * 2.4 + 3.0, h * 9.0)) - 0.5;
    float fold = sin(h * 30.0 + theta * 2.0) * 0.5 + sin(h * 61.0 - theta * 3.0) * 0.25;
    float rr = r * (1.0 + uCrush * (0.34 * sin(h * 3.14159) + 0.16 * fold + 0.5 * dent));
    float th = theta + uCrush * (0.5 * h + dent * 0.3);
    vec3 crushed = vec3(cos(th) * rr, sin(th) * rr, -h * (1.0 - uCrush * 0.82) * 12.9);

    // Melt: slumps into a wobbling pool on the plate.
    vec3 center = vec3(0.0, 0.0, -1.1);
    vec3 d = crushed - center + vec3(0.001);
    vec3 dir = normalize(d);
    float wob = 1.0 + 0.14 * sin(dir.x * 6.0 + uT * 1.7) * sin(dir.y * 7.0 - uT * 1.3);
    vec3 pool = center + dir * 4.1 * wob * vec3(1.15, 1.15, 0.36);
    vec3 p = mix(crushed, pool, uMelt);

    // Reform: metal climbs out of the pool from the base upward.
    float f = smoothstep(h * 0.8, h * 0.8 + 0.2, uForm);
    vF = f;
    vH = h;
    p = mix(p, position, f);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const canFragment = /* glsl */ `
  uniform sampler2D map;
  uniform float uIsLabel, uHeat, uForm, uPrint, uCrush, uMelt, uT;
  varying vec2 vUv; varying vec3 vView; varying float vH; varying float vF;
  ${NOISE}
  void main(){
    vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
    vec3 v = normalize(-vView);
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    float lit = 0.32 + 0.9 * max(dot(n, normalize(vec3(-0.5, 0.65, 0.6))), 0.0);

    vec3 silver = vec3(0.62, 0.66, 0.72) * lit + pow(1.0 - ndv, 3.0) * 0.5;
    vec3 base = silver;
    if (uIsLabel > 0.5) {
      // Fresh label: exact colours. Shading only appears once the metal is actually deformed.
      float roll = 1.0 - 0.62 * pow(1.0 - ndv, 2.6);
      vec3 label = texture2D(map, vUv).rgb;
      vec3 shown = mix(label * roll, label * lit, smoothstep(0.0, 0.25, uCrush));
      float speck = hash(floor(vUv * vec2(620.0, 500.0)));
      float printed = step(vH + (speck - 0.5) * 0.05, uPrint);
      base = mix(silver, shown, printed);
      // Print head: a hot line travelling up the fresh can.
      float head = smoothstep(0.035, 0.0, abs(vH - uPrint)) * step(uPrint, 0.995) * step(0.005, uPrint) * vF;
      base += vec3(3.0, 2.4, 0.9) * head;
    }

    // Molten metal: flowing, overbright so it blooms. Cools as it climbs into the new can.
    float flow = fbm(vec2(vUv.x * 7.0 + uT * 0.12, vH * 7.0 - uT * 0.22));
    // Dark crust over bright veins, so the surface visibly flows rather than clipping to a flat glow.
    float veins = smoothstep(0.38, 0.62, flow);
    vec3 molten = mix(vec3(0.55, 0.07, 0.01), vec3(1.9, 0.72, 0.1), veins);
    molten = mix(molten, vec3(2.5, 1.6, 0.5), smoothstep(0.62, 0.78, flow));
    float heat = uHeat * (1.0 - vF);
    // Scorch first, then glow, so the label burns off rather than cross-fading.
    base = mix(base, base * 0.18, smoothstep(0.0, 0.35, heat));
    base = mix(base, molten, smoothstep(0.25, 0.8, heat));

    gl_FragColor = vec4(base, 1.0);
    #include <colorspace_fragment>
  }`;

function Sparks({ count, burst }: { count: number; burst: { value: number } }) {
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      a[i] = Math.random() * Math.PI * 2;
      a[i + 1] = Math.random();
      a[i + 2] = Math.random();
    }
    return a;
  }, [count]);
  const uniforms = useMemo(() => ({ uB: burst }), [burst]);
  return (
    <points frustumCulled={false} position={[0, BASE + 0.25, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uB; varying float vA;
          void main(){
            float life = clamp(uB * (0.7 + position.y * 0.8), 0.0, 1.0);
            float speed = 1.1 + position.z * 2.6;
            vec3 p = vec3(cos(position.x), 0.0, sin(position.x)) * speed * life;
            p.y = (0.55 + position.y * 1.5) * life - 2.6 * life * life;
            vA = step(0.001, uB) * (1.0 - life);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (16.0 + position.z * 28.0) * (1.0 - life * 0.5) / max(-mv.z, 0.5);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          varying float vA;
          void main(){
            float a = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
            gl_FragColor = vec4(vec3(3.6, 1.8, 0.45), a * vA);
            #include <colorspace_fragment>
          }`}
      />
    </points>
  );
}

function Scene({ scroll, mobile, reduced }: { scroll: Scroll; mobile: boolean; reduced: boolean }) {
  const smooth = useSmooth(scroll);
  const { nodes }: any = useGLTF("/can-red.glb");
  const label = useCanLabel("energy-drink");
  const { camera } = useThree();
  const can = useRef<THREE.Group>(null);
  const press = useRef<THREE.Group>(null);
  const embers = useRef<THREE.Group>(null);
  const glow = useMemo(() => ({ value: 0 }), []);
  const emberTravel = useRef(0);
  const burst = useMemo(() => ({ value: 0 }), []);

  // Shared by every part of the can, so they deform as one object.
  const shared = useMemo(
    () => ({
      uCrush: { value: 0 },
      uMelt: { value: 0 },
      uForm: { value: 0 },
      uHeat: { value: 0 },
      uPrint: { value: 1 },
      uT: { value: 0 },
      map: { value: label },
    }),
    [label],
  );
  const labelUniforms = useMemo(() => ({ ...shared, uIsLabel: { value: 1 } }), [shared]);
  const metalUniforms = useMemo(() => ({ ...shared, uIsLabel: { value: 0 } }), [shared]);

  const baseX = mobile ? 0 : 0.62;
  const baseZ = mobile ? -1.2 : 1.05;

  useFrame((state, dt) => {
    const { p } = smooth.current;
    const t = state.clock.elapsedTime;
    shared.uT.value = t;

    // Ballistic press: slow approach, then a hard stop with no bounce.
    const slam = at(p, BEATS.slam);
    const crush = slam * slam * slam;
    shared.uCrush.value = crush;
    shared.uHeat.value = at(p, BEATS.heat);
    const melt = at(p, BEATS.melt);
    shared.uMelt.value = melt;
    const form = at(p, BEATS.form);
    shared.uForm.value = form;
    // Old label is burnt off under the heat; the swap to a blank happens while it is fully molten.
    shared.uPrint.value = p < 0.6 ? 1 : at(p, BEATS.print);
    burst.value = p < 0.285 ? 0 : Math.min(1, (p - 0.285) / 0.09);

    if (can.current) {
      // Whole rotation lands exactly on front-facing as the print finishes.
      const turn = reduced ? 0 : Math.sin(t * 0.4) * 0.12 * (1 - at(p, [0.16, 0.2]));
      can.current.rotation.y = FRONT + turn + (1 - at(p, [0.66, 0.92])) * at(p, [0.62, 0.66]) * -Math.PI * 2;
    }
    if (press.current) {
      const canTop = BASE + HEIGHT * (1 - crush * 0.82);
      const raised = 2.4;
      const closed = lerp(raised, canTop + 0.14, at(p, [0.14, 0.2]));
      press.current.position.y = lerp(closed, raised, at(p, BEATS.release));
      press.current.visible = p > 0.1 && p < 0.46;
    }
    glow.value = shared.uHeat.value * (1 - form);
    if (embers.current) embers.current.visible = shared.uHeat.value > 0.05 && form < 0.9;
    emberTravel.current += dt * (reduced ? 0 : 0.5);

    const hit = bell(p, 0.285, 0.29, 0.3, 0.33) * 0.03;
    camera.position.set(state.pointer.x * 0.1 + Math.sin(t * 61) * hit, state.pointer.y * 0.06 + Math.cos(t * 53) * hit, 5);
    camera.lookAt(0, 0, 0);
  });

  const parts = ["bolt", "bottom", "can_top", "hole", "tab", "tab_bevel"];

  return (
    <>
      <color attach="background" args={["#0B0E14"]} />
      <group position={[baseX, 0, baseZ]}>
        <group ref={can} position-y={BASE}>
          <group scale={0.1} rotation={[Math.PI / 2, 0, 0]}>
            {parts.map((name) => (
              <mesh key={name} geometry={nodes[name].geometry} frustumCulled={false}>
                <shaderMaterial uniforms={metalUniforms} vertexShader={canVertex} fragmentShader={canFragment} side={THREE.DoubleSide} />
              </mesh>
            ))}
            <mesh geometry={nodes.can_label.geometry} frustumCulled={false}>
              <shaderMaterial uniforms={labelUniforms} vertexShader={canVertex} fragmentShader={canFragment} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>

        {/* Hydraulic press */}
        <group ref={press} visible={false}>
          <mesh position-y={0.09}>
            <boxGeometry args={[1.5, 0.18, 1.1]} />
            <meshStandardMaterial color="#2a3442" metalness={0.8} roughness={0.42} />
          </mesh>
          <mesh position={[0, 0.012, 0.556]}>
            <boxGeometry args={[1.52, 0.022, 0.012]} />
            <meshBasicMaterial color={[1.5, 0.08, 0.22]} toneMapped={false} />
          </mesh>
          <mesh position-y={1.4}>
            <cylinderGeometry args={[0.09, 0.09, 2.4, 20]} />
            <meshStandardMaterial color="#8d99a8" metalness={1} roughness={0.25} />
          </mesh>
        </group>

        {/* Plate the can stands on, glows under the molten metal */}
        <mesh position-y={BASE - 0.05}>
          <boxGeometry args={[1.9, 0.1, 1.4]} />
          <meshStandardMaterial color="#2a3442" metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position-y={BASE + 0.004} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.6, 2.6]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={{ uGlow: glow }}
            vertexShader={`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
            fragmentShader={`
              uniform float uGlow; varying vec2 vP;
              void main(){
                float a = smoothstep(1.25, 0.1, length(vP));
                gl_FragColor = vec4(vec3(1.0, 0.34, 0.05), a * a * uGlow * 0.8);
                #include <colorspace_fragment>
              }`}
          />
        </mesh>

        <Sparks count={mobile ? 120 : 360} burst={burst} />
        <group ref={embers} visible={false}>
          <Drift count={mobile ? 80 : 240} box={[2.6, 3, 2]} center={[0, 0.3, 0]} dir={[0.05, 1, 0]} color="#ff9a3c" size={20} travel={emberTravel} opacity={0.9} />
        </group>
      </group>

      <directionalLight intensity={2.6} position={[-2, 3, 4]} />
      <hemisphereLight intensity={0.6} color="#a5b4c4" groundColor="#0B0E14" />
      {/* No tone mapping: the label stays true, and only the overbright molten metal crosses the bloom threshold. */}
      <Fx smooth={smooth} mobile={mobile} bloom={0.55} threshold={1.05} tone={false} />
    </>
  );
}

export default function Stage({ scroll, active, reduced }: { scroll: Scroll; active: boolean; reduced: boolean }) {
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
        <Scene scroll={scroll} mobile={!isDesktop} reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}
