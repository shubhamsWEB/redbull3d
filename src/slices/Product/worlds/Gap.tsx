"use client";

// Pink Edition: the can rides a skateboard, hits the kicker and kickflips the gap, with slow-mo at the apex.
// Every position is a pure function of scroll, so the trick scrubs forwards and backwards.
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import { SodaCan } from "@/components/SodaCan";
import { bell, FRONT, Fx, lerp, SkyDome, smoothstep, useSmooth, WorldProps } from "./shared";

const FLOOR = -0.9;
const LIP = { x: -1.1, y: FLOOR + 0.62 };
const LAND = { x: 3.1, y: FLOOR };
const RIDE = 0.14; // Height of the deck above the surface.

function trickAt(p: number) {
  if (p < 0.32) {
    const u = smoothstep(p, 0, 0.32);
    return { x: lerp(-9, -2.6, u), y: FLOOR, pitch: 0, air: 0 };
  }
  if (p < 0.4) {
    const u = (p - 0.32) / 0.08;
    return { x: lerp(-2.6, LIP.x, u), y: lerp(FLOOR, LIP.y, u * u), pitch: lerp(0, 0.45, u), air: 0 };
  }
  if (p < 0.76) {
    // Slow-mo: time crawls through the apex, then snaps back for the landing.
    const raw = (p - 0.4) / 0.36;
    const u = raw < 0.5 ? 0.5 * (1 - Math.pow(1 - raw * 2, 2.4)) : 0.5 + 0.5 * Math.pow(raw * 2 - 1, 2.4);
    return {
      x: lerp(LIP.x, LAND.x, u),
      y: lerp(LIP.y, LAND.y, u) + Math.sin(u * Math.PI) * 1.65,
      pitch: lerp(0.45, -0.2, u),
      air: u,
    };
  }
  const u = smoothstep(p, 0.76, 1);
  return { x: lerp(LAND.x, 8.2, u), y: FLOOR, pitch: lerp(-0.2, 0, smoothstep(p, 0.76, 0.8)), air: 1 };
}

const wedge = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(1.0, 0.1, 1.5, 0.62);
  s.lineTo(1.5, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -1.2);
  return g;
})();

