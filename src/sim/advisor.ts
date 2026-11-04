// The coach's brain: from the boat's state, find the single change that helps most, and say it in
// three steps (what to look at, what to do, how much and why). Also explains what a change did
// (quiz, easy mode). Pure: uses the steady-state physics, no UI.
import { L } from '../i18n';
import type { ControlKey, Controls } from '../content/types';
import { J80_PROFILE } from './boatProfile';
import { clamp, steadyState, type ForceResult, type SailPlanState, type SectionResult, type SteadyResult } from './physics';
import { optimalControls, targetSpeed } from './polar';


export const CONTROL_NAME: Record<ControlKey, string> = {
  jibSheet: L('jib sheet', 'écoute de foc'),
  jibLead: L('jib car', 'chariot de foc'),
  jibHalyard: L('jib halyard', 'drisse de foc'),
  mainSheet: L('mainsheet', 'écoute de GV'),
  traveller: L('traveller', 'chariot de GV'),
  vang: L('vang', 'hale-bas'),
  outhaul: L('outhaul', 'bordure'),
  cunningham: L('cunningham', 'cunningham'),
  backstay: L('backstay', 'pataras'),
  hike: L('crew weight', "poids de l'équipage"),
};

const ACT: Record<ControlKey, [string, string]> = {
  jibSheet: [L('Ease the jib sheet', "Choque l'écoute de foc"), L('Trim the jib sheet', "Borde l'écoute de foc")],
  jibLead: [L('Move the jib car forward', 'Avance le chariot de foc'), L('Move the jib car aft', 'Recule le chariot de foc')],
  jibHalyard: [L('Ease the jib halyard', 'Choque la drisse de foc'), L('Tension the jib halyard', 'Étarque la drisse de foc')],
  mainSheet: [L('Ease the mainsheet', "Choque l'écoute de GV"), L('Trim the mainsheet', "Borde l'écoute de GV")],
  traveller: [L('Drop the traveller (to leeward)', 'Descends le chariot de GV (sous le vent)'), L('Pull the traveller up (to windward)', 'Monte le chariot de GV (au vent)')],
  vang: [L('Ease the vang', 'Choque le hale-bas'), L('Pull the vang on', 'Reprends du hale-bas')],
  outhaul: [L('Ease the outhaul (deeper foot)', 'Choque la bordure (bas plus creux)'), L('Pull the outhaul (flatter foot)', 'Reprends la bordure (bas plus plat)')],
  cunningham: [L('Ease the cunningham', 'Relâche le cunningham'), L('Pull the cunningham on', 'Reprends du cunningham')],
  backstay: [L('Ease the backstay', 'Relâche le pataras'), L('Pull the backstay on', 'Reprends du pataras')],
  hike: [L('Bring the crew in', "Rentre l'équipage"), L('Crew out: hike', 'Équipage au rappel')],
};
const KITE_ACT: [string, string] = [L('Ease the kite sheet', "Choque l'écoute de spi"), L('Trim the kite sheet', "Borde l'écoute de spi")];

/** keyboard keys [less, more] and the 3D handle */
const HOW: Record<ControlKey, [string, string, string]> = {
  jibSheet: ['S', 'W', L('the winch handle', 'la poignée du winch')],
  jibLead: ['[', ']', L('the jib car', 'le chariot de foc')],
  jibHalyard: ['N', 'M', L('the halyard at the mast', 'la drisse au mât')],
  mainSheet: ['D', 'E', L('the mainsheet', "l'écoute de GV")],
  traveller: ['G', 'T', L('the traveller car', 'le chariot de GV')],
  vang: ['J', 'U', L('the vang', 'le hale-bas')],
  outhaul: ['K', 'I', L('the clew of the main', 'le point d’écoute de GV')],
  cunningham: ['L', 'O', L('the cunningham at the tack', 'le cunningham au point d’amure')],
  backstay: ['H', 'Y', L('the backstay', 'le pataras')],
  hike: ['Z', 'X', L('the crew slider', 'le curseur équipage')],
};

