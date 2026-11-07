// Free-practice session builder for the Live Simulator.
import { optimalControls } from '../sim/polar';
import type { ScenarioDef } from '../sim/runner';
import { mulberry32 } from '../sim/rng';
import type { WindEvent } from '../sim/wind';
import { STANDARD } from './criteria';
import type { Controls } from './types';
import { NEUTRAL_UPWIND } from '../sim/physics';
import { L } from '../i18n';

const POINT_FR: Record<FreeOptions['point'], string> = { upwind: 'au près', reach: 'travers', downwind: 'au portant' };

export interface FreeOptions {
  tws: number;
  gustiness: number; // 0..1
  shifts: number; // 0..1
  sea: number; // 0..3
  point: 'upwind' | 'reach' | 'downwind';
  start: 'good' | 'neutral' | 'bad';
  tactician: boolean;
  seed: number;
  /** downwind kite: asymmetric on the sprit (J/80) or symmetric on a pole */
  kite?: 'asym' | 'sym';
}

export const DEFAULT_FREE: FreeOptions = { tws: 12, gustiness: 0.5, shifts: 0.4, sea: 1, point: 'upwind', start: 'neutral', tactician: false, seed: 42, kite: 'asym' };

export function buildFree(o: FreeOptions): ScenarioDef {
  const rand = mulberry32(o.seed);
  const events: WindEvent[] = [];
  let t = 15;
  while (t < 1800) {
    const r = rand();
    if (o.gustiness > 0 && r < 0.45 + o.gustiness * 0.3) {
      events.push({ kind: rand() < 0.62 ? 'gust' : 'lull', start: t, ramp: 1.5 + rand() * 2, hold: 5 + rand() * 8, amount: (2 + rand() * 5) * (0.4 + o.gustiness) });
    } else if (o.shifts > 0) {
      events.push({ kind: 'shift', start: t, ramp: 6, hold: 0, amount: (rand() - 0.5) * 22 * o.shifts, revert: rand() < 0.5 });
    }
    t += 18 + rand() * 30;
  }
  const twa = o.point === 'upwind' ? 38 : o.point === 'reach' ? 95 : 140;
  const headsail = o.point === 'downwind' ? 'gennaker' : 'jib';
  const sym = o.kite === 'sym';
  const opt = optimalControls(o.tws, twa, headsail === 'gennaker' && sym ? 'spinnaker' : headsail);
  let controls: Controls = opt;
  if (o.start === 'neutral') controls = { ...NEUTRAL_UPWIND, jibSheet: o.point === 'upwind' ? 0.8 : 0.45, mainSheet: o.point === 'upwind' ? 0.9 : 0.35, traveller: o.point === 'upwind' ? 0.6 : 0.5 };
  if (o.start === 'neutral' && sym && headsail === 'gennaker') controls = { ...controls, jibLead: 0.5, jibHalyard: 0.4 }; // guy half way, pole mid height
  if (o.start === 'bad') controls = { ...opt, jibSheet: o.point === 'upwind' ? 1 : 0.2, mainSheet: 1, traveller: 0.8, backstay: o.tws > 14 ? 0 : 1, outhaul: 0, vang: 0, hike: 0.2, jibLead: 0.1 };
  return {
    id: `free-${o.point}${sym ? '-sym' : ''}`,
    mode: 'situation',
    title: L('Free practice', 'Entraînement libre'),
    subtitle: L(`${o.tws} kn · ${o.point} · sea ${o.sea} · gusts ${Math.round(o.gustiness * 100)}% · shifts ${Math.round(o.shifts * 100)}%`, `${o.tws} nds · ${POINT_FR[o.point]} · mer ${o.sea} · risées ${Math.round(o.gustiness * 100)}% · bascules ${Math.round(o.shifts * 100)}%`),
    level: 1,
    skills: ['headsail', 'mainsail', 'balance'],
    pressure: 1,
    duration: 1800,
    evalFrom: 5,
    brief: L('Open water. Play with every control, watch the sail shapes and telltales, feel the gusts. End the session any time for a performance debrief.', 'Plan d\'eau libre. Jouez avec tous les réglages, observez la forme des voiles et les penons, sentez les risées. Terminez la session quand vous voulez pour un debrief de performance.'),
    task: o.tactician ? L('The tactician will call tacks/gybes regularly — practice your sheet work.', 'Le tacticien annoncera régulièrement des virements/empannages — travaillez vos écoutes.') : L('Keep the boat at target speed with a balanced helm. Ask the helm to tack/gybe when you want.', 'Gardez le bateau à la vitesse cible avec une barre équilibrée. Demandez au barreur de virer/empanner quand vous voulez.'),
    focusControls: [],
    config: () => ({
      wind: { tws: o.tws, twd: 0, gustiness: o.gustiness, shiftiness: o.shifts, seed: o.seed, events },
      sea: o.sea,
      twa,
      fixedTwa: o.point === 'reach' ? 95 : undefined,
      v: o.start === 'good' ? (o.point === 'upwind' ? 5 : 7) : 3,
      heel: 10,
      headsail,
      kiteSym: sym,
      controls,
    }),
    script: [],
    onStep: o.tactician
      ? (c) => {
          const s = c.sim;
          const last = Number(c.data.last ?? 0);
          if (s.maneuver && !s.maneuver.done) return;
          if (s.t - last > 40 && !c.data.warned) {
            c.data.warned = true;
            c.data.at = s.t + 5;
            c.prompt(Math.abs(s.twa) < 95 ? L('Tactician: "Tack in 5 — prep the lazy sheet!"', 'Tacticien : « Virement dans 5 — préparez l\'écoute au repos ! »') : L('Tactician: "Gybe in 5 — prep!"', 'Tacticien : « Empannage dans 5 — préparez ! »'), 'warn', 4);
          }
          if (c.data.warned && s.t >= Number(c.data.at)) {
            c.data.warned = false;
            c.data.last = s.t;
            if (Math.abs(s.twa) < 95) s.commandTack();
            else s.commandGybe();
          }
        }
      : undefined,
    criteria: STANDARD({ speed: 2, heel: 1.2, rudder: 1.2, eff: 1, energy: 0.6, adjust: 0.4 }),
    expectedAdjustments: 40,
    energyBudget: 200,
    debrief: {
      physics:
        L('Free practice measures the fundamentals: average speed relative to target, heel and rudder kept in the fast window, attached flow on both sails, crew energy and economy of adjustments. Speed comes from flow; balance (heel and helm) decides how much of that force becomes drive rather than drag.', 'L\'entraînement libre mesure les fondamentaux : vitesse moyenne par rapport à la cible, gîte et safran gardés dans la plage rapide, écoulement attaché sur les deux voiles, énergie de l\'équipage et économie de réglages. La vitesse vient de l\'écoulement ; l\'équilibre (gîte et barre) décide quelle part de cette force devient propulsion plutôt que traînée.'),
      ideal: [L('Trim to the telltales first.', 'Réglez d\'abord aux penons.'), L('Use the traveller and backstay to keep heel in the 18–24° window in breeze.', 'Utilisez le chariot de GV et le pataras pour garder la gîte entre 18 et 24° dans la brise.'), L('Keep the rudder below ~5°.', 'Gardez le safran sous ~5°.'), L('Adjust purposefully: change, wait, observe.', 'Réglez avec intention : changez, attendez, observez.')],
      commonErrors: [L('Constant hunting on the sheets.', 'Pomper sans arrêt sur les écoutes.'), L('Ignoring heel and helm load.', 'Ignorer la gîte et la charge de barre.')],
    },
    hints: [L('Press the keyboard icon for shortcuts.', 'Appuyez sur l\'icône clavier pour les raccourcis.'), L('Switch to "Sail shape" to see the sections.', 'Passez sur « Forme des voiles » pour voir les sections.')],
  };
}
