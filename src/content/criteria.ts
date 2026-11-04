// Reusable evaluation criteria for scenario content.
import type { ActionLog } from '../sim/engine';
import { clamp } from '../sim/physics';
import { optimalControls } from '../sim/polar';
import type { Criterion, EvalCtx } from '../sim/runner';
import { mean, reactionScore, scoreLinear, window } from '../sim/scoring';
import type { ControlKey } from './types';
import { L } from '../i18n';

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const f1 = (x: number) => x.toFixed(1);

export const stdSpeed = (w = 1.5): Criterion => ({
  id: 'speed',
  group: 'Boat speed',
  label: L('Boat speed vs target', 'Vitesse du bateau vs cible'),
  weight: w,
  evaluate: ({ std }) => ({
    score: std.speed,
    note: `${L(`Averaged ${pct(std.avgPerf)} of target speed.`, `Moyenne de ${pct(std.avgPerf)} de la vitesse cible.`)} ${std.avgPerf > 0.95 ? L('Fast.', 'Rapide.') : std.avgPerf > 0.88 ? L('Some speed lost.', 'Un peu de vitesse perdue.') : L('Significant speed loss — check flow and heel.', "Perte de vitesse importante — vérifiez l'écoulement et la gîte.")}`,
  }),
});

export const stdHeel = (w = 1.5): Criterion => ({
  id: 'heel',
  group: 'Heel management',
  label: L('Heel kept under control', 'Gîte maîtrisée'),
  weight: w,
  evaluate: ({ std }) => ({
    score: std.heel,
    note: `${L(`Max heel ${f1(std.maxHeel)}°, ${f1(std.timeOverHeel)} s above 25°.`, `Gîte max ${f1(std.maxHeel)}°, ${f1(std.timeOverHeel)} s au-dessus de 25°.`)} ${std.timeOverHeel > 3 ? L('Excess heel adds leeway, hull drag and weather helm.', 'Trop de gîte ajoute de la dérive, de la traînée de coque et de la barre ardente.') : L('Heel stayed in the fast window.', 'La gîte est restée dans la plage rapide.')}`,
  }),
});

export const stdRudder = (w = 1.2): Criterion => ({
  id: 'rudder',
  group: 'Rudder load',
  label: L('Rudder load / helm balance', 'Charge du safran / équilibre de barre'),
  weight: w,
  evaluate: ({ std, sim }) => ({
    score: std.rudder,
    note: `${L(`Max rudder ${f1(std.maxRudder)}° (comfort ${sim.p.rudderComfort}°), ${f1(std.timeRudderOver)} s overloaded.`, `Safran max ${f1(std.maxRudder)}° (confort ${sim.p.rudderComfort}°), ${f1(std.timeRudderOver)} s en surcharge.`)} ${std.timeRudderOver > 2 ? L('A loaded rudder is a brake: every degree of rudder beyond ~4° is drag.', 'Un safran chargé est un frein : chaque degré de barre au-delà de ~4° est de la traînée.') : L('Helm stayed light.', 'La barre est restée légère.')}`,
  }),
});

export const stdEfficiency = (w = 1): Criterion => ({
  id: 'eff',
  group: 'Sail efficiency',
  label: L('Flow quality on both sails', 'Qualité d\'écoulement sur les deux voiles'),
  weight: w,
  evaluate: ({ std }) => ({
    score: std.efficiency,
    note: `${L(`Average flow quality ${pct(std.avgEff)}.`, `Qualité d'écoulement moyenne ${pct(std.avgEff)}.`)} ${std.avgEff < 0.75 ? L('Sections were luffing or stalled a lot of the time.', 'Des sections ont faseyé ou décroché une bonne partie du temps.') : L('Telltales mostly flowing.', 'Penons majoritairement bien écoulés.')}`,
  }),
});

export const stdEnergy = (w = 0.8): Criterion => ({
  id: 'energy',
  group: 'Winch effort',
  label: L('Crew energy management', 'Gestion de l\'énergie de l\'équipage'),
  weight: w,
  evaluate: ({ std }) => ({
    score: std.energy,
    note: `${L(`Used ${Math.round(std.energyUsed)}% energy, lowest ${Math.round(std.minEnergy)}%.`, `${Math.round(std.energyUsed)}% d'énergie utilisée, minimum ${Math.round(std.minEnergy)}%.`)} ${std.minEnergy < 15 ? L('You emptied the tank — the next maneuver will be slow.', 'Réservoir vide — la prochaine manœuvre sera lente.') : L('Energy kept in reserve.', 'Énergie gardée en réserve.')}`,
  }),
});