/** short physics, per control and direction */
const WHY: Record<ControlKey, [string, string]> = {
  jibSheet: [
    L('Easing opens the jib angle and twists the leech: lower angle of attack, the leeward flow re-attaches and the slot opens.', "Choquer ouvre l'angle du foc et fait vriller la chute : l'incidence baisse, l'écoulement se recolle sous le vent et la fente s'ouvre."),
    L('Trimming closes the jib angle and the leech: more angle of attack and pointing, until the leeward telltales stall.', "Border ferme l'angle du foc et la chute : plus d'incidence et de cap, jusqu'à ce que les penons sous le vent décrochent."),
  ],
  jibLead: [
    L('Car forward: the sheet pulls down on the leech - it closes, the foot gets rounder, more power.', "Chariot avancé : l'écoute tire vers le bas sur la chute — elle se ferme, la bordure s'arrondit, plus de puissance."),
    L('Car aft: the sheet pulls along the foot - the foot flattens and the upper leech twists open.', "Chariot reculé : l'écoute tire le long de la bordure — le bas s'aplatit et le haut de la chute s'ouvre."),
  ],
  jibHalyard: [
    L('Softer halyard: the draft moves aft and the entry gets finer - more pointing in light air.', "Drisse plus molle : le creux recule et l'entrée s'affine — plus de cap dans le petit temps."),
    L('More halyard: pulls the draft forward against the wind - rounder entry, wider groove in breeze.', "Plus de drisse : le creux avance contre le vent — entrée plus ronde, couloir plus large dans la brise."),
  ],
  mainSheet: [
    L('Easing the main lowers its angle and opens its leech: less heel and less weather helm.', "Choquer la GV réduit son angle et ouvre sa chute : moins de gîte et moins d'ardent."),
    L('Trimming the main closes its leech: more power and pointing, more heel and helm.', 'Border la GV ferme sa chute : plus de puissance et de cap, plus de gîte et de barre.'),
  ],
  traveller: [
    L('Traveller down rotates the whole main off the wind without changing its shape: the fastest depower.', 'Descendre le chariot fait pivoter toute la GV hors du vent sans changer sa forme : la dépuissance la plus rapide.'),
    L('Traveller up brings the boom to the centreline: more pointing and power when there is not enough heel.', "Monter le chariot ramène la bôme dans l'axe : plus de cap et de puissance quand la gîte manque."),
  ],
  vang: [
    L('Less vang lets the boom rise and the leech twist: softer, more power low down off the wind.', 'Moins de hale-bas laisse la bôme monter et la chute vriller : plus souple.'),
    L('Vang holds the boom down and the leech closed when the sheet is eased - without it the main becomes a cone.', "Le hale-bas tient la bôme et la chute quand l'écoute est choquée — sans lui la GV fait le cornet de frite."),
  ],
  outhaul: [
    L('Easing the outhaul deepens the bottom of the main: more power to punch through chop or in light air.', 'Choquer la bordure creuse le bas de la GV : plus de puissance dans le clapot ou le petit temps.'),
    L('Pulling the outhaul flattens the bottom of the main: less drag and heel in breeze.', 'Reprendre la bordure aplatit le bas de la GV : moins de traînée et de gîte dans la brise.'),
  ],
  cunningham: [
    L('Less cunningham lets the draft go aft - fine in light air, folds on the luff are OK there.', 'Moins de cunningham laisse le creux reculer — bien dans le petit temps, les plis au guindant y sont acceptables.'),
    L('Cunningham pulls the draft forward and opens the top of the main: needed as the wind builds.', 'Le cunningham ramène le creux en avant et ouvre le haut de la GV : nécessaire quand le vent monte.'),
  ],
  backstay: [
    L('Less backstay: straighter mast, deeper main, sagging forestay - power for light air and chop.', 'Moins de pataras : mât plus droit, GV plus creuse, étai qui flèche — de la puissance pour le petit temps et le clapot.'),
    L('Backstay bends the mast (flatter main, open leech) and tightens the forestay (flatter, twistier jib).', "Le pataras cintre le mât (GV plus plate, chute ouverte) et tend l'étai (foc plus plat et plus vrillé)."),
  ],
  hike: [
    L('Crew in (or to leeward in light air): less righting moment, the boat heels a few degrees and the sails fall into shape.', "Équipage rentré (ou sous le vent dans le petit temps) : moins de couple de redressement, le bateau gîte de quelques degrés et les voiles prennent leur forme."),
    L('Hiking adds righting moment for free: the boat stands up and the keel and rudder work better.', 'Le rappel ajoute du couple de redressement gratuitement : le bateau se redresse, quille et safran travaillent mieux.'),
  ],
};
const KITE_WHY: [string, string] = [
  L('Ease the kite until its luff just curls, then trim back a touch: that is the kite at its most efficient.', "Choque le spi jusqu'à ce que le guindant frise, puis reborde un peu : c'est là qu'il est le plus efficace."),
  L('The luff is rolling back: trim until it holds, just at the edge of the curl.', "Le guindant s'enroule : borde jusqu'à ce qu'il tienne, juste à la limite de la frisure."),
];

