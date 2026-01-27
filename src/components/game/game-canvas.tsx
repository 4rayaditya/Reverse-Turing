"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { PerspectiveCamera, OrbitControls, Environment, Text, Stars, Float, MeshDistortMaterial } from "@react-three/drei"
import { useRef, useMemo } from "react"
import * as THREE from "three"
import { Mesh, PointLight } from "three"

// Enhanced 3D Poker Chip with glow and animation
const PokerChip = ({ position, color, animated = false }: { position: [number, number, number], color: string, animated?: boolean }) => {
    const meshRef = useRef<Mesh>(null!)
    
    useFrame((state) => {
        if (animated && meshRef.current) {
            meshRef.current.rotation.y += 0.02
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.05
        }
    })
    
    return (
        <Float speed={animated ? 2 : 0} rotationIntensity={animated ? 0.5 : 0}>
            <mesh ref={meshRef} position={position} castShadow receiveShadow>
                <cylinderGeometry args={[0.25, 0.25, 0.08, 32]} />
                <meshStandardMaterial 
                    color={color} 
                    metalness={0.8} 
                    roughness={0.1} 
                    emissive={color}
                    emissiveIntensity={0.3}
                />
            </mesh>
            {/* Glow ring */}
            <mesh position={position} scale={1.2}>
                <torusGeometry args={[0.25, 0.02, 16, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.4} />
            </mesh>
        </Float>
    )
}

// Enhanced Player Avatar with glow and floating animation
const PlayerAvatar = ({ position, name, isActive }: { position: [number, number, number], name: string, isActive: boolean }) => {
    const meshRef = useRef<Mesh>(null!)
    const rimRef = useRef<Mesh>(null!)
    const lightRef = useRef<PointLight>(null!)

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + (isActive ? Math.sin(state.clock.elapsedTime * 2) * 0.15 : 0)
        }
        if (rimRef.current) {
            const mat = rimRef.current.material as THREE.MeshStandardMaterial
            mat.emissiveIntensity = isActive ? 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.3 : 0.2
        }
        if (lightRef.current) {
            lightRef.current.intensity = isActive ? 1.5 + Math.abs(Math.sin(state.clock.elapsedTime * 3)) * 0.8 : 0.4
        }
    })

    return (
        <group position={position}>
            <Float speed={isActive ? 2 : 0.5} rotationIntensity={0.2} floatIntensity={isActive ? 0.3 : 0.05}>
                <mesh ref={meshRef} castShadow receiveShadow>
                    <sphereGeometry args={[0.5, 32, 32]} />
                    <meshStandardMaterial 
                        color={isActive ? "#00ff88" : "#4a5568"} 
                        emissive={isActive ? "#00ff88" : "#2d3748"} 
                        emissiveIntensity={isActive ? 0.8 : 0.2}
                        metalness={0.6}
                        roughness={0.2}
                    />
                </mesh>
            </Float>

            {isActive && (
                <>
                    <mesh ref={rimRef} scale={[1.4, 0.6, 1.4]} position={[0, 0.02, 0]}>
                        <torusGeometry args={[0.9, 0.12, 16, 64]} />
                        <meshStandardMaterial color="#00ff88" emissive="#00ff88" transparent opacity={0.25} />
                    </mesh>
                    <pointLight ref={lightRef} position={[0, 1.2, 0]} color="#00ff88" intensity={1.5} distance={6} />
                </>
            )}

            {/* Nameplate */}
            <Text position={[0, -0.9, 0]} fontSize={0.25} color={isActive ? "#00ff88" : "#ffffff"} anchorX="center" anchorY="middle">
                {name}
            </Text>
        </group>
    )
}

