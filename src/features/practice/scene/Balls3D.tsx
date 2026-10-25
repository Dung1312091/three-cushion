import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CanvasTexture, Mesh, Quaternion } from 'three';
import { positionAt } from '@/engine/simulate';
import type { BallId, SimEvent } from '@/engine/types';
import { sfxBallBall, sfxCushion, sfxStrike } from '@/lib/sfx';
import { CUE_ANIM, playClock, usePractice } from '../store';
import { BALL_BASE, ballTexture } from './ballTexture';

const IDS: BallId[] = ['white', 'yellow', 'red'];
const qa = new Quaternion();
const qb = new Quaternion();
const tmp: [number, number] = [0, 0];

function shadowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

function firstEventAfter(events: SimEvent[], t: number): number {
  let i = 0;
  while (i < events.length && events[i].t <= t) i++;
  return i;
}

/** Impact sounds scaled by the simulated speeds (m/s). */
function soundFor(e: SimEvent, V0: number): void {
  if (e.type === 'strike') sfxStrike(V0 / 6);
  else if (e.type === 'ball-ball') sfxBallBall(e.relSpeed / 2);
  else if (e.type === 'ball-cushion') sfxCushion(e.speedIn / 3.5);
}

/**
 * Advances the playback clock once per frame (runs before the other frame callbacks) and
 * plays the strike / ball / cushion sounds as playback time crosses each event.
 */
export function PlaybackClock() {
  const cursor = useRef<{ shot: unknown; t: number; idx: number }>({ shot: null, t: 0, idx: 0 });
  useFrame((_, dt) => {
    const s = usePractice.getState();
    const c = s.current;
    if (!c) return;
    const cur = cursor.current;
    const events = c.result.events;
    if (cur.shot !== c) {
      cur.shot = c;
      cur.t = playClock.t;
      cur.idx = firstEventAfter(events, playClock.t);
    }
    if (s.playback.playing) {
      playClock.t += Math.min(dt, 0.05) * s.playback.speed;
      const end = c.result.tEnd;
      if (playClock.t > end + 0.6) {
        if (s.playback.loop) playClock.t = -CUE_ANIM;
        else {
          playClock.t = end;
          usePractice.setState({ playback: { ...s.playback, playing: false } });
        }
      }
    }
    const t = playClock.t;
    // Paused, scrubbed or looped back: resync silently instead of replaying a burst of sounds.
    if (!s.playback.playing || t < cur.t) {
      cur.idx = firstEventAfter(events, t);
      cur.t = t;
      return;
    }
    while (cur.idx < events.length && events[cur.idx].t <= t) soundFor(events[cur.idx++], c.strike.V0);
    cur.t = t;
  }, -1);
  return null;
}

/** The three balls: analytic positions + baked orientations during playback. Dragging lives in DragController. */
export function Balls3D() {
  const table = usePractice((s) => s.table);
  const balls = usePractice((s) => s.balls);
  const dragging = usePractice((s) => s.drag?.id);
  const R = table.ballRadius;
  const meshes = useRef<Record<BallId, Mesh | null>>({ white: null, yellow: null, red: null });
  const shadows = useRef<Record<BallId, Mesh | null>>({ white: null, yellow: null, red: null });
  const textures = useMemo(() => Object.fromEntries(IDS.map((id) => [id, ballTexture(...BALL_BASE[id])])) as Record<BallId, CanvasTexture>, []);
  const shadowTex = useMemo(() => shadowTexture(), []);

  useFrame(() => {
    const s = usePractice.getState();
    const c = s.current;
    for (const id of IDS) {
      const m = meshes.current[id];
      if (!m) continue;
      let x = s.balls[id].x;
      let y = s.balls[id].y;
      if (c && c.segs[id]?.length) {
        const t = Math.min(Math.max(playClock.t, 0), c.result.tEnd);
        positionAt(c.segs[id], t, tmp);
        x = tmp[0];
        y = tmp[1];
        const q = c.baked.quats[id];
        if (q) {
          const f = t * c.baked.hz;
          const i = Math.min(Math.floor(f), q.length / 4 - 1);
          const j = Math.min(i + 1, q.length / 4 - 1);
          qa.set(q[4 * i], q[4 * i + 1], q[4 * i + 2], q[4 * i + 3]);
          qb.set(q[4 * j], q[4 * j + 1], q[4 * j + 2], q[4 * j + 3]);
          m.quaternion.copy(qa).slerp(qb, f - i);
        }
      } else {
        m.quaternion.identity();
      }
      m.position.set(x, y, R);
      shadows.current[id]?.position.set(x + 0.006, y - 0.004, 0.0008);
    }
  });

  return (
    <group>
      {IDS.map((id) => (
        <group key={id}>
          <mesh
            ref={(m) => {
              meshes.current[id] = m;
            }}
            position={[balls[id].x, balls[id].y, R]}
          >
            <sphereGeometry args={[R, 48, 32]} />
            <meshStandardMaterial map={textures[id]} roughness={0.22} metalness={0} emissive={dragging === id ? '#335' : '#000'} />
          </mesh>
          <mesh
            ref={(m) => {
              shadows.current[id] = m;
            }}
            position={[balls[id].x, balls[id].y, 0.0008]}
          >
            <planeGeometry args={[R * 3.2, R * 3.2]} />
            <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