export const actText = (k: ControlKey, more: boolean, kite = false) => (kite && k === 'jibSheet' ? KITE_ACT : ACT[k])[more ? 1 : 0];
export const whyText = (k: ControlKey, more: boolean, kite = false) => (kite && k === 'jibSheet' ? KITE_WHY : WHY[k])[more ? 1 : 0];
export const howText = (k: ControlKey, more: boolean) => {
  const [a, b, h] = HOW[k];
  return L(`key ${more ? b : a}, or drag ${h} in 3D`, `touche ${more ? b : a}, ou glisse ${h} en 3D`);
};

// ---------------------------------------------------------------- reading the sails

export type FlowWord = 'ok' | 'stall' | 'luff' | 'flog';
const FLOW_FR: Record<FlowWord, string> = { ok: 'attaché', stall: 'décroché', luff: 'faseye', flog: 'bat' };
export const flowWord = (w: FlowWord) => L(w === 'ok' ? 'flowing' : w === 'stall' ? 'stalled' : w === 'luff' ? 'luffing' : 'flogging', FLOW_FR[w]);

/** the dominant flow of a sail, and where */
export function sailFlow(secs: SectionResult[]): { w: FlowWord; where: string } {
  const bad = secs.filter((x) => x.flow !== 'ok');
  if (!bad.length) return { w: 'ok', where: '' };
  const count = (f: string) => secs.filter((x) => x.flow === f).length;
  const w: FlowWord = count('flog') ? 'flog' : count('stall') >= count('luff') ? 'stall' : 'luff';
  const parts = secs.filter((x) => x.flow === w).map((x) => (x.h < 0.3 ? L('bottom', 'bas') : x.h > 0.7 ? L('top', 'haut') : L('middle', 'milieu')));
  return { w, where: parts.length === secs.length ? L('everywhere', 'partout') : parts.join(', ') };
}

// ---------------------------------------------------------------- the state as numbers

export interface BoatReading {
  v: number;
  target: number;
  perf: number;
  heel: number;
  rudder: number;
  f: ForceResult;
  kiteCurl?: number;
  kiteOver?: number;
}

export function solve(c: Controls, tws: number, twa: number, plan: SailPlanState, sea = 0): BoatReading {
  const kite = plan.headsail === 'gennaker';
  let p = plan;
  let kiteCurl = 0;
  let kiteOver = 0;
  if (kite) {
    const opt = optimalControls(tws, Math.abs(twa), 'gennaker').jibSheet;
    kiteCurl = clamp((opt - 0.03 - c.jibSheet) / 0.1, 0, 1.5);
    kiteOver = clamp((c.jibSheet - opt - 0.06) / 0.1, 0, 1);
    p = { ...plan, kiteCurl, kiteOver } as SailPlanState;
  }
  const r: SteadyResult = steadyState(J80_PROFILE, c, { tws, twa: Math.abs(twa), sea }, p);
  const target = targetSpeed(tws, Math.abs(twa), plan.headsail);
  return { v: r.v, target, perf: r.v / target, heel: r.heel, rudder: r.f.rudder, f: r.f, kiteCurl, kiteOver };
}

