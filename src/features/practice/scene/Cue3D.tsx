import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { contactPoint, cueFrame } from '@/engine/resolve/cue';
import type { CueStrike } from '@/engine/types';
import { playClock, usePractice } from '../store';

const CUE_LEN = 1.42;
const Y = new Vector3(0, 1, 0);
const dir = new Vector3();

/** Visible strike: which cue stroke is "active" right now. */
export function activeStrike(): CueStrike | undefined {
  const s = usePractice.getState();
  if (s.current) return s.current.strike;
  if (s.tab === 'manual') return s.manualStrike;
  return s.options.find((o) => o.id === s.selectedId)?.strike;
}

/** Gap between tip and ball over the lead-in: back 15 cm (0.6 s), forward (0.15 s), follow-through 10 cm. */
function tipGap(t: number): number {
  if (t < -0.15) {
    const k = Math.min(1, (t + 0.75) / 0.6);
    return 0.02 + 0.13 * (1 - (1 - k) * (1 - k));
  }
  if (t < 0) return 0.15 * (-t / 0.15);
  return -Math.min(0.1, t * 0.6);
}

/** Tapered cue (12 mm tip, 30 mm butt) placed so the tip meets rQ along −ĉ, at elevation θ (§13.2). */
export function Cue3D() {
  const mesh = useRef<Mesh>(null);
  const R = usePractice((s) => s.table.ballRadius);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const s = usePractice.getState();
    const strike = activeStrike();
    if (!strike || !s.layers.cue) {
      m.visible = false;
      return;
    }
    const playing = !!s.current;
    const t = playing ? playClock.t : -0.75;
    const mat = m.material as MeshStandardMaterial;
    const fade = playing && t > 0 ? Math.max(0, 1 - (t - 0.15) / 0.35) : 1;
    m.visible = fade > 0.02;
    mat.opacity = fade;
    const { c } = cueFrame(strike.phi, strike.theta);
    const rq = contactPoint(strike, R);
    const ball = s.balls[s.cue];
    const gap = playing ? tipGap(t) : 0.025;
    dir.set(c[0], c[1], c[2]);
    // Tip point: contact point on the ball, pulled back along −ĉ by the gap.
    const tx = ball.x + rq[0] - c[0] * gap;
    const ty = ball.y + rq[1] - c[1] * gap;
    const tz = R + rq[2] - c[2] * gap;
    m.position.set(tx - (c[0] * CUE_LEN) / 2, ty - (c[1] * CUE_LEN) / 2, tz - (c[2] * CUE_LEN) / 2);
    m.quaternion.setFromUnitVectors(Y, dir);
  });
  return (
    <mesh ref={mesh} visible={false}>
      <cylinderGeometry args={[0.006, 0.015, CUE_LEN, 20]} />
      <meshStandardMaterial color="#d9c3a0" roughness={0.45} transparent />
    </mesh>
  );
}
