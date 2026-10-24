import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { BallId } from '@/engine/types';
import { usePractice } from '../store';

const IDS: BallId[] = ['white', 'yellow', 'red'];
/** Touch slop: a ball is grabbed if the finger lands within this many CSS pixels of its centre. */
const PICK_RADIUS_PX = 40;

/**
 * Ball dragging and aim dragging with plain DOM pointer events on the canvas (§13.3).
 * R3F's per-mesh capture routed moves to the ball mesh (which had no move handler) and a
 * 5 px ball is too small to hit with a finger, so we pick the nearest ball on screen and
 * project the pointer onto the plane z = R ourselves.
 */
export function DragController() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const el = gl.domElement;
    const ray = new Raycaster();
    const ndc = new Vector2();
    const hit = new Vector3();
    const tmp = new Vector3();
    let mode: 'none' | 'ball' | 'aim' = 'none';
    let pointerId = -1;

    const table = () => usePractice.getState().table;
    /** Physics → world: (x − L/2, z, W/2 − y). */
    const toWorld = (x: number, y: number, z: number, out: Vector3) => out.set(x - table().L / 2, z, table().W / 2 - y);

    const pointerOnTable = (e: PointerEvent): { x: number; y: number } | null => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const t = table();
      const plane = new Plane(new Vector3(0, 1, 0), -t.ballRadius);
      if (!ray.ray.intersectPlane(plane, hit)) return null;
      return { x: hit.x + t.L / 2, y: t.W / 2 - hit.z };
    };

    const nearestBall = (e: PointerEvent): BallId | null => {
      const s = usePractice.getState();
      const r = el.getBoundingClientRect();
      let best: BallId | null = null;
      let bestD = PICK_RADIUS_PX;
      for (const id of IDS) {
        const b = s.balls[id];
        toWorld(b.x, b.y, s.table.ballRadius, tmp).project(camera);
        const sx = r.left + ((tmp.x + 1) / 2) * r.width;
        const sy = r.top + ((1 - tmp.y) / 2) * r.height;
        const d = Math.hypot(sx - e.clientX, sy - e.clientY);
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
      return best;
    };

    const onDown = (e: PointerEvent) => {
      const s = usePractice.getState();
      if (mode !== 'none' || e.button > 0) return;
      if (s.tab !== 'place' && s.tab !== 'manual') return;
      if (s.camera === 'free') return; // orbit controls own the gestures
      const id = nearestBall(e);
      if (id) {
        mode = 'ball';
        s.beginDrag(id);
        s.setDrag({ id, clientX: e.clientX, clientY: e.clientY, touch: e.pointerType === 'touch' });
      } else if (s.tab === 'manual') {
        mode = 'aim';
        aimAt(e);
      } else return;
      pointerId = e.pointerId;
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const aimAt = (e: PointerEvent) => {
      const p = pointerOnTable(e);
      if (!p) return;
      const s = usePractice.getState();
      const c = s.balls[s.cue];
      if (Math.hypot(p.x - c.x, p.y - c.y) < 0.02) return;
      s.setManual({ phi: Math.atan2(p.y - c.y, p.x - c.x) });
    };

    const onMove = (e: PointerEvent) => {
      if (mode === 'none' || e.pointerId !== pointerId) return;
      e.preventDefault();
      const s = usePractice.getState();
      if (mode === 'aim') {
        aimAt(e);
        return;
      }
      const drag = s.drag;
      const p = pointerOnTable(e);
      if (!drag || !p) return;
      s.moveBall(drag.id, p.x, p.y);
      s.setDrag({ ...drag, clientX: e.clientX, clientY: e.clientY });
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      mode = 'none';
      pointerId = -1;
      usePractice.getState().setDrag(undefined);
    };

    const onCursor = (e: PointerEvent) => {
      if (mode !== 'none' || e.pointerType !== 'mouse') return;
      const s = usePractice.getState();
      const grab = (s.tab === 'place' || s.tab === 'manual') && s.camera !== 'free' && nearestBall(e);
      el.style.cursor = grab ? 'grab' : s.tab === 'manual' ? 'crosshair' : '';
    };

    const noMenu = (e: Event) => e.preventDefault();

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointermove', onCursor);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('contextmenu', noMenu);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointermove', onCursor);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('contextmenu', noMenu);
    };
  }, [gl, camera]);

  return null;
}