export default function Gap({ can, scroll, reduced, mobile, embedded, lite, fx = true }: WorldProps) {
  const low = mobile || !!lite; // Geometry and particle density.
  const smooth = useSmooth(scroll);
  const { camera } = useThree();
  const rig = useRef<THREE.Group>(null);
  const board = useRef<THREE.Group>(null);
  const canGroup = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const petals = useRef<THREE.InstancedMesh>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: low ? 90 : 260 }, () => ({
        x: THREE.MathUtils.randFloat(-12, 13),
        y: Math.random() * 7,
        z: THREE.MathUtils.randFloat(-5, 2.8),
        rate: THREE.MathUtils.randFloat(0.25, 0.65),
        r: Math.random() * 6,
        s: THREE.MathUtils.randFloat(0.022, 0.05),
      })),
    [low],
  );

  useFrame((state, dt) => {
    const { p } = smooth.current;
    const t = state.clock.elapsedTime;
    const k = trickAt(p);
    const apex = bell(p, 0.42, 0.53, 0.63, 0.74);
    const flip = smoothstep(k.air, 0.12, 0.88);

    if (rig.current) {
      rig.current.position.set(k.x, k.y + RIDE, 0);
      rig.current.rotation.z = k.pitch;
    }
    if (board.current) {
      // Kickflip round the deck axis; the board drops away from the can at the apex.
      board.current.rotation.x = flip * Math.PI * 2;
      board.current.position.y = -apex * 0.42;
    }
    if (canGroup.current) {
      const land = bell(p, 0.755, 0.77, 0.79, 0.84);
      canGroup.current.position.y = 1.03 + apex * 0.1 - land * 0.16;
      canGroup.current.rotation.y = FRONT + flip * Math.PI * 2 + (reduced ? 0 : Math.sin(t * 0.7) * 0.08);
      canGroup.current.scale.set(1 + land * 0.13, 1 - land * 0.16, 1 + land * 0.13);
    }
    if (wheels.current) wheels.current.children.forEach((w) => (w.rotation.z = -k.x * 8));

    // Tracking shot; swings round the can and pushes in for the apex. Copy stays clear on desktop.
    const orbit = -0.32 + apex * 0.95;
    const dist = lerp(6, 4.4, apex);
    const lead = mobile ? 0 : 0.72 * (1 - apex * 0.5);
    camera.position.set(k.x + Math.sin(orbit) * dist - lead, lerp(0.15, k.y + 0.35, 0.5 + apex * 0.5), Math.cos(orbit) * dist);
    look.set(k.x - lead, k.y + 0.8, 0);
    camera.lookAt(look);

    if (petals.current && !reduced) {
      seeds.forEach((s, i) => {
        const y = 7 - ((s.y + t * s.rate) % 7) - 1;
        dummy.position.set(s.x + Math.sin(t * s.rate + s.r) * 0.45, y, s.z);
        dummy.rotation.set(t * s.rate * 1.8 + s.r, t * s.rate + s.r, s.r);
        dummy.scale.setScalar(s.s);
        dummy.updateMatrix();
        petals.current!.setMatrixAt(i, dummy.matrix);
      });
      petals.current.instanceMatrix.needsUpdate = true;
    }
  });

  const city = useMemo(
    () => Array.from({ length: 34 }, (_, i) => ({ x: -18 + i * 1.3, w: 0.8 + ((i * 37) % 10) / 9, h: 1.3 + ((i * 53) % 12) * 0.44 })),
    [],
  );

  return (
    <>
      <fog attach="fog" args={["#ee9d84", 9, 32]} />
      <SkyDome top="#3c1544" bottom="#ffb987" sun={[0.2, 0.17, -0.97]} />

      {city.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 + FLOOR - 1, -13]}>
          <boxGeometry args={[b.w, b.h, 1]} />
          <meshBasicMaterial color="#54223f" fog={false} />
        </mesh>
      ))}

      {/* Run-up, kicker, gap, landing */}
      <mesh position={[-8.1, FLOOR - 1.5, 0]} receiveShadow>
        <boxGeometry args={[14, 3, 2.4]} />
        <meshStandardMaterial color="#c9a3a0" roughness={0.9} />
      </mesh>
      <mesh geometry={wedge} position={[-2.6, FLOOR, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#e8bdb3" roughness={0.7} />
      </mesh>
      <mesh position={[8.1, FLOOR - 1.5, 0]} receiveShadow>
        <boxGeometry args={[14, 3, 2.4]} />
        <meshStandardMaterial color="#c9a3a0" roughness={0.9} />
      </mesh>
      <mesh position={[0, FLOOR - 3.6, 0]}>
        <boxGeometry args={[60, 0.4, 40]} />
        <meshStandardMaterial color="#6b324a" roughness={1} />
      </mesh>

      <group ref={rig}>
        <group ref={canGroup} position-y={1.03}>
          <SodaCan flavor={can.slug} />
        </group>
        <group ref={board}>
          <RoundedBox args={[1.25, 0.05, 0.42]} radius={0.024} castShadow>
            <meshStandardMaterial color="#1f1020" roughness={0.65} />
          </RoundedBox>
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[1.05, 0.015, 0.3]} />
            <meshStandardMaterial color="#e0648f" roughness={0.5} />
          </mesh>
          <group ref={wheels}>
            {[-0.42, 0.42].flatMap((x) =>
              [-0.18, 0.18].map((z) => (
                <mesh key={`${x}${z}`} position={[x, -0.1, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.052, 0.052, 0.05, 16]} />
                  <meshStandardMaterial color="#fff2e4" roughness={0.35} />
                </mesh>
              )),
            )}
          </group>
        </group>
      </group>

      <instancedMesh ref={petals} args={[undefined, undefined, seeds.length]} frustumCulled={false}>
        <circleGeometry args={[1, 6]} />
        <meshStandardMaterial color="#ffc9dc" side={THREE.DoubleSide} roughness={0.6} emissive="#a7446b" emissiveIntensity={0.3} />
      </instancedMesh>

      <directionalLight
        castShadow={!low}
        intensity={4.2}
        position={[-3, 5, 5]}
        color="#ffdcc4"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <hemisphereLight intensity={0.85} color="#ffcfb5" groundColor="#6b3250" />
      <Environment files="/hdr/lobby.hdr" environmentIntensity={0.65} />
      <Fx smooth={smooth} mobile={mobile || !!embedded || !fx} bloom={0.75} threshold={0.82} />
    </>
  );
}
