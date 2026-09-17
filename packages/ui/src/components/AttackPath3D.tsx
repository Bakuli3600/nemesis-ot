import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GraphNode {
  id: string;
  label: string;
  sublabel: string;
  type: 'WALLET' | 'DAPP' | 'CONTRACT' | 'OPERATOR' | 'NFT';
  position: [number, number, number];
  color: string;
  isCompromised?: boolean;
}

const ATTACK_NODES: GraphNode[] = [
  { id: 'wallet', label: 'USER WALLET', sublabel: '0x5534...012', type: 'WALLET', position: [-2.6, 0.4, 0], color: '#3b82f6' },
  { id: 'dapp', label: 'FAKE AIRDROP DAPP', sublabel: 'airdrop-claim.xyz', type: 'DAPP', position: [-1.3, 1.4, 0.5], color: '#f59e0b' },
  { id: 'contract', label: 'REWARD CONTRACT', sublabel: '0x7777...777', type: 'CONTRACT', position: [0, 0.2, -0.2], color: '#ef4444', isCompromised: true },
  { id: 'operator', label: 'DRAINER OPERATOR', sublabel: '0x6666...666', type: 'OPERATOR', position: [1.3, -1.0, 0.4], color: '#dc2626', isCompromised: true },
  { id: 'nft', label: 'NFT COLLECTION', sublabel: 'BAYC #4819', type: 'NFT', position: [2.6, 0.6, 0], color: '#a855f7', isCompromised: true },
];

function NodeMesh({ node, isSelected, onClick }: { node: GraphNode; isSelected: boolean; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && node.isCompromised) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.08;
      meshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={node.position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isSelected ? 1.2 : node.isCompromised ? 0.9 : 0.4}
          roughness={0.2}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.42, 12, 12]} />
        <meshBasicMaterial color={node.color} wireframe transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function ConnectionLine({ start, end, isAttack }: { start: [number, number, number]; end: [number, number, number]; isAttack?: boolean }) {
  const lineObject = useMemo(() => {
    const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: isAttack ? '#ef4444' : '#06b6d4',
      transparent: true,
      opacity: 0.7,
      linewidth: 2,
    });
    return new THREE.Line(geometry, material);
  }, [start, end, isAttack]);

  return <primitive object={lineObject} />;
}

export const AttackPath3D: React.FC<{ isCritical?: boolean }> = ({ isCritical = true }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(ATTACK_NODES[2]);

  return (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-slate-800 bg-[#060911]">
      <Canvas camera={{ position: [0, 0, 5.2], fov: 48 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Attack connections */}
        <ConnectionLine start={ATTACK_NODES[0].position} end={ATTACK_NODES[1].position} />
        <ConnectionLine start={ATTACK_NODES[1].position} end={ATTACK_NODES[2].position} isAttack={isCritical} />
        <ConnectionLine start={ATTACK_NODES[2].position} end={ATTACK_NODES[3].position} isAttack={isCritical} />
        <ConnectionLine start={ATTACK_NODES[3].position} end={ATTACK_NODES[4].position} isAttack={isCritical} />

        {/* Nodes */}
        {ATTACK_NODES.map((node) => (
          <NodeMesh
            key={node.id}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onClick={() => setSelectedNode(node)}
          />
        ))}
      </Canvas>

      {/* Floating HUD Legend */}
      <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800 text-[10px] font-mono text-slate-300">
        <span className="w-2 h-2 rounded-full bg-cyan-400" /> Safe Origin
        <span className="w-2 h-2 rounded-full bg-amber-400" /> Phishing dApp
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Exploited Entity
      </div>

      {/* Selected Node Details Card */}
      {selectedNode && (
        <div className="absolute bottom-2 left-2 right-2 bg-[#0a0f1d]/90 backdrop-blur-lg border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 flex items-center justify-between">
          <div>
            <div className="font-bold tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedNode.color }} />
              {selectedNode.label}
              {selectedNode.isCompromised && (
                <span className="text-[10px] text-red-400 bg-red-950/60 border border-red-800 px-1 rounded">
                  ATTACK VECTOR
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-400">{selectedNode.sublabel}</div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            Click nodes in 3D graph to inspect vector
          </div>
        </div>
      )}
    </div>
  );
};
