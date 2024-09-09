"use client";
import React, { useRef } from 'react'
import { useGLTF, PerspectiveCamera,useTexture } from '@react-three/drei'
import * as THREE from "three";


const flavorTextures = {
  lemonLime: "/labels/blueberry.avif",
  grape: "/labels/bluecan.webp",
  blackCherry: "/labels/watermelon.avif",
  strawberryLemonade: "/labels/original.webp",
  watermelon: "/labels/tropical.avif ",
};

const metalMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.3,
  metalness: 1,
  color: "#bbbbbb",
});
export function SodaCan(props:any) {
  const { nodes, materials }:any = useGLTF('/can-red.glb');
    const labels:any = useTexture(flavorTextures);

  // Fixes upside down labels
  labels.strawberryLemonade.flipY = true;
  labels.blackCherry.flipY = true;
  labels.watermelon.flipY = true;
  labels.grape.flipY = true;
  labels.lemonLime.flipY = true;

  const label:any = labels[props.flavor];
  return (
    <group {...props} position={[0, -1, 0]} dispose={null} scale={.12} rotation={[Math.PI / 2, 0, 0]}>
      {/* <PerspectiveCamera makeDefault={false} fov={25} position={[0, 0, 35]} /> */}
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.bolt.geometry}
          material={materials.m_aluminium}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.bottom.geometry}
          material={materials.m_aluminium}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.can_top.geometry}
          material={materials.m_aluminium}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.hole.geometry}
          material={materials.m_aluminium}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tab.geometry}
          material={materials.m_aluminium}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tab_bevel.geometry}
          material={materials.m_aluminium}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.can_label.geometry}
          material={materials.m_label}
        >
           <meshStandardMaterial roughness={0.15} metalness={0.1} map={label} />
          </mesh>
      </group>
  )
}

useGLTF.preload('/can-red.glb')

