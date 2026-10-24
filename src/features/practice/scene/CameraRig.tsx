import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { OrthographicCamera as OCam, PerspectiveCamera as PCam, Vector3 } from 'three';
import { usePractice } from '../store';
import { activeStrike } from './Cue3D';

const MARGIN = 0.25;
const target = new Vector3();
const pos = new Vector3();

/**
 * Two cameras (§13.2): top-down orthographic (default for placing — fits the table
 * into the area not covered by the panels, long axis vertical in portrait) and the
 * shooter's perspective view behind the cue ball. "free" adds OrbitControls.
 */
export function CameraRig() {
  const mode = usePractice((s) => s.camera);
  const drag = usePractice((s) => s.drag);
  const ortho = useRef<OCam>(null);
  const persp = useRef<PCam>(null);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  // In demand mode the very first frame can render before makeDefault swaps cameras; ask for a few more.
  useEffect(() => {
    let n = 0;
    let id = 0;
    const kick = () => {
      invalidate();
      if (++n < 4) id = requestAnimationFrame(kick);
    };
    kick();
    return () => cancelAnimationFrame(id);
  }, [mode, size.width, size.height, invalidate]);

  useFrame((_, dt) => {
    const s = usePractice.getState();
    const { L, W } = s.table;
    const { top, bottom, right } = s.insets;
    const visW = Math.max(50, size.width - right);
    const visH = Math.max(50, size.height - top - bottom);
    const portrait = visH > visW * 1.15;
    if (ortho.current) {
      const cam = ortho.current;      const ext = portrait ? [W + 2 * MARGIN, L + 2 * MARGIN] : [L + 2 * MARGIN, W + 2 * MARGIN];
      const zoom = Math.min(visW / ext[0], visH / ext[1]);
      // World up on screen: physics +y (landscape) is world −z; in portrait physics +x (world +x) points up.
      const up = portrait ? new Vector3(1, 0, 0) : new Vector3(0, 0, -1);
      const rightV = portrait ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
      const dxPx = -right / 2;
      const dyPx = (top - bottom) / 2;
      target.set(0, 0, 0).addScaledVector(rightV, -dxPx / zoom).addScaledVector(up, dyPx / zoom);
      cam.up.copy(up);
      cam.position.set(target.x, 5, target.z);
      cam.lookAt(target);
      if (Math.abs(cam.zoom - zoom) > 1e-6) {
        cam.zoom = zoom;
        cam.updateProjectionMatrix();
      }
    }
    if (mode === 'shooter' && persp.current) {
      const strike = activeStrike();
      const c = s.balls[s.cue];
      const phi = strike?.phi ?? 0;
      const dx = Math.cos(phi);
      const dy = Math.sin(phi);
      // Physics → world: (x − L/2, z, W/2 − y)
      pos.set(c.x - dx * 0.85 - L / 2, 0.34, W / 2 - (c.y - dy * 0.85));
      target.set(c.x + dx * 1.3 - L / 2, 0, W / 2 - (c.y + dy * 1.3));
      const k = 1 - Math.exp(-dt * 9);
      const cam = persp.current;
      cam.position.lerp(pos, k);
      cam.up.set(0, 1, 0);
      cam.lookAt(target);
      if (cam.position.distanceTo(pos) > 0.002) invalidate();
    }
  });

  return (
    <>
      <OrthographicCamera ref={ortho} makeDefault={mode === 'top'} position={[0, 5, 0]} near={0.1} far={20} zoom={200} />
      <PerspectiveCamera ref={persp} makeDefault={mode !== 'top'} position={[0, 2.2, 2.4]} fov={50} near={0.02} far={30} />
      {mode === 'free' && <OrbitControls makeDefault enabled={!drag} target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={0.4} maxDistance={6} />}
    </>
  );
}
