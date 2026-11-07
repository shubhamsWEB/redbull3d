"use client";

// Original: fall from orbit. Procedural planet, atmosphere, re-entry glow, then clouds.
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Cloud, Clouds, Environment } from "@react-three/drei";
import * as THREE from "three";

import { bell, Drift, Fx, lerp, smoothstep, useSmooth, WorldCan, WorldProps } from "./shared";

const earthShader = {
  vertexShader: `
    varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
    void main(){
      vLocal = normalize(position);
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
    float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float n3(vec3 p){
      vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * n3(p); p = p * 2.02 + 7.0; a *= 0.5; } return v; }
    void main(){
      float land = smoothstep(0.5, 0.56, fbm(vLocal * 4.0));
      vec3 surface = mix(vec3(0.015, 0.09, 0.3), mix(vec3(0.1, 0.27, 0.08), vec3(0.42, 0.34, 0.2), fbm(vLocal * 11.0)), land);
      float cloud = smoothstep(0.5, 0.74, fbm(vLocal * 7.0 + vec3(uTime * 0.01, 0.0, 0.0)));
      surface = mix(surface, vec3(1.0), cloud * 0.9);
      float light = smoothstep(-0.25, 0.75, dot(vNormal, normalize(vec3(-0.45, 0.8, 0.45))));
      float rim = pow(clamp(1.0 - dot(vNormal, vView), 0.0, 1.0), 2.6);
      vec3 col = surface * light + vec3(0.3, 0.62, 1.0) * rim * (light + 0.1) * 1.8;
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
};

const haloShader = {
  transparent: true,
  depthWrite: false,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  vertexShader: `
    varying vec3 vNormal; varying vec3 vView;
    void main(){
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vNormal; varying vec3 vView;
    void main(){
      float a = pow(max(dot(vNormal, vView), 0.0), 5.0);
      gl_FragColor = vec4(vec3(0.3, 0.65, 1.0) * 1.7, a);
      #include <colorspace_fragment>
    }`,
};

const glowShader = {
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: earthShader.vertexShader,
  fragmentShader: `
    uniform float uHeat; uniform float uTime;
    varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
    void main(){
      float f = clamp(1.0 - dot(vNormal, vView), 0.0, 1.0);
      float rim = pow(f, 2.2) * (1.0 - pow(f, 2.4)) * 1.6; // Fades at the silhouette too, so no hard capsule edge.
      float flow = 0.72 + 0.28 * sin(vLocal.y * 22.0 + uTime * 14.0);
      vec3 col = mix(vec3(1.0, 0.28, 0.03), vec3(1.0, 0.85, 0.45), rim);
      gl_FragColor = vec4(col * 2.4, rim * flow * uHeat);
      #include <colorspace_fragment>
    }`,
};

export default function Stratosphere({ can, scroll, reduced, mobile, embedded, lite, fx = true }: WorldProps) {
  const low = mobile || !!lite; // Geometry and particle density.
  const smooth = useSmooth(scroll);
  const canRef = useRef<THREE.Group>(null);
  const planet = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Group>(null);
  const starMat = useRef<THREE.ShaderMaterial>(null);
  const travel = useRef(0);
  const { scene } = useThree();
  const sky = useMemo(() => ({ space: new THREE.Color("#02030a"), day: new THREE.Color("#4aa5e8"), now: new THREE.Color() }), []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const glowUniforms = useMemo(() => ({ uTime: { value: 0 }, uHeat: { value: 0 } }), []);

  useFrame((state, dt) => {
    const { p, push } = smooth.current;
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    glowUniforms.uTime.value = t;
    travel.current += dt * (reduced ? 0 : 0.1 + push * 5);

    scene.background = sky.now.lerpColors(sky.space, sky.day, smoothstep(p, 0.42, 0.8));

    if (planet.current) {
      // Limb sits low in frame, then the planet swallows the view as you fall.
      const s = 1 + 7 * p * p;
      planet.current.scale.setScalar(s);
      planet.current.position.y = lerp(-13.7, -11 * s + 1.4 * p, smoothstep(p, 0, 1));
      planet.current.position.z = -6 - 10 * (s - 1);
      planet.current.rotation.y = t * 0.012 + p * 1.2;
      planet.current.visible = p < 0.82;
    }
    if (canRef.current) {
      const arrive = smoothstep(p, 0, 0.22);
      canRef.current.position.set(
        (mobile ? 0 : 0.72) + state.pointer.x * 0.2 + Math.sin(t * 47) * push * 0.012,
        lerp(mobile ? -0.2 : 0.42, mobile ? -0.05 : 0.04, arrive) + state.pointer.y * 0.12 + Math.cos(t * 53) * push * 0.012,
        lerp(-2.4, mobile ? -2.3 : -0.3, arrive) + push * 0.25,
      );
    }
    glowUniforms.uHeat.value = bell(p, 0.14, 0.26, 0.42, 0.52);
    if (clouds.current) clouds.current.position.y = lerp(-9, 8, smoothstep(p, 0.4, 1));
    if (starMat.current) starMat.current.uniforms.uOpacity.value = 1 - smoothstep(p, 0.15, 0.42);
  });

  return (
    <>
      <group ref={planet} position={[0, -13.7, -6]}>
        <mesh>
          <sphereGeometry args={[11, 96, 64]} />
          <shaderMaterial args={[earthShader]} uniforms={uniforms} />
        </mesh>
        <mesh scale={1.06}>
          <sphereGeometry args={[11, 64, 32]} />
          <shaderMaterial args={[haloShader]} />
        </mesh>
      </group>

      <Stars materialRef={starMat} count={low ? 900 : 2400} />
      <Drift
        count={low ? 200 : 500}
        box={[9, 7, 8]}
        center={[0, 0, -2]}
        dir={[0, 3.6, 0]}
        color="#bfe4ff"
        size={26}
        travel={travel}
        opacity={0.7}
      />

      <group ref={clouds} position-y={-9}>
        <Clouds material={THREE.MeshBasicMaterial} limit={70} texture="/cloud.png">
          <Cloud segments={20} bounds={[7, 1.2, 2]} volume={5} color="#eef6fc" opacity={0.75} position={[-2.2, 0, -3]} />
          <Cloud segments={20} bounds={[7, 1.2, 2]} volume={5} color="#d9ebf7" opacity={0.75} position={[2.5, -3, -2]} />
        </Clouds>
      </group>

      <WorldCan ref={canRef} flavor={can.slug} smooth={smooth} reduced={reduced} />
      <HeatShell parent={canRef} uniforms={glowUniforms} />

      <directionalLight intensity={3.2} position={[-2.5, 3, 3]} />
      <Environment files="/hdr/lobby.hdr" environmentIntensity={0.7} />
      <Fx smooth={smooth} mobile={mobile || !!embedded || !fx} bloom={0.85} threshold={0.78} />
    </>
  );
}

function HeatShell({ parent, uniforms }: { parent: React.RefObject<THREE.Group>; uniforms: any }) {
  const shell = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (shell.current && parent.current) {
      shell.current.position.copy(parent.current.position);
      shell.current.visible = uniforms.uHeat.value > 0.01;
    }
  });
  return (
    <mesh ref={shell} visible={false}>
      <capsuleGeometry args={[0.42, 1.25, 8, 32]} />
      <shaderMaterial args={[glowShader]} uniforms={uniforms} />
    </mesh>
  );
}

function Stars({ materialRef, count }: { materialRef: React.RefObject<THREE.ShaderMaterial>; count: number }) {
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      a[i] = THREE.MathUtils.randFloatSpread(70);
      a[i + 1] = THREE.MathUtils.randFloatSpread(44);
      a[i + 2] = -30 - Math.random() * 20;
    }
    return a;
  }, [count]);
  const uniforms = useMemo(() => ({ uOpacity: { value: 1 } }), []);
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`void main(){ gl_PointSize = 1.0 + fract(position.x * 7.3) * 2.2; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`uniform float uOpacity; void main(){ gl_FragColor = vec4(vec3(1.2), uOpacity * smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5)));
          #include <colorspace_fragment>
        }`}
      />
    </points>
  );
}
