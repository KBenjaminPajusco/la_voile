// Maneuver Lab: timed maneuver exercises evaluated on preparation, initial response,
// trim adjustments, timing, acceleration and final balance.
import { L } from '../i18n';
import { optimalControls } from '../sim/polar';
import { clamp } from '../sim/physics';
import type { Criterion, EvalCtx, ScenarioDef } from '../sim/runner';
import { mean, scoreLinear, window } from '../sim/scoring';
import {
  accelCriterion,
  avgIn,
  callCriterion,
  f1,
  finalControlCriterion,
  isDepower,
  isPowerUp,
  pct,
  reactionCriterion,
  stdEnergy,
  stdAdjust,
} from './criteria';

const W = (tws: number, seed: number, events: ScenarioDef['config'] extends () => infer C ? (C extends { wind: { events: infer E } } ? E : never) : never = []) => ({
  tws,
  twd: 0,
  gustiness: 0.2,
  shiftiness: 0.15,
  seed,
  events,
});

const prepCriterion = (markName: string, w = 1): Criterion => ({
  id: 'prep',
  group: 'Preparation',
  label: L('Lazy sheet loaded before the turn', 'Écoute molle préparée avant le virage'),
  weight: w,
  evaluate: (ctx) => {
    const t = ctx.marks[markName];
    const p = ctx.actions.find((a) => a.kind === 'prep');
    if (!p) return { score: 0, note: L('Not prepared: without the lazy sheet on the winch and the handle ready, tailing is ~2× slower.', "Pas préparé : sans l'écoute molle sur le winch et la manivelle en place, embraquer est ~2× plus lent.") };
    if (t !== undefined && p.t > t) return { score: 40, note: L(`Prepared ${f1(p.t - t)} s after the helm started turning — too late.`, `Préparé ${f1(p.t - t)} s après le début du virage du barreur — trop tard.`) };
    return { score: 100, note: L(`Prepared ${t !== undefined ? f1(t - p.t) + ' s before the turn' : ''}.`, `Préparé ${t !== undefined ? f1(t - p.t) + ' s avant le virage' : ''}.`) };
  },
});

const releaseCriterion = (kind: 'tack' | 'gybe', w = 1.5): Criterion => ({
  id: 'release',
  group: 'Initial response',
  label: kind === 'tack' ? L('Release timing (bow through the wind)', "Moment du largage (étrave dans le lit du vent)") : L('Release timing (stern through the wind)', "Moment du largage (arrière dans le lit du vent)"),
  weight: w,
  evaluate: (ctx) => {
    const m = ctx.sim.maneuvers.find((x) => x.kind === kind);
    if (!m) return { score: 0, note: L('Maneuver did not happen.', "La manœuvre n'a pas eu lieu.") };
    if (m.autoReleased) return { score: 10, note: L('You never released — the old sheet held the sail backed until the pit blew it. The backed sail brakes the boat and pushes the bow.', "Vous n'avez jamais largué — l'ancienne écoute a tenu la voile à contre jusqu'à ce que le piano la largue. La voile à contre freine le bateau et repousse l'étrave.") };
    if (m.releasedAt === undefined || m.releaseTwa === undefined) return { score: 0, note: L('No release.', 'Pas de largage.') };
    const twa = m.releaseTwa;
    const oldSide = Math.sign(twa) !== Math.sign(m.targetTwa);
    const a = Math.abs(twa);
    if (kind === 'tack') {
      if (oldSide && a > 18) return { score: 35, note: L(`Released at ${f1(a)}° TWA on the old tack — far too early: the jib stopped driving and stopped helping the bow through.`, `Largué à ${f1(a)}° de TWA sur l'ancien bord — bien trop tôt : le foc a cessé de propulser et d'aider l'étrave à passer.`) };
      if (oldSide) return { score: a > 10 ? 80 : 100, note: L(`Released ${f1(a)}° before head-to-wind — ${a > 10 ? 'slightly early' : 'perfect: the jib just started to back'}.`, `Largué ${f1(a)}° avant le vent debout — ${a > 10 ? 'un peu tôt' : 'parfait : le foc commençait juste à prendre à contre'}.`) };
      return { score: clamp(100 - (a - 2) * 9, 15, 95), note: L(`Released ${f1(a)}° after crossing — the jib was backed and braking.`, `Largué ${f1(a)}° après le passage — le foc était à contre et freinait.`) };
    }
    // gybe: |twa| ~180 at the crossing
    const off = 180 - a;
    if (oldSide && off > 20) return { score: 30, note: L(`Released ${f1(off)}° before dead downwind — kite collapses early.`, `Largué ${f1(off)}° avant le plein vent arrière — le spi s'effondre trop tôt.`) };
    if (oldSide) return { score: 100, note: L(`Released ${f1(off)}° before the stern crossed — clean.`, `Largué ${f1(off)}° avant le passage de l'arrière — propre.`) };
    return { score: clamp(100 - off * 5, 20, 90), note: L(`Released ${f1(off)}° after the stern crossed — the kite wrapped/backed.`, `Largué ${f1(off)}° après le passage de l'arrière — le spi s'est enroulé / mis à contre.`) };
  },
});

const tailCriterion = (markName: string, frac: number, good: number, bad: number, w = 1.2): Criterion => ({
  id: 'tail',
  group: 'Timing',
  label: L(`Sheet in to ${Math.round(frac * 100)}% of final quickly`, `Écoute rentrée rapidement à ${Math.round(frac * 100)} % du réglage final`),
  weight: w,
  evaluate: (ctx) => {
    const m = ctx.sim.maneuvers[0];
    const t0 = ctx.marks[markName] ?? m?.crossedAt;
    if (t0 === undefined) return { score: 0, note: L('Not reached.', 'Non atteint.') };
    const final = mean(window(ctx.tel, ctx.sim.t - 4, ctx.sim.t).map((s) => s.jibSheet));
    const s = ctx.tel.find((x) => x.t >= t0 && x.jibSheet >= final * frac);
    if (!s) return { score: 0, note: L('Sheet never reached working trim.', "L'écoute n'a jamais atteint le réglage de travail.") };
    const dt = s.t - t0;
    return { score: scoreLinear(-dt, -bad, -good), note: L(`${Math.round(frac * 100)}% of final trim ${f1(dt)} s after the crossing. Tail while the sail is unloaded — once it fills you are grinding against load.`, `${Math.round(frac * 100)} % du réglage final ${f1(dt)} s après le passage. Embraquez tant que la voile est déchargée — une fois gonflée, vous moulinez contre la charge.`) };
  },
});

const minSpeedCriterion = (w = 1): Criterion => ({
  id: 'minspeed',
  group: 'Acceleration',
  label: L('Speed retained through the maneuver', 'Vitesse conservée pendant la manœuvre'),
  weight: w,
  evaluate: (ctx) => {
    const m = ctx.sim.maneuvers[0];
    if (!m) return { score: 0, note: '—' };
    const r = (m.minSpeed ?? 0) / Math.max(0.1, m.entrySpeed);
    return { score: scoreLinear(r, 0.4, 0.66), note: L(`Minimum speed ${f1(m.minSpeed ?? 0)} kn from ${f1(m.entrySpeed)} kn (${pct(r)} retained).`, `Vitesse minimale ${f1(m.minSpeed ?? 0)} nds depuis ${f1(m.entrySpeed)} nds (${pct(r)} conservés).`) };
  },
});

const balanceEnd = (w = 1): Criterion => ({
  id: 'balance-end',
  group: 'Final balance',
  label: L('Balanced boat at the end', 'Bateau équilibré à la fin'),
  weight: w,
  evaluate: (ctx) => {
    const t = ctx.sim.t;
    const heel = avgIn(ctx, t - 5, t, (s) => s.heel);
    const rud = avgIn(ctx, t - 5, t, (s) => s.rudder);
    const perf = avgIn(ctx, t - 5, t, (s) => s.perf);
    const s = scoreLinear(perf, 0.82, 0.97) * 0.6 + (heel < 26 && heel > 2 ? 20 : 0) + (rud < 6 && rud > -1 ? 20 : 0);
    return { score: s, note: L(`Last 5 s: ${pct(perf)} target, heel ${f1(heel)}°, rudder ${f1(rud)}°.`, `5 dernières s : ${pct(perf)} de la cible, gîte ${f1(heel)}°, safran ${f1(rud)}°.`) };
  },
});

