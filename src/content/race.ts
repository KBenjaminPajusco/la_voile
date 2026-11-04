// Match Racing Challenge: a full short-course race. The player trims and communicates;
// the AI helm & tactician sail the boat. An opponent model races in parallel.
import { bestVmgAngle, optimalControls } from '../sim/polar';
import { clamp } from '../sim/physics';
import type { Criterion, RunContext, ScenarioDef } from '../sim/runner';
import { mean, scoreLinear, window } from '../sim/scoring';
import { STANDARD, f1, pct } from './criteria';
import type { WindEvent } from '../sim/wind';
import { L as tr } from '../i18n';

export const BOAT_LENGTH = 8;

export interface RaceOptions {
  tws: number;
  legLength: number; // m
  opponentSkill: number; // 0.94 .. 0.99 of target VMG
  seed: number;
  label: string;
}

export const RACE_PRESETS: RaceOptions[] = [
  { tws: 10, legLength: 220, opponentSkill: 0.9, seed: 1201, label: tr('Club race — 10 kn, forgiving opponent', 'Course de club — 10 nds, adversaire indulgent') },
  { tws: 13, legLength: 260, opponentSkill: 0.935, seed: 1301, label: tr('Grade 2 — 13 kn, gusty, solid opponent', 'Grade 2 — 13 nds, rafaleux, adversaire solide') },
  { tws: 17, legLength: 280, opponentSkill: 0.965, seed: 1701, label: tr('World Tour — 17 kn, shifty, top opponent', 'World Tour — 17 nds, bascules, adversaire de haut niveau') },
];

type Phase = 'prestart' | 'upwind1' | 'rounding1' | 'downwind' | 'rounding2' | 'upwind2' | 'finished';

const n = (c: RunContext, k: string) => Number(c.data[k] ?? 0);

function legProgress(c: RunContext): number {
  const ph = c.data.phase as Phase;
  const y = c.sim.y;
  const L = n(c, 'L');
  switch (ph) {
    case 'prestart':
      return y;
    case 'upwind1':
    case 'rounding1':
      return y;
    case 'downwind':
    case 'rounding2':
      return L + (L - y);
    case 'upwind2':
    case 'finished':
      return 2 * L + y;
  }
}

function events(o: RaceOptions): WindEvent[] {
  const g = o.tws > 15 ? 6 : 5;
  return [
    { kind: 'gust', start: 45, ramp: 2, hold: 9, amount: g, label: tr('Puff', 'Risée') },
    { kind: 'shift', start: 70, ramp: 6, hold: 0, amount: -8, label: tr('Header coming — 8 degrees.', 'Refusante qui arrive — 8 degrés.') },
    { kind: 'lull', start: 100, ramp: 2.5, hold: 8, amount: 4 },
    { kind: 'gust', start: 175, ramp: 1.5, hold: 8, amount: g + 1 },
    { kind: 'shift', start: 210, ramp: 6, hold: 0, amount: 6, label: tr('Right shift filling in.', 'Bascule à droite qui rentre.') },
    { kind: 'gust', start: 265, ramp: 1.5, hold: 8, amount: g },
    { kind: 'lull', start: 310, ramp: 2, hold: 8, amount: 3 },
  ];
}

const tackQuality = (c: Parameters<Criterion['evaluate']>[0], kind: 'tack' | 'gybe') => {
  const ms = c.sim.maneuvers.filter((m) => m.kind === kind);
  if (!ms.length) return { score: 50, note: tr(`No ${kind}s.`, kind === 'tack' ? 'Aucun virement.' : 'Aucun empannage.') };
  const scores = ms.map((m) => {
    let s = 100;
    if (m.autoReleased) s -= 50;
    if (m.releaseTwa !== undefined) {
      const old = Math.sign(m.releaseTwa) !== Math.sign(m.targetTwa);
      const a = kind === 'tack' ? Math.abs(m.releaseTwa) : 180 - Math.abs(m.releaseTwa);
      if (old && a > 18) s -= 30;
      if (!old) s -= clamp(a * 6, 0, 45);
    }
    const t0 = m.crossedAt ?? m.start;
    const s90 = c.tel.find((x) => x.t > t0 && x.perf > 0.9 && x.maneuver === null);
    const dt = s90 ? s90.t - t0 : 25;
    s -= clamp((dt - 7) * 3.5, 0, 40);
    return clamp(s, 0, 100);
  });
  return { score: mean(scores), note: tr(`${ms.length} ${kind}(s), average quality ${Math.round(mean(scores))}/100 (release timing + acceleration to 90 %).`, `${ms.length} ${kind === 'tack' ? 'virement(s)' : 'empannage(s)'}, qualité moyenne ${Math.round(mean(scores))}/100 (moment du largage + accélération à 90 %).`) };
};

