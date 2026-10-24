import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CanvasTexture, Group, Mesh, Quaternion, Vector3 } from 'three';
import { positionAt } from '@/engine/simulate';
import type { BallId } from '@/engine/types';
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

/** Advances the playback clock once per frame (runs before the other frame callbacks). */
export function PlaybackClock() {
  useFrame((_, dt) => {
    const s = usePractice.getState();
    const c = s.current;
    if (!c || !s.playback.playing) return;
    playClock.t += Math.min(dt, 0.05) * s.playback.speed;
    const end = c.result.tEnd;
    if (playClock.t > end + 0.6) {
      if (s.playback.loop) playClock.t = -CUE_ANIM;
      else {
        playClock.t = end;
        usePractice.setState({ playback: { ...s.playback, playing: false } });
      }
    }
  }, -1);
  return null;
}

/** The three balls: analytic positions + baked orientations during playback, draggable when placing (§13.3). */
export function Balls3D({ groupRef }: { groupRef: React.RefObject<Group | null> }) {
  const table = usePractice((s) => s.table);
  const balls = usePractice((s) => s.balls);
  const tab = usePractice((s) => s.tab);
  const dragging = usePractice((s) => s.drag?.id);
  const R = table.ballRadius;
  const meshes = useRef<Record<BallId, Mesh | null>>({ white: null, yellow: null, red: null });
  const shadows = useRef<Record<BallId, Mesh | null>>({ white: null, yellow: null, red: null });
  const textures = useMemo(() => Object.fromEntries(IDS.map((id) => [id, ballTexture(...BALL_BASE[id])])) as Record<BallId, CanvasTexture>, []);
  const shadowTex = useMemo(() => shadowTexture(), []);
  const { gl } = useThree();
  const local = useMemo(() => new Vector3(), []);

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

  const canDrag = tab === 'place' || tab === 'manual';

  const toPhysics = (e: ThreeEvent<PointerEvent>): { x: number; y: number } | null => {
    const g = groupRef.current;
    if (!g) return null;
    local.copy(e.point);
    g.worldToLocal(local);
    return { x: local.x, y: local.y };
  };

  const onDown = (id: BallId) => (e: ThreeEvent<PointerEvent>) => {
    const s = usePractice.getState();
    if (!canDrag) return;
    e.stopPropagation();
    (e.target as unknown as Element | null)?.setPointerCapture?.(e.pointerId);
    gl.domElement.setPointerCapture?.(e.pointerId);
    s.beginDrag(id);
    s.setDrag({ id, clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY, touch: e.pointerType === 'touch' });
  };

  return (
    <group>
      {IDS.map((id) => (
        <group key={id}>
          <mesh
            ref={(m) => {
              meshes.current[id] = m;
            }}
            position={[balls[id].x, balls[id].y, R]}
            onPointerDown={onDown(id)}
            onPointerOver={() => canDrag && (document.body.style.cursor = 'grab')}
            onPointerOut={() => (document.body.style.cursor = '')}
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
      <DragPlane toPhysics={toPhysics} />
    </group>
  );
}

/** Invisible plane that receives drag moves (placing) and aim drags (manual mode). */
function DragPlane({ toPhysics }: { toPhysics: (e: ThreeEvent<PointerEvent>) => { x: number; y: number } | null }) {
  const table = usePractice((s) => s.table);
  const aiming = useRef(false);
  const { gl } = useThree();

  const aimAt = (p: { x: number; y: number }) => {
    const s = usePractice.getState();
    const c = s.balls[s.cue];
    if (Math.hypot(p.x - c.x, p.y - c.y) < 0.02) return;
    s.setManual({ phi: Math.atan2(p.y - c.y, p.x - c.x) });
  };

  return (
    <mesh
      position={[table.L / 2, table.W / 2, table.ballRadius]}
      onPointerDown={(e) => {
        const s = usePractice.getState();
        if (s.tab !== 'manual' || s.drag) return;
        const p = toPhysics(e);
        if (!p) return;
        aiming.current = true;
        gl.domElement.setPointerCapture?.(e.pointerId);
        aimAt(p);
      }}
      onPointerMove={(e) => {
        const s = usePractice.getState();
        const p = toPhysics(e);
        if (!p) return;
        if (s.drag) {
          s.moveBall(s.drag.id, p.x, p.y);
          s.setDrag({ ...s.drag, clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY });
        } else if (aiming.current) aimAt(p);
      }}
      onPointerUp={() => {
        aiming.current = false;
        const s = usePractice.getState();
        if (s.drag) s.setDrag(undefined);
      }}
      onPointerCancel={() => {
        aiming.current = false;
        usePractice.getState().setDrag(undefined);
      }}
    >
      <planeGeometry args={[table.L + 2, table.W + 2]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
