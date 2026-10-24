import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { findSystem } from '@/content/loader';
import { usePractice } from '../store';

const RAIL_W = 0.13;
const CUSHION_W = 0.05;

/** Bed, cushions with the true nose height, walnut frame and pearl diamonds (§13.2). Physics frame, z up. */
export function Table3D() {
  const table = usePractice((s) => s.table);
  const cloth = usePractice((s) => s.settings.clothColor);
  const overlay = usePractice((s) => s.layers.systemOverlay);
  const { L, W, cushionHeight: h, diamondOffset } = table;
  const D = L / 8;
  const railTop = h + 0.006;
  const outer = CUSHION_W + RAIL_W;

  const diamonds = useMemo(() => {
    const out: Array<[number, number]> = [];
    for (let i = 1; i < 8; i++) out.push([i * D, -diamondOffset], [i * D, W + diamondOffset]);
    for (let j = 1; j < 4; j++) out.push([-diamondOffset, j * D], [L + diamondOffset, j * D]);
    return out;
  }, [D, L, W, diamondOffset]);

  const sys = overlay ? findSystem('bo-50') : undefined;

  return (
    <group>
      {/* Bed */}
      <mesh position={[L / 2, W / 2, -0.001]} receiveShadow>
        <planeGeometry args={[L + 2 * CUSHION_W, W + 2 * CUSHION_W]} />
        <meshStandardMaterial color={cloth} roughness={0.95} metalness={0} />
      </mesh>
      {/* Cushions: the inner face is the nose line of the play field. */}
      {[
        [L / 2, -CUSHION_W / 2, L + 2 * CUSHION_W, CUSHION_W],
        [L / 2, W + CUSHION_W / 2, L + 2 * CUSHION_W, CUSHION_W],
        [-CUSHION_W / 2, W / 2, CUSHION_W, W],
        [L + CUSHION_W / 2, W / 2, CUSHION_W, W],
      ].map(([x, y, sx, sy], i) => (
        <mesh key={`c${i}`} position={[x, y, h / 2]}>
          <boxGeometry args={[sx, sy, h]} />
          <meshStandardMaterial color={cloth} roughness={0.9} />
        </mesh>
      ))}
      {/* Frame */}
      {[
        [L / 2, -CUSHION_W - RAIL_W / 2, L + 2 * outer, RAIL_W],
        [L / 2, W + CUSHION_W + RAIL_W / 2, L + 2 * outer, RAIL_W],
        [-CUSHION_W - RAIL_W / 2, W / 2, RAIL_W, W + 2 * CUSHION_W],
        [L + CUSHION_W + RAIL_W / 2, W / 2, RAIL_W, W + 2 * CUSHION_W],
      ].map(([x, y, sx, sy], i) => (
        <mesh key={`r${i}`} position={[x, y, railTop / 2 - 0.04]}>
          <boxGeometry args={[sx, sy, railTop + 0.08]} />
          <meshStandardMaterial color="#4a2e1c" roughness={0.55} metalness={0.05} />
        </mesh>
      ))}
      {diamonds.map(([x, y]) => (
        <mesh key={`${x.toFixed(3)}:${y.toFixed(3)}`} position={[x, y, railTop + 0.0005]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.0075, 0.0075, 0.001, 20]} />
          <meshStandardMaterial color="#ece7dc" roughness={0.3} />
        </mesh>
      ))}
      {sys &&
        [...sys.numbering.start, ...sys.numbering.aim].map((p, i) => {
          const off = diamondOffset + 0.045;
          const pos: [number, number, number] =
            p.cushion === 'L1' ? [p.diamond * D, -off, railTop] : p.cushion === 'L2' ? [p.diamond * D, W + off, railTop] : p.cushion === 'S1' ? [-off, p.diamond * D, railTop] : [L + off, p.diamond * D, railTop];
          return (
            <Html key={`n${i}`} position={pos} center zIndexRange={[5, 0]}>
              <span className="num pointer-events-none select-none text-xs font-semibold text-pearl">{p.value}</span>
            </Html>
          );
        })}
    </group>
  );
}