const Table = () => {
    return (
        <group>
            {/* Main table surface - rich green felt */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                <circleGeometry args={[5, 64]} />
                <meshStandardMaterial 
                    color="#0a5f38" 
                    roughness={0.85} 
                    metalness={0.1}
                />
            </mesh>
            
            {/* Table base/support */}
            <mesh position={[0, -0.4, 0]}>
                <cylinderGeometry args={[4.5, 4.8, 1, 32]} />
                <meshStandardMaterial 
                    color="#2d1810" 
                    roughness={0.5} 
                    metalness={0.3}
                />
            </mesh>
            
            {/* Outer wooden rim */}
            <mesh position={[0, 0.05, 0]}>
                <torusGeometry args={[5, 0.2, 16, 64]} />
                <meshStandardMaterial 
                    color="#3d2817" 
                    roughness={0.6} 
                    metalness={0.2}
                />
            </mesh>
            
            {/* Inner betting rail - darker felt */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}>
                <ringGeometry args={[3, 4.2, 64]} />
                <meshStandardMaterial 
                    color="#064d2e" 
                    roughness={0.92}
                />
            </mesh>
            
            {/* Gold decorative outer ring */}
            <mesh position={[0, 0.15, 0]}>
                <torusGeometry args={[4.9, 0.05, 16, 64]} />
                <meshStandardMaterial 
                    color="#d4af37" 
                    roughness={0.3} 
                    metalness={0.9}
                    emissive="#8b6914"
                    emissiveIntensity={0.3}
                />
            </mesh>
            
            {/* Gold decorative inner ring */}
            <mesh position={[0, 0.15, 0]}>
                <torusGeometry args={[3.1, 0.04, 16, 64]} />
                <meshStandardMaterial 
                    color="#d4af37" 
                    roughness={0.3} 
                    metalness={0.9}
                    emissive="#8b6914"
                    emissiveIntensity={0.3}
                />
            </mesh>
            
            {/* Felt texture lines radiating from center */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <mesh 
                    key={angle}
                    rotation={[-Math.PI / 2, 0, (angle * Math.PI) / 180]} 
                    position={[0, 0.11, 0]}
                >
                    <planeGeometry args={[0.04, 8]} />
                    <meshStandardMaterial 
                        color="#085733" 
                        transparent
                        opacity={0.25}
                    />
                </mesh>
            ))}
            
            {/* Poker chip stacks at cardinal positions */}
            {[0, 90, 180, 270].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const colors = ["#dc2626", "#2563eb", "#16a34a", "#eab308"];
                return (
                    <group key={i} position={[Math.cos(rad) * 4.3, 0.3, Math.sin(rad) * 4.3]}>
                        {[0, 1, 2, 3].map((stackIdx) => (
                            <mesh key={stackIdx} position={[0, stackIdx * 0.12, 0]} castShadow>
                                <cylinderGeometry args={[0.25, 0.25, 0.1, 32]} />
                                <meshStandardMaterial 
                                    color={colors[i]}
                                    roughness={0.4}
                                    metalness={0.6}
                                />
                            </mesh>
                        ))}
                    </group>
                );
            })}
            
            {/* Card deck in center */}
            <group position={[0, 0.25, 0]}>
                {[0, 1, 2, 3, 4].map((cardIdx) => (
                    <group key={cardIdx} position={[0, cardIdx * 0.02, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[1.2, 0.02, 1.7]} />
                            <meshStandardMaterial 
                                color="#dc2626" 
                                roughness={0.4}
                                metalness={0.3}
                            />
                        </mesh>
                        {/* Card back design */}
                        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[1.0, 1.5]} />
                            <meshStandardMaterial 
                                color="#1e40af"
                                emissive="#1e3a8a"
                                emissiveIntensity={0.2}
                            />
                        </mesh>
                    </group>
                ))}
            </group>
            
            {/* Dealer button */}
            <group position={[-3.5, 0.22, 0]}>
                <mesh castShadow>
                    <cylinderGeometry args={[0.3, 0.3, 0.08, 32]} />
                    <meshStandardMaterial 
                        color="#ffffff"
                        roughness={0.3}
                        metalness={0.7}
                    />
                </mesh>
                <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.25, 32]} />
                    <meshStandardMaterial 
                        color="#000000"
                        emissive="#111111"
                    />
                </mesh>
            </group>
        </group>
    )
}

export function GameCanvas({ gameState }: { gameState: any }) {
    // Generate player positions around the table
    const playerPositions = useMemo(() => {
        const positions = []
        const radius = 6.5
        const count = 12
        for(let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2
            positions.push([Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius] as [number, number, number])
        }
        return positions
    }, [])
    
    const players = gameState?.players || []

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <PerspectiveCamera makeDefault position={[0, 12, 15]} fov={50} />
      <OrbitControls 
        maxPolarAngle={Math.PI / 2.2} 
        minDistance={8} 
        maxDistance={25}
        enableDamping
        dampingFactor={0.05}
      />
      
      {/* Enhanced Lighting Setup */}
      <ambientLight intensity={0.4} color="#f0ead6" />
      
      {/* Main overhead spotlight - casino style */}
      <spotLight 
        position={[0, 20, 0]} 
        angle={0.5} 
        penumbra={0.8} 
        intensity={2.5} 
        castShadow 
        color="#fef3c7"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      
      {/* Accent lights for atmosphere */}
      <pointLight position={[8, 8, 8]} intensity={0.8} color="#8b5cf6" distance={20} />
      <pointLight position={[-8, 8, -8]} intensity={0.8} color="#ec4899" distance={20} />
      <pointLight position={[8, 8, -8]} intensity={0.6} color="#3b82f6" distance={20} />
      <pointLight position={[-8, 8, 8]} intensity={0.6} color="#10b981" distance={20} />
      
      {/* Rim lighting from below for dramatic effect */}
      <pointLight position={[0, -2, 0]} intensity={0.5} color="#d4af37" distance={15} />
      <pointLight position={[-5, 10, -5]} intensity={1} color="#8b5cf6" />
      
      {/* Starfield background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <Environment preset="night" />

      {/* Game Objects */}
      <Table />
      
      {players.map((p: any, i: number) => (
          <PlayerAvatar 
            key={p.userId || i} 
            position={playerPositions[i % 12]} 
                        name={p.name || `Player ${i+1}`} 
                        isActive={gameState?.currentRound?.answerer === p.userId}
          />
      ))}
      
      {/* Central chip stack with animation */}
      <PokerChip position={[0, 0.1, 0]} color="#ffd700" animated />
      <PokerChip position={[0, 0.19, 0]} color="#ffd700" animated />
      <PokerChip position={[0, 0.28, 0]} color="#ff4444" animated />
      <PokerChip position={[0.3, 0.1, 0.3]} color="#4444ff" />
      <PokerChip position={[-0.3, 0.1, -0.3]} color="#44ff44" />

      {/* Floor with gradient */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.8} metalness={0.2} />
      </mesh>
      
      {/* Atmospheric fog */}
      <fog attach="fog" args={['#0a0a0a', 15, 40]} />
    </Canvas>
  )
}
