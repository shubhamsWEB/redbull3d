"use client";

// Brushed-aluminium feathered wings, built from instanced feathers so they can fold, fan and flap.
import { MutableRefObject, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const lerp = THREE.MathUtils.lerp;

const feather = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.03);
  s.bezierCurveTo(0.3, -0.125, 0.78, -0.115, 1, 0);
  s.bezierCurveTo(0.78, 0.07, 0.3, 0.075, 0, 0.03);
  s.closePath();
  const g = new THREE.ShapeGeometry(s, 12);
  // Bow the normals across the vane so metal catches light like a curved blade, not a flat card.
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const n = new THREE.Vector3(pos.getX(i) * 0.3, pos.getY(i) * 7, 1).normalize();
    nor.setXYZ(i, n.x, n.y, n.z);
    uv.setXY(i, pos.getX(i), pos.getY(i) / 0.25 + 0.5);
  }
  return g;
})();

// Shaft and barbs, drawn once. Darkens the metal so each feather reads individually.
function featherTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const x = c.getContext("2d")!;
  const base = x.createLinearGradient(0, 0, 512, 0);
  base.addColorStop(0, "#5d6875");
  base.addColorStop(0.55, "#c7d0da");
  base.addColorStop(1, "#ffffff");
  x.fillStyle = base;
  x.fillRect(0, 0, 512, 128);
  x.strokeStyle = "rgba(10,14,20,.34)";
  x.lineWidth = 1.2;
  for (let i = -60; i < 560; i += 7) {
    for (const dir of [-1, 1]) {
      x.beginPath();
      x.moveTo(i, 64);
      x.lineTo(i + 46, 64 + dir * 64);
      x.stroke();
    }
  }
  x.strokeStyle = "rgba(10,14,20,.8)";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(0, 64);
  x.lineTo(512, 64);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const ROWS = [
  { n: 20, len: [0.62, 1.22], width: 1.35, z: -0.04, spread: [-112, -6] },
  { n: 18, len: [0.42, 0.7], width: 1.15, z: 0, spread: [-108, -20] },
  { n: 15, len: [0.2, 0.36], width: 1, z: 0.04, spread: [-100, -28] },
];

type WingState = MutableRefObject<{ open: number; flap: number; warm: boolean }>;

function Wing({ state, side }: { state: WingState; side: 1 | -1 }) {
  const root = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const total = ROWS.reduce((a, r) => a + r.n, 0);
  const map = useMemo(featherTexture, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!mesh.current || !root.current) return;
    const { open, flap } = state.current;
    root.current.visible = open > 0.001 || state.current.warm;
    const beat = Math.sin(flap);
    root.current.rotation.y = lerp(1.1, 0.1 + beat * 0.62, open);
    root.current.rotation.z = beat * 0.16 * open;
    let i = 0;
    ROWS.forEach((row) => {
      for (let k = 0; k < row.n; k++, i++) {
        const t = k / (row.n - 1); // 0 at the shoulder, 1 at the wing tip
        const armX = 0.05 + t * 0.8 * open;
        const armY = Math.sin(t * Math.PI * 0.55) * 0.3 * open;
        // Feathers lag the beat towards the tip, so the wing ripples instead of hinging.
        const ripple = Math.sin(flap - t * 1.5) * 0.14 * open * t;
        const deg = lerp(-96, lerp(row.spread[0], row.spread[1], t), open);
        dummy.position.set(armX, armY, row.z + t * 0.02);
        dummy.rotation.set(ripple + 0.42, 0, THREE.MathUtils.degToRad(deg) + ripple * 0.6);
        const len = lerp(row.len[0], row.len[1], Math.pow(t, 0.8)) * lerp(0.4, 1, open);
        dummy.scale.set(len, row.width * lerp(0.6, 1, open), 1);
        dummy.updateMatrix();
        mesh.current!.setMatrixAt(i, dummy.matrix);
      }
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[side * 0.16, 0.28, -0.26]} scale={[side, 1, 1]}>
      <group ref={root} visible={false}>
        <instancedMesh ref={mesh} args={[feather, undefined, total]} frustumCulled={false}>
          <meshStandardMaterial map={map} metalness={0.92} roughness={0.34} side={THREE.DoubleSide} envMapIntensity={1.15} />
        </instancedMesh>
      </group>
    </group>
  );
}

export default function Wings({ state }: { state: WingState }) {
  return (
    <>
      <Wing state={state} side={1} />
      <Wing state={state} side={-1} />
    </>
  );
}
