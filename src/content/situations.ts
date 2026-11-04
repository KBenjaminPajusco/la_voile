// High-pressure decision scenarios (Situation Training). Run in the live simulator.
import { L } from '../i18n';
import { optimalControls } from '../sim/polar';
import { clamp } from '../sim/physics';
import type { ScenarioDef } from '../sim/runner';
import { mean, scoreLinear, window } from '../sim/scoring';
import {
  STANDARD,
  avgIn,
  accelCriterion,
  callCriterion,
  f1,
  finalControlCriterion,
  firstAfter,
  isDepower,
  isMainDepower,
  isPowerUp,
  pct,
  reactionCriterion,
} from './criteria';

const wind = (tws: number, extra: Partial<ScenarioDef['config'] extends () => infer C ? C extends { wind: infer W } ? W : never : never> = {}) => ({
  tws,
  twd: 0,
  gustiness: 0.35,
  shiftiness: 0.25,
  seed: 7,
  events: [],
  ...extra,
});

export const SITUATIONS: ScenarioDef[] = [
  // ------------------------------------------------------------------ A
  {
    id: 'sit-overpowered',
    mode: 'situation',
    title: L('Overpowered', 'Surtoilé'),
    subtitle: L('Scenario A — heel, heavy helm, 19 knots', 'Scénario A — gîte, barre dure, 19 nœuds'),
    level: 4,
    skills: ['mainsail', 'balance'],
    pressure: 2,
    duration: 45,
    evalFrom: 2,
    brief: L(
      '12 knots and short chop, the boat set up for it: full main, soft backstay, traveller up. A big puff is on the water upwind — 19 knots. You can see it coming: about 10 seconds to get ready before it hits.',
      '12 nœuds et un clapot court, le bateau réglé pour : GV pleine, pataras mou, chariot de GV haut. Une grosse risée arrive sur l\'eau au vent — 19 nœuds. Tu la vois venir : environ 10 secondes pour te préparer avant qu\'elle ne frappe.',
    ),
    task: L(
      'Read the puff on the water and get ready before it lands (crew weight, backstay, traveller), then depower while keeping an efficient shape and the jib working: heel ~20–24°, helm light.',
      'Lis la risée sur l\'eau et prépare-toi avant qu\'elle n\'arrive (rappel, pataras, chariot), puis dépuissante en gardant une forme efficace et le foc qui travaille : gîte ~20–24°, barre légère.',
    ),
    focusControls: ['traveller', 'mainSheet', 'backstay', 'outhaul', 'cunningham', 'hike'],
    config: () => ({
      // 12 kn, then a big puff to 19 kn that you see on the water ~12 s before it lands
      wind: wind(12, { seed: 11, events: [{ kind: 'gust', start: 12, ramp: 4, hold: 60, amount: 7 }] }),
      sea: 1,
      twa: 38,
      v: 5.5,
      heel: 20,
      // trimmed well for 12 kn, with the light-air shape (soft backstay, outhaul, no cunningham):
      // ~21 deg of heel now, ~48 deg in the 19 kn puff unless the crew depowers
      controls: { ...optimalControls(12, 38), backstay: 0.08, outhaul: 0.35, cunningham: 0 },
    }),
    script: [
      { at: 0.1, run: (c) => (c.mark('start'), c.prompt(L('Tactician: "Big puff on the water upwind — 19 knots, here in about 12 seconds. Get ready!"', 'Tacticien : « Grosse risée sur l\'eau au vent — 19 nœuds, ici dans environ 12 secondes. Prépare-toi ! »'), 'warn', 5)) },
      { at: 12, run: (c) => (c.mark('puff'), c.prompt(L('Helm: "Here it is — I am loaded up, help me!"', 'Barreur : « La voilà — je suis chargé, aidez-moi ! »'), 'alarm', 4)) },
      { at: 20, run: (c) => c.prompt(L('Tactician: "Hold this lane, we need to keep height on the opponent."', 'Tacticien : « Tiens cette ligne, on doit garder du cap sur l\'adversaire. »'), 'info', 5) },
    ],
    criteria: [
      reactionCriterion('react', L('Reaction to the puff: first depower action (getting ready before it lands counts)', 'Réaction à la risée : première action de dépuissance (se préparer avant qu\'elle arrive compte)'), 'puff', isDepower, 1.5, 7, 1.5, 'Initial response', 10),
      {
        id: 'order',
        group: 'Decision',
        label: L('Depower order: main before jib', 'Ordre de dépuissance : GV avant foc'),
        weight: 1.4,
        evaluate: (ctx) => {
          const jibEase = ctx.actions.find((a) => a.key === 'jibSheet' && (a.value ?? 1) < (a.from ?? 0) - 0.06);
          const main = ctx.actions.find(isMainDepower);
          if (!main)
            return {
              score: 10,
              note: L(
                'The main was never eased — the main carries most of the heeling moment and creates the weather helm.',
                "La GV n'a jamais été choquée — c'est elle qui porte l'essentiel du moment de gîte et crée l'ardent.",
              ),
            };
          if (jibEase && jibEase.t < main.t)
            return {
              score: 35,
              note: L(
                'You eased the jib first. That kills pointing and drive on this rig while the main keeps the weather helm. Ease traveller/main first.',
                "Tu as choqué le foc en premier. Sur ce gréement, ça tue le cap et la propulsion pendant que la GV garde l'ardent. Choque d'abord le chariot / la GV.",
              ),
            };
          return {
            score: 100,
            note: L(
              `Main depowered first (${main.label} at ${f1(main.t)} s). Correct: the main is the throttle, the jib is the engine.`,
              `GV dépuissantée en premier (${main.label} à ${f1(main.t)} s). Correct : la GV est l'accélérateur, le foc est le moteur.`,
            ),
          };
        },
      },
      {
        id: 'shape',
        group: 'Trim adjustments',
        label: L('Shape depower (backstay / outhaul / cunningham)', 'Dépuissance par la forme (pataras / bordure / cunningham)'),
        weight: 1.2,
        evaluate: ({ sim }) => {
          const c = sim.controls;
          const pts = clamp((c.backstay - 0.08) / 0.45, 0, 1) * 60 + clamp((c.outhaul - 0.35) / 0.45, 0, 1) * 25 + clamp(c.cunningham / 0.4, 0, 1) * 15;
          return {
            score: pts,
            note: L(
              `Backstay ${pct(c.backstay)}, outhaul ${pct(c.outhaul)}, cunningham ${pct(c.cunningham)}. Flattening (backstay bends the mast, outhaul flattens the foot) reduces power at the source so you need less traveller.`,
              `Pataras ${pct(c.backstay)}, bordure ${pct(c.outhaul)}, cunningham ${pct(c.cunningham)}. Aplatir (le pataras cintre le mât, la bordure aplatit le bas de voile) réduit la puissance à la source, donc il faut moins de chariot.`,
            ),
          };
        },
      },
      {
        id: 'hike',
        group: 'Final balance',
        label: L('Crew weight used (full hike)', "Poids de l'équipage utilisé (rappel complet)"),
        weight: 0.8,
        evaluate: ({ sim }) => ({
          score: sim.controls.hike >= 0.95 ? 100 : sim.controls.hike * 80,
          note: L(
            `Hike at ${pct(sim.controls.hike)}. Crew righting moment is free power — always max it before easing sails.`,
            `Rappel à ${pct(sim.controls.hike)}. Le couple de redressement de l'équipage est de la puissance gratuite — maximise-le toujours avant de choquer les voiles.`,
          ),
        }),
      },
      {
        id: 'jibwork',
        group: 'Sail efficiency',
        label: L('Jib kept working', 'Foc maintenu en travail'),
        weight: 1,
        evaluate: (ctx) => {
          const eff = avgIn(ctx, 20, 45, (s) => s.jibEff);
          return {
            score: scoreLinear(eff, 0.5, 0.88),
            note: L(
              `Jib flow quality ${pct(eff)} in the second half. The jib should stay trimmed with telltales flowing.`,
              `Qualité d'écoulement du foc ${pct(eff)} en seconde moitié. Le foc doit rester bordé avec les penons qui volent.`,
            ),
          };
        },
      },
      ...STANDARD({ heel: 1.6, rudder: 1.6, speed: 1.2 }),
    ],
    expectedAdjustments: 6,
    energyBudget: 40,
    debrief: {
      physics: L(
        'Heeling moment ≈ side force × height of the centre of effort. The main is the bigger, taller sail and sits aft of the centre of lateral resistance, so its side force creates both heel and weather helm. Dropping the traveller rotates the whole main away from the wind (lower angle of attack) without opening the leech much; backstay bends the mast, flattening the main and opening the upper leech so the top sheds load. Heel itself adds weather helm (the drive force is offset to leeward) and costs keel efficiency — so a flatter boat is a faster boat.',
        "Moment de gîte ≈ force latérale × hauteur du centre de poussée vélique. La GV est la voile la plus grande et la plus haute, et elle se trouve en arrière du centre de résistance latérale : sa force latérale crée à la fois la gîte et l'ardent. Descendre le chariot de GV fait pivoter toute la GV hors du vent (angle d'incidence plus faible) sans trop ouvrir la chute ; le pataras cintre le mât, aplatit la GV et ouvre le haut de la chute pour que le haut délaste. La gîte elle-même ajoute de l'ardent (la force propulsive est décalée sous le vent) et coûte de l'efficacité à la quille — un bateau plus à plat est un bateau plus rapide.",
      ),
      ideal: [
        L('Crew full hike immediately (free righting moment).', 'Équipage au rappel complet immédiatement (couple de redressement gratuit).'),
        L('Traveller down 10–20 % — the fastest depower with no shape change.', 'Chariot de GV descendu de 10–20 % — la dépuissance la plus rapide, sans changer la forme.'),
        L(
          'Backstay on hard: flattens the main, opens the leech, tightens the forestay (flatter jib entry).',
          "Pataras à fond : aplatit la GV, ouvre la chute, tend l'étai (entrée du foc plus plate).",
        ),
        L(
          'Outhaul and cunningham on to flatten the lower main and keep the draft forward.',
          'Bordure et cunningham repris pour aplatir le bas de la GV et garder le creux en avant.',
        ),
        L(
          'Keep the jib trimmed — maybe lead aft a touch to twist the top — and let the main luff slightly in the puffs.',
          'Garde le foc bordé — éventuellement chariot de foc un peu reculé pour vriller le haut — et laisse la GV faseyer légèrement dans les risées.',
        ),
      ],
      commonErrors: [
        L(
          'Easing the jib first: the boat stops pointing and the main still overpowers the helm.',
          'Choquer le foc en premier : le bateau ne fait plus de cap et la GV surcharge toujours la barre.',
        ),
        L(
          'Dumping the mainsheet: leech opens hugely, main flogs, boat stops.',
          "Larguer l'écoute de GV : la chute s'ouvre énormément, la GV bat, le bateau s'arrête.",
        ),
        L(
          'Ignoring the backstay: you spend the leg with the traveller on the floor and a deep, draggy main.',
          'Oublier le pataras : tu passes le bord avec le chariot en butée et une GV creuse qui freine.',
        ),
      ],
    },
    hints: [
      L('Watch heel and rudder gauges.', 'Surveille les jauges de gîte et de safran.'),
      L('Traveller and backstay are your fast levers.', 'Le chariot de GV et le pataras sont tes leviers rapides.'),
      L('Do not forget the crew hike.', "N'oublie pas le rappel de l'équipage."),
    ],
  },

  // ------------------------------------------------------------------ B
  {
    id: 'sit-accel-tack',
    mode: 'situation',
    title: L('Acceleration after a tack', 'Relance après un virement'),
    subtitle: L('Scenario B — the boat is slow, opponent to leeward', "Scénario B — le bateau est lent, l'adversaire sous le vent"),
    level: 5,
    skills: ['maneuvers', 'headsail'],
    pressure: 3,
    duration: 30,
    brief: L(
      'You just tacked to cover. Speed fell to 3 knots in 11 knots of breeze. The jib was ground in to full upwind trim and the main is sheeted hard. The opponent is accelerating to leeward.',
      "Tu viens de virer pour contrôler. La vitesse est tombée à 3 nœuds dans 11 nœuds de vent. Le foc a été mouliné jusqu'au réglage de près complet et la GV est bordée à fond. L'adversaire accélère sous le vent.",
    ),
    task: L(
      'Rebuild speed as fast as possible: shape the sails for acceleration, communicate with the helm, then trim back to upwind settings as speed comes.',
      'Reconstruis la vitesse le plus vite possible : donne aux voiles une forme de relance, communique avec le barreur, puis reborde vers les réglages de près à mesure que la vitesse revient.',
    ),
    focusControls: ['jibSheet', 'mainSheet', 'traveller'],
    config: () => ({
      wind: wind(11, { seed: 3, gustiness: 0.2 }),
      sea: 1,
      twa: -38,
      v: 3.0,
      heel: 18,
      controls: { ...optimalControls(11, 38), jibSheet: 0.97, mainSheet: 0.97, traveller: 0.55 },
    }),
    script: [{ at: 0.1, run: (c) => (c.mark('start'), c.prompt(L('Tactician: "We need speed NOW — they are rolling us."', 'Tacticien : « Il nous faut de la vitesse MAINTENANT — ils nous passent dessus. »'), 'alarm', 4)) }],
    criteria: [
      reactionCriterion(
        'react',
        L('Initial response: ease for acceleration', 'Réponse initiale : choquer pour relancer'),
        'start',
        (a) => (a.kind === 'adjust' && (a.key === 'jibSheet' || a.key === 'mainSheet') && (a.value ?? 1) < (a.from ?? 0)) || (a.kind === 'mode' && /accel|foot/.test(a.tag ?? a.label)),
        1.5,
        6,
        1.4,
        'Initial response',
      ),
      callCriterion('call', L('Told the helm (accel / foot mode)', 'Barreur prévenu (mode relance / vitesse)'), ['accel', 'foot'], 'start', 0, 6, 1),
      {
        id: 'ease-amount',
        group: 'Trim adjustments',
        label: L('Acceleration trim: jib eased 5–12 %', 'Réglage de relance : foc choqué de 5–12 %'),
        weight: 1.2,
        evaluate: (ctx) => {
          const opt = optimalControls(11, 38).jibSheet;
          const w = window(ctx.tel, 1.5, 9);
          const js = mean(w.map((s) => s.jibSheet));
          const d = opt - js;
          const s = d >= 0.04 && d <= 0.14 ? 100 : d < 0.04 ? clamp(30 + d * 1000, 0, 90) : clamp(100 - (d - 0.14) * 500, 0, 100);
          return {
            score: s,
            note: L(
              `Jib averaged ${pct(js)} during acceleration (reference ${pct(opt)}). ${d < 0.04 ? 'Too tight for low speed: narrow groove, high side force, more leeway.' : d > 0.14 ? 'Over-eased: the jib luffed and lost drive.' : 'Good acceleration shape — wider, twisted, forgiving.'}`,
              `Foc en moyenne à ${pct(js)} pendant la relance (référence ${pct(opt)}). ${d < 0.04 ? 'Trop bordé pour une faible vitesse : plage de réglage étroite, forte force latérale, plus de dérive.' : d > 0.14 ? 'Trop choqué : le foc a faseyé et perdu sa propulsion.' : 'Bonne forme de relance — plus ouverte, vrillée, tolérante.'}`,
            ),
          };
        },
      },
      accelCriterion('start', 0.9, 6, 18, 2),
      finalControlCriterion('jibSheet', L('Re-trimmed to upwind setting', 'Rebordé au réglage de près'), 0.05, 1.1, 'Final balance'),
      {
        id: 'mode-back',
        group: 'Timing',
        label: L('Back to normal mode when fast', 'Retour au mode normal une fois rapide'),
        weight: 0.7,
        evaluate: ({ sim }) => ({
          score: sim.helmMode === 'normal' || sim.helmMode === 'point' ? 100 : 30,
          note: L(
            `Ended in ${sim.helmMode} mode. Once speed is back, call "speed OK" so the helm can point again.`,
            `Terminé en mode ${sim.helmMode}. Une fois la vitesse revenue, annonce « vitesse OK » pour que le barreur puisse remonter au vent.`,
          ),
        }),
      },
      ...STANDARD({ speed: 1.3, heel: 0.6, rudder: 0.6, eff: 0.8 }),
    ],
    expectedAdjustments: 6,
    energyBudget: 45,
    debrief: {
      physics: L(
        'At low speed the keel needs a bigger leeway angle to generate the same side force (lift ∝ V²), so a fully trimmed rig makes the boat slide sideways and stall the keel. The apparent wind is also further aft and lighter at low speed. Easing the jib a few centimetres and opening the main leech reduces side force while keeping drive; bearing away a few degrees (accel mode) increases the drive/side-force ratio. As speed builds, the apparent wind moves forward and you trim progressively — "trim with the speed".',
        "À faible vitesse, la quille a besoin d'un angle de dérive plus grand pour produire la même force latérale (portance ∝ V²) : un gréement bordé à fond fait glisser le bateau de côté et décrocher la quille. Le vent apparent est aussi plus arrière et plus faible à basse vitesse. Choquer le foc de quelques centimètres et ouvrir la chute de GV réduit la force latérale tout en gardant la propulsion ; abattre de quelques degrés (mode relance) augmente le rapport propulsion / force latérale. À mesure que la vitesse monte, le vent apparent avance et tu bordes progressivement — « border avec la vitesse ».",
      ),
      ideal: [
        L('Ease jib 5–10 % and mainsheet a touch (more twist) immediately.', 'Choque immédiatement le foc de 5–10 % et un peu l\'écoute de GV (plus de vrillage).'),
        L('Call the helm: "Accel mode — bow down" (or "foot").', 'Annonce au barreur : « Mode relance — abats un peu » (ou « vitesse »).'),
        L(
          'Grind back progressively as the speedo climbs — not faster than the speed.',
          'Remouline progressivement à mesure que le speedo monte — pas plus vite que la vitesse.',
        ),
        L(
          'At ~90 % target: jib to full trim, main back on, call "speed OK, you can point".',
          'À ~90 % de la cible : foc bordé à fond, GV reprise, annonce « vitesse OK, tu peux remonter ».',
        ),
      ],
      commonErrors: [
        L('Staying block-to-block at 3 knots: the boat crabs sideways.', 'Rester bordé à bloc à 3 nœuds : le bateau dérape en crabe.'),
        L('Easing too much: the jib luffs and you lose the drive you need.', 'Trop choquer : le foc faseye et tu perds la propulsion dont tu as besoin.'),
        L('Never calling the helm: they keep pinching.', 'Ne jamais prévenir le barreur : il continue de pincer.'),
      ],
    },
    hints: [
      L('Look at leeway and keel stall in the instruments.', 'Regarde la dérive et le décrochage de quille dans les instruments.'),
      L('Use the mode buttons to talk to the helm.', 'Utilise les boutons de mode pour parler au barreur.'),
    ],
  },

  // ------------------------------------------------------------------ C
  {
    id: 'sit-heavy-jib',
    mode: 'situation',
    title: L('The heavy jib', 'Le foc lourd'),
    subtitle: L('Scenario C — loaded winch, tired arms, tack coming', 'Scénario C — winch chargé, bras fatigués, virement imminent'),
    level: 5,
    skills: ['energy', 'headsail'],
    pressure: 2,
    duration: 50,
    brief: L(
      '17 knots. After the last tack you could not get the final 15 % of jib sheet in — the winch is in high gear and it is too heavy. You are at 45 % energy. The tactician will call another tack in about 35 seconds.',
      "17 nœuds. Après le dernier virement, tu n'as pas pu reprendre les derniers 15 % d'écoute de foc — le winch est en grande vitesse et c'est trop lourd. Tu es à 45 % d'énergie. Le tacticien annoncera un nouveau virement dans environ 35 secondes.",
    ),
    task: L(
      'Decide: accept a slightly imperfect trim, grind hard, change gear, or prioritise another adjustment — and keep enough energy for the next tack.',
      "Décide : accepter un réglage légèrement imparfait, mouliner fort, changer de vitesse ou donner la priorité à un autre réglage — et garder assez d'énergie pour le prochain virement.",
    ),
    focusControls: ['jibSheet'],
    config: () => ({
      wind: wind(17, { seed: 5 }),
      sea: 1,
      twa: 38,
      v: 5.3,
      heel: 20,
      energy: 45,
      gear: 'high',
      controls: { ...optimalControls(17, 38), jibSheet: 0.68 },
    }),
    script: [
      { at: 0.1, run: (c) => (c.mark('start'), c.sim.setTarget('jibSheet', 0.68), (c.sim.actions.length = 0), c.prompt(L('Pit: "Jib is still eased — we are slow and low."', 'Piano : « Le foc est encore choqué — on est lents et bas. »'), 'warn', 5)) },
      { at: 30, run: (c) => c.prompt(L('Tactician: "Tack in 5!"', 'Tacticien : « Virement dans 5 ! »'), 'warn', 4) },
      { at: 35, run: (c) => (c.mark('tack'), (c.data.energyAtTack = c.sim.energy), c.sim.commandTack()) },
      {
        when: (c) => c.marks.tack !== undefined && Math.abs(c.sim.twa) < 8 && !c.data.autoRel,
        run: (c) => {
          c.data.autoRel = true;
          if (!c.sim.plan.jibReleased && c.sim.headsailSide === Math.sign(c.sim.twa)) c.prompt(L('Release the old sheet now! (R)', "Largue l'ancienne écoute maintenant ! (R)"), 'alarm', 2);
        },
      },
    ],
    criteria: [
      {
        id: 'decision',
        group: 'Decision',
        label: L('Smart effort: low gear / brief sprint / unload', 'Effort intelligent : petite vitesse / bref sprint / délester'),
        weight: 1.6,
        evaluate: (ctx) => {
          const gear = ctx.actions.find((a) => a.kind === 'gear' && /low/.test(a.tag ?? a.label) && a.t < 30);
          const unload = ctx.actions.find((a) => (a.kind === 'mode' && /point/.test(a.tag ?? a.label)) || (a.kind === 'call' && /point/.test(a.tag ?? a.label)));
          const s = (gear ? 70 : 0) + (unload ? 30 : 0);
          const parts = [
            gear ? L('switched to low gear (more mechanical advantage)', 'es passé en petite vitesse (plus de démultiplication)') : L('stayed in high gear', 'es resté en grande vitesse'),
            unload
              ? L('asked the helm to point briefly to unload the sheet', "as demandé au barreur de lofer brièvement pour délester l'écoute")
              : L('did not use the helm to unload the sheet', "n'as pas utilisé le barreur pour délester l'écoute"),
          ];
          return {
            score: Math.max(s, ctx.sim.telemetry.some((x) => x.t < 30 && x.jibSheet > 0.8) ? 55 : 0),
            note: L(`You ${parts.join(' and ')}.`, `Tu ${parts.join(' et tu ')}.`),
          };
        },
      },
      {
        id: 'trim',
        group: 'Trim adjustments',
        label: L('Jib trimmed to working range before the tack', 'Foc bordé dans sa plage de travail avant le virement'),
        weight: 1.3,
        evaluate: (ctx) => {
          const opt = optimalControls(17, 38).jibSheet;
          const s = ctx.tel.filter((x) => x.t > 20 && x.t < 30);
          const js = mean(s.map((x) => x.jibSheet));
          return { score: clamp(100 - (Math.max(0, opt - js - 0.04) / 0.15) * 100, 0, 100), note: L(`Jib at ${pct(js)} before the tack (reference ${pct(opt)}). Within ~4 % is fast enough.`, `Foc à ${pct(js)} avant le virement (référence ${pct(opt)}). À ~4 % près, c'est assez rapide.`) };
        },
      },
      {
        id: 'reserve',
        group: 'Winch effort',
        label: L('Energy reserve at the tack', "Réserve d'énergie au virement"),
        weight: 1.5,
        evaluate: (ctx) => {
          const e = Number(ctx.data.energyAtTack ?? 0);
          return {
            score: scoreLinear(e, 10, 40),
            note: L(
              `${Math.round(e)}% energy when the tack was called. Below ~25 % the post-tack grind is slow and the boat stays slow.`,
              `${Math.round(e)} % d'énergie à l'annonce du virement. En dessous de ~25 %, le moulinage après le virement est lent et le bateau reste lent.`,
            ),
          };
        },
      },
      accelCriterion('tack', 0.9, 9, 20, 1.2, L('Exit of the next tack (90 % target)', 'Sortie du virement suivant (90 % de la cible)')),
      ...STANDARD({ speed: 1.2, heel: 0.6, rudder: 0.6, energy: 0.6 }),
    ],
    expectedAdjustments: 6,
    energyBudget: 35,
    debrief: {
      physics: L(
        'Sheet load scales with apparent wind speed squared and with how hard the sail is loaded — the last centimetres are the heaviest. Grinding power is limited by human output, so rope speed ≈ power / load. Low gear multiplies handle force (more mechanical advantage) at the cost of speed; a sprint burns energy fast. A brief luff by the helm (pointing for 2 seconds) reduces the angle of attack and sheet load so you can steal the last few centimetres cheaply.',
        "La charge d'écoute croît avec le carré de la vitesse du vent apparent et avec la charge de la voile — les derniers centimètres sont les plus lourds. La puissance de moulinage est limitée par l'humain, donc vitesse du bout ≈ puissance / charge. La petite vitesse multiplie la force sur la manivelle (plus de démultiplication) au prix de la vitesse ; un sprint brûle l'énergie très vite. Un bref lof du barreur (remonter 2 secondes) réduit l'angle d'incidence et la charge d'écoute pour grappiller les derniers centimètres à moindre coût.",
      ),
      ideal: [
        L('Switch to low gear — the load is beyond what high gear allows.', 'Passe en petite vitesse — la charge dépasse ce que permet la grande vitesse.'),
        L(
          'Ask the helm to point / feather briefly ("give me 2 seconds high") and grind the last centimetres in.',
          'Demande au barreur de lofer brièvement (« donne-moi 2 secondes haut ») et mouline les derniers centimètres.',
        ),
        L(
          'Accept ~95 % trim if the cost to get 100 % is your whole energy reserve: a tack is coming.',
          'Accepte ~95 % de réglage si les 100 % coûtent toute ta réserve d\'énergie : un virement arrive.',
        ),
        L(
          'Recover energy before the tack; tail fast during the next tack while the sheet is unloaded.',
          "Récupère de l'énergie avant le virement ; embraque vite pendant le virement suivant tant que l'écoute est déchargée.",
        ),
      ],
      commonErrors: [
        L('Sprinting in high gear until exhausted.', "Sprinter en grande vitesse jusqu'à l'épuisement."),
        L('Ignoring the jib entirely: boat is slow and low for the whole leg.', 'Ignorer complètement le foc : le bateau est lent et bas tout le bord.'),
        L('Arriving at the tack with 5 % energy.', "Arriver au virement avec 5 % d'énergie."),
      ],
    },
    hints: [
      L('Gear toggle: Q. Sprint: hold Shift.', 'Changer de vitesse : Q. Sprint : maintenir Maj.'),
      L('The "Point" call reduces sheet load briefly.', "L'annonce « Lofer » réduit brièvement la charge d'écoute."),
    ],
  },

  // ------------------------------------------------------------------ D
  {
    id: 'sit-unstable',
    mode: 'situation',
    title: L('Unstable boat', 'Bateau instable'),
    subtitle: L('Scenario D — heel spikes, then no power', 'Scénario D — pics de gîte, puis plus de puissance'),
    level: 6,
    skills: ['balance', 'mainsail'],
    pressure: 2,
    duration: 60,
    evalFrom: 3,
    brief: L(
      'Gusty 14 knots and a nasty chop. The boat alternates between too much heel in the puffs and stalling in the lulls. The rig is set flat and tight (backstay max, outhaul max, mainsheet block-to-block) and half the crew is sitting in.',
      "14 nœuds avec des risées et un vilain clapot. Le bateau alterne entre trop de gîte dans les risées et décrochage dans les molles. Le gréement est réglé plat et tendu (pataras max, bordure max, écoute de GV bordée à bloc) et la moitié de l'équipage est assise à l'intérieur.",
    ),
    task: L(
      'Identify the right combination of sail controls and crew positioning to make the boat stable and fast through the gust cycle.',
      "Trouve la bonne combinaison de réglages de voiles et de placement de l'équipage pour rendre le bateau stable et rapide sur tout le cycle de risées.",
    ),
    focusControls: ['hike', 'mainSheet', 'backstay', 'outhaul', 'traveller', 'jibLead'],
    config: () => ({
      wind: wind(14, {
        seed: 21,
        gustiness: 0.9,
        events: [
          { kind: 'gust', start: 6, ramp: 1.5, hold: 5, amount: 5 },
          { kind: 'lull', start: 16, ramp: 2, hold: 4, amount: 4 },
          { kind: 'gust', start: 27, ramp: 1.5, hold: 6, amount: 6 },
          { kind: 'lull', start: 38, ramp: 2, hold: 4, amount: 4 },
          { kind: 'gust', start: 48, ramp: 1.5, hold: 6, amount: 5 },
        ],
      }),
      sea: 2,
      twa: 38,
      v: 5.2,
      heel: 14,
      controls: { ...optimalControls(14, 38), backstay: 0.95, outhaul: 1, mainSheet: 1, vang: 0.6, traveller: 0.5, hike: 0.4 },
    }),
    script: [{ at: 0.1, run: (c) => (c.mark('start'), c.prompt(L('Helm: "It\'s on-off: overpowered then dead. Sort it out!"', 'Barreur : « C\'est tout ou rien : surtoilé puis plus rien. Règle-moi ça ! »'), 'warn', 5)) }],
    criteria: [
      {
        id: 'stability',
        group: 'Heel management',
        label: L('Heel stability (2nd half vs 1st)', 'Stabilité de gîte (2e moitié vs 1re)'),
        weight: 1.6,
        evaluate: (ctx) => {
          const sd = (a: number[]) => {
            const m = mean(a);
            return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
          };
          const s1 = sd(window(ctx.tel, 3, 25).map((s) => s.heel));
          const s2 = sd(window(ctx.tel, 30, 60).map((s) => s.heel));
          return {
            score: scoreLinear(s2, 6, 2.8),
            note: L(
              `Heel standard deviation ${f1(s1)}° → ${f1(s2)}°. A steady heel means the helm can steer straight and the keel works consistently.`,
              `Écart-type de gîte ${f1(s1)}° → ${f1(s2)}°. Une gîte stable permet au barreur de tenir une trajectoire droite et à la quille de travailler régulièrement.`,
            ),
          };
        },
      },
      {
        id: 'crew',
        group: 'Final balance',
        label: L('Crew weight on the rail', "Poids de l'équipage au rappel"),
        weight: 1.2,
        evaluate: ({ sim }) => ({
          score: sim.controls.hike * 100,
          note: L(
            `Hike ${pct(sim.controls.hike)}. Righting moment from the crew is the cheapest stability you have.`,
            `Rappel ${pct(sim.controls.hike)}. Le couple de redressement de l'équipage est la stabilité la moins chère dont tu disposes.`,
          ),
        }),
      },
      {
        id: 'chop-shape',
        group: 'Trim adjustments',
        label: L('Power & twist for the chop', 'Puissance et vrillage pour le clapot'),
        weight: 1.4,
        evaluate: ({ sim }) => {
          const c = sim.controls;
          const s = clamp((0.95 - c.backstay) / 0.5, 0, 1) * 35 + clamp((1 - c.outhaul) / 0.35, 0, 1) * 25 + clamp((1 - c.mainSheet) / 0.12, 0, 1) * 25 + clamp((c.jibLead - 0.5) / 0.15 + 0.5, 0, 1) * 15;
          return {
            score: s,
            note: L(
              `Backstay ${pct(c.backstay)}, outhaul ${pct(c.outhaul)}, mainsheet ${pct(c.mainSheet)}, jib lead ${pct(c.jibLead)}. In chop you need a fuller, more twisted shape: a wider groove tolerates the pitching and gives the punch to drive through waves.`,
              `Pataras ${pct(c.backstay)}, bordure ${pct(c.outhaul)}, écoute de GV ${pct(c.mainSheet)}, chariot de foc ${pct(c.jibLead)}. Dans le clapot, il faut une forme plus creuse et plus vrillée : une plage de réglage plus large tolère le tangage et donne la puissance pour passer les vagues.`,
            ),
          };
        },
      },
      {
        id: 'traveller-play',
        group: 'Decision',
        label: L('Traveller played with the puffs', 'Chariot de GV joué avec les risées'),
        weight: 1,
        evaluate: (ctx) => {
          const n = ctx.actions.filter((a) => a.key === 'traveller' || a.key === 'mainSheet').length;
          return {
            score: clamp(n * 18, 0, 100),
            note: L(
              `${n} main/traveller adjustments. Through a gust cycle the main is played actively: down in the puff, up in the lull.`,
              `${n} réglages GV / chariot. Sur un cycle de risées, la GV se joue activement : en bas dans la risée, en haut dans la molle.`,
            ),
          };
        },
      },
      ...STANDARD({ speed: 1.4, heel: 1, rudder: 1, adjust: 0.3 }),
    ],
    expectedAdjustments: 14,
    energyBudget: 50,
    debrief: {
      physics: L(
        'A very flat, tight-leeched rig has a narrow groove: small changes in apparent wind angle (pitching in chop, gusts) push sections from attached flow straight into stall or luffing, so power switches on and off. Twist widens the operating range because each height works at a slightly different angle of attack. Crew weight increases righting moment so heel responds less to each puff. The traveller is the dynamic gust valve.',
        "Un gréement très plat avec une chute fermée a une plage de réglage étroite : de petites variations d'angle du vent apparent (tangage dans le clapot, risées) font passer les sections d'un écoulement attaché directement au décrochage ou au faseyement, donc la puissance s'allume et s'éteint. Le vrillage élargit la plage de fonctionnement car chaque hauteur travaille à un angle d'incidence légèrement différent. Le poids de l'équipage augmente le couple de redressement, la gîte réagit donc moins à chaque risée. Le chariot de GV est la soupape dynamique des risées.",
      ),
      ideal: [
        L('Crew full hike first.', "D'abord l'équipage au rappel complet."),
        L('Backstay off to ~50 %, outhaul eased — power for the waves.', 'Pataras relâché à ~50 %, bordure choquée — de la puissance pour les vagues.'),
        L(
          'Ease the mainsheet a touch for twist; jib lead aft a notch to twist the jib top.',
          "Choque un peu l'écoute de GV pour le vrillage ; chariot de foc reculé d'un cran pour vriller le haut du foc.",
        ),
        L('Play the traveller: down in the puffs, back up in the lulls.', 'Joue le chariot de GV : en bas dans les risées, remonté dans les molles.'),
      ],
      commonErrors: [
        L('Leaving everything at max flat: the boat stalls in every lull.', 'Tout laisser au plus plat : le bateau décroche dans chaque molle.'),
        L('Fixing heel only with the jib sheet.', "Corriger la gîte uniquement avec l'écoute de foc."),
        L('Crew sitting in while the boat heels.', "L'équipage assis à l'intérieur pendant que le bateau gîte."),
      ],
    },
    hints: [
      L('Gusts and lulls alternate every ~10 s.', 'Risées et molles alternent toutes les ~10 s.'),
      L('Watch the heel trace in the chart.', 'Surveille la courbe de gîte sur le graphique.'),
    ],
  },

  // ------------------------------------------------------------------ E
  {
    id: 'sit-gust',
    mode: 'situation',
    title: L('Sudden gust', 'Risée soudaine'),
    subtitle: L('Scenario E — 11 → 21 knots on the windward leg', 'Scénario E — 11 → 21 nœuds sur le bord de près'),
    level: 6,
    skills: ['reaction', 'mainsail'],
    pressure: 3,
    duration: 40,
    evalFrom: 1,
    brief: L(
      'Match race, upwind, 11 knots. A dark line on the water: a big squall puff is about to hit. You are on the hip of the opponent — rounding up or flogging sails costs the race.',
      "Match race, au près, 11 nœuds. Une ligne sombre sur l'eau : une grosse risée de grain va frapper. Tu es dans la hanche de l'adversaire — partir au lof ou faire battre les voiles coûte la course.",
    ),
    task: L(
      'Anticipate, call it, react quickly without unnecessary flapping, keep control, then power up again when it passes.',
      "Anticipe, annonce-la, réagis vite sans faseyement inutile, garde le contrôle, puis remets de la puissance quand elle est passée.",
    ),
    focusControls: ['traveller', 'mainSheet', 'backstay', 'hike'],
    config: () => ({
      wind: wind(11, { seed: 31, gustiness: 0.2, events: [{ kind: 'gust', start: 12, ramp: 1.6, hold: 12, amount: 10 }] }),
      sea: 1,
      twa: 38,
      v: 5.2,
      heel: 15,
      helmFeathers: false,
      controls: { ...optimalControls(11, 38), hike: 0.85 },
    }),
    script: [
      { at: 0.1, run: (c) => c.mark('start') },
      { at: 6.5, run: (c) => c.prompt(L('Big pressure on the water — 5 seconds!', "Grosse pression sur l'eau — 5 secondes !"), 'warn', 4) },
      { at: 12, run: (c) => c.mark('gust') },
      { at: 25.6, run: (c) => c.mark('gustEnd') },
    ],
    criteria: [
      callCriterion('call', L('Called the pressure to the helm', 'Pression annoncée au barreur'), ['pressure'], 'gust', 6, 1, 1),
      reactionCriterion('react', L('Reaction to the gust (depower)', 'Réaction à la risée (dépuissance)'), 'gust', isDepower, 0.8, 5, 1.6, 'Reaction time', 1.5),
      {
        id: 'peak',
        group: 'Heel management',
        label: L('Peak heel in the gust', 'Gîte maximale dans la risée'),
        weight: 1.4,
        evaluate: (ctx) => {
          const pk = Math.max(...window(ctx.tel, 12, 22).map((s) => s.heel));
          return {
            score: scoreLinear(pk, 36, 25),
            note: L(
              `Peak heel ${f1(pk)}°. Above ~30° the rudder loses grip and the boat rounds up.`,
              `Gîte maximale ${f1(pk)}°. Au-delà de ~30°, le safran perd son accroche et le bateau part au lof.`,
            ),
          };
        },
      },
      {
        id: 'flap',
        group: 'Sail efficiency',
        label: L('No unnecessary flapping', 'Pas de faseyement inutile'),
        weight: 1.2,
        evaluate: (ctx) => {
          const w = window(ctx.tel, 12, 25);
          const eff = mean(w.map((s) => s.jibEff));
          const jibDump = ctx.actions.some((a) => a.key === 'jibSheet' && a.t > 10 && a.t < 25 && (a.from ?? 0) - (a.value ?? 0) > 0.15);
          return {
            score: clamp(scoreLinear(eff, 0.45, 0.85) - (jibDump ? 30 : 0), 0, 100),
            note: L(
              `Jib flow quality ${pct(eff)} in the gust${jibDump ? '; you dumped the jib (>15 %) — that is flogging, not trimming' : ''}.`,
              `Qualité d'écoulement du foc ${pct(eff)} dans la risée${jibDump ? " ; tu as largué le foc (>15 %) — c'est le faire battre, pas le régler" : ''}.`,
            ),
          };
        },
      },
      {
        id: 'repower',
        group: 'Timing',
        label: L('Powered up again after the gust', 'Puissance remise après la risée'),
        weight: 1,
        evaluate: (ctx) => {
          const a = firstAfter(ctx, ctx.marks.gustEnd ?? 26, isPowerUp);
          const perf = avgIn(ctx, 32, 40, (s) => s.perf);
          return {
            score: (a ? 50 : 0) + scoreLinear(perf, 0.85, 0.98) * 0.5,
            note: L(
              `${a ? `Re-powered (${a.label}) ${f1(a.t - (ctx.marks.gustEnd ?? 26))} s after the gust.` : 'Never powered back up.'} Speed after the gust ${pct(perf)}.`,
              `${a ? `Puissance remise (${a.label}) ${f1(a.t - (ctx.marks.gustEnd ?? 26))} s après la risée.` : 'Puissance jamais remise.'} Vitesse après la risée ${pct(perf)}.`,
            ),
          };
        },
      },
      ...STANDARD({ speed: 1, heel: 1, rudder: 1.3 }),
    ],
    expectedAdjustments: 6,
    energyBudget: 35,
    debrief: {
      physics: L(
        'A gust increases apparent wind speed (force ∝ AWS²) and swings the apparent wind aft (the boat has not accelerated yet), so angle of attack and heeling moment jump together. Weather helm builds with heel and main load. The fastest response is the traveller (and main) because it reduces main angle of attack instantly without changing the jib; pre-calling lets the helm feather on entry. When the gust passes, the opposite happens — failing to re-power leaves you slow in the lull.',
        "Une risée augmente la vitesse du vent apparent (force ∝ AWS²) et fait reculer le vent apparent (le bateau n'a pas encore accéléré) : l'angle d'incidence et le moment de gîte bondissent ensemble. L'ardent augmente avec la gîte et la charge de GV. La réponse la plus rapide est le chariot de GV (et la GV), car il réduit instantanément l'incidence de la GV sans toucher au foc ; annoncer à l'avance permet au barreur de lofer légèrement à l'entrée. Quand la risée passe, c'est l'inverse — ne pas remettre de puissance te laisse lent dans la molle.",
      ),
      ideal: [
        L('Call "pressure in 3, 2, 1" to the helm and crew.', "Annonce « pression dans 3, 2, 1 » au barreur et à l'équipage."),
        L('At impact: traveller down (and a little mainsheet), crew full hike.', "À l'impact : chariot de GV en bas (et un peu d'écoute de GV), équipage au rappel complet."),
        L('Keep the jib on — never dump it.', 'Garde le foc bordé — ne le largue jamais.'),
        L('Backstay on if the gust is sustained.', 'Pataras repris si la risée dure.'),
        L('Re-power (traveller up, backstay off) as it fades.', 'Remets de la puissance (chariot remonté, pataras relâché) quand elle faiblit.'),
      ],
      commonErrors: [
        L('Waiting for the heel before acting.', "Attendre la gîte avant d'agir."),
        L('Dumping the jib: flogging, loss of pointing.', 'Larguer le foc : il bat, perte de cap.'),
        L('Staying depowered after the gust.', 'Rester dépuissanté après la risée.'),
      ],
    },
    hints: [
      L('Watch the gust indicator and wind speed.', "Surveille l'indicateur de risée et la vitesse du vent."),
      L('Key 1: call pressure.', 'Touche 1 : annoncer la pression.'),
    ],
  },

  // ------------------------------------------------------------------ F
  {
    id: 'sit-overtrim',
    mode: 'situation',
    title: L('Over-trimming', 'Sur-bordé'),
    subtitle: L('Scenario F — the jib is choking the boat', 'Scénario F — le foc étouffe le bateau'),
    level: 3,
    skills: ['headsail'],
    pressure: 1,
    duration: 35,
    evalFrom: 1,
    brief: L(
      '9 knots, flat water. Someone "helped" by grinding the jib block-to-block with the lead well forward. The boat feels heavy, the speed is down, the main luff is bubbling.',
      "9 nœuds, mer plate. Quelqu'un a « aidé » en moulinant le foc à bloc avec le chariot de foc bien avancé. Le bateau semble lourd, la vitesse a baissé, le guindant de GV gonfle à contre.",
    ),
    task: L(
      'Diagnose with the telltales and the sail-shape view, then recover efficient trim. Do it with as few, purposeful adjustments as possible.',
      'Diagnostique avec les penons et la vue de forme des voiles, puis retrouve un réglage efficace. Fais-le avec le moins de réglages possible, chacun réfléchi.',
    ),
    focusControls: ['jibSheet', 'jibLead'],
    config: () => ({
      wind: wind(9, { seed: 41, gustiness: 0.2 }),
      sea: 0,
      twa: 40,
      v: 4.3,
      heel: 10,
      controls: { ...optimalControls(9, 40), jibSheet: 1, jibLead: 0.15 },
    }),
    script: [{ at: 0.1, run: (c) => (c.mark('start'), c.prompt(L('Helm: "Feels sticky. Are we over-trimmed?"', 'Barreur : « Ça colle. On est sur-bordés ? »'), 'info', 5)) }],
    criteria: [
      reactionCriterion('react', L('Diagnosis: first jib ease', 'Diagnostic : premier choc de foc'), 'start', (a) => a.key === 'jibSheet' && (a.value ?? 1) < (a.from ?? 0), 2, 10, 1.3, 'Initial response'),
      finalControlCriterion('jibSheet', L('Jib sheet back in the window', 'Écoute de foc revenue dans la plage'), 0.05, 1.5, 'Trim adjustments'),
      {
        id: 'lead',
        group: 'Trim adjustments',
        label: L('Lead moved back towards neutral', 'Chariot de foc ramené vers le neutre'),
        weight: 1,
        evaluate: ({ sim }) => ({
          score: scoreLinear(Math.abs(sim.controls.jibLead - 0.5), 0.35, 0.1),
          note: L(
            `Lead at ${pct(sim.controls.jibLead)}. A forward lead closes the jib leech and narrows the slot.`,
            `Chariot de foc à ${pct(sim.controls.jibLead)}. Un chariot avancé ferme la chute du foc et resserre la fente.`,
          ),
        }),
      },
      {
        id: 'slot',
        group: 'Final balance',
        label: L('Slot open, main not backwinded', 'Fente ouverte, GV sans contre'),
        weight: 1,
        evaluate: ({ sim }) => ({
          score: scoreLinear(sim.f.shapes.slot, 1.5, 4.5),
          note: L(
            `Slot ${f1(sim.f.shapes.slot)}° (backwind ${pct(Math.min(1, sim.f.shapes.backwind))}).`,
            `Fente ${f1(sim.f.shapes.slot)}° (contre ${pct(Math.min(1, sim.f.shapes.backwind))}).`,
          ),
        }),
      },
      {
        id: 'gain',
        group: 'Boat speed',
        label: L('Speed recovered', 'Vitesse retrouvée'),
        weight: 1.2,
        evaluate: (ctx) => {
          const a = avgIn(ctx, 0, 3, (s) => s.perf);
          const b = avgIn(ctx, 25, 35, (s) => s.perf);
          return { score: scoreLinear(b, 0.88, 0.98), note: L(`Performance ${pct(a)} → ${pct(b)}.`, `Performance ${pct(a)} → ${pct(b)}.`) };
        },
      },
      ...STANDARD({ speed: 0.6, heel: 0.3, rudder: 0.3, adjust: 1.3 }),
    ],
    expectedAdjustments: 4,
    energyBudget: 25,
    debrief: {
      physics: L(
        'Over-trimming raises the angle of attack beyond the stall angle: flow separates on the leeward side (leeward telltales stall and hang), lift stops growing while drag and side force stay high → more heel, less drive. A forward lead adds leech tension, closing the jib exit; the jib wash is then aimed into the lee side of the main, which "backwinds" (bubbles at the luff). Easing restores attached flow and opens the slot so the jib accelerates air over the main instead of choking it.',
        "Sur-border augmente l'angle d'incidence au-delà de l'angle de décrochage : l'écoulement se décolle côté sous le vent (les penons sous le vent décrochent et pendent), la portance cesse d'augmenter alors que la traînée et la force latérale restent élevées → plus de gîte, moins de propulsion. Un chariot de foc avancé ajoute de la tension de chute et ferme la sortie du foc ; le flux du foc est alors dirigé vers l'extrados de la GV, qui prend « à contre » (gonfle au guindant). Choquer rétablit un écoulement attaché et ouvre la fente, pour que le foc accélère l'air sur la GV au lieu de l'étouffer.",
      ),
      ideal: [
        L('Read the telltales: leeward stalling = over-trimmed.', 'Lis les penons : sous le vent qui décrochent = sur-bordé.'),
        L(
          'Ease the jib until leeward telltales fly, windward just lifting at the top.',
          "Choque le foc jusqu'à ce que les penons sous le vent volent, ceux au vent se soulevant juste en haut.",
        ),
        L('Move the lead back to neutral so the leech twists open slightly.', "Ramène le chariot de foc au neutre pour que la chute vrille et s'ouvre légèrement."),
        L('Stop — let the boat accelerate before touching anything else.', "Stop — laisse le bateau accélérer avant de toucher à autre chose."),
      ],
      commonErrors: [
        L('Easing the main to stop the backwind instead of fixing the jib.', 'Choquer la GV pour supprimer le contre au lieu de corriger le foc.'),
        L('Hunting the sheet in and out.', "Jouer l'écoute en permanence, dedans-dehors."),
      ],
    },
    hints: [
      L('Open the Sail Shape view to see the slot.', 'Ouvre la vue Forme des voiles pour voir la fente.'),
      L('Leeward telltales tell you about stall.', 'Les penons sous le vent te renseignent sur le décrochage.'),
    ],
  },

  // ------------------------------------------------------------------ G
  {
    id: 'sit-kite-gust',
    mode: 'situation',
    title: L('Gennaker on the edge', 'Gennaker à la limite'),
    subtitle: L('Scenario G — reaching gust, broach risk', 'Scénario G — risée au travers, risque de départ au lof'),
    level: 7,
    skills: ['headsail', 'reaction'],
    pressure: 3,
    duration: 40,
    evalFrom: 1,
    brief: L(
      'Tight reach under gennaker, 13 knots, to defend the inside at the gybe mark. A 7-knot puff is coming. A broach here hands the race to the opponent.',
      "Petit largue sous gennaker, 13 nœuds, pour défendre l'intérieur à la bouée d'empannage. Une risée de 7 nœuds arrive. Un départ au lof ici offre la course à l'adversaire.",
    ),
    task: L(
      'Keep the kite flying (no collapse), survive the puff without a broach, and stay fast.',
      "Garde le spi gonflé (sans qu'il s'effondre), passe la risée sans partir au lof, et reste rapide.",
    ),
    focusControls: ['jibSheet', 'vang', 'mainSheet', 'hike'],
    config: () => ({
      wind: wind(13, { seed: 51, gustiness: 0.3, events: [{ kind: 'gust', start: 12, ramp: 1.5, hold: 9, amount: 7 }] }),
      sea: 1,
      twa: 110,
      fixedTwa: 110,
      v: 9,
      heel: 15,
      headsail: 'gennaker',
      controls: { ...optimalControls(13, 110, 'gennaker'), vang: 0.6 },
    }),
    script: [
      { at: 0.1, run: (c) => c.mark('start') },
      { at: 7, run: (c) => c.prompt(L('Pressure coming — 5 seconds!', 'Pression qui arrive — 5 secondes !'), 'warn', 4) },
      { at: 12, run: (c) => c.mark('gust') },
    ],
    criteria: [
      callCriterion('call', L('Called the puff', 'Risée annoncée'), ['pressure'], 'gust', 6, 1, 0.8),
      reactionCriterion(
        'react',
        L('Eased kite sheet / main / vang in the puff', 'Écoute de spi / GV / hale-bas choqués dans la risée'),
        'gust',
        (a) => a.kind === 'adjust' && ['jibSheet', 'mainSheet', 'vang'].includes(a.key ?? '') && (a.value ?? 1) < (a.from ?? 0),
        0.8,
        5,
        1.5,
        'Reaction time',
        1,
      ),
      {
        id: 'broach',
        group: 'Rudder load',
        label: L('No broach (rudder stall)', 'Pas de départ au lof (décrochage du safran)'),
        weight: 1.6,
        evaluate: (ctx) => {
          const t = ctx.tel.filter((s) => s.rudder > ctx.sim.p.rudderStall).length * 0.25;
          return {
            score: clamp(100 - t * 35, 0, 100),
            note: t > 0 ? L(`Rudder stalled for ${f1(t)} s — that is a broach.`, `Safran décroché pendant ${f1(t)} s — c'est un départ au lof.`) : L('Helm kept control.', 'Le barreur a gardé le contrôle.'),
          };
        },
      },
      {
        id: 'collapse',
        group: 'Sail efficiency',
        label: L('Kite never collapsed', "Le spi ne s'est jamais effondré"),
        weight: 1.3,
        evaluate: (ctx) => {
          const t = ctx.tel.filter((s) => s.collapsed).length * 0.25;
          return {
            score: clamp(100 - t * 25, 0, 100),
            note: t > 0 ? L(`Collapsed for ${f1(t)} s — eased too far.`, `Effondré pendant ${f1(t)} s — trop choqué.`) : L('Kite stayed full.', 'Le spi est resté plein.'),
          };
        },
      },
      ...STANDARD({ speed: 1.4, heel: 1, rudder: 0.6 }),
    ],
    expectedAdjustments: 6,
    energyBudget: 40,
    debrief: {
      physics: L(
        'On a reach most of the gennaker force is sideways and high, so a puff heels the boat hard; heel moves the drive force to leeward of the hull, creating a strong turning moment into the wind. The vang holds the main leech closed — easing it lets the main top twist off and dump. Easing the kite sheet as the puff hits rotates the sail and reduces angle of attack; ease until the luff just curls, never past it or the kite collapses.',
        "Au travers, l'essentiel de la force du gennaker est latérale et haute : une risée fait fortement gîter le bateau ; la gîte déporte la force propulsive sous le vent de la coque et crée un fort couple d'auloffée. Le hale-bas maintient la chute de GV fermée — le choquer laisse le haut de la GV vriller et se décharger. Choquer l'écoute de spi à l'arrivée de la risée fait pivoter la voile et réduit l'angle d'incidence ; choque jusqu'à ce que le guindant commence juste à s'enrouler, jamais au-delà, sinon le spi s'effondre.",
      ),
      ideal: [
        L('Call the puff.', 'Annonce la risée.'),
        L('At impact: ease kite sheet 0.5–1 m, ease vang/main to twist the top off.', "À l'impact : choque l'écoute de spi de 0,5–1 m, choque hale-bas / GV pour vriller le haut."),
        L('Crew hiked hard.', 'Équipage au rappel à fond.'),
        L(
          'Re-trim to the curl as the boat accelerates (apparent wind goes forward).',
          "Reborde jusqu'à l'enroulement du guindant à mesure que le bateau accélère (le vent apparent avance).",
        ),
      ],
      commonErrors: [
        L('Holding the sheet: broach.', "Garder l'écoute bloquée : départ au lof."),
        L('Over-easing: collapse and a big wrap risk.', "Trop choquer : le spi s'effondre, gros risque d'enroulement."),
        L('Vang left on hard: main cannot spill.', 'Hale-bas laissé à fond : la GV ne peut pas se décharger.'),
      ],
    },
    hints: [
      L('In gennaker mode the sheet slider trims the kite.', "En mode gennaker, le curseur d'écoute règle le spi."),
      L('Watch the rudder gauge for broach.', 'Surveille la jauge de safran pour anticiper le départ au lof.'),
    ],
  },

  // ------------------------------------------------------------------ H
  {
    id: 'sit-lull-chop',
    mode: 'situation',
    title: L('Light patch in the chop', 'Molle dans le clapot'),
    subtitle: L('Scenario H — 12 knots drops to 6, motorboat waves', 'Scénario H — 12 nœuds qui tombent à 6, vagues de bateaux à moteur'),
    level: 4,
    skills: ['reaction', 'balance'],
    pressure: 2,
    duration: 45,
    evalFrom: 1,
    brief: L(
      'Upwind, 12 knots with spectator-boat chop. A big soft patch is ahead: the wind will drop to ~6 knots for 15 seconds. The boat is set for 12 knots and the crew is hiking.',
      "Au près, 12 nœuds avec le clapot des bateaux spectateurs. Une grosse molle arrive : le vent va tomber à ~6 nœuds pendant 15 secondes. Le bateau est réglé pour 12 nœuds et l'équipage est au rappel.",
    ),
    task: L(
      'Keep the boat moving through the lull: power up, bring crew weight in, ask the helm for a mode change, then return to settings when the breeze fills.',
      "Garde le bateau en mouvement dans la molle : remets de la puissance, rentre le poids de l'équipage, demande un changement de mode au barreur, puis reviens aux réglages quand le vent revient.",
    ),
    focusControls: ['hike', 'backstay', 'outhaul', 'jibSheet', 'traveller'],
    config: () => ({
      wind: wind(12, { seed: 61, gustiness: 0.2, events: [{ kind: 'lull', start: 12, ramp: 2.5, hold: 15, amount: 6 }] }),
      sea: 2,
      twa: 38,
      v: 5.2,
      heel: 16,
      controls: { ...optimalControls(12, 38), hike: 1 },
    }),
    script: [
      { at: 0.1, run: (c) => c.mark('start') },
      { at: 5, run: (c) => c.prompt(L('Soft patch ahead — 5 seconds.', 'Molle devant — 5 secondes.'), 'info', 4) },
      { at: 12, run: (c) => c.mark('lull') },
      { at: 29.5, run: (c) => c.mark('lullEnd') },
    ],
    criteria: [
      callCriterion('call', L('Told the helm (lull / foot)', 'Barreur prévenu (molle / vitesse)'), ['lull', 'foot'], 'lull', 5, 3, 1),
      reactionCriterion('react', L('Power-up reaction', 'Réaction : remise en puissance'), 'lull', isPowerUp, 1, 6, 1.3, 'Reaction time', 1),
      {
        id: 'crew',
        group: 'Heel management',
        label: L('Crew came in (no windward heel)', "Équipage rentré (pas de gîte au vent)"),
        weight: 1,
        evaluate: (ctx) => {
          const minHeel = Math.min(...window(ctx.tel, 13, 27).map((s) => s.heel));
          return {
            score: scoreLinear(minHeel, -3, 3),
            note: L(
              `Minimum heel in the lull ${f1(minHeel)}°. Crew hiking in 6 knots heels the boat to windward: lee helm, sails fall into the wrong shape.`,
              `Gîte minimale dans la molle ${f1(minHeel)}°. Un équipage au rappel dans 6 nœuds fait gîter le bateau au vent : barre molle, les voiles prennent une mauvaise forme.`,
            ),
          };
        },
      },
      {
        id: 'lullspeed',
        group: 'Boat speed',
        label: L('Speed held through the lull', 'Vitesse tenue dans la molle'),
        weight: 1.4,
        evaluate: (ctx) => {
          const p = avgIn(ctx, 13, 27, (s) => s.perf);
          return {
            score: scoreLinear(p, 0.8, 0.97),
            note: L(
              `${pct(p)} of target in the lull. Keeping the boat moving matters more than pointing.`,
              `${pct(p)} de la cible dans la molle. Garder le bateau en mouvement compte plus que le cap.`,
            ),
          };
        },
      },
      {
        id: 'after',
        group: 'Timing',
        label: L('Back to breeze settings after', 'Retour aux réglages de brise ensuite'),
        weight: 0.8,
        evaluate: (ctx) => ({
          score: ctx.sim.controls.hike > 0.8 ? 100 : 40,
          note: L(`Hike ${pct(ctx.sim.controls.hike)} at the end — the 12 knots came back.`, `Rappel ${pct(ctx.sim.controls.hike)} à la fin — les 12 nœuds sont revenus.`),
        }),
      },
      ...STANDARD({ speed: 0.8, heel: 0.6, rudder: 0.4 }),
    ],
    expectedAdjustments: 8,
    energyBudget: 35,
    debrief: {
      physics: L(
        'In a lull the apparent wind drops and moves aft relative to the sail; the jib and main are now over-sheeted for the new angle and too flat to generate the needed lift. Deeper sections (backstay off, outhaul eased) increase maximum lift; a slightly eased jib with more twist keeps flow attached at the top. With less heeling moment, crew hiking creates windward heel — the boat gets lee helm and the sails hang. In chop you need extra power to push through waves.',
        "Dans une molle, le vent apparent faiblit et recule par rapport à la voile ; le foc et la GV sont alors sur-bordés pour le nouvel angle et trop plats pour produire la portance nécessaire. Des profils plus creux (pataras relâché, bordure choquée) augmentent la portance maximale ; un foc légèrement choqué avec plus de vrillage garde l'écoulement attaché en haut. Avec moins de moment de gîte, l'équipage au rappel crée de la gîte au vent — le bateau devient mou à la barre et les voiles pendent. Dans le clapot, il faut un supplément de puissance pour passer les vagues.",
      ),
      ideal: [
        L('Call "lull, bow down a touch".', 'Annonce « molle, abats un peu ».'),
        L('Crew in as the heel drops.', "L'équipage rentre à mesure que la gîte baisse."),
        L('Backstay off, outhaul eased, traveller up.', 'Pataras relâché, bordure choquée, chariot de GV remonté.'),
        L('Jib eased 2–4 % for flow.', "Foc choqué de 2–4 % pour l'écoulement."),
        L('Reverse it all when the pressure returns.', 'Inverse tout quand la pression revient.'),
      ],
      commonErrors: [
        L('Hiking in the lull.', 'Rester au rappel dans la molle.'),
        L('Staying flat and tight: the boat parks.', "Rester plat et tendu : le bateau s'arrête."),
        L('Forgetting to re-depower when the breeze fills.', 'Oublier de redépuissanter quand le vent revient.'),
      ],
    },
    hints: [
      L('Watch the heel go negative if the crew keeps hiking.', "Regarde la gîte devenir négative si l'équipage reste au rappel."),
      L('Key 2: call the lull.', 'Touche 2 : annoncer la molle.'),
    ],
  },
];
