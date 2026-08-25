import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useRef, useMemo } from "react";
import * as THREE from "three";

/* ── Wireframe Globe with Pulsing Crisis Hotspots ── */
function PulsingHotspots({ positions }) {
  const ref = useRef();
  const baseSize = 0.065;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Pulsing size and opacity
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
    ref.current.material.size = baseSize + pulse * 0.04;
    ref.current.material.opacity = 0.5 + pulse * 0.45;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ff5f6d"
        size={baseSize}
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}

/* ── Expanding ring pulse per hotspot ── */
function HotspotRings({ positions }) {
  const rings = useMemo(() => {
    const arr = [];
    for (let i = 0; i < positions.length; i += 3) {
      arr.push([positions[i], positions[i + 1], positions[i + 2]]);
    }
    return arr;
  }, [positions]);

  return rings.map((pos, i) => (
    <HotspotRing key={i} position={pos} delay={i * 0.4} />
  ));
}

function HotspotRing({ position, delay }) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.elapsedTime + delay) % 2.5) / 2.5;
    const scale = 1 + t * 2.5;
    ref.current.scale.set(scale, scale, scale);
    ref.current.material.opacity = 0.4 * (1 - t);
  });

  return (
    <mesh ref={ref} position={position}>
      <ringGeometry args={[0.03, 0.045, 16]} />
      <meshBasicMaterial
        color="#ff5f6d"
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Globe() {
  const groupRef = useRef();

  const gridDots = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 280; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0;
      arr.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    return new Float32Array(arr);
  }, []);

  const hotspots = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 14; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.04;
      arr.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    return new Float32Array(arr);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.07;
      groupRef.current.rotation.x = Math.sin(t * 0.15) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[3.2, 0.2, -1.5]}>
      {/* Wireframe shell */}
      <mesh>
        <icosahedronGeometry args={[2, 8]} />
        <meshBasicMaterial
          color="#1a3d6b"
          wireframe
          transparent
          opacity={0.18}
        />
      </mesh>

      {/* Solid core */}
      <mesh>
        <sphereGeometry args={[1.92, 32, 32]} />
        <meshStandardMaterial
          color="#04091a"
          transparent
          opacity={0.55}
          roughness={1}
        />
      </mesh>

      {/* Surface grid dots */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={gridDots.length / 3}
            array={gridDots}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#4a9cd4"
          size={0.018}
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </points>

      {/* Pulsing crisis hotspot markers */}
      <PulsingHotspots positions={hotspots} />
      <HotspotRings positions={hotspots} />

      {/* Orbital ring 1 */}
      <mesh rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[2.45, 0.008, 8, 120]} />
        <meshBasicMaterial color="#45b5ff" transparent opacity={0.35} />
      </mesh>

      {/* Orbital ring 2 */}
      <mesh rotation={[Math.PI / 1.7, Math.PI / 5, 0]}>
        <torusGeometry args={[2.65, 0.006, 8, 120]} />
        <meshBasicMaterial color="#7c7bff" transparent opacity={0.22} />
      </mesh>

      {/* Atmosphere halo */}
      <mesh>
        <sphereGeometry args={[2.25, 32, 32]} />
        <meshBasicMaterial
          color="#1a70b5"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

/* ── Ambient floating energy orbs ── */
function FloatingOrbs() {
  const orbs = useMemo(() => {
    const palette = ["#45b5ff", "#7c7bff", "#0fccae", "#ff5f6d", "#f59e0b"];
    return Array.from({ length: 7 }, () => ({
      pos: [
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 5 - 2,
      ],
      size: Math.random() * 0.1 + 0.04,
      spd: Math.random() * 0.6 + 0.25,
      col: palette[Math.floor(Math.random() * palette.length)],
    }));
  }, []);

  return orbs.map((o, i) => (
    <Float key={i} speed={o.spd} floatIntensity={2.2} rotationIntensity={0}>
      <mesh position={o.pos}>
        <sphereGeometry args={[o.size, 12, 12]} />
        <meshBasicMaterial color={o.col} transparent opacity={0.45} />
      </mesh>
    </Float>
  ));
}

/* ── Pulsing radar ring around globe ── */
function RadarPulse() {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const scale = 1 + (t % 3) * 0.15;
    ref.current.scale.set(scale, scale, scale);
    ref.current.material.opacity = 0.25 - ((t % 3) / 3) * 0.25;
  });

  return (
    <mesh ref={ref} position={[3.2, 0.2, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.0, 2.06, 64]} />
      <meshBasicMaterial
        color="#45b5ff"
        transparent
        opacity={0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ── Main Scene ── */
export default function HeroScene() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#050a17"]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[10, 8, 8]} intensity={0.3} color="#45b5ff" />

        <Stars
          radius={80}
          depth={50}
          count={3500}
          factor={3}
          saturation={0.2}
          fade
          speed={0.35}
        />

        <Globe />
        <FloatingOrbs />
        <RadarPulse />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.12}
            luminanceSmoothing={0.9}
            intensity={1.3}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
