import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { BallId } from '@/engine/types';
import { playClock, usePractice } from '../store';

const IDS: BallId[] = ['white', 'yellow', 'red'];
export const TRAIL_COLOR: Record<BallId, string> = { white: '#ffffff', yellow: '#f2c230', red: '#ff5a67' };
const Z = 0.0015;

function toPoints(tr: Float32Array): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i + 1 < tr.length; i += 2) out.push([tr[i], tr[i + 1], Z]);
  return out.length > 1 ? out : [[tr[0] ?? 0, tr[1] ?? 0, Z], [tr[0] ?? 0, tr[1] ?? 0, Z]];
}

/** One trail that grows with playback time (instanceCount on the Line2 geometry, no React re-render). */
function GrowingTrail({ ball, track, hz }: { ball: BallId; track: Float32Array; hz: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const points = useMemo(() => toPoints(track), [track]);
  useFrame(() => {
    const g = ref.current?.geometry;
    if (!g) return;
    const n = Math.max(0, Math.min(points.length - 1, Math.floor(Math.max(0, playClock.t) * hz)));
    g.instanceCount = n;
  });
  return <Line ref={ref} points={points} color={TRAIL_COLOR[ball]} lineWidth={ball === usePractice.getState().cue ? 3 : 2.25} transparent opacity={0.95} />;
}

export function Trails() {
  const current = usePractice((s) => s.current);
  const prediction = usePractice((s) => s.prediction);
  const tab = usePractice((s) => s.tab);
  const show = usePractice((s) => s.layers.trails);
  const cue = usePractice((s) => s.cue);
  if (!show) return null;
  if (current) {
    return (
      <group>
        {IDS.map((id) => current.tracks[id] && <GrowingTrail key={`${id}-${current.result.tEnd}`} ball={id} track={current.tracks[id]} hz={60} />)}
      </group>
    );
  }
  if (tab === 'manual' && prediction) {
    return (
      <group>
        {IDS.map((id) =>
          prediction.tracks[id] && prediction.tracks[id].length > 4 ? (
            <Line key={id} points={toPoints(prediction.tracks[id])} color={TRAIL_COLOR[id]} lineWidth={id === cue ? 2.5 : 1.75} transparent opacity={id === cue ? 0.9 : 0.7} />
          ) : null,
        )}
      </group>
    );
  }
  return null;
}