/** what a good crew optimises: speed, without an unmanageable heel or a heavy helm */
const merit = (b: BoatReading) => b.perf - 0.012 * Math.max(0, b.heel - 25) - 0.015 * Math.max(0, b.rudder - 7);

// ---------------------------------------------------------------- advice

export interface Advice {
  ok: boolean;
  /** hint 1: what to look at */
  look: string;
  /** hint 2: what to do */
  act: string;
  /** hint 3: how much, how, and why */
  detail: string;
  key?: ControlKey;
  value?: number;
}

export interface AdviceInput {
  controls: Controls;
  tws: number;
  twa: number;
  plan: SailPlanState;
  sea?: number;
  /** keys the player may use (default: all) */
  keys?: ControlKey[];
  /** stronger wind about to arrive (puff on the water): advise for it */
  upcoming?: { tws: number; inSec: number };
}

function symptom(b: BoatReading, key: ControlKey, kite: boolean): string {
  const jf = sailFlow(kite && b.f.gennaker ? b.f.gennaker.sections : b.f.jib.sections);
  const mf = sailFlow(b.f.main.sections);
  const jibSide = key === 'jibSheet' || key === 'jibLead' || key === 'jibHalyard';
  if (jibSide && kite) {
    if ((b.kiteCurl ?? 0) > 0.6) return L('Look at the kite luff: it is rolling back a long way - too eased.', "Regarde le guindant du spi : il s'enroule beaucoup — trop choqué.");
    if ((b.kiteOver ?? 0) > 0.2 || (b.kiteCurl ?? 0) < 0.05) return L('Look at the kite luff: hard and straight, no curl at all - over-trimmed.', 'Regarde le guindant du spi : dur et droit, aucune frisure — sur-bordé.');
  }
  if (jibSide && jf.w === 'stall') return L(`Look at the jib's leeward telltales and leech: stalled (${jf.where}), the leech is closed.`, `Regarde les penons sous le vent et la chute du foc : décrochés (${jf.where}), la chute est fermée.`);
  if (jibSide && (jf.w === 'luff' || jf.w === 'flog')) return L(`Look at the jib's windward telltales: lifting (${jf.where}).`, `Regarde les penons au vent du foc : ils se lèvent (${jf.where}).`);
  if (!kite && b.f.shapes.slot < 3 && (jibSide || key === 'mainSheet' || key === 'traveller')) return L('Look at the slot: the jib leech is closing on the main, its luff is bubbling.', 'Regarde la fente : la chute du foc se referme sur la GV, son guindant prend à contre.');
  if (b.heel > 26) return L(`Look at the heel: ${b.heel.toFixed(0)}° and the helm is loading up (${b.rudder.toFixed(1)}° of rudder).`, `Regarde la gîte : ${b.heel.toFixed(0)}° et la barre se charge (${b.rudder.toFixed(1)}° de safran).`);
  if (b.rudder > 7) return L(`Feel the helm: ${b.rudder.toFixed(1)}° of rudder, it is dragging the boat.`, `Sens la barre : ${b.rudder.toFixed(1)}° de safran, elle freine le bateau.`);
  if (mf.w === 'stall') return L(`Look at the main leech telltales: stalled (${mf.where}).`, `Regarde les penons de chute de GV : décrochés (${mf.where}).`);
  if (mf.w === 'luff' || mf.w === 'flog') return L(`Look at the main luff: ${flowWord(mf.w)} (${mf.where}).`, `Regarde le guindant de GV : ${flowWord(mf.w)} (${mf.where}).`);
  if (b.heel < 8 && !kite) return L(`Look at the heel: only ${b.heel.toFixed(0)}° - there is power to use.`, `Regarde la gîte : seulement ${b.heel.toFixed(0)}° — il y a de la puissance à prendre.`);
  return L(`Look at the speed: ${Math.round(b.perf * 100)}% of target.`, `Regarde la vitesse : ${Math.round(b.perf * 100)} % de la cible.`);
}

