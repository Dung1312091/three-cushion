import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { bake } from '@/engine/bake';
import { restingBalls, simulate } from '@/engine/simulate';
import { makeTable } from '@/engine/table';
import type { CueStrike } from '@/engine/types';
import { numVi } from '@/lib/format';
import { getPool } from '@/workers/pool';
import type { BenchStats } from '@/workers/sim.worker';

function mainThreadBench(n: number): BenchStats {
  const table = makeTable('UMB_MATCH');
  const balls = restingBalls(table, { white: { x: 0.7, y: 0.4 }, yellow: { x: 2.2, y: 1.0 }, red: { x: 1.4, y: 0.9 } });
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const shots: CueStrike[] = Array.from({ length: n }, () => ({ phi: rnd() * 2 * Math.PI, theta: 0.087, a: (rnd() - 0.5) * 0.6, b: (rnd() - 0.5) * 0.6, V0: 1.5 + rnd() * 4.5 }));
  const fast: number[] = [];
  const fine: number[] = [];
  let ev = 0;
  for (const s of shots) {
    const t0 = performance.now();
    ev += simulate(table, balls, 'white', s, { fast: true, recordSegments: false }).events.length;
    fast.push(performance.now() - t0);
  }
  for (const s of shots.slice(0, 200)) {
    const t0 = performance.now();
    bake(simulate(table, balls, 'white', s), 120);
    fine.push(performance.now() - t0);
  }
  const p = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.floor(q * (xs.length - 1))];
  return { n, fast: { p50: p(fast, 0.5), p95: p(fast, 0.95) }, fine: { p50: p(fine, 0.5), p95: p(fine, 0.95) }, avgEvents: ev / n };
}

/** /dev/bench — hidden from the menu (§14 Phase 0). */
export default function DevBench() {
  const [rows, setRows] = useState<Array<{ where: string; s: BenchStats }>>([]);
  const [busy, setBusy] = useState(false);
  const run = async (where: 'main' | 'worker') => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 20));
    const s = where === 'main' ? mainThreadBench(1000) : await getPool().main.bench(1000);
    setRows((r) => [...r, { where: where === 'main' ? 'Main thread' : 'Worker', s }]);
    setBusy(false);
  };
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5">
      <h1 className="text-2xl font-bold">Benchmark engine</h1>
      <p className="mt-2 text-muted">1.000 cú ngẫu nhiên (fast) và 200 cú fine + bake. Mục tiêu: fast p95 ≤ 0,5 ms trên laptop, ≤ 2 ms trên điện thoại.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" disabled={busy} onClick={() => void run('main')}>
          Chạy trên main thread
        </Button>
        <Button disabled={busy} onClick={() => void run('worker')}>
          Chạy trong worker
        </Button>
      </div>
      <table className="num mt-6 w-full text-left text-lg">
        <thead className="font-sans text-sm text-muted">
          <tr>
            <th className="py-2">Nơi chạy</th>
            <th>fast p50</th>
            <th>fast p95</th>
            <th>fine p50</th>
            <th>fine p95</th>
            <th>sự kiện TB</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              <td className="py-2 font-sans text-base">{r.where}</td>
              <td>{numVi(r.s.fast.p50, 3)} ms</td>
              <td>{numVi(r.s.fast.p95, 3)} ms</td>
              <td>{numVi(r.s.fine.p50, 2)} ms</td>
              <td>{numVi(r.s.fine.p95, 2)} ms</td>
              <td>{numVi(r.s.avgEvents, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
