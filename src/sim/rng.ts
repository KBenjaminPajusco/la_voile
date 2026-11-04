// Deterministic pseudo-random generator so scenarios replay identically.
export type Rand = (() => number) & { st: { a: number } };
/** mulberry32; its state is exposed (`st`) so a wind model can be copied to look ahead */
export function mulberry32(seed: number): Rand {
  const st = { a: seed >>> 0 };
  const f = (() => {
    st.a = (st.a + 0x6d2b79f5) >>> 0;
    let t = st.a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rand;
  f.st = st;
  return f;
}

export function gaussian(rand: () => number) {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