export const stdAdjust = (w = 0.8): Criterion => ({
  id: 'adjust',
  group: 'Unnecessary adjustments',
  label: L('Economy of adjustments', 'Économie de réglages'),
  weight: w,
  evaluate: ({ std }) => ({
    score: std.adjustments,
    note: `${L(`${std.nAdjust} adjustments, ${std.nReversals} reversals (trim then ease within 4 s).`, `${std.nAdjust} réglages, ${std.nReversals} allers-retours (border puis choquer en moins de 4 s).`)} ${std.nReversals > 2 ? L('Hunting on the controls disturbs flow and the helm.', "Pomper sur les réglages perturbe l'écoulement et le barreur.") : L('Purposeful changes.', 'Changements réfléchis.')}`,
  }),
});

export const STANDARD = (opts: Partial<Record<'speed' | 'heel' | 'rudder' | 'eff' | 'energy' | 'adjust', number>> = {}) => [
  stdSpeed(opts.speed ?? 1.5),
  stdHeel(opts.heel ?? 1.2),
  stdRudder(opts.rudder ?? 1),
  stdEfficiency(opts.eff ?? 1),
  stdEnergy(opts.energy ?? 0.6),
  stdAdjust(opts.adjust ?? 0.6),
];

// ---------------------------------------------------------------- helpers

export const isDepower = (a: ActionLog) =>
  a.kind === 'adjust' &&
  ((a.key === 'traveller' && (a.value ?? 0) < (a.from ?? 0)) ||
    (a.key === 'mainSheet' && (a.value ?? 0) < (a.from ?? 0)) ||
    (a.key === 'backstay' && (a.value ?? 0) > (a.from ?? 0)) ||
    (a.key === 'outhaul' && (a.value ?? 0) > (a.from ?? 0)) ||
    (a.key === 'cunningham' && (a.value ?? 0) > (a.from ?? 0)) ||
    (a.key === 'hike' && (a.value ?? 0) > (a.from ?? 0)));

export const isMainDepower = (a: ActionLog) =>
  a.kind === 'adjust' &&
  ((a.key === 'traveller' && (a.value ?? 0) < (a.from ?? 0)) || (a.key === 'mainSheet' && (a.value ?? 0) < (a.from ?? 0)));

export const isPowerUp = (a: ActionLog) =>
  a.kind === 'adjust' &&
  ((a.key === 'traveller' && (a.value ?? 0) > (a.from ?? 0)) ||
    (a.key === 'backstay' && (a.value ?? 0) < (a.from ?? 0)) ||
    (a.key === 'outhaul' && (a.value ?? 0) < (a.from ?? 0)) ||
    (a.key === 'mainSheet' && (a.value ?? 0) > (a.from ?? 0)) ||
    (a.key === 'hike' && (a.value ?? 0) < (a.from ?? 0)));

export const firstAfter = (ctx: EvalCtx, t: number, pred: (a: ActionLog) => boolean) => ctx.actions.find((a) => a.t >= t && pred(a));

export function reactionCriterion(
  id: string,
  label: string,
  markName: string,
  pred: (a: ActionLog) => boolean,
  good: number,
  bad: number,
  w = 1.5,
  group: Criterion['group'] = 'Reaction time',
  allowEarly = 0,
): Criterion {
  return {
    id,
    group,
    label,
    weight: w,
    evaluate: (ctx) => {
      const t0 = ctx.marks[markName];
      if (t0 === undefined) return { score: 0, note: L('The trigger never happened.', 'L\'événement déclencheur n\'a jamais eu lieu.') };
      const a = firstAfter(ctx, t0 - allowEarly, pred);
      if (!a) return { score: 0, note: L('No relevant action was taken.', 'Aucune action pertinente n\'a été faite.') };
      const dt = Math.max(0, a.t - t0);
      const s = reactionScore(dt, good, bad);
      return { score: s, note: L(`First relevant action (${a.label}) ${a.t < t0 ? `${f1(t0 - a.t)} s before` : `${f1(dt)} s after`} the trigger.`, `Première action pertinente (${a.label}) ${a.t < t0 ? `${f1(t0 - a.t)} s avant` : `${f1(dt)} s après`} le déclencheur.`) };
    },
  };
}

