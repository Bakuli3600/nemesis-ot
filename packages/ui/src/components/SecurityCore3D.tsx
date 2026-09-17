import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function RotatingCore({ isAlert }: { isAlert?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.4;
      meshRef.current.rotation.y += delta * 0.6;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.3;
      ringRef.current.rotation.x -= delta * 0.2;
    }
  });

  const coreColor = isAlert ? '#ef4444' : '#06b6d4';
  const ringColor = isAlert ? '#b91c1c' : '#0ea5e9';

  return (
    <group>
      {/* Central polyhedral core */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial
          color={coreColor}
          wireframe
          emissive={coreColor}
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Outer orbit ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.8, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

export const SecurityCore3D: React.FC<{ isAlert?: boolean; size?: number }> = ({
  isAlert = false,
  size = 56,
}) => {
  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[5, 5, 5]} intensity={1.5} />
        <RotatingCore isAlert={isAlert} />
      </Canvas>
    </div>
  );
};
