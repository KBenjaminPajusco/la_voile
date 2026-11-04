// Target-speed and optimal-trim lookup built from the generated polar table.
import type { Controls } from '../content/types';
import { POLAR } from './polar.generated';
import { clamp, DEG, type Headsail } from './physics';

type Table = { twa: number[]; v: number[][]; c: number[][][] };

function idx(arr: number[], x: number) {
  const xc = clamp(x, arr[0], arr[arr.length - 1]);
  let i = 0;
  while (i < arr.length - 2 && arr[i + 1] < xc) i++;
  const t = (xc - arr[i]) / (arr[i + 1] - arr[i]);
  return { i, t: clamp(t, 0, 1) };
}

function table(h: Headsail): Table {
  return h === 'gennaker' ? POLAR.gennaker : POLAR.jib;
}

export function targetSpeed(tws: number, twa: number, h: Headsail = 'jib'): number {
  const T = table(h);
  const a = idx(POLAR.tws, tws);
  const b = idx(T.twa, Math.abs(twa));
  const v00 = T.v[a.i][b.i];
  const v01 = T.v[a.i][b.i + 1];
  const v10 = T.v[a.i + 1][b.i];
  const v11 = T.v[a.i + 1][b.i + 1];
  let v = (v00 * (1 - b.t) + v01 * b.t) * (1 - a.t) + (v10 * (1 - b.t) + v11 * b.t) * a.t;
  if (tws < POLAR.tws[0]) v *= tws / POLAR.tws[0];
  return v;
}

export function optimalControls(tws: number, twa: number, h: Headsail = 'jib'): Controls {
  const T = table(h);
  const a = idx(POLAR.tws, tws);
  const b = idx(T.twa, Math.abs(twa));
  const i = a.t < 0.5 ? a.i : a.i + 1;
  const j = b.t < 0.5 ? b.i : b.i + 1;
  const row = T.c[i][j];
  const out = {} as Controls;
  POLAR.keys.forEach((k, n) => ((out as Record<string, number>)[k] = row[n]));
  return out;
}

/** Best VMG angle upwind (jib) or downwind (gennaker) for a wind speed. */
export function bestVmgAngle(tws: number, upwind: boolean): { twa: number; v: number; vmg: number } {
  let best = { twa: upwind ? 42 : 140, v: 0, vmg: -1 };
  const h: Headsail = upwind ? 'jib' : 'gennaker';
  const range = upwind ? [34, 55] : [118, 170];
  for (let twa = range[0]; twa <= range[1]; twa += 1) {
    const v = targetSpeed(tws, twa, h);
    const vmg = upwind ? v * Math.cos(twa * DEG) : -v * Math.cos(twa * DEG);
    if (vmg > best.vmg) best = { twa, v, vmg };
  }
  return best;
}