/** Mean value of a sample field in [t0, t1] relative to scenario marks. */
export function avgIn(ctx: EvalCtx, t0: number, t1: number, f: (s: EvalCtx['tel'][number]) => number) {
  return mean(window(ctx.tel, t0, t1).map(f));
}

export function finalControlCriterion(
  key: ControlKey,
  label: string,
  tol: number,
  w = 1,
  group: Criterion['group'] = 'Final balance',
  bias = 0,
): Criterion {
  return {
    id: `final-${key}`,
    group,
    label,
    weight: w,
    evaluate: ({ sim }) => {
      const tolerance = tol + 0.015;
      const opt = optimalControls(sim.twsSmooth, Math.abs(sim.twa), sim.plan.headsail)[key] + bias;
      const d = sim.controls[key] - opt;
      const s = clamp(100 - (Math.max(0, Math.abs(d) - tolerance) / 0.2) * 100, 0, 100);
      const word = Math.abs(d) <= tolerance ? L('in the window', 'dans la plage') : d > 0 ? L('too much', 'trop') : L('too little', 'pas assez');
      return { score: s, note: L(`Ended at ${pct(sim.controls[key])} — reference ${pct(clamp(opt, 0, 1))} (${word}).`, `Fini à ${pct(sim.controls[key])} — référence ${pct(clamp(opt, 0, 1))} (${word}).`) };
    },
  };
}

export function timeToSpeed(ctx: EvalCtx, from: number, frac: number) {
  const s = ctx.tel.find((x) => x.t >= from && x.perf >= frac && x.maneuver === null);
  return s ? s.t - from : undefined;
}

export function accelCriterion(markName: string, frac: number, good: number, bad: number, w = 1.6, label?: string): Criterion {
  return {
    id: `accel-${markName}`,
    group: 'Acceleration',
    label: label ?? L(`Time to ${Math.round(frac * 100)}% target speed`, `Temps pour atteindre ${Math.round(frac * 100)}% de la vitesse cible`),
    weight: w,
    evaluate: (ctx) => {
      const t0 = ctx.marks[markName];
      if (t0 === undefined) return { score: 0, note: L('Not reached.', 'Non atteint.') };
      const dt = timeToSpeed(ctx, t0, frac);
      if (dt === undefined) return { score: 0, note: L(`Never reached ${Math.round(frac * 100)}% of target speed.`, `Jamais atteint ${Math.round(frac * 100)}% de la vitesse cible.`) };
      return { score: scoreLinear(-dt, -bad, -good), note: L(`Reached ${Math.round(frac * 100)}% target in ${f1(dt)} s (good < ${good} s).`, `${Math.round(frac * 100)}% de la cible atteints en ${f1(dt)} s (bien < ${good} s).`) };
    },
  };
}

export function callCriterion(id: string, label: string, calls: string[], markName: string, before: number, after: number, w = 0.8): Criterion {
  return {
    id,
    group: 'Communication',
    label,
    weight: w,
    evaluate: (ctx) => {
      const t0 = ctx.marks[markName];
      if (t0 === undefined) return { score: 0, note: L('Trigger not reached.', 'Déclencheur non atteint.') };
      const a = ctx.actions.find((x) => (x.kind === 'call' || x.kind === 'mode') && calls.some((c) => (x.tag ?? x.label).toLowerCase().includes(c)) && x.t >= t0 - before && x.t <= t0 + after);
      return a
        ? { score: 100, note: L(`${a.label} at ${f1(a.t - t0)} s relative to the event.`, `${a.label} à ${f1(a.t - t0)} s par rapport à l'événement.`) }
        : { score: 0, note: L('No call to the helm — they steer better when they know what is coming and what you are doing.', 'Aucune annonce au barreur — il barre mieux quand il sait ce qui arrive et ce que vous faites.') };
    },
  };
}