const accelTrim = (from: string, w = 1.2): Criterion => ({
  id: 'accel-trim',
  group: 'Trim adjustments',
  label: L('Jib eased a few % while accelerating', 'Foc choqué de quelques % pendant la relance'),
  weight: w,
  evaluate: (ctx: EvalCtx) => {
    const t0 = ctx.marks[from] ?? ctx.sim.maneuvers[0]?.crossedAt;
    if (t0 === undefined) return { score: 0, note: '—' };
    const opt = optimalControls(ctx.sim.tws, 38).jibSheet;
    const w0 = window(ctx.tel, t0 + 2, t0 + 7);
    const js = mean(w0.map((s) => s.jibSheet));
    const d = opt - js;
    const s = d >= 0.03 && d <= 0.13 ? 100 : d < 0.03 ? clamp(40 + d * 1200, 0, 85) : clamp(100 - (d - 0.13) * 500, 0, 100);
    return {
      score: s,
      note: L(
        `Jib averaged ${pct(js)} in the first seconds after the tack (full trim ≈ ${pct(opt)}). ${d < 0.03 ? 'Full trim at low speed: high side force, keel near stall.' : d > 0.13 ? 'Too far eased: luffing.' : 'Good: eased for acceleration.'}`,
        `Foc en moyenne à ${pct(js)} dans les premières secondes après le virement (bordé à fond ≈ ${pct(opt)}). ${d < 0.03 ? 'Bordé à fond à basse vitesse : force latérale élevée, quille proche du décrochage.' : d > 0.13 ? 'Trop choqué : ça faseye.' : 'Bien : choqué pour la relance.'}`,
      ),
    };
  },
});