export function advise(inp: AdviceInput): Advice {
  const kite = inp.plan.headsail === 'gennaker';
  const tws = inp.upcoming && inp.upcoming.tws > inp.tws + 2 ? inp.upcoming.tws : inp.tws;
  const now = solve(inp.controls, tws, inp.twa, inp.plan, inp.sea);
  const opt = optimalControls(tws, Math.abs(inp.twa), inp.plan.headsail);
  const keys = (inp.keys ?? (Object.keys(opt) as ControlKey[])).filter((k) => !(kite && (k === 'jibLead' || k === 'jibHalyard')));
  const m0 = merit(now);
  let best: { k: ControlKey; v: number; gain: number; r: BoatReading } | null = null;
  for (const k of keys) {
    const d = opt[k] - inp.controls[k];
    if (Math.abs(d) < 0.03) continue;
    // the full move, and a partial one (sometimes half-way is where the gain is)
    for (const f of [1, 0.5]) {
      const v = clamp(inp.controls[k] + d * f, 0, 1);
      const r = solve({ ...inp.controls, [k]: v }, tws, inp.twa, inp.plan, inp.sea);
      const gain = merit(r) - m0 - (f < 1 ? 0.002 : 0);
      if (!best || gain > best.gain) best = { k, v, gain, r };
    }
  }
  const pre = tws !== inp.tws ? L(`A puff of ${tws.toFixed(0)} kn lands in about ${Math.round(inp.upcoming!.inSec)} s. `, `Une risée de ${tws.toFixed(0)} nds arrive dans environ ${Math.round(inp.upcoming!.inSec)} s. `) : '';
  if (!best || best.gain < 0.008)
    return {
      ok: true,
      look: pre + L('The trim is good: telltales flowing, heel and helm in the window.', 'Le réglage est bon : penons qui volent, gîte et barre dans la plage.'),
      act: L('Hold it - watch the telltales and the pressure on the water.', "Tiens-le — surveille les penons et la pression sur l'eau."),
      detail: L('Change nothing that works. The next move comes from the wind (puff, lull, shift) or the helm.', "Ne touche pas à ce qui marche. Le prochain réglage viendra du vent (risée, molle, bascule) ou du barreur."),
    };
  const more = best.v > inp.controls[best.k];
  const dv = best.r.v - now.v;
  const dh = best.r.heel - now.heel;
  const effect = L(
    `expected: speed ${dv >= 0 ? '+' : ''}${dv.toFixed(2)} kn, heel ${dh >= 0 ? '+' : ''}${dh.toFixed(0)}°`,
    `effet attendu : vitesse ${dv >= 0 ? '+' : ''}${dv.toFixed(2)} nd, gîte ${dh >= 0 ? '+' : ''}${dh.toFixed(0)}°`,
  );
  return {
    ok: false,
    key: best.k,
    value: best.v,
    look: pre + symptom(now, best.k, kite),
    act: `${actText(best.k, more, kite)} (${howText(best.k, more)}).`,
    detail: L(
      `To about ${Math.round(best.v * 100)}% (now ${Math.round(inp.controls[best.k] * 100)}%) - ${effect}. ${whyText(best.k, more, kite)}`,
      `Vers ~${Math.round(best.v * 100)} % (actuellement ${Math.round(inp.controls[best.k] * 100)} %) — ${effect}. ${whyText(best.k, more, kite)}`,
    ),
  };
}

// ---------------------------------------------------------------- what just happened

export interface ChangeReport {
  /** one line per control moved */
  moves: string[];
  /** what the boat did */
  effects: string[];
  /** 0..1 how much of the gap to the best trim the player recovered (can be < 0) */
  recovered: number;
}

