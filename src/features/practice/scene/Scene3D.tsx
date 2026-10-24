import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { sceneApi, usePractice } from '../store';
import { Balls3D, PlaybackClock } from './Balls3D';
import { CameraRig } from './CameraRig';
import { Cue3D } from './Cue3D';
import { DragController } from './DragController';
import { Table3D } from './Table3D';
import { Trails } from './Trails';

function InvalidateBridge() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    sceneApi.invalidate = () => invalidate();
    return () => {
      sceneApi.invalidate = () => {};
    };
  }, [invalidate]);
  return null;
}

/** Practice-room scene. The physics frame is wrapped once; children use physics coordinates directly (§4.3). */
export function Scene3D() {
  const table = usePractice((s) => s.table);
  const playing = usePractice((s) => s.playback.playing);
  const dragging = usePractice((s) => !!s.drag);
  const camera = usePractice((s) => s.camera);
  const active = playing || dragging || camera !== 'top';
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={active ? 'always' : 'demand'}
      shadows={false}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
      aria-label="Bàn bida 3D"
    >
      <InvalidateBridge />
      <PerformanceMonitor>
        <AdaptiveDpr pixelated={false} />
      </PerformanceMonitor>
      <color attach="background" args={['#0e1a2b']} />
      <hemisphereLight args={['#ffffff', '#16304f', 1.1]} />
      <directionalLight position={[0.8, 4, 1.2]} intensity={1.7} />
      <directionalLight position={[-2, 2, -1.5]} intensity={0.35} />
      <CameraRig />
      <PlaybackClock />
      <DragController />
      <group rotation-x={-Math.PI / 2} position={[-table.L / 2, 0, table.W / 2]}>
        {/* Only balls and their paths on the cloth — no ghosts, ellipses, fans or markers. */}
        <Table3D />
        <Trails />
        <Balls3D />
        <Cue3D />
      </group>
    </Canvas>
  );
}