export const MANEUVERS: ScenarioDef[] = [
  // ------------------------------------------------------------------ Tack
  {
    id: 'man-tack',
    mode: 'maneuver',
    title: L('Tack', 'Virement de bord'),
    subtitle: L('Release, tail, accelerate', 'Larguer, embraquer, relancer'),
    level: 5,
    skills: ['maneuvers', 'headsail'],
    pressure: 2,
    duration: 32,
    brief: L(
      'Upwind in 12 knots. The tactician will call a tack. Your job: prepare the lazy sheet, release at the right moment, tail fast while the jib is unloaded, ease slightly for acceleration and finish the trim as speed builds.',
      "Au près dans 12 nœuds. Le tacticien va annoncer un virement de bord. Votre travail : préparer l'écoute molle, larguer au bon moment, embraquer vite tant que le foc est déchargé, choquer légèrement pour la relance et finir le réglage à mesure que la vitesse revient.",
    ),
    task: L(
      'Prep (A), release (R) as the bow passes head to wind, sheet target eased ~6 % then full trim at speed.',
      "Préparer (A), larguer (R) quand l'étrave passe le vent debout, cible d'écoute choquée de ~6 % puis bordé à fond une fois à vitesse.",
    ),
    focusControls: ['jibSheet'],
    sequence: [
      { t: L('t = 2 s', 't = 2 s'), what: L('Tactician: "Ready to tack" — load the lazy sheet (A).', "Tacticien : « Paré à virer » — préparez l'écoute molle (A).") },
      { t: L('t = 6 s', 't = 6 s'), what: L('Helm turns. Release (R) as the bow reaches head to wind.', "Le barreur vire. Larguez (R) quand l'étrave arrive vent debout.") },
      { t: L('crossing', 'passage'), what: L('Tail fast — the jib is unloaded for ~2 seconds.', 'Embraquez vite — le foc est déchargé pendant ~2 secondes.') },
      { t: L('+2 s', '+2 s'), what: L('Hold ~5 % eased; call accel mode.', 'Gardez ~5 % choqué ; annoncez le mode relance.') },
      { t: L('+8 s', '+8 s'), what: L('Trim to full as speed reaches ~90 %. Call "speed OK".', 'Bordez à fond quand la vitesse atteint ~90 %. Annoncez « vitesse OK ».') },
    ],
    config: () => ({ wind: W(12, 101), sea: 1, twa: 38, v: 5.3, heel: 16, controls: optimalControls(12, 38) }),
    script: [
      { at: 2, run: (c) => c.prompt(L('Tactician: "Ready to tack…"', 'Tacticien : « Paré à virer… »'), 'info', 4) },
      { at: 6, run: (c) => (c.mark('turn'), c.sim.commandTack()) },
      { when: (c) => c.sim.maneuvers[0]?.crossedAt !== undefined, run: (c) => c.mark('cross') },
    ],
    criteria: [
      prepCriterion('turn'),
      releaseCriterion('tack'),
      tailCriterion('cross', 0.85, 2.5, 7),
      accelTrim('cross'),
      callCriterion('call', L('Called accel / foot after the tack', 'Mode relance / vitesse annoncé après le virement'), ['accel', 'foot'], 'cross', 1, 6, 0.7),
      minSpeedCriterion(0.8),
      accelCriterion('cross', 0.9, 9, 18, 1.5),
      finalControlCriterion('jibSheet', L('Final jib trim', 'Réglage final du foc'), 0.05, 1),
      balanceEnd(0.8),
      stdEnergy(0.4),
    ],
    expectedAdjustments: 5,
    energyBudget: 35,
    debrief: {
      physics: L(
        'Through the tack the boat loses drive (sails luff head to wind) while hull drag continues, so speed falls. The jib can be tailed almost for free while it is unloaded; once the apparent wind fills it, every centimetre is ground against load. Out of the tack the speed is low, apparent wind is aft and the keel needs more leeway: a slightly eased jib (wider groove, lower side force) and a foot mode give more drive per unit of side force. Trim progressively as the apparent wind moves forward with speed.',
        "Pendant le virement, le bateau perd sa propulsion (les voiles faseyent vent debout) alors que la traînée de la coque continue : la vitesse chute. Le foc peut être embraqué presque gratuitement tant qu'il est déchargé ; dès que le vent apparent le gonfle, chaque centimètre se mouline contre la charge. En sortie de virement, la vitesse est faible, le vent apparent est en arrière et la quille a besoin de plus de dérive : un foc légèrement choqué (plage de réglage plus large, force latérale plus faible) et un mode vitesse donnent plus de propulsion par unité de force latérale. Bordez progressivement à mesure que le vent apparent avance avec la vitesse.",
      ),
      ideal: [
        L('Load lazy sheet early, handle in.', "Préparer l'écoute molle tôt, manivelle en place."),
        L('Release when the jib starts to back (bow ~5–10° from head to wind).', "Larguer quand le foc commence à prendre à contre (étrave à ~5–10° du vent debout)."),
        L('Tail hard immediately — get 85 % in before the sail loads.', 'Embraquer fort immédiatement — rentrer 85 % avant que la voile se charge.'),
        L('Stop ~5 % short; call "accel".', "S'arrêter ~5 % avant ; annoncer « relance »."),
        L('Grind the last few % as the speedo comes up; call "speed OK".', 'Mouliner les derniers % quand le speedo monte ; annoncer « vitesse OK ».'),
      ],
      commonErrors: [
        L('Releasing too early (jib stops driving).', 'Larguer trop tôt (le foc cesse de propulser).'),
        L('Releasing late (backed jib brakes the boat).', 'Larguer trop tard (le foc à contre freine le bateau).'),
        L('Grinding block-to-block at 3 knots.', 'Border à bloc à 3 nœuds.'),
      ],
    },
    hints: [L('A = prepare sheet, R = release', "A = préparer l'écoute, R = larguer"), L('W/S = trim/ease jib target', 'W/S = border/choquer la cible du foc')],
  },

  // ------------------------------------------------------------------ Gybe
  {
    id: 'man-gybe',
    mode: 'maneuver',
    title: L('Gennaker gybe', 'Empannage sous gennaker'),
    subtitle: L('Blow the old sheet, fill on the new side', "Larguer l'ancienne écoute, gonfler sur le nouveau bord"),
    level: 6,
    skills: ['maneuvers', 'headsail'],
    pressure: 2,
    duration: 32,
    brief: L(
      'Downwind, 13 knots, gennaker up at ~140° TWA. The helm will gybe. Release the old sheet as the stern passes through the wind and trim the new sheet fast so the kite fills on the new side without collapsing.',
      "Au portant, 13 nœuds, gennaker envoyé à ~140° de TWA. Le barreur va empanner. Larguez l'ancienne écoute quand l'arrière passe dans le lit du vent et bordez vite la nouvelle pour que le spi gonfle sur le nouveau bord sans s'effondrer.",
    ),
    task: L(
      'Prep (A), release (R) near dead downwind, trim the kite on the new side, then ease to the curl.',
      "Préparer (A), larguer (R) près du plein vent arrière, border le spi sur le nouveau bord, puis choquer jusqu'à la frisure.",
    ),
    focusControls: ['jibSheet', 'vang'],
    sequence: [
      { t: L('t = 3 s', 't = 3 s'), what: L('Tactician: "Gybe in 5" — prepare the lazy sheet (A).', "Tacticien : « Empannage dans 5 » — préparez l'écoute molle (A).") },
      { t: L('t = 8 s', 't = 8 s'), what: L('Helm bears away and gybes.', 'Le barreur abat et empanne.') },
      { t: L('~170–180°', '~170–180°'), what: L('Release the old sheet (R) just before the stern crosses.', "Larguez l'ancienne écoute (R) juste avant que l'arrière passe.") },
      { t: L('after', 'après'), what: L('Trim hard to fill, then ease to the curl.', "Bordez fort pour gonfler, puis choquez jusqu'à la frisure.") },
    ],
    config: () => ({ wind: W(13, 202), sea: 1, twa: 140, v: 9, heel: 6, headsail: 'gennaker', controls: optimalControls(13, 140, 'gennaker') }),
    script: [
      { at: 3, run: (c) => c.prompt(L('Tactician: "Gybe in 5"', 'Tacticien : « Empannage dans 5 »'), 'info', 4) },
      { at: 8, run: (c) => (c.mark('turn'), c.sim.commandGybe()) },
      { when: (c) => c.sim.maneuvers[0]?.crossedAt !== undefined, run: (c) => c.mark('cross') },
    ],
    criteria: [
      prepCriterion('turn'),
      releaseCriterion('gybe'),
      {
        id: 'collapse',
        group: 'Trim adjustments',
        label: L('Kite collapse time', "Durée d'effondrement du spi"),
        weight: 1.4,
        evaluate: (ctx) => {
          const t = ctx.tel.filter((s) => s.collapsed && s.t > 8).length * 0.25;
          return { score: scoreLinear(-t, -8, -1.5), note: L(`Kite collapsed for ${f1(t)} s in total.`, `Spi effondré pendant ${f1(t)} s au total.`) };
        },
      },
      tailCriterion('cross', 0.8, 2.5, 8, 1),
      minSpeedCriterion(1),
      accelCriterion('cross', 0.9, 6, 14, 1.3),
      balanceEnd(1),
      stdEnergy(0.4),
    ],
    expectedAdjustments: 5,
    energyBudget: 40,
    debrief: {
      physics: L(
        'When the stern crosses the wind, the old windward side of the gennaker becomes leeward. If the old sheet is held, the clew is pinned on the wrong side: the sail backs, collapses and can wrap the forestay. Releasing just before the stern crosses lets the clew fly forward and around; the new sheet must then come in fast because the apparent wind on a fresh gybe angle is light and the sail needs a high angle of attack to refill. Once full, ease back to the curl for maximum projected area and lift.',
        "Quand l'arrière passe le vent, l'ancien côté au vent du gennaker devient sous le vent. Si l'ancienne écoute est tenue, le point d'écoute est bloqué du mauvais côté : la voile prend à contre, s'effondre et peut s'enrouler autour de l'étai. Larguer juste avant le passage de l'arrière laisse le point d'écoute partir vers l'avant et faire le tour ; la nouvelle écoute doit alors rentrer vite, car le vent apparent juste après l'empannage est faible et la voile a besoin d'une forte incidence pour se regonfler. Une fois gonflée, rechoquez jusqu'à la frisure pour un maximum de surface projetée et de portance.",
      ),
      ideal: [
        L('Lazy sheet ready, winch clean.', 'Écoute molle prête, winch dégagé.'),
        L('Blow the old sheet at ~170°.', "Larguer l'ancienne écoute à ~170°."),
        L('Tail the new sheet hard (unloaded, fast).', 'Embraquer fort la nouvelle écoute (déchargée, rapide).'),
        L('Once full, ease to the curl; the boat accelerates and the apparent wind moves forward.', "Une fois gonflé, choquer jusqu'à la frisure ; le bateau accélère et le vent apparent avance."),
      ],
      commonErrors: [
        L('Holding the old sheet past dead downwind.', "Tenir l'ancienne écoute au-delà du plein vent arrière."),
        L('Releasing at 150° (kite collapses before the gybe).', "Larguer à 150° (le spi s'effondre avant l'empannage)."),
        L('Leaving the new sheet over-trimmed (stalled, heeling).', 'Laisser la nouvelle écoute trop bordée (décroché, gîte).'),
      ],
    },
    hints: [L('A = prep, R = release', 'A = préparer, R = larguer'), L('In kite mode the sheet slider trims the gennaker.', "En mode spi, le curseur d'écoute règle le gennaker.")],
  },

  // ------------------------------------------------------------------ Upwind acceleration from slow
  {
    id: 'man-accel',
    mode: 'maneuver',
    title: L('Upwind acceleration', 'Relance au près'),
    subtitle: L('From luffing to full speed', 'Du faseyement à pleine vitesse'),
    level: 4,
    skills: ['maneuvers', 'headsail'],
    pressure: 1,
    duration: 26,
    brief: L(
      'The boat is almost stopped after a luff: sails eased, 2 knots, 10 knots of breeze. Rebuild speed with the right sequence: jib first (it creates the flow the main uses), then the main, with a foot mode, then trim to target.',
      "Le bateau est presque arrêté après une auloffée : voiles choquées, 2 nœuds, 10 nœuds de vent. Reconstruisez la vitesse dans le bon ordre : le foc d'abord (il crée l'écoulement dont la GV se sert), puis la GV, en mode vitesse, puis bordez jusqu'à la cible.",
    ),
    task: L(
      'Trim the jib to ~85 % of upwind, then the main with twist, call "accel", trim fully only when speed comes.',
      "Bordez le foc à ~85 % du réglage de près, puis la GV avec du vrillage, annoncez « relance », ne bordez à fond qu'une fois la vitesse revenue.",
    ),
    focusControls: ['jibSheet', 'mainSheet'],
    sequence: [
      { t: L('t = 0', 't = 0'), what: L('Go! Jib in first to ~85 %.', "Go ! Le foc d'abord, à ~85 %.") },
      { t: L('+1–2 s', '+1–2 s'), what: L('Mainsheet in, leaving twist. Call accel mode.', 'Écoute de GV bordée, en laissant du vrillage. Annoncez le mode relance.') },
      { t: L('~80 %', '~80 %'), what: L('Trim jib & main to full; call "speed OK".', 'Bordez foc et GV à fond ; annoncez « vitesse OK ».') },
    ],
    config: () => ({ wind: W(10, 303), sea: 0, twa: 45, v: 2, heel: 2, helmMode: 'accel', controls: { ...optimalControls(10, 38), jibSheet: 0.45, mainSheet: 0.35 } }),
    script: [{ at: 0.2, run: (c) => (c.mark('go'), c.prompt(L('GO — build speed!', 'GO — relancez !'), 'warn', 3)) }],
    criteria: [
      {
        id: 'order',
        group: 'Preparation',
        label: L('Sequence: jib before main', "Ordre : foc avant GV"),
        weight: 1.2,
        evaluate: (ctx) => {
          const j = ctx.actions.find((a) => a.key === 'jibSheet' && (a.value ?? 0) > (a.from ?? 0));
          const m = ctx.actions.find((a) => a.key === 'mainSheet' && (a.value ?? 0) > (a.from ?? 0));
          if (!j || !m) return { score: 30, note: L('Both sails need trimming to accelerate.', 'Les deux voiles doivent être bordées pour accélérer.') };
          return j.t <= m.t + 0.3
            ? { score: 100, note: L('Jib first: the jib sets up the flow (and upwash) the main works in, and trimming the main first adds weather helm before you have rudder flow.', "Foc d'abord : le foc installe l'écoulement (et l'upwash) dans lequel travaille la GV, alors que border la GV en premier ajoute de l'ardent avant que le safran ait de l'écoulement.") }
            : { score: 45, note: L('Main first: with no speed and no jib flow, a sheeted main rounds the boat up and stalls.', "GV d'abord : sans vitesse ni écoulement sur le foc, une GV bordée fait lofer le bateau et décroche.") };
        },
      },
      reactionCriterion('react', L('Initial response', 'Réaction initiale'), 'go', (a) => a.kind === 'adjust' && (a.value ?? 0) > (a.from ?? 0), 0.8, 4, 1, 'Initial response'),
      {
        id: 'nooverstall',
        group: 'Trim adjustments',
        label: L('No over-trim at low speed', 'Pas de sur-bordé à basse vitesse'),
        weight: 1.3,
        evaluate: (ctx) => {
          const opt = optimalControls(10, 38).jibSheet;
          const bad = ctx.tel.filter((s) => s.perf < 0.75 && s.jibSheet > opt + 0.02).length * 0.25;
          return { score: scoreLinear(-bad, -6, 0), note: L(`${f1(bad)} s with the jib at/over full trim while slower than 75 % of target.`, `${f1(bad)} s avec le foc bordé à fond ou plus, à moins de 75 % de la cible.`) };
        },
      },
      accelCriterion('go', 0.9, 9, 18, 2),
      finalControlCriterion('jibSheet', L('Final jib trim', 'Réglage final du foc'), 0.05, 0.8),
      finalControlCriterion('mainSheet', L('Final mainsheet', 'Écoute de GV finale'), 0.08, 0.8),
      balanceEnd(0.8),
      stdAdjust(0.4),
    ],
    expectedAdjustments: 6,
    energyBudget: 35,
    debrief: {
      physics: L(
        'With no boat speed the apparent wind is the true wind — far aft of where the sails are set upwind — and the keel and rudder have no lift. Sheeting the jib first creates drive without much weather helm (its centre of effort is forward). The main, trimmed with twist, then adds power. Full upwind trim is only right once the boat has speed: apparent wind moves forward as speed builds, and the keel can then carry the side force without excessive leeway.',
        "Sans vitesse, le vent apparent est le vent réel — bien en arrière de l'angle pour lequel les voiles sont réglées au près — et la quille et le safran n'ont aucune portance. Border le foc en premier crée de la propulsion sans beaucoup d'ardent (son centre de poussée est en avant). La GV, bordée avec du vrillage, ajoute ensuite de la puissance. Le réglage de près à fond n'est juste qu'une fois le bateau lancé : le vent apparent avance avec la vitesse, et la quille peut alors encaisser la force latérale sans dérive excessive.",
      ),
      ideal: [
        L('Jib to ~85 %.', 'Foc à ~85 %.'),
        L('Main in with some twist (sheet ~80 % of upwind).', 'GV bordée avec du vrillage (écoute à ~80 % du réglage de près).'),
        L('Accel/foot mode.', 'Mode relance / vitesse.'),
        L('Trim both to target as speed reaches ~80–90 %.', 'Border les deux à la cible quand la vitesse atteint ~80–90 %.'),
      ],
      commonErrors: [L('Main first: the boat rounds up.', "GV d'abord : le bateau lofe."), L('Block-to-block immediately: stall & leeway.', 'À bloc tout de suite : décrochage et dérive.')],
    },
    hints: [L('Watch the AWA move forward as you accelerate.', "Regardez l'AWA avancer pendant que vous accélérez.")],
  },

  // ------------------------------------------------------------------ Windward mark rounding
  {
    id: 'man-bearaway',
    mode: 'maneuver',
    title: L('Windward mark rounding', 'Passage de la bouée au vent'),
    subtitle: L('Bear away and hoist', 'Abattre et envoyer'),
    level: 6,
    skills: ['maneuvers', 'mainsail'],
    pressure: 2,
    duration: 30,
    brief: L(
      'Approaching the windward mark in 14 knots. The helm will bear away to ~140° and the crew will hoist the gennaker. The boat will not bear away with a sheeted main — ease it with the turn, ease the jib, take the backstay off, then trim the kite as soon as it is up.',
      "Approche de la bouée au vent dans 14 nœuds. Le barreur va abattre à ~140° et l'équipage va envoyer le gennaker. Le bateau n'abattra pas avec une GV bordée — choquez-la avec le virage, choquez le foc, relâchez le pataras, puis bordez le spi dès qu'il est en haut.",
    ),
    task: L(
      'Ease main & jib with the turn, backstay off, then trim the gennaker to fill and ease to the curl.',
      "Choquez GV et foc avec le virage, pataras relâché, puis bordez le gennaker pour le gonfler et choquez jusqu'à la frisure.",
    ),
    focusControls: ['mainSheet', 'jibSheet', 'backstay', 'vang'],
    sequence: [
      { t: L('t = 4 s', 't = 4 s'), what: L('Tactician: "Mark in 4… bear away on my call."', 'Tacticien : « Bouée dans 4… on abat à mon signal. »') },
      { t: L('t = 8 s', 't = 8 s'), what: L('Helm bears away: ease the main hard, ease the jib, backstay off.', 'Le barreur abat : choquez franchement la GV, choquez le foc, pataras relâché.') },
      { t: L('~95° TWA', '~95° TWA'), what: L('Crew hoists (3–4 s).', "L'équipage envoie (3–4 s).") },
      { t: L('kite up', 'spi en haut'), what: L('Trim the kite to fill, then ease to the curl.', "Bordez le spi pour le gonfler, puis choquez jusqu'à la frisure.") },
    ],
    config: () => ({ wind: W(14, 404), sea: 1, twa: 38, v: 5.6, heel: 18, controls: optimalControls(14, 38) }),
    script: [
      { at: 4, run: (c) => c.prompt(L('Tactician: "Mark in 4…"', 'Tacticien : « Bouée dans 4… »'), 'info', 4) },
      { at: 8, run: (c) => (c.mark('turn'), c.sim.commandBearAway(140, true)) },
      { when: (c) => c.sim.plan.headsail === 'gennaker', run: (c) => c.mark('kite') },
      { when: (c) => Math.abs(c.sim.twa) > 120, run: (c) => c.mark('turned') },
    ],
    criteria: [
      reactionCriterion('main', L('Main eased with the turn', 'GV choquée avec le virage'), 'turn', (a) => a.key === 'mainSheet' && (a.value ?? 1) < (a.from ?? 0), 0.5, 4, 1.6, 'Initial response', 2),
      {
        id: 'turntime',
        group: 'Timing',
        label: L('Turn completed quickly (to 120°)', 'Virage effectué rapidement (jusqu’à 120°)'),
        weight: 1.2,
        evaluate: (ctx) => {
          const a = ctx.marks.turn;
          const b = ctx.marks.turned;
          if (a === undefined || b === undefined) return { score: 0, note: L('The boat never got past 120° — the helm could not bear away.', "Le bateau n'a jamais dépassé 120° — le barreur n'a pas pu abattre.") };
          return { score: scoreLinear(-(b - a), -16, -8), note: L(`Bear-away took ${f1(b - a)} s. An over-trimmed main gives weather helm that fights the turn.`, `L'abattée a pris ${f1(b - a)} s. Une GV trop bordée donne de l'ardent qui s'oppose au virage.`) };
        },
      },
      {
        id: 'backstay',
        group: 'Trim adjustments',
        label: L('Backstay off downwind', 'Pataras relâché au portant'),
        weight: 0.8,
        evaluate: ({ sim }) => ({ score: scoreLinear(-sim.controls.backstay, -0.4, -0.1), note: L(`Backstay at ${pct(sim.controls.backstay)} — downwind you want a straight mast and a deep main.`, `Pataras à ${pct(sim.controls.backstay)} — au portant, on veut un mât droit et une GV creuse.`) }),
      },
      {
        id: 'kitefill',
        group: 'Acceleration',
        label: L('Kite trimmed and flowing quickly', 'Spi réglé et porteur rapidement'),
        weight: 1.3,
        evaluate: (ctx) => {
          const k = ctx.marks.kite;
          if (k === undefined) return { score: 0, note: L('Kite never hoisted (the boat did not bear away far enough).', "Spi jamais envoyé (le bateau n'a pas assez abattu).") };
          // 'set' = sheet within reach of the optimal kite trim for the moment's wind and angle (kite
          // efficiency is naturally low when deep, so it cannot be the test)
          const s = ctx.tel.find((x) => x.t > k && !x.collapsed && Math.abs(Math.abs(x.twa) - 140) < 25 && Math.abs(x.jibSheet - optimalControls(x.tws, Math.abs(x.twa), 'gennaker').jibSheet) < 0.09);
          if (!s) return { score: 0, note: L('Kite never set properly.', 'Spi jamais correctement réglé.') };
          return { score: scoreLinear(-(s.t - k), -8, -2), note: L(`Kite flowing ${f1(s.t - k)} s after the hoist.`, `Spi porteur ${f1(s.t - k)} s après l'envoi.`) };
        },
      },
      {
        id: 'speeddw',
        group: 'Final balance',
        label: L('Downwind speed after rounding', 'Vitesse au portant après le passage'),
        weight: 1,
        evaluate: (ctx) => {
          const p = avgIn(ctx, ctx.sim.t - 6, ctx.sim.t, (s) => s.perf);
          return { score: scoreLinear(p, 0.75, 0.96), note: L(`${pct(p)} of downwind target at the end.`, `${pct(p)} de la cible au portant à la fin.`) };
        },
      },
      stdEnergy(0.4),
      stdAdjust(0.3),
    ],
    expectedAdjustments: 8,
    energyBudget: 40,
    debrief: {
      physics: L(
        'Bearing away swings the apparent wind aft: a main still sheeted for upwind becomes hugely over-trimmed and stalled, its side force aft of the CLR makes strong weather helm, and the rudder (which must turn the boat away) is overloaded. Easing the main with the turn removes that turning moment and lets the helm bear away with little rudder (less drag). Downwind, the backstay is released to straighten the mast and add depth to the main; the gennaker is trimmed hard to fill, then eased to the curl.',
        "Abattre fait reculer le vent apparent : une GV encore bordée pour le près devient très sur-bordée et décroche, sa force latérale en arrière du centre de dérive crée un fort ardent, et le safran (qui doit faire abattre le bateau) est surchargé. Choquer la GV avec le virage supprime ce moment et permet au barreur d'abattre avec peu de safran (moins de traînée). Au portant, on relâche le pataras pour redresser le mât et donner du creux à la GV ; le gennaker est bordé fort pour gonfler, puis choqué jusqu'à la frisure.",
      ),
      ideal: [
        L('Main eased as the helm starts turning ("ease, ease, ease").', 'GV choquée dès que le barreur commence à tourner (« choque, choque, choque »).'),
        L('Jib eased with the turn.', 'Foc choqué avec le virage.'),
        L('Backstay off, cunningham off, outhaul eased.', 'Pataras relâché, cunningham relâché, bordure choquée.'),
        L('Kite: trim to fill then ease to curl.', "Spi : border pour gonfler puis choquer jusqu'à la frisure."),
      ],
      commonErrors: [
        L('Holding the main: the boat refuses to bear away (and may round up).', 'Garder la GV bordée : le bateau refuse d’abattre (et peut partir au lof).'),
        L('Forgetting the backstay.', 'Oublier le pataras.'),
      ],
    },
    hints: [L('D = ease main target.', 'D = choquer la cible de GV.'), L('Rudder gauge shows the fight.', 'La jauge de safran montre la lutte.')],
  },

  // ------------------------------------------------------------------ Leeward mark rounding
  {
    id: 'man-harden',
    mode: 'maneuver',
    title: L('Leeward mark rounding', 'Passage de la bouée sous le vent'),
    subtitle: L('Douse and trim to the turn', 'Affaler et border avec le virage'),
    level: 6,
    skills: ['maneuvers', 'headsail'],
    pressure: 2,
    duration: 30,
    brief: L(
      'Downwind in 12 knots, gennaker up. The crew douses and the helm hardens up around the leeward mark. You must trim the jib and main "to the turn": the sheets should arrive at upwind trim exactly as the boat reaches its upwind angle — no sooner (stall, heel) and no later (luffing, wide exit).',
      "Au portant dans 12 nœuds, gennaker envoyé. L'équipage affale et le barreur remonte au près autour de la bouée sous le vent. Vous devez border foc et GV « avec le virage » : les écoutes doivent arriver au réglage de près exactement quand le bateau atteint son angle de près — pas avant (décrochage, gîte) et pas après (faseyement, sortie large).",
    ),
    task: L(
      'As the helm turns, trim jib and main progressively in sync with the TWA. Backstay and outhaul on for upwind.',
      'Pendant que le barreur tourne, bordez foc et GV progressivement en phase avec la TWA. Pataras et bordure repris pour le près.',
    ),
    focusControls: ['jibSheet', 'mainSheet', 'backstay', 'outhaul'],
    sequence: [
      { t: L('t = 5 s', 't = 5 s'), what: L('Tactician: "Rounding in 4, douse on my call".', 'Tacticien : « Bouée dans 4, affalage à mon signal ».') },
      { t: L('t = 9 s', 't = 9 s'), what: L('Douse + harden up. Trim with the turn.', 'Affalage + remontée au près. Bordez avec le virage.') },
      { t: L('~upwind', '~au près'), what: L('Sheets at upwind trim; backstay & outhaul on.', 'Écoutes au réglage de près ; pataras et bordure repris.') },
    ],
    config: () => ({ wind: W(12, 505), sea: 1, twa: 140, v: 8, heel: 6, headsail: 'gennaker', controls: { ...optimalControls(12, 140, 'gennaker'), backstay: 0.05, outhaul: 0.35 } }),
    script: [
      { at: 5, run: (c) => c.prompt(L('Tactician: "Rounding in 4…"', 'Tacticien : « Bouée dans 4… »'), 'info', 4) },
      { at: 9, run: (c) => (c.mark('turn'), c.sim.commandHardenUp(true)) },
      { when: (c) => c.marks.turn !== undefined && c.sim.maneuvers[0]?.done, run: (c) => c.mark('done') },
    ],
    criteria: [
      {
        id: 'sync',
        group: 'Trim adjustments',
        label: L('Trimmed in sync with the turn', 'Bordé en phase avec le virage'),
        weight: 2,
        evaluate: (ctx) => {
          const t0 = ctx.marks.turn;
          if (t0 === undefined) return { score: 0, note: '—' };
          const w = window(ctx.tel, t0 + 1, t0 + 14).filter((s) => Math.abs(s.twa) < 120);
          if (!w.length) return { score: 0, note: L('No data.', 'Pas de données.') };
          const err = mean(
            w.map((s) => {
              const o = optimalControls(s.tws, Math.abs(s.twa));
              return Math.abs(s.jibSheet - o.jibSheet) + Math.abs(s.mainSheet - o.mainSheet);
            }),
          );
          return { score: scoreLinear(err, 0.55, 0.15), note: L(`Average sheet error vs. the ideal for each angle: ${pct(err / 2)} per sheet.`, `Erreur moyenne d'écoute par rapport à l'idéal pour chaque angle : ${pct(err / 2)} par écoute.`) };
        },
      },
      {
        id: 'luffstall',
        group: 'Sail efficiency',
        label: L('Flow through the turn', 'Écoulement pendant le virage'),
        weight: 1,
        evaluate: (ctx) => {
          const t0 = ctx.marks.turn ?? 9;
          const e = avgIn(ctx, t0 + 1, t0 + 14, (s) => (s.jibEff + s.mainEff) / 2);
          return { score: scoreLinear(e, 0.5, 0.88), note: L(`Average flow quality ${pct(e)} during the rounding.`, `Qualité d'écoulement moyenne ${pct(e)} pendant le passage.`) };
        },
      },
      {
        id: 'upwind-shape',
        group: 'Final balance',
        label: L('Upwind shape set (backstay / outhaul)', 'Forme de près réglée (pataras / bordure)'),
        weight: 0.8,
        evaluate: ({ sim }) => {
          const o = optimalControls(sim.tws, 38);
          const e = Math.abs(sim.controls.backstay - o.backstay) + Math.abs(sim.controls.outhaul - o.outhaul);
          return { score: scoreLinear(e, 0.7, 0.2), note: L(`Backstay ${pct(sim.controls.backstay)}, outhaul ${pct(sim.controls.outhaul)} (reference ${pct(o.backstay)} / ${pct(o.outhaul)}).`, `Pataras ${pct(sim.controls.backstay)}, bordure ${pct(sim.controls.outhaul)} (référence ${pct(o.backstay)} / ${pct(o.outhaul)}).`) };
        },
      },
      minSpeedCriterion(0.8),
      balanceEnd(1.2),
      stdEnergy(0.4),
    ],
    expectedAdjustments: 8,
    energyBudget: 45,
    debrief: {
      physics: L(
        'As the boat hardens up, the apparent wind moves forward and increases. For each heading there is one sheet position that keeps the angle of attack in the groove. Trimming too early stalls the sails and heels the boat while it is still turning (rudder drag); trimming too late lets the sails luff and the boat slides wide. "Trim to the turn" keeps the sails working all the way, so the boat exits fast and high.',
        "Quand le bateau remonte au près, le vent apparent avance et forcit. Pour chaque cap, il existe une position d'écoute qui garde l'incidence dans la bonne plage. Border trop tôt fait décrocher les voiles et gîter le bateau pendant qu'il tourne encore (traînée du safran) ; border trop tard laisse les voiles faseyer et le bateau sortir large. « Border avec le virage » garde les voiles efficaces tout du long, pour une sortie rapide et haute.",
      ),
      ideal: [
        L('Jib sheet ready on the winch while the kite comes down.', 'Écoute de foc prête sur le winch pendant que le spi descend.'),
        L('Trim jib and main progressively with the turn.', 'Border foc et GV progressivement avec le virage.'),
        L('Backstay/outhaul on as you reach close-hauled.', 'Reprendre pataras / bordure en arrivant au près serré.'),
        L('Accelerate in foot mode, then point.', 'Accélérer en mode vitesse, puis passer en mode cap.'),
      ],
      commonErrors: [
        L('Trimming everything at once at the start of the turn.', 'Tout border d’un coup au début du virage.'),
        L('Main trimmed late: wide rounding, opponent gets inside.', "GV bordée trop tard : passage large, l'adversaire passe à l'intérieur."),
      ],
    },
    hints: [L('Watch the TWA vs. your sheet positions.', 'Comparez la TWA à vos positions d’écoute.')],
  },

  // ------------------------------------------------------------------ Pre-start
  {
    id: 'man-prestart',
    mode: 'maneuver',
    title: L('Pre-start acceleration', 'Relance de pré-départ'),
    subtitle: L('Hit the line at speed on the gun', 'Passer la ligne lancé au coup de canon'),
    level: 7,
    skills: ['maneuvers', 'tactics'],
    pressure: 3,
    duration: 24,
    brief: L(
      'You are holding position below the line, sails luffing, 1 knot, 11 knots of breeze. The helm will bear off at 8 seconds to go. Speed at the gun is everything in match racing.',
      "Vous tenez votre position sous la ligne, voiles qui faseyent, 1 nœud, 11 nœuds de vent. Le barreur va abattre à 8 secondes du départ. En match racing, la vitesse au coup de canon est primordiale.",
    ),
    task: L(
      'At "GO" (8 s before the gun): jib first, then main; call accel; reach ≥ 85 % target speed at the gun without rounding up.',
      'Au « GO » (8 s avant le canon) : foc d’abord, puis GV ; annoncez la relance ; atteignez ≥ 85 % de la vitesse cible au canon sans partir au lof.',
    ),
    focusControls: ['jibSheet', 'mainSheet', 'traveller'],
    sequence: [
      { t: L('-12 s', '-12 s'), what: L('Holding, sails luffing. Get ready.', 'En attente, voiles qui faseyent. Préparez-vous.') },
      { t: L('-8 s', '-8 s'), what: L('GO: jib in to ~85 %, main in with twist, accel mode.', 'GO : foc bordé à ~85 %, GV bordée avec du vrillage, mode relance.') },
      { t: L('0 s', '0 s'), what: L('Gun — full speed, trim to target, call "speed OK".', 'Canon — pleine vitesse, bordez à la cible, annoncez « vitesse OK ».') },
    ],
    config: () => ({ wind: W(11, 606), sea: 1, twa: 55, fixedTwa: 55, v: 1, heel: 0, helmMode: 'accel', controls: { ...optimalControls(11, 38), jibSheet: 0.3, mainSheet: 0.25, traveller: 0.5 } }),
    script: [
      { at: 0.2, run: (c) => c.prompt(L('Holding… 12 seconds to the gun.', 'En attente… 12 secondes avant le canon.'), 'info', 3) },
      { at: 4, run: (c) => (c.mark('go'), (c.sim.fixedTwa = 50), c.prompt(L('GO — 8 seconds!', 'GO — 8 secondes !'), 'alarm', 3)) },
      { at: 8, run: (c) => (c.sim.fixedTwa = undefined) },
      { at: 12, run: (c) => (c.mark('gun'), (c.data.gunSpeed = c.sim.v), (c.data.gunPerf = c.sim.v / c.sim.target()), c.prompt(L('GUN!', 'CANON !'), 'good', 2)) },
    ],
    criteria: [
      {
        id: 'early',
        group: 'Preparation',
        label: L('Held position until GO', "Position tenue jusqu'au GO"),
        weight: 0.8,
        evaluate: (ctx) => {
          const early = ctx.actions.find((a) => a.kind === 'adjust' && a.t < 3.6 && (a.value ?? 0) > (a.from ?? 0) + 0.15);
          return early
            ? { score: 40, note: L('Trimmed on before GO — you would cross the line early.', 'Bordé avant le GO — vous franchiriez la ligne trop tôt.') }
            : { score: 100, note: L('Held the luff until GO.', "Faseyement tenu jusqu'au GO.") };
        },
      },
      reactionCriterion('react', L('Reaction at GO', 'Réaction au GO'), 'go', (a) => a.kind === 'adjust' && (a.value ?? 0) > (a.from ?? 0), 0.5, 3, 1.4, 'Initial response', 0.4),
      {
        id: 'order',
        group: 'Trim adjustments',
        label: L('Jib before main', 'Foc avant GV'),
        weight: 1,
        evaluate: (ctx) => {
          const j = ctx.actions.find((a) => a.key === 'jibSheet' && a.t >= 3.6 && (a.value ?? 0) > (a.from ?? 0));
          const m = ctx.actions.find((a) => a.key === 'mainSheet' && a.t >= 3.6 && (a.value ?? 0) > (a.from ?? 0));
          if (!j || !m) return { score: 30, note: L('Both sheets need trimming.', 'Les deux écoutes doivent être bordées.') };
          return j.t <= m.t + 0.3
            ? { score: 100, note: L('Jib first — correct.', "Foc d'abord — correct.") }
            : { score: 45, note: L('Main first: weather helm with no rudder flow — the boat rounds up instead of accelerating.', "GV d'abord : de l'ardent sans écoulement sur le safran — le bateau lofe au lieu d'accélérer.") };
        },
      },
      {
        id: 'gun',
        group: 'Acceleration',
        label: L('Speed at the gun', 'Vitesse au coup de canon'),
        weight: 2.2,
        evaluate: (ctx) => {
          const p = Number(ctx.data.gunPerf ?? 0);
          return { score: scoreLinear(p, 0.4, 0.74), note: L(`${f1(Number(ctx.data.gunSpeed ?? 0))} kn at the gun (${pct(p)} of target).`, `${f1(Number(ctx.data.gunSpeed ?? 0))} nds au canon (${pct(p)} de la cible).`) };
        },
      },
      callCriterion('call', L('Communication: accel / speed calls', 'Communication : annonces relance / vitesse'), ['accel', 'foot', 'speed'], 'go', 0.5, 12, 0.6),
      balanceEnd(1),
    ],
    expectedAdjustments: 6,
    energyBudget: 40,
    debrief: {
      physics: L(
        'From a standstill the boat needs drive before it can make use of a high-lift, upwind trim. Trimming the jib first generates drive with little turning moment; the main follows with twist. Bearing off a few degrees (accel) raises the drive/side-force ratio while the keel has no lift yet. The acceleration phase is limited by the boat mass (≈1.7 t with crew): about 8 seconds to reach 85 % target in medium air.',
        "À l'arrêt, le bateau a besoin de propulsion avant de pouvoir tirer parti d'un réglage de près à forte portance. Border le foc en premier génère de la propulsion avec peu de moment de rotation ; la GV suit avec du vrillage. Abattre de quelques degrés (relance) augmente le rapport propulsion / force latérale tant que la quille n'a pas encore de portance. La phase d'accélération est limitée par la masse du bateau (≈1,7 t avec l'équipage) : environ 8 secondes pour atteindre 85 % de la cible dans du vent moyen.",
      ),
      ideal: [
        L('Wait — sails luffing, crew ready.', 'Attendre — voiles qui faseyent, équipage prêt.'),
        L('GO: jib to 85 %, then main.', 'GO : foc à 85 %, puis GV.'),
        L('Accel mode until ~85 %.', "Mode relance jusqu'à ~85 %."),
        L('Trim to target and call "speed OK" after the gun.', 'Border à la cible et annoncer « vitesse OK » après le canon.'),
      ],
      commonErrors: [L('Starting too early.', 'Partir trop tôt.'), L('Main first: round-up.', "GV d'abord : départ au lof."), L('Block-to-block at 2 knots.', 'À bloc à 2 nœuds.')],
    },
    hints: [L('Hold W to trim jib target, E for main.', 'Maintenez W pour border la cible du foc, E pour la GV.')],
  },

  // ------------------------------------------------------------------ Mode transition
  {
    id: 'man-modes',
    mode: 'maneuver',
    title: L('Upwind mode transitions', 'Changements de mode au près'),
    subtitle: L('Foot to roll, then point to hold', 'Mode vitesse pour enrouler, puis mode cap pour tenir'),
    level: 5,
    skills: ['tactics', 'headsail'],
    pressure: 2,
    duration: 40,
    brief: L(
      'Upwind in 12 knots, close to the opponent. The tactician will ask for a FOOT mode (speed, bow down) to roll over them, then a POINT/high mode to hold the lane. The trimmer sets the shape for each mode and tells the helm.',
      "Au près dans 12 nœuds, près de l'adversaire. Le tacticien va demander un mode VITESSE (vitesse, étrave basse) pour lui passer dessus, puis un mode CAP / haut pour tenir le couloir. Le régleur adapte la forme des voiles à chaque mode et prévient le barreur.",
    ),
    task: L(
      'FOOT: ease jib 3–6 %, twist, call foot. POINT: trim jib to full, traveller up a touch, call point. Then back to normal.',
      'VITESSE : choquez le foc de 3–6 %, du vrillage, annoncez vitesse. CAP : foc bordé à fond, chariot de GV légèrement monté, annoncez cap. Puis retour au normal.',
    ),
    focusControls: ['jibSheet', 'traveller', 'mainSheet', 'jibLead'],
    sequence: [
      { t: L('t = 6 s', 't = 6 s'), what: L('Tactician: "Foot mode!" → ease jib a little, call foot.', 'Tacticien : « Mode vitesse ! » → choquez un peu le foc, annoncez vitesse.') },
      { t: L('t = 22 s', 't = 22 s'), what: L('Tactician: "Hold high now!" → trim, traveller up, call point.', 'Tacticien : « On tient haut ! » → bordez, chariot de GV monté, annoncez cap.') },
      { t: L('t = 34 s', 't = 34 s'), what: L('Back to normal.', 'Retour au normal.') },
    ],
    config: () => ({ wind: W(12, 707), sea: 1, twa: 38, v: 5.3, heel: 17, controls: optimalControls(12, 38) }),
    script: [
      { at: 6, run: (c) => (c.mark('foot'), c.prompt(L('Tactician: "FOOT mode — roll them!"', 'Tacticien : « Mode VITESSE — on leur passe dessus ! »'), 'warn', 4)) },
      { at: 22, run: (c) => (c.mark('point'), c.prompt(L('Tactician: "HOLD HIGH — point now!"', 'Tacticien : « ON TIENT HAUT — mode cap ! »'), 'warn', 4)) },
      { at: 34, run: (c) => (c.mark('normal'), c.prompt(L('Tactician: "Normal mode."', 'Tacticien : « Mode normal. »'), 'info', 3)) },
    ],
    criteria: [
      callCriterion('callfoot', L('Called foot mode', 'Mode vitesse annoncé'), ['foot'], 'foot', 0, 4, 1),
      callCriterion('callpoint', L('Called point mode', 'Mode cap annoncé'), ['point'], 'point', 0, 4, 1),
      {
        id: 'footshape',
        group: 'Trim adjustments',
        label: L('Foot shape: jib eased a little', 'Forme vitesse : foc légèrement choqué'),
        weight: 1.3,
        evaluate: (ctx) => {
          const o = optimalControls(12, 38).jibSheet;
          const js = avgIn(ctx, 10, 21, (s) => s.jibSheet);
          const d = o - js;
          return { score: d >= 0.02 && d <= 0.09 ? 100 : d < 0.02 ? 40 : clamp(100 - (d - 0.09) * 600, 0, 100), note: L(`Jib at ${pct(js)} in foot mode (normal ≈ ${pct(o)}).`, `Foc à ${pct(js)} en mode vitesse (normal ≈ ${pct(o)}).`) };
        },
      },
      {
        id: 'pointshape',
        group: 'Trim adjustments',
        label: L('Point shape: jib full trim', 'Forme cap : foc bordé à fond'),
        weight: 1.3,
        evaluate: (ctx) => {
          const o = optimalControls(12, 38).jibSheet;
          const js = avgIn(ctx, 26, 33, (s) => s.jibSheet);
          const d = js - o;
          return {
            score: d >= -0.03 && d <= 0.06 ? 100 : d < -0.03 ? clamp(100 + (d + 0.03) * 700, 0, 100) : 40,
            note: L(`Jib at ${pct(js)} in point mode (normal ≈ ${pct(o)}). ${d > 0.06 ? 'Over-trimmed: stalled.' : ''}`, `Foc à ${pct(js)} en mode cap (normal ≈ ${pct(o)}). ${d > 0.06 ? 'Trop bordé : décroché.' : ''}`),
          };
        },
      },
      {
        id: 'footspeed',
        group: 'Boat speed',
        label: L('Speed gain in foot mode', 'Gain de vitesse en mode vitesse'),
        weight: 1.2,
        evaluate: (ctx) => {
          const v0 = avgIn(ctx, 2, 6, (s) => s.v);
          const v1 = avgIn(ctx, 12, 21, (s) => s.v);
          return { score: scoreLinear(v1 - v0, -0.05, 0.25), note: L(`Speed ${f1(v0)} → ${f1(v1)} kn in foot mode.`, `Vitesse ${f1(v0)} → ${f1(v1)} nds en mode vitesse.`) };
        },
      },
      {
        id: 'pointvmg',
        group: 'Timing',
        label: L('Height held in point mode (VMG)', 'Cap tenu en mode cap (VMG)'),
        weight: 1,
        evaluate: (ctx) => {
          const vmg = avgIn(ctx, 26, 33, (s) => s.vmg);
          const ref = avgIn(ctx, 2, 6, (s) => s.vmg);
          return { score: scoreLinear(vmg / Math.max(0.1, ref), 0.85, 1.0), note: L(`VMG ${f1(vmg)} kn in point mode vs ${f1(ref)} kn normal.`, `VMG ${f1(vmg)} nds en mode cap contre ${f1(ref)} nds en normal.`) };
        },
      },
      stdAdjust(0.4),
    ],
    expectedAdjustments: 8,
    energyBudget: 40,
    debrief: {
      physics: L(
        'Foot: sailing a few degrees lower increases apparent wind angle; easing the jib slightly and twisting the sails keeps the angle of attack right and lowers side force, so the boat accelerates with less leeway. Point: once at speed, a harder jib (finer entry, tighter leech) and traveller up let the helm sail higher while flow stays attached — but only if the speed is there to carry the side force. Telling the helm keeps steering and trim aligned.',
        "Vitesse : naviguer quelques degrés plus bas augmente l'angle du vent apparent ; choquer légèrement le foc et vriller les voiles garde la bonne incidence et réduit la force latérale, donc le bateau accélère avec moins de dérive. Cap : une fois lancé, un foc plus bordé (entrée plus fine, chute plus fermée) et le chariot de GV monté permettent au barreur de remonter plus haut tout en gardant l'écoulement attaché — mais seulement si la vitesse est là pour encaisser la force latérale. Prévenir le barreur garde la barre et le réglage cohérents.",
      ),
      ideal: [
        L('Foot: ease jib 3–5 %, lead aft 1 notch optional, call "foot".', 'Vitesse : choquer le foc de 3–5 %, chariot de foc reculé d’un cran (optionnel), annoncer « vitesse ».'),
        L('Point: full jib trim, traveller up, call "point".', 'Cap : foc bordé à fond, chariot de GV monté, annoncer « cap ».'),
        L('Back to normal on request.', 'Retour au normal sur demande.'),
      ],
      commonErrors: [
        L('Trimming harder in foot mode (stall).', 'Border plus en mode vitesse (décrochage).'),
        L('Easing in point mode (luffing).', 'Choquer en mode cap (faseyement).'),
        L('Silent trimmer: helm and sails disagree.', 'Régleur muet : barre et voiles en désaccord.'),
      ],
    },
    hints: [L('Mode buttons talk to the helm.', 'Les boutons de mode parlent au barreur.')],
  },

  // ------------------------------------------------------------------ Gust response
  {
    id: 'man-gust',
    mode: 'maneuver',
    title: L('Gust response', 'Réponse à la risée'),
    subtitle: L('Call, ease the traveller, re-trim', 'Annoncer, descendre le chariot, re-border'),
    level: 4,
    skills: ['reaction', 'mainsail'],
    pressure: 2,
    duration: 34,
    brief: L(
      'Upwind in 12 knots. A 6-knot puff will hit at t = 10 s and last ~10 s. Classic gust drill: call it, drop the traveller as it hits, keep the jib, then bring the traveller back as it fades.',
      "Au près dans 12 nœuds. Une risée de 6 nœuds va toucher à t = 10 s et durer ~10 s. Exercice classique de risée : annoncez-la, descendez le chariot de GV à l'impact, gardez le foc, puis remontez le chariot quand elle faiblit.",
    ),
    task: L('Call pressure before the puff, traveller down at impact, back up after.', "Annoncez la pression avant la risée, chariot de GV descendu à l'impact, remonté après."),
    focusControls: ['traveller', 'mainSheet', 'hike'],
    sequence: [
      { t: L('t = 5 s', 't = 5 s'), what: L('Pressure visible: call it (P).', 'Pression visible : annoncez-la (P).') },
      { t: L('t = 10 s', 't = 10 s'), what: L('Impact: traveller down 15–25 %.', 'Impact : chariot de GV descendu de 15–25 %.') },
      { t: L('t = 21 s', 't = 21 s'), what: L('Fading: traveller back up.', 'Elle faiblit : chariot de GV remonté.') },
    ],
    config: () => ({ wind: W(12, 808, [{ kind: 'gust', start: 12, ramp: 1.5, hold: 9, amount: 6 }]), sea: 1, twa: 38, v: 5.3, heel: 17, helmFeathers: false, controls: optimalControls(12, 38) }),
    script: [
      { at: 5, run: (c) => c.prompt(L('Pressure on the water…', "De la pression sur l'eau…"), 'info', 4) },
      { at: 12, run: (c) => c.mark('gust') },
      { at: 20.5, run: (c) => c.mark('fade') },
    ],
    criteria: [
      callCriterion('call', L('Pressure called before impact', "Pression annoncée avant l'impact"), ['pressure'], 'gust', 5, 0.5, 1),
      reactionCriterion('react', L('Traveller/main at impact', "Chariot / GV à l'impact"), 'gust', (a) => isDepower(a) && (a.key === 'traveller' || a.key === 'mainSheet'), 0.6, 4, 1.6, 'Reaction time', 1),
      {
        id: 'peak',
        group: 'Heel management',
        label: L('Peak heel', 'Gîte maximale'),
        weight: 1.3,
        evaluate: (ctx) => {
          const pk = Math.max(...window(ctx.tel, 10, 20).map((s) => s.heel));
          return { score: scoreLinear(pk, 32, 24), note: L(`Peak heel ${f1(pk)}°.`, `Gîte maximale ${f1(pk)}°.`) };
        },
      },
      reactionCriterion('repower', L('Re-power as it fades', 'Re-puissance quand elle faiblit'), 'fade', isPowerUp, 1.5, 6, 1, 'Timing', 1),
      {
        id: 'jibkept',
        group: 'Sail efficiency',
        label: L('Jib kept on', 'Foc gardé bordé'),
        weight: 0.8,
        evaluate: (ctx) => {
          const e = avgIn(ctx, 10, 20, (s) => s.jibEff);
          return { score: scoreLinear(e, 0.5, 0.85), note: L(`Jib flow ${pct(e)} in the puff.`, `Écoulement du foc ${pct(e)} dans la risée.`) };
        },
      },
      balanceEnd(0.8),
    ],
    expectedAdjustments: 4,
    energyBudget: 30,
    debrief: {
      physics: L(
        'Traveller down reduces the main angle of attack without opening the leech: the heeling moment and weather helm drop immediately while the main keeps its shape. When the puff fades, AWS drops and the heel goes — the traveller must come back or the boat is underpowered and slow.',
        "Descendre le chariot de GV réduit l'incidence de la GV sans ouvrir la chute : le moment de gîte et l'ardent chutent immédiatement tandis que la GV garde sa forme. Quand la risée faiblit, l'AWS baisse et la gîte disparaît — le chariot doit remonter, sinon le bateau manque de puissance et ralentit.",
      ),
      ideal: [
        L('Call 3-2-1.', 'Annoncer 3-2-1.'),
        L('Traveller down at impact.', "Chariot de GV descendu à l'impact."),
        L('Crew hiked.', "Équipage au rappel."),
        L('Traveller up as it fades.', 'Chariot de GV remonté quand elle faiblit.'),
      ],
      commonErrors: [L('Late reaction.', 'Réaction tardive.'), L('Forgetting to come back up.', 'Oublier de remonter.')],
    },
    hints: [L('T/G = traveller up/down, 1 = pressure call.', 'T/G = chariot de GV haut/bas, 1 = annonce de pression.')],
  },

  // ------------------------------------------------------------------ Lull response
  {
    id: 'man-lull',
    mode: 'maneuver',
    title: L('Lull response', 'Réponse à la molle'),
    subtitle: L('Power up, crew in, bow down', 'Remettre de la puissance, équipage rentré, étrave basse'),
    level: 4,
    skills: ['reaction', 'balance'],
    pressure: 1,
    duration: 34,
    brief: L(
      'Upwind in 13 knots, a lull to ~8 knots at t = 10 s. The trimmer powers up, calls the helm, and gets the crew to come in before the boat heels to windward.',
      "Au près dans 13 nœuds, une molle à ~8 nœuds à t = 10 s. Le régleur remet de la puissance, prévient le barreur et fait rentrer l'équipage avant que le bateau gîte au vent.",
    ),
    task: L(
      'Call lull, crew in, traveller up/backstay off, jib a touch eased; reverse when the breeze returns.',
      "Annoncez la molle, équipage rentré, chariot de GV monté / pataras relâché, foc légèrement choqué ; inversez quand le vent revient.",
    ),
    focusControls: ['hike', 'traveller', 'backstay', 'jibSheet'],
    sequence: [
      { t: L('t = 6 s', 't = 6 s'), what: L('Soft patch visible: call it (L).', 'Zone molle visible : annoncez-la (L).') },
      { t: L('t = 10 s', 't = 10 s'), what: L('Lull: crew in, power up.', 'Molle : équipage rentré, puissance remise.') },
      { t: L('t = 22 s', 't = 22 s'), what: L('Breeze back: hike, depower to settings.', 'Le vent revient : rappel, réduire la puissance aux réglages.') },
    ],
    config: () => ({ wind: W(13, 909, [{ kind: 'lull', start: 12, ramp: 2, hold: 9, amount: 5 }]), sea: 1, twa: 38, v: 5.4, heel: 18, controls: { ...optimalControls(13, 38), hike: 1 } }),
    script: [
      { at: 6, run: (c) => c.prompt(L('Soft patch ahead…', 'Zone molle devant…'), 'info', 4) },
      { at: 12, run: (c) => c.mark('lull') },
      { at: 21, run: (c) => c.mark('back') },
    ],
    criteria: [
      callCriterion('call', L('Lull / foot called', 'Molle / mode vitesse annoncé'), ['lull', 'foot'], 'lull', 4, 2, 1),
      reactionCriterion('crewin', L('Crew in at the lull', 'Équipage rentré dans la molle'), 'lull', (a) => a.key === 'hike' && (a.value ?? 1) < (a.from ?? 0), 1, 5, 1.2, 'Reaction time', 1),
      reactionCriterion('power', L('Powered up', 'Puissance remise'), 'lull', isPowerUp, 1, 6, 1, 'Trim adjustments', 1),
      {
        id: 'speed',
        group: 'Boat speed',
        label: L('Speed in the lull', 'Vitesse dans la molle'),
        weight: 1.3,
        evaluate: (ctx) => {
          const p = avgIn(ctx, 12, 20, (s) => s.perf);
          return { score: scoreLinear(p, 0.82, 0.97), note: L(`${pct(p)} of target in the lull.`, `${pct(p)} de la cible dans la molle.`) };
        },
      },
      reactionCriterion('back', L('Back to breeze settings', 'Retour aux réglages de brise'), 'back', (a) => a.key === 'hike' && (a.value ?? 0) > (a.from ?? 0), 1.5, 6, 0.8, 'Timing', 0.5),
      balanceEnd(0.8),
    ],
    expectedAdjustments: 7,
    energyBudget: 30,
    debrief: {
      physics: L(
        'In the lull, heeling moment drops sharply (∝ AWS²) while crew righting moment stays — the boat heels to windward unless the crew moves in. Power is needed: deeper sails (backstay off) and a traveller up keep the main working; a touch of jib ease adds twist and keeps the top flowing at the lower apparent wind speed.',
        "Dans la molle, le moment de gîte chute fortement (∝ AWS²) alors que le moment de redressement de l'équipage reste — le bateau gîte au vent si l'équipage ne rentre pas. Il faut de la puissance : des voiles plus creuses (pataras relâché) et le chariot de GV monté gardent la GV efficace ; un peu de foc choqué ajoute du vrillage et garde le haut de la voile porteur avec un vent apparent plus faible.",
      ),
      ideal: [
        L('Call "lull".', 'Annoncer « molle ».'),
        L('Crew in.', 'Équipage rentré.'),
        L('Traveller up, backstay off.', 'Chariot de GV monté, pataras relâché.'),
        L('Back to breeze settings when it returns.', 'Retour aux réglages de brise quand le vent revient.'),
      ],
      commonErrors: [L('Crew still hiking: windward heel.', "Équipage encore au rappel : gîte au vent."), L('No power-up.', 'Pas de remise en puissance.')],
    },
    hints: [L('Z/X = crew in/out, 2 = lull call.', 'Z/X = équipage rentré/au rappel, 2 = annonce de molle.')],
  },
];
