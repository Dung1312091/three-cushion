import * as Comlink from 'comlink';
import type { ShotOption, SolveRequest, SolveStats } from '@/solver/types';
import type { SimApi } from './sim.worker';

/** Worker pool: min(cores − 1, 4) workers; the solver splits stroke presets across them (§8.3). */
export class SimPool {
  readonly size: number;
  private readonly remotes: Array<Comlink.Remote<SimApi>>;

  constructor(size?: number) {
    const hc = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    this.size = size ?? Math.max(1, Math.min(hc - 1, 4));
    this.remotes = Array.from({ length: this.size }, () =>
      Comlink.wrap<SimApi>(new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' })),
    );
  }

  /** Worker used for single simulations (playback, prediction, analysis). */
  get main(): Comlink.Remote<SimApi> {
    return this.remotes[0];
  }

  async solve(req: SolveRequest, epoch: number, onOption: (o: ShotOption) => void): Promise<SolveStats | null> {
    const cb = Comlink.proxy(onOption);
    const all = await Promise.all(this.remotes.map((r, i) => r.solve(req, i, this.size, epoch, cb)));
    const done = all.filter((s): s is SolveStats => !!s);
    if (done.length === 0) return null;
    return {
      sims: done.reduce((a, s) => a + s.sims, 0),
      candidates: done.reduce((a, s) => a + s.candidates, 0),
      elapsedMs: Math.max(...done.map((s) => s.elapsedMs)),
      partial: done.some((s) => s.partial),
    };
  }

  cancel(epoch: number): void {
    for (const r of this.remotes) void r.cancel(epoch);
  }
}

let pool: SimPool | null = null;
export const getPool = (): SimPool => (pool ??= new SimPool());
