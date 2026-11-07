// A Simulator-shaped source for the 3D view that shows a fixed situation (quiz illustrations):
// the steady state for the given trim and wind, solved once, advanced only in position and time.
import type { QuizScene } from '../content/quizScenes';
import type { ControlKey, Controls } from '../content/types';
import { J80_PROFILE } from '../sim/boatProfile';
import type { Snapshot } from '../sim/engine';
import { DEFAULT_PLAN, KN, clamp, steadyState, type SailPlanState, type SteadyResult } from '../sim/physics';
import { optimalControls, targetSpeed } from '../sim/polar';
import { mainOnControls } from '../sim/advisor';

/** a scene about the jib (only jib controls are wrong): the main is sheeted at 90 % with the traveller down,
 *  so the boom is not in the trimmer's face */
export function sceneIsJib(spec: QuizScene): boolean {
  const keys = [...Object.keys(spec.delta ?? {}), ...Object.keys(spec.set ?? {})];
  return (spec.headsail ?? 'jib') === 'jib' && keys.length > 0 && keys.every((k) => k.startsWith('jib'));
}

/** the good trim for a scene's wind (what the player is aiming for) */
export function sceneOptimal(spec: QuizScene, tws = spec.tws, twa = spec.twa): Controls {
  const headsail = spec.headsail ?? 'jib';
  return sceneIsJib(spec) ? mainOnControls(tws, twa, { ...DEFAULT_PLAN, headsail, crewFore: spec.crewFore ?? 0 }, spec.sea ?? 0) : optimalControls(tws, Math.abs(twa), headsail);
}

export interface SnapshotSource {
  sea: number;
  snapshot(): Snapshot;
}

/** A quiz scene as a live mini-lab: the steady state for its trim, re-solved when a control moves. */
export interface QuizLab extends SnapshotSource {
  headsail: 'jib' | 'gennaker';
  tws: number;
  twa: number;
  plan: SailPlanState;
  /** the trim the scene starts with */
  c0: Controls;
  controls: Controls;
  /** bumps on every change */
  version: number;
  setTarget(k: ControlKey, v: number): void;
  setAll(c: Controls): void;
}

export function staticSource(spec: QuizScene): QuizLab {
  const headsail = spec.headsail ?? 'jib';
  const base = sceneOptimal(spec, spec.trimTws ?? spec.tws, spec.trimTwa ?? spec.twa);
  const c0: Controls = { ...base };
  for (const [k, d] of Object.entries(spec.delta ?? {})) (c0 as any)[k] = clamp((c0 as any)[k] + (d as number), 0, 1);
  Object.assign(c0, spec.set ?? {});
  const plan: SailPlanState = {
    ...DEFAULT_PLAN,
    headsail,
    jibReleased: !!spec.jibReleased,
    gennakerCollapsed: !!spec.gennakerCollapsed,
    crewFore: spec.crewFore ?? 0,
  };
  const sea = spec.sea ?? 0;
  const target = targetSpeed(spec.tws, Math.abs(spec.twa), headsail);
  const build = (c: Controls): Snapshot => {
    const p = { ...plan } as any;
    if (headsail === 'gennaker') {
      const opt = optimalControls(spec.tws, Math.abs(spec.twa), 'gennaker').jibSheet;
      p.kiteCurl = spec.gennakerCollapsed ? 1.5 : clamp((opt - 0.03 - c.jibSheet) / 0.1, 0, 1.5);
      p.kiteOver = clamp((c.jibSheet - opt - 0.06) / 0.1, 0, 1);
    }
    const r = steadyState(J80_PROFILE, c, { tws: spec.tws, twa: Math.abs(spec.twa), sea }, p);
    return {
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
      kiteCurl: p.kiteCurl ?? 0,
      kiteOver: p.kiteOver ?? 0,
      kiteLeechFlap: 0,
      kiteMainBackwind: 0,
      kiteSwing: 0,
    rollMode: false,
    crewHold: false,
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
    grinder: false,
      controls: c,
      targets: c,
      f: r.f,
      plan: p,
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
  };
  let snap = build(c0);
  const t0 = performance.now();
  const lab: QuizLab = {
    sea,
    headsail,
    tws: spec.tws,
    twa: spec.twa,
    plan,
    c0,
    controls: { ...c0 },
    version: 0,
    setTarget(k, v) {
      const nv = clamp(v, 0, 1);
      if (Math.abs(nv - lab.controls[k]) < 1e-4) return;
      lab.controls = { ...lab.controls, [k]: nv };
      snap = build(lab.controls);
      lab.version++;
    },
    setAll(c) {
      lab.controls = { ...c };
      snap = build(lab.controls);
      lab.version++;
    },
    snapshot() {
      const t = (performance.now() - t0) / 1000;
      // sailing north at the solved speed; a small pitch from the sea so it is not frozen
      return { ...snap, t, y: snap.v * KN * t, pitch: sea * 1.2 * Math.sin(t * 2.4) };
    },
  };
  return lab;
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
    kiteSwing: 0,
    rollMode: false,
    crewHold: false,
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
    grinder: false,
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
