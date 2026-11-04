// A Simulator-shaped source for the 3D view that shows a fixed situation (quiz illustrations):
// the steady state for the given trim and wind, solved once, advanced only in position and time.
import type { QuizScene } from '../content/quizScenes';
import type { Controls } from '../content/types';
import { J80_PROFILE } from '../sim/boatProfile';
import type { Snapshot } from '../sim/engine';
import { DEFAULT_PLAN, KN, clamp, steadyState, type SteadyResult } from '../sim/physics';
import { optimalControls, targetSpeed } from '../sim/polar';

export interface SnapshotSource {
  sea: number;
  snapshot(): Snapshot;
}

export function staticSource(spec: QuizScene): SnapshotSource {
  const headsail = spec.headsail ?? 'jib';
  const base = optimalControls(spec.trimTws ?? spec.tws, Math.abs(spec.trimTwa ?? spec.twa), headsail);
  const c: Controls = { ...base };
  for (const [k, d] of Object.entries(spec.delta ?? {})) (c as any)[k] = clamp((c as any)[k] + (d as number), 0, 1);
  Object.assign(c, spec.set ?? {});
  const plan = {
    ...DEFAULT_PLAN,
    headsail,
    jibReleased: !!spec.jibReleased,
    gennakerCollapsed: !!spec.gennakerCollapsed,
    crewFore: spec.crewFore ?? 0,
  };
  const sea = spec.sea ?? 0;
  if (headsail === 'gennaker') {
    const opt = optimalControls(spec.tws, Math.abs(spec.twa), 'gennaker').jibSheet;
    (plan as any).kiteCurl = spec.gennakerCollapsed ? 1.5 : clamp((opt - 0.03 - c.jibSheet) / 0.1, 0, 1.5);
    (plan as any).kiteOver = clamp((c.jibSheet - opt - 0.06) / 0.1, 0, 1);
  }
  const r = steadyState(J80_PROFILE, c, { tws: spec.tws, twa: Math.abs(spec.twa), sea }, plan);
  const target = targetSpeed(spec.tws, Math.abs(spec.twa), headsail);
  const t0 = performance.now();
  const snap: Snapshot = {
    t: 0,
    v: r.v,
    target,
    perf: r.v / target,
    // a luffing, stopped boat can solve to a windward heel; it just sits upright
    heel: Math.max(r.heel, -2),
    heelRate: 0,
    pitch: 0,
    pitchRate: 0,
    rollDamping: 0.9,
    kiteCurl: (plan as any).kiteCurl ?? 0,
    kiteOver: (plan as any).kiteOver ?? 0,
    kiteLeechFlap: 0,
    kiteMainBackwind: 0,
    autoTrim: false,
    manualHelm: false,
    manualKeys: [],
    kiteLuffFlap: 0,
    accel: 0,
    heading: 0,
    twa: spec.twa,
    tws: spec.tws,
    twd: (spec.twa + 360) % 360,
    aws: r.f.aws,
    awa: r.f.awa,
    vmg: r.vmg,
    rudder: r.f.rudder,
    energy: 100,
    gear: 'high',
    sprint: false,
    controls: c,
    targets: c,
    f: r.f,
    plan,
    helmMode: 'normal',
    maneuver: null,
    messages: [],
    winchState: 'idle',
    gust: 0,
    upcoming: undefined,
    x: 0,
    y: 0,
    roundUp: false,
    crewFore: plan.crewFore as -1 | 0 | 1,
    dist: 0,
  };
  return {
    sea,
    snapshot() {
      const t = (performance.now() - t0) / 1000;
      // sailing north at the solved speed; a small pitch from the sea so it is not frozen
      return { ...snap, t, y: r.v * KN * t, pitch: sea * 1.2 * Math.sin(t * 2.4) };
    },
  };
}

/**
 * A snapshot of a lesson lab's state for the 3D view: built from the steady state the lab has
 * already solved (nothing is recomputed per frame), sailing north at its speed.
 */
export function labSnapshot(r: SteadyResult, c: Controls, tws: number, twa: number, headsail: 'jib' | 'gennaker', t: number): Snapshot {
  const plan = { ...DEFAULT_PLAN, headsail };
  let kiteCurl = 0;
  let kiteOver = 0;
  if (headsail === 'gennaker') {
    const opt = optimalControls(tws, Math.abs(twa), 'gennaker').jibSheet;
    kiteCurl = clamp((opt - 0.03 - c.jibSheet) / 0.1, 0, 1.5);
    kiteOver = clamp((c.jibSheet - opt - 0.06) / 0.1, 0, 1);
  }
  const target = targetSpeed(tws, Math.abs(twa), headsail);
  return {
    t,
    v: r.v,
    target,
    perf: r.v / target,
    heel: Math.max(r.heel, -2),
    heelRate: 0,
    pitch: 0,
    pitchRate: 0,
    rollDamping: 0.9,
    kiteCurl,
    kiteOver,
    kiteLeechFlap: 0,
    kiteMainBackwind: 0,
    kiteLuffFlap: 0,
    autoTrim: false,
    manualHelm: false,
    manualKeys: [],
    accel: 0,
    heading: 0,
    twa,
    tws,
    twd: (twa + 360) % 360,
    aws: r.f.aws,
    awa: r.f.awa,
    vmg: r.vmg,
    rudder: r.f.rudder,
    energy: 100,
    gear: 'high',
    sprint: false,
    controls: c,
    targets: c,
    f: r.f,
    plan,
    helmMode: 'normal',
    maneuver: null,
    messages: [],
    winchState: 'idle',
    gust: 0,
    upcoming: undefined,
    x: 0,
    y: r.v * KN * t,
    roundUp: false,
    crewFore: 0,
    dist: 0,
  };
}
