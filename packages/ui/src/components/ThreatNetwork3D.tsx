import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ClusterParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 140;

  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 5;
    positions[i + 1] = (Math.random() - 0.5) * 4;
    positions[i + 2] = (Math.random() - 0.5) * 3;
  }

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.15;
      pointsRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#06b6d4"
        transparent
        opacity={0.8}
      />
    </points>
  );
}

export const ThreatNetwork3D: React.FC<{ height?: number }> = ({ height = 180 }) => {
  return (
    <div style={{ height }} className="w-full relative rounded-lg overflow-hidden border border-slate-800 bg-[#050811]">
      <Canvas camera={{ position: [0, 0, 3.8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <ClusterParticles />
      </Canvas>
      <div className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-400/80 bg-black/50 px-2 py-0.5 rounded">
        THREAT INTELLIGENCE CLUSTER MIRROR
      </div>
    </div>
  );
};
