/**
 * Real-root finding for polynomials of degree ≤ 4 on an interval (§6.4).
 *
 * ADR-004: instead of Ferrari's closed form we isolate roots by splitting the
 * interval at the critical points (roots of the derivative, found recursively)
 * and bisecting/Newton-polishing each monotonic piece. This is exact for double
 * roots and degenerate leading coefficients (one ball stationary), which is
 * where closed-form quartic solvers lose precision.
 *
 * Coefficients are passed lowest power first: c[0] + c[1]x + c[2]x² + …
 */

export function polyEval(c: ArrayLike<number>, deg: number, x: number): number {
  let r = c[deg];
  for (let i = deg - 1; i >= 0; i--) r = r * x + c[i];
  return r;
}

function effectiveDegree(c: ArrayLike<number>, deg: number): number {
  let maxAbs = 0;
  for (let i = 0; i <= deg; i++) maxAbs = Math.max(maxAbs, Math.abs(c[i]));
  if (maxAbs === 0) return -1;
  let d = deg;
  while (d > 0 && Math.abs(c[d]) <= 1e-14 * maxAbs) d--;
  return d;
}

function pushIfIn(out: number[], x: number, lo: number, hi: number): void {
  if (x >= lo && x <= hi && Number.isFinite(x)) out.push(x);
}

/** Real roots of c0 + c1 x + c2 x² in [lo, hi], ascending. */
export function quadraticRoots(c0: number, c1: number, c2: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  const deg = effectiveDegree([c0, c1, c2], 2);
  if (deg <= 0) return out;
  if (deg === 1) {
    pushIfIn(out, -c0 / c1, lo, hi);
    return out;
  }
  const disc = c1 * c1 - 4 * c2 * c0;
  if (disc < 0) {
    // Tangency within rounding: treat as a double root.
    if (disc > -1e-14 * (c1 * c1 + Math.abs(4 * c2 * c0))) pushIfIn(out, -c1 / (2 * c2), lo, hi);
    return out;
  }
  const sq = Math.sqrt(disc);
  const q = -0.5 * (c1 + (c1 >= 0 ? sq : -sq));
  const r1 = q / c2;
  const r2 = q !== 0 ? c0 / q : r1;
  const a = Math.min(r1, r2);
  const b = Math.max(r1, r2);
  pushIfIn(out, a, lo, hi);
  if (b !== a) pushIfIn(out, b, lo, hi);
  return out;
}

function refine(c: ArrayLike<number>, deg: number, a: number, b: number, fa: number): number {
  // Bisection with a Newton step when it stays inside the bracket.
  let lo = a;
  let hi = b;
  let flo = fa;
  let x = 0.5 * (lo + hi);
  for (let it = 0; it < 80; it++) {
    const fx = polyEval(c, deg, x);
    if (fx === 0) return x;
    if ((fx > 0) === (flo > 0)) {
      lo = x;
      flo = fx;
    } else {
      hi = x;
    }
    if (hi - lo < 1e-13 * Math.max(1, Math.abs(x))) break;
    let d = c[deg] * deg;
    for (let i = deg - 1; i >= 1; i--) d = d * x + c[i] * i;
    const xn = d !== 0 ? x - fx / d : NaN;
    x = xn > lo && xn < hi ? xn : 0.5 * (lo + hi);
  }
  return x;
}

/** All real roots of the polynomial in [lo, hi], ascending (multiple roots reported once). */
export function realRootsInInterval(c: ArrayLike<number>, deg: number, lo: number, hi: number): number[] {
  const d = effectiveDegree(c, deg);
  if (d <= 0) return [];
  if (d <= 2) return quadraticRoots(c[0], c[1], d === 2 ? c[2] : 0, lo, hi);
  const dc = new Array<number>(d);
  for (let i = 1; i <= d; i++) dc[i - 1] = c[i] * i;
  const crit = realRootsInInterval(dc, d - 1, lo, hi);
  const pts = [lo, ...crit, hi];
  const roots: number[] = [];
  let fPrev = polyEval(c, d, pts[0]);
  if (fPrev === 0) roots.push(pts[0]);
  for (let k = 1; k < pts.length; k++) {
    const x = pts[k];
    const fx = polyEval(c, d, x);
    if (fx === 0) {
      if (roots.length === 0 || roots[roots.length - 1] !== x) roots.push(x);
    } else if (fPrev !== 0 && (fx > 0) !== (fPrev > 0)) {
      roots.push(refine(c, d, pts[k - 1], x, fPrev));
    } else if (fPrev !== 0 && k < pts.length - 1) {
      // Touching root at a critical point (double root): |f| tiny relative to scale.
      const scale = Math.abs(c[0]) + Math.abs(c[d]) + 1e-300;
      if (Math.abs(fx) < 1e-12 * scale) roots.push(x);
    }
    fPrev = fx;
  }
  return roots;
}

/**
 * First time τ in [lo, hi] where f crosses from positive to non-positive while
 * decreasing — i.e. the first moment of contact. Returns Infinity if none.
 * If f(lo) ≤ 0 and f is decreasing at lo, contact is immediate (returns lo).
 */
export function firstContactRoot(c: ArrayLike<number>, deg: number, lo: number, hi: number): number {
  const d = effectiveDegree(c, deg);
  if (d <= 0) return Infinity;
  const f0 = polyEval(c, d, lo);
  let df0 = c[d] * d;
  for (let i = d - 1; i >= 1; i--) df0 = df0 * lo + c[i] * i;
  if (f0 <= 0 && df0 < 0) return lo;
  const roots = realRootsInInterval(c, d, lo, hi);
  for (const r of roots) {
    let dr = c[d] * d;
    for (let i = d - 1; i >= 1; i--) dr = dr * r + c[i] * i;
    if (dr < 0 && r > lo) return r;
  }
  return Infinity;
}