export function explainChange(before: Controls, after: Controls, rb: BoatReading, ra: BoatReading, best: BoatReading, kite: boolean): ChangeReport {
  const moves: string[] = [];
  for (const k of Object.keys(after) as ControlKey[]) {
    const d = after[k] - before[k];
    if (Math.abs(d) < 0.015) continue;
    const name = kite && k === 'jibSheet' ? L('kite sheet', 'écoute de spi') : CONTROL_NAME[k];
    moves.push(`${name} ${Math.round(before[k] * 100)} → ${Math.round(after[k] * 100)} % — ${whyText(k, d > 0, kite)}`);
  }
  const effects: string[] = [];
  const dv = ra.v - rb.v;
  effects.push(
    L(`Speed ${rb.v.toFixed(2)} → ${ra.v.toFixed(2)} kn (${Math.round(ra.perf * 100)}% of target).`, `Vitesse ${rb.v.toFixed(2)} → ${ra.v.toFixed(2)} nds (${Math.round(ra.perf * 100)} % de la cible).`) +
      (Math.abs(dv) < 0.02 ? L(' No real change.', ' Pas de vrai changement.') : ''),
  );
  if (Math.abs(ra.heel - rb.heel) >= 1) effects.push(L(`Heel ${rb.heel.toFixed(0)}° → ${ra.heel.toFixed(0)}°.`, `Gîte ${rb.heel.toFixed(0)}° → ${ra.heel.toFixed(0)}°.`));
  if (Math.abs(ra.rudder - rb.rudder) >= 0.8) effects.push(L(`Rudder ${rb.rudder.toFixed(1)}° → ${ra.rudder.toFixed(1)}° (${ra.rudder < rb.rudder ? 'lighter helm' : 'heavier helm'}).`, `Safran ${rb.rudder.toFixed(1)}° → ${ra.rudder.toFixed(1)}° (${ra.rudder < rb.rudder ? 'barre plus légère' : 'barre plus dure'}).`));
  const head = (b: BoatReading) => (kite && b.f.gennaker ? b.f.gennaker.sections : b.f.jib.sections);
  const jb = sailFlow(head(rb));
  const ja = sailFlow(head(ra));
  if (jb.w !== ja.w || jb.where !== ja.where) effects.push(L(`${kite ? 'Kite' : 'Jib'}: ${flowWord(jb.w)}${jb.where ? ` (${jb.where})` : ''} → ${flowWord(ja.w)}${ja.where ? ` (${ja.where})` : ''}.`, `${kite ? 'Spi' : 'Foc'} : ${flowWord(jb.w)}${jb.where ? ` (${jb.where})` : ''} → ${flowWord(ja.w)}${ja.where ? ` (${ja.where})` : ''}.`));
  const mb = sailFlow(rb.f.main.sections);
  const ma = sailFlow(ra.f.main.sections);
  if (mb.w !== ma.w || mb.where !== ma.where) effects.push(L(`Main: ${flowWord(mb.w)}${mb.where ? ` (${mb.where})` : ''} → ${flowWord(ma.w)}${ma.where ? ` (${ma.where})` : ''}.`, `GV : ${flowWord(mb.w)}${mb.where ? ` (${mb.where})` : ''} → ${flowWord(ma.w)}${ma.where ? ` (${ma.where})` : ''}.`));
  if (!kite && Math.abs(ra.f.shapes.slot - rb.f.shapes.slot) > 1) effects.push(L(`Slot ${rb.f.shapes.slot.toFixed(1)}° → ${ra.f.shapes.slot.toFixed(1)}° ${ra.f.shapes.slot < 3 ? '(closed: main backwinded)' : ra.f.shapes.slot > 6.5 ? '(open)' : ''}.`, `Fente ${rb.f.shapes.slot.toFixed(1)}° → ${ra.f.shapes.slot.toFixed(1)}° ${ra.f.shapes.slot < 3 ? '(fermée : GV à contre)' : ra.f.shapes.slot > 6.5 ? '(ouverte)' : ''}.`));
  if (kite && Math.abs((ra.kiteCurl ?? 0) - (rb.kiteCurl ?? 0)) > 0.15) effects.push(L(`Kite luff curl ${Math.round((rb.kiteCurl ?? 0) * 100)} → ${Math.round((ra.kiteCurl ?? 0) * 100)} %.`, `Frisure du guindant ${Math.round((rb.kiteCurl ?? 0) * 100)} → ${Math.round((ra.kiteCurl ?? 0) * 100)} %.`));
  const gap = merit(best) - merit(rb);
  const recovered = gap > 0.005 ? (merit(ra) - merit(rb)) / gap : merit(ra) >= merit(rb) - 0.005 ? 1 : -1;
  return { moves, effects, recovered };
}

export { merit };
