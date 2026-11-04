// Generic performance analysis of a simulator run. Content (scenarios) adds its own
// criteria on top of these standard metrics.
import type { ActionLog, Sample, Simulator } from './engine';
import { clamp } from './physics';
import { L } from '../i18n';

export type EvalGroup =
  | 'Preparation'
  | 'Initial response'
  | 'Trim adjustments'
  | 'Timing'
  | 'Acceleration'
  | 'Final balance'
  | 'Decision'
  | 'Boat speed'
  | 'Heel management'
  | 'Rudder load'
  | 'Sail efficiency'
  | 'Winch effort'
  | 'Unnecessary adjustments'
  | 'Reaction time'
  | 'Communication';

export interface StandardMetrics {
  speed: number;
  heel: number;
  rudder: number;
  efficiency: number;
  energy: number;
  adjustments: number;
  avgPerf: number;
  maxHeel: number;
  timeOverHeel: number; // s with heel > 26
  timeRudderOver: number; // s with rudder > comfort
  maxRudder: number;
  avgEff: number;
  energyUsed: number;
  minEnergy: number;
  nAdjust: number;
  nReversals: number;
  duration: number;
}

export function window(tel: Sample[], t0: number, t1: number) {
  return tel.filter((s) => s.t >= t0 && s.t <= t1);
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function scoreLinear(x: number, bad: number, good: number) {
  return clamp(((x - bad) / (good - bad)) * 100, 0, 100);
}

export function standardMetrics(
  sim: Simulator,
  opts: { t0?: number; t1?: number; expectedAdjustments?: number; energyBudget?: number; comfort?: number } = {},
): StandardMetrics {
  const t0 = opts.t0 ?? 0;
  const t1 = opts.t1 ?? sim.t;
  const tel = window(sim.telemetry, t0, t1);
  const dt = 0.25;
  const comfort = opts.comfort ?? sim.p.rudderComfort;
  const avgPerf = mean(tel.map((s) => Math.min(1.08, s.perf)));
  const maxHeel = Math.max(0, ...tel.map((s) => s.heel));
  const timeOverHeel = tel.filter((s) => s.heel > 26).length * dt;
  const timeOver30 = tel.filter((s) => s.heel > 30).length * dt;
  const timeRudderOver = tel.filter((s) => s.rudder > comfort).length * dt;
  const timeStall = tel.filter((s) => s.rudder > sim.p.rudderStall).length * dt;
  const maxRudder = Math.max(0, ...tel.map((s) => s.rudder));
  // in a breeze, correct depowering deliberately feathers part of the sails: normalise by wind
  const effRef = (tws: number) => (tws < 12 ? 0.93 : Math.max(0.6, 0.93 - 0.032 * (tws - 12)));
  const avgEff = mean(tel.map((s) => Math.min(1, (s.jibEff + s.mainEff) / 2 / effRef(s.tws)) * 0.93));
  const e0 = tel[0]?.energy ?? 100;
  let used = 0;
  for (let i = 1; i < tel.length; i++) used += Math.max(0, tel[i - 1].energy - tel[i].energy);
  const minEnergy = Math.min(e0, ...tel.map((s) => s.energy));
  const acts = sim.actions.filter((a) => a.t >= t0 && a.t <= t1 && a.kind === 'adjust');
  const nAdjust = acts.length;
  const nReversals = acts.filter((a) => a.reversal).length;
  const duration = Math.max(1, t1 - t0);

  const frac = (x: number) => x / duration;
  const speed = scoreLinear(avgPerf, 0.72, 0.985);
  const heel = clamp(100 - 260 * frac(timeOverHeel) - 400 * frac(timeOver30), 0, 100);
  const rudder = clamp(100 - 260 * frac(timeRudderOver) - 500 * frac(timeStall), 0, 100);
  const efficiency = scoreLinear(avgEff, 0.55, 0.93);
  const budget = opts.energyBudget ?? 40;
  const energy = clamp(100 - Math.max(0, used - budget) * 1.3 - (minEnergy < 15 ? 25 : 0), 0, 100);
  const expected = opts.expectedAdjustments ?? 6;
  const adjustments = clamp(100 - 7 * Math.max(0, nAdjust - expected) - 9 * nReversals, 0, 100);
  return {
    speed,
    heel,
    rudder,
    efficiency,
    energy,
    adjustments,
    avgPerf,
    maxHeel,
    timeOverHeel,
    timeRudderOver,
    maxRudder,
    avgEff,
    energyUsed: used,
    minEnergy,
    nAdjust,
    nReversals,
    duration,
  };
}

/** First action matching `pred` at or after time t. */
export function firstAction(actions: ActionLog[], t: number, pred: (a: ActionLog) => boolean) {
  return actions.find((a) => a.t >= t && pred(a));
}

export const isAdjust = (key: string, dir?: 1 | -1) => (a: ActionLog) =>
  a.kind === 'adjust' && a.key === key && (dir === undefined || Math.sign((a.value ?? 0) - (a.from ?? 0)) === dir);

export function reactionScore(dtReact: number | undefined, good = 1.5, bad = 8) {
  if (dtReact === undefined) return 0;
  return clamp(100 - ((dtReact - good) / (bad - good)) * 100, 0, 100);
}

export function grade(score: number) {
  if (score >= 90) return { label: L('Excellent', 'Excellent'), tone: 'good' as const };
  if (score >= 75) return { label: L('Good', 'Bien'), tone: 'good' as const };
  if (score >= 60) return { label: L('Fair', 'Correct'), tone: 'warn' as const };
  if (score >= 40) return { label: L('Weak', 'Faible'), tone: 'warn' as const };
  return { label: L('Poor', 'Insuffisant'), tone: 'alarm' as const };
}