export function buildRace(o: RaceOptions): ScenarioDef {
  const L = o.legLength;
  const GUN = 14;
  return {
    id: `race-${o.tws}`,
    mode: 'race',
    title: tr('Match Racing Challenge', 'Défi Match Racing'),
    subtitle: o.label,
    level: 8,
    skills: ['tactics', 'maneuvers', 'headsail', 'mainsail', 'energy'],
    pressure: 3,
    duration: 600,
    evalFrom: GUN,
    brief: tr(`Windward–leeward match race in ${o.tws} knots: pre-start, upwind leg with tacks, windward rounding & hoist, downwind with gybes, leeward rounding & douse, upwind finish. Leg length ${L} m. The helm and tactician sail the boat: you are responsible for trim, sheets in maneuvers, energy, and communication.`, `Match race banane dans ${o.tws} nœuds : pré-départ, bord de près avec virements, passage de la bouée au vent & envoi, portant avec empannages, passage de la bouée sous le vent & affalage, arrivée au près. Longueur de bord ${L} m. Le barreur et le tacticien mènent le bateau : vous êtes responsable du réglage, des écoutes en manœuvre, de l'énergie et de la communication.`),
    task: tr('Win the race. Keep the boat at target speed and in balance through every phase; nail the sheet work in each maneuver; communicate pressure and modes.', 'Gagnez la course. Gardez le bateau à la vitesse cible et équilibré à chaque phase ; soignez le travail d\'écoutes à chaque manœuvre ; annoncez la pression et les modes.'),
    focusControls: ['jibSheet', 'mainSheet', 'traveller', 'backstay', 'hike'],
    config: () => ({
      wind: { tws: o.tws, twd: 0, gustiness: 0.45, shiftiness: 0.35, seed: o.seed, events: events(o) },
      sea: o.tws > 15 ? 2 : 1,
      twa: 55,
      fixedTwa: 55,
      v: 1,
      heel: 0,
      helmMode: 'accel',
      controls: { ...optimalControls(o.tws, 38), jibSheet: 0.3, mainSheet: 0.25 },
    }),
    script: [
      {
        at: 0.1,
        run: (c) => {
          c.data.phase = 'prestart';
          c.data.L = L;
          c.data.opp = -22;
          c.data.oppV = 1;
          c.data.legs = 0;
          c.sim.y = -22;
          c.prompt(tr('Pre-start: hold position, sails luffing. GO comes at 8 s to the gun.', 'Pré-départ : tenez la position, voiles qui faseyent. Le GO tombe à 8 s du coup de canon.'), 'info', 5);
        },
      },
      { at: GUN - 8, run: (c) => (c.mark('go'), (c.sim.fixedTwa = 50), c.prompt(tr('GO — 8 seconds to the gun! Jib first.', 'GO — 8 secondes avant le coup de canon ! Le foc d\'abord.'), 'alarm', 3)) },
      { at: GUN - 4, run: (c) => (c.sim.fixedTwa = undefined) },
      {
        at: GUN,
        run: (c) => {
          c.mark('gun');
          c.data.gunPerf = c.sim.v / c.sim.target();
          c.data.phase = 'upwind1';
          c.prompt(c.sim.y > 0 ? tr('GUN — you were over early! (penalty: 1 boat length)', 'CANON — vous étiez parti trop tôt ! (pénalité : 1 longueur)') : tr('GUN! Upwind leg — speed and height.', 'CANON ! Bord de près — vitesse et cap.'), c.sim.y > 0 ? 'alarm' : 'good', 3);
          if (c.sim.y > 0) c.data.opp = n(c, 'opp') + BOAT_LENGTH;
        },
      },
      { at: GUN + 30, run: (c) => (c.data.phase === 'upwind1' ? c.prompt(tr('Tactician: "They are footing to leeward — keep the speed on!"', 'Tacticien : « Ils abattent sous le vent pour la vitesse — gardez la vitesse ! »'), 'info', 4) : undefined) },
    ],
    onStep: (c, dt) => {
      const sim = c.sim;
      const ph = c.data.phase as Phase;
      if (!ph || ph === 'finished') return;
      // ---- opponent model: VMG at its skill level, losses in maneuvers
      if (sim.t > GUN - 8) {
        const oppP = n(c, 'opp');
        const upwind = oppP < L || oppP > 2 * L;
        const best = bestVmgAngle(sim.twsSmooth, upwind);
        const vmgTarget = best.vmg * o.opponentSkill * (1 - 0.035 * sim.sea);
        let oppV = n(c, 'oppV');
        oppV += (vmgTarget - oppV) * clamp(dt / 4, 0, 1);
        c.data.oppV = oppV;
        const p0 = n(c, 'opp');
        let p1 = p0 + oppV * 0.514444 * dt;
        // opponent tacks/gybes every ~70 m of leg progress, losing ~1.2 BL
        const lastM = n(c, 'oppLastM');
        if (sim.t > GUN && p1 - lastM > 70) {
          c.data.oppLastM = p1;
          p1 -= BOAT_LENGTH * 1.1;
        }
        c.data.opp = p1;
      }
      const me = legProgress(c);
      c.data.me = me;

      // ---- tactician / helm decisions
      const busy = sim.maneuver && !sim.maneuver.done;
      const xAway = sim.x * Math.sign(Math.sin((sim.heading * Math.PI) / 180));
      if (ph === 'upwind1' || ph === 'upwind2') {
        if (!busy && sim.t - n(c, 'lastTack') > 18 && xAway > 70) {
          c.data.lastTack = sim.t;
          c.prompt(tr('Tactician: "Tack in 3… prepare!"', 'Tacticien : « Virement dans 3… préparez ! »'), 'warn', 3);
          c.data.tackAt = sim.t + 3;
        }
        if (n(c, 'tackAt') > 0 && sim.t >= n(c, 'tackAt')) {
          c.data.tackAt = 0;
          sim.commandTack();
        }
        // header -> tack on it
        if (!busy && ph === 'upwind1' && !c.data.headerTack && sim.t > 78 && sim.t < 120 && sim.t - n(c, 'lastTack') > 12) {
          c.data.headerTack = true;
          c.data.lastTack = sim.t;
          c.prompt(tr('Tactician: "We are headed — tacking in 3!"', 'Tacticien : « On est refusés — on vire dans 3 ! »'), 'warn', 3);
          c.data.tackAt = sim.t + 3;
        }
        const target = ph === 'upwind1' ? L : L * 1.6 - 0; // finish line at 0.6 L up the second beat
        if (ph === 'upwind1' && sim.y > L - 22 && !busy && !c.data.bearAwayCalled) {
          c.data.bearAwayCalled = true;
          c.prompt(tr('Tactician: "Mark in 4 — bear away & hoist on the mark!"', 'Tacticien : « Bouée dans 4 — abattée & envoi à la bouée ! »'), 'warn', 4);
        }
        if (ph === 'upwind1' && sim.y >= L && !busy) {
          c.data.phase = 'rounding1';
          c.mark('wm');
          sim.commandBearAway(140, true);
        }
        if (ph === 'upwind2' && sim.y >= target - L) {
          c.data.phase = 'finished';
          c.mark('finish');
          const margin = (me - n(c, 'opp')) / BOAT_LENGTH;
          c.data.margin = margin;
          c.prompt(margin > 0 ? tr(`FINISH — you win by ${margin.toFixed(1)} boat lengths!`, `ARRIVÉE — vous gagnez de ${margin.toFixed(1)} longueurs !`) : tr(`FINISH — you lose by ${(-margin).toFixed(1)} boat lengths.`, `ARRIVÉE — vous perdez de ${(-margin).toFixed(1)} longueurs.`), margin > 0 ? 'good' : 'alarm', 8);
          c.end(margin > 0 ? 'win' : 'loss');
        }
      }
      if (ph === 'rounding1' && sim.maneuver?.done && sim.plan.headsail === 'gennaker') {
        c.data.phase = 'downwind';
        c.data.lastGybe = sim.t;
      }
      if (ph === 'downwind') {
        if (!busy && sim.t - n(c, 'lastGybe') > 15 && xAway > 70 && sim.y > 60) {
          c.data.lastGybe = sim.t;
          c.prompt(tr('Tactician: "Gybe in 4… prep the lazy sheet!"', 'Tacticien : « Empannage dans 4… préparez l\'écoute au repos ! »'), 'warn', 4);
          c.data.gybeAt = sim.t + 4;
        }
        if (n(c, 'gybeAt') > 0 && sim.t >= n(c, 'gybeAt')) {
          c.data.gybeAt = 0;
          sim.commandGybe();
        }
        if (sim.y < 60 && !c.data.douseCalled && !busy) {
          c.data.douseCalled = true;
          c.prompt(tr('Tactician: "Leeward mark in 5 — douse, then trim to the turn."', 'Tacticien : « Bouée sous le vent dans 5 — affalage, puis bordez avec le virage. »'), 'warn', 4);
        }
        if (sim.y <= 28 && !busy) {
          c.data.phase = 'rounding2';
          c.mark('lm');
          sim.commandHardenUp(true);
        }
      }
      if (ph === 'rounding2' && sim.maneuver?.done) {
        c.data.phase = 'upwind2';
        c.data.lastTack = sim.t;
      }
      if (sim.t > 560 && c.data.phase !== 'finished') {
        c.data.phase = 'finished';
        c.data.margin = (me - n(c, 'opp')) / BOAT_LENGTH;
        c.end('time');
      }
    },
    hud: (c) => {
      const ph = (c.data.phase as Phase) ?? 'prestart';
      const me = n(c, 'me');
      const opp = n(c, 'opp');
      const delta = (me - opp) / BOAT_LENGTH;
      const L0 = n(c, 'L') || L;
      const names: Record<Phase, string> = {
        prestart: tr('PRE-START', 'PRÉ-DÉPART'),
        upwind1: tr('UPWIND 1', 'PRÈS 1'),
        rounding1: tr('WINDWARD MARK', 'BOUÉE AU VENT'),
        downwind: tr('DOWNWIND', 'PORTANT'),
        rounding2: tr('LEEWARD MARK', 'BOUÉE SOUS LE VENT'),
        upwind2: tr('UPWIND — FINISH', 'PRÈS — ARRIVÉE'),
        finished: tr('FINISHED', 'TERMINÉ'),
      };
      const toMark =
        ph === 'upwind1' || ph === 'rounding1' || ph === 'prestart'
          ? L0 - c.sim.y
          : ph === 'downwind' || ph === 'rounding2'
            ? c.sim.y - 28
            : 0.6 * L0 - c.sim.y;
      const clock = c.sim.t < GUN ? `-${(GUN - c.sim.t).toFixed(0)} s` : `${Math.floor((c.sim.t - GUN) / 60)}:${String(Math.floor((c.sim.t - GUN) % 60)).padStart(2, '0')}`;
      return [
        { label: tr('Phase', 'Phase'), value: names[ph], tone: 'info' },
        { label: tr('Race clock', 'Chrono course'), value: clock },
        { label: tr('To mark', 'À la bouée'), value: `${Math.max(0, toMark).toFixed(0)} m` },
        { label: tr('vs opponent', 'vs adversaire'), value: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} ${tr('BL', 'L')}`, tone: delta >= 0 ? 'good' : 'alarm' },
      ];
    },
    criteria: [
      {
        id: 'result',
        group: 'Decision',
        label: tr('Race result', 'Résultat de la course'),
        weight: 2,
        evaluate: (c) => {
          const m = Number(c.data.margin ?? -5);
          return { score: m > 0 ? clamp(80 + m * 4, 80, 100) : clamp(70 + m * 8, 0, 70), note: m > 0 ? tr(`Won by ${f1(m)} boat lengths.`, `Gagnée de ${f1(m)} longueurs.`) : tr(`Lost by ${f1(-m)} boat lengths.`, `Perdue de ${f1(-m)} longueurs.`) };
        },
      },
      {
        id: 'start',
        group: 'Acceleration',
        label: tr('Speed at the gun', 'Vitesse au coup de canon'),
        weight: 1.2,
        evaluate: (c) => {
          const p = Number(c.data.gunPerf ?? 0);
          return { score: scoreLinear(p, 0.4, 0.74), note: tr(`${pct(p)} of target at the gun.`, `${pct(p)} de la cible au coup de canon.`) };
        },
      },
      {
        id: 'upwind',
        group: 'Boat speed',
        label: tr('Upwind speed (outside maneuvers)', 'Vitesse au près (hors manœuvres)'),
        weight: 1.5,
        evaluate: (c) => {
          const w = c.tel.filter((s) => s.t > GUN + 4 && Math.abs(s.twa) < 70 && s.maneuver === null);
          const p = mean(w.map((s) => s.perf));
          return { score: scoreLinear(p, 0.82, 0.98), note: tr(`Averaged ${pct(p)} of upwind target.`, `Moyenne de ${pct(p)} de la cible au près.`) };
        },
      },
      { id: 'tacks', group: 'Timing', label: tr('Tack sheet work', 'Travail d\'écoutes en virement'), weight: 1.3, evaluate: (c) => tackQuality(c, 'tack') },
      {
        id: 'wm',
        group: 'Trim adjustments',
        label: tr('Windward rounding: main eased with the bear-away', 'Bouée au vent : GV choquée avec l\'abattée'),
        weight: 0.9,
        evaluate: (c) => {
          const t = c.marks.wm;
          if (t === undefined) return { score: 0, note: tr('Did not reach the windward mark.', 'Bouée au vent non atteinte.') };
          const a = c.actions.find((x) => x.key === 'mainSheet' && x.t > t - 2 && x.t < t + 4 && (x.value ?? 1) < (x.from ?? 0));
          return a ? { score: 100, note: tr(`Main eased ${f1(a.t - t)} s from the start of the turn.`, `GV choquée ${f1(a.t - t)} s après le début du virage.`) } : { score: 20, note: tr('Main not eased — the helm fought weather helm to bear away.', 'GV non choquée — le barreur a lutté contre la barre ardente pour abattre.') };
        },
      },
      {
        id: 'downwind',
        group: 'Sail efficiency',
        label: tr('Downwind: kite full and fast', 'Portant : spi plein et rapide'),
        weight: 1.3,
        evaluate: (c) => {
          const w = c.tel.filter((s) => Math.abs(s.twa) > 110 && s.maneuver === null);
          if (!w.length) return { score: 0, note: tr('No downwind leg.', 'Pas de bord de portant.') };
          const col = c.tel.filter((s) => s.collapsed).length * 0.25;
          const p = mean(w.map((s) => s.perf));
          return { score: clamp(scoreLinear(p, 0.78, 0.97) - col * 4, 0, 100), note: tr(`Downwind ${pct(p)} of target, kite collapsed ${f1(col)} s.`, `Portant à ${pct(p)} de la cible, spi fermé ${f1(col)} s.`) };
        },
      },
      { id: 'gybes', group: 'Timing', label: tr('Gybe sheet work', 'Travail d\'écoutes en empannage'), weight: 0.9, evaluate: (c) => tackQuality(c, 'gybe') },
      {
        id: 'lm',
        group: 'Trim adjustments',
        label: tr('Leeward rounding exit speed', 'Vitesse de sortie de bouée sous le vent'),
        weight: 0.9,
        evaluate: (c) => {
          const t = c.marks.lm;
          if (t === undefined) return { score: 0, note: tr('Did not reach the leeward mark.', 'Bouée sous le vent non atteinte.') };
          const p = mean(window(c.tel, t + 8, t + 18).map((s) => s.perf));
          return { score: scoreLinear(p, 0.7, 0.93), note: tr(`${pct(p)} of target 8–18 s after the rounding.`, `${pct(p)} de la cible 8–18 s après le passage de bouée.`) };
        },
      },
      {
        id: 'comms',
        group: 'Communication',
        label: tr('Calls to the helm', 'Annonces au barreur'),
        weight: 0.8,
        evaluate: (c) => {
          const k = c.actions.filter((a) => a.kind === 'call' || a.kind === 'mode').length;
          return { score: clamp(k * 14, 0, 100), note: tr(`${k} calls / mode changes. Pressure, lulls and speed calls let the helm steer for the conditions.`, `${k} annonces / changements de mode. Les annonces de pression, de molles et de vitesse permettent au barreur de barrer selon les conditions.`) };
        },
      },
      ...STANDARD({ speed: 0.6, heel: 1, rudder: 0.8, eff: 0.6, energy: 0.8, adjust: 0.4 }),
    ],
    expectedAdjustments: 60,
    energyBudget: 160,
    debrief: {
      physics:
        tr('A match race is won by small, repeated gains: speed at the gun, clean tacks (release timing and fast tailing), keeping the boat in its heel/helm window through puffs and lulls, and easing/trimming with each turn. Every boat length lost at a maneuver must be recovered with speed on the straight lines — usually impossible against a good opponent.', 'Un match race se gagne par de petits gains répétés : vitesse au coup de canon, virements propres (moment du largage et reprise rapide), bateau gardé dans sa plage de gîte/barre dans les risées et les molles, et choquer/border à chaque virage. Chaque longueur perdue en manœuvre doit être reprise en vitesse sur les bords — généralement impossible face à un bon adversaire.'),
      ideal: [
        tr('Pre-start: jib first at GO, accel mode, full speed at the gun.', 'Pré-départ : le foc d\'abord au GO, mode accel, pleine vitesse au coup de canon.'),
        tr('Upwind: play the traveller with the puffs, keep the jib working, call pressure.', 'Près : jouez le chariot de GV dans les risées, gardez le foc efficace, annoncez la pression.'),
        tr('Tacks: prep, release at head-to-wind, tail hard, accel trim, then full trim.', 'Virements : préparez, larguez face au vent, reprenez fort, réglage accel, puis bordé complet.'),
        tr('Windward mark: ease main with the turn, backstay off, kite to the curl.', 'Bouée au vent : choquez la GV avec le virage, pataras relâché, spi au frisé.'),
        tr('Gybes: release near dead downwind, fill fast on the new side.', 'Empannages : larguez près du vent arrière, remplissez vite sur le nouveau bord.'),
        tr('Leeward mark: trim to the turn, backstay/outhaul on, then accelerate.', 'Bouée sous le vent : bordez avec le virage, pataras/bordure étarqués, puis accélérez.'),
      ],
      commonErrors: [tr('Late sheet release in tacks.', 'Largage d\'écoute tardif en virement.'), tr('Forgetting to ease the main at the bear-away.', 'Oublier de choquer la GV à l\'abattée.'), tr('Running out of energy before the last beat.', 'Manquer d\'énergie avant le dernier bord de près.')],
    },
    hints: [tr('A = prep sheet, R = release, 1 = pressure call', 'A = préparer l\'écoute, R = larguer, 1 = annonce de pression'), tr('Shift = sprint grind, Space = pause', 'Maj = sprint au moulin, Espace = pause')],
  };
}
