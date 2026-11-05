// TRIMMASTER sailing physics core.
// Pure functions, no UI. Simplified but physically informed: sail sections with
// angle of attack / camber / draft / twist, slot interaction, heeling vs righting
// moment, keel leeway and stall, rudder balance and hull resistance.
// The goal is educational consistency, not a certified VPP.

import type { Controls } from '../content/types';
import type { BoatProfile } from './boatProfile';

export const DEG = Math.PI / 180;
export const KN = 0.514444; // m/s per knot
const RHO_AIR = 1.225;
const RHO_WATER = 1025;
const G = 9.81;

export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Headsail = 'jib' | 'gennaker';
export type Flow = 'flog' | 'luff' | 'ok' | 'stall';

export interface SailShape {
  angle: number; // chord angle of the lowest section to centreline, deg (leeward +)
  twist: number; // deg between bottom and top section
  depth: number; // camber ratio (mid section)
  depthBottom: number;
  depthTop: number;
  draft: number; // draft position, fraction of chord from luff
  leech: number; // leech tension index 0..1
  entry: number; // entry angle of mid section, deg
  groove: number; // groove width, deg
}

export interface ShapeSet {
  jib: SailShape;
  main: SailShape;
  gennaker: SailShape;
  forestaySag: number; // 0..~1.2
  slot: number; // deg; ~7–9 is healthy, < 3 = main backwinded
  backwind: number; // 0..1.5
  halyardError: number; // >0 too soft (scallops), <0 too hard
  boomAngle: number;
  /** boom rise above horizontal, deg: no vang + eased sheet lets the boom lift (the 'cornet de frite') */
  boomLift: number;
  /** small horizontal folds along the luff 0..1 when luff tension is below what the wind needs:
   *  jib = halyard (and forestay), main = cunningham. Fine in light air, a call for tension in breeze. */
  jibLuffFold: number;
  mainLuffFold: number;
}

export interface SectionResult {
  h: number; // height fraction 0..1
  z: number; // height above deck, m
  awa: number; // deg (heeled-plane)
  alpha: number; // chord angle of attack, deg
  a: number; // alpha relative to luffing point, deg
  cl: number;
  cd: number;
  flow: Flow;
  quality: number; // 0..1 flow quality
}

export interface SailResult {
  sections: SectionResult[];
  drive: number; // N
  side: number; // N
  heelMoment: number; // N·m
  yawMoment: number; // N·m (+ = weather helm)
  force: number; // total aero force, N
  efficiency: number; // 0..1
  /** 0..1 attached-flow measure for roll damping (a mild stall still damps) */
  attached: number;
  /** pitching moment of the drive about the waterline, N·m (drive × height it acts at): bow-down */
  pitchMoment: number;
  cl: number;
}

export interface EnvInput {
  tws: number; // kn (at masthead)
  twa: number; // deg 0..180 (magnitude)
  sea: number; // 0 flat .. 3 heavy
  wavePhase?: number; // radians, pitching phase for AWA jitter
}

export interface DynState {
  v: number; // boat speed, kn
  heel: number; // deg
}

export interface ForceResult {
  shapes: ShapeSet;
  aws: number; // kn (deck-level-ish, heeled)
  awa: number; // deg
  jib: SailResult;
  main: SailResult;
  gennaker: SailResult | null;
  drive: number;
  side: number;
  heelMoment: number;
  rightingMoment: number;
  yawMoment: number;
  resistance: number;
  rHull: number;
  rInduced: number;
  rRudder: number;
  rWaves: number;
  leeway: number; // deg
  keelStalled: boolean;
  rudder: number; // deg required to balance
  rudderStalled: boolean;
  heelEq: number; // static equilibrium heel for current forces
  jibSheetLoad: number; // N
  mainSheetLoad: number; // N
}

export interface SailPlanState {
  headsail: Headsail;
  gennakerCollapsed: boolean;
  jibReleased: boolean; // flogging (during a tack)
  jibBacked: boolean; // sheeted on the wrong side
  crewFore: number; // -1 aft .. 0 normal .. 1 forward
  /** gennaker luff curl, 0 = none, ~0.1-0.3 = the trimmer's target (a lip that comes and goes),
   *  1+ = folding back hard, about to collapse. Set by the engine from the sheet vs the trim point. */
  kiteCurl?: number;
  /** gennaker leech flutter 0..1: the main eased too far, the kite's exit flow no longer follows its leeward side */
  kiteLeechFlap?: number;
  /** main luff backwinded by the kite's exit flow 0..1 (main over-trimmed under the gennaker) */
  kiteMainBackwind?: number;
  /** gennaker luff flutter 0..1: a main eased too far lets the flow between main and kite go
   *  back and forth, and the kite luff breathes in and out */
  kiteLuffFlap?: number;
}

export const DEFAULT_PLAN: SailPlanState = {
  headsail: 'jib',
  gennakerCollapsed: false,
  jibReleased: false,
  jibBacked: false,
  crewFore: 0,
};

// ---------------------------------------------------------------- shapes

function entryAngle(depth: number, draft: number) {
  return 0.36 * Math.atan((2 * depth) / draft) / DEG;
}
function grooveWidth(depth: number, draft: number) {
  return clamp(6 + 50 * (depth - 0.08) + 25 * (0.45 - draft), 3, 14);
}

/** Compute sail geometry from the controls. Pure function of controls + apparent wind speed. */
export function computeShapes(c: Controls, awsKn: number): ShapeSet {
  // ---- forestay sag: backstay (and mainsheet leech load on a fractional rig) tension the forestay
  const windLoad = clamp(awsKn / 16, 0.15, 1.4);
  const forestaySag = clamp((1 - 0.72 * c.backstay - 0.18 * c.mainSheet * c.mainSheet) * windLoad * 0.85, 0, 1.25);

  // ---- jib
  const leadFwd = 1 - c.jibLead; // 1 = car forward
  const jibLeech = clamp(Math.pow(c.jibSheet, 1.6) * (0.55 + 0.6 * leadFwd), 0, 1);
  const footTension = clamp(c.jibSheet * (0.25 + 0.75 * c.jibLead), 0, 1);
  const halyardNeed = clamp(0.12 + awsKn / 28, 0.15, 0.95);
  const halyardError = halyardNeed - c.jibHalyard;
  const jibDepth = clamp(0.085 + 0.03 * (1 - footTension) + 0.035 * forestaySag + 0.012 * (1 - c.jibSheet), 0.06, 0.17);
  const jibDraft = clamp(0.4 - 0.16 * (c.jibHalyard - halyardNeed) + 0.05 * forestaySag + 0.02 * (awsKn / 20), 0.28, 0.56);
  // backstay on: the forestay straightens, the jib's head moves forward/up while the clew stays -
  // the jib flattens AND its leech opens a little. A sagging forestay lets the head drop back and
  // the leech close a touch.
  const jibTwist = clamp(3 + 17 * (1 - jibLeech) - 2 * forestaySag + 3 * c.backstay, 2, 32);
  const jibAngle = 7.5 + Math.pow(1 - c.jibSheet, 1.1) * 36 + (c.jibLead - 0.5) * 2;
  const jib: SailShape = {
    angle: jibAngle,
    twist: jibTwist,
    depth: jibDepth,
    depthBottom: clamp(jibDepth + 0.025 * (1 - footTension) - 0.012, 0.05, 0.19),
    depthTop: clamp(jibDepth * 0.88, 0.05, 0.17),
    draft: jibDraft,
    leech: jibLeech,
    entry: entryAngle(jibDepth, jibDraft),
    groove: grooveWidth(jibDepth, jibDraft),
  };

  // ---- main
  const carAngle = (0.5 - c.traveller) * 18;
  const boomAngle = clamp(carAngle * (0.35 + 0.65 * c.mainSheet) + Math.pow(1 - c.mainSheet, 1.15) * 62, -4, 78);
  const sheetComp = Math.pow(c.mainSheet, 2.1);
  const vangComp = c.vang * 0.9 * (0.35 + 0.65 * (1 - c.mainSheet));
  let mainLeech = 1 - (1 - sheetComp) * (1 - vangComp);
  mainLeech = clamp(mainLeech - 0.22 * c.backstay * (0.5 + 0.5 * c.mainSheet) - 0.07 * c.cunningham, 0, 1);
  const bend = clamp(0.85 * c.backstay + 0.15 * c.vang * c.mainSheet, 0, 1);
  // nothing holds the boom down when the sheet is eased and the vang is off: it lifts, the leech
  // falls away and the sail becomes a cone ("cornet de frite") - full and baggy low, open and
  // luffing high. The vang is what keeps the leech when the sheet stops pulling down.
  const boomFree = (1 - sheetComp) * (1 - clamp(vangComp * 1.25, 0, 1));
  const boomLift = 11 * boomFree * clamp((1 - c.mainSheet) * 1.6, 0, 1);
  const mainDepth = clamp(0.138 - 0.045 * bend - 0.012 * c.cunningham + 0.008 * boomFree * (1 - c.mainSheet), 0.07, 0.165);
  const mainDraft = clamp(0.47 + 0.07 * bend - 0.11 * c.cunningham + 0.035 * (awsKn / 20), 0.34, 0.6);
  const mainTwist = clamp(2 + 24 * (1 - mainLeech) + 18 * (1 - mainLeech) ** 2 * (1 - c.mainSheet) + 2 * c.backstay, 1.5, 48);
  const main: SailShape = {
    angle: boomAngle,
    twist: mainTwist,
    depth: mainDepth,
    depthBottom: clamp(mainDepth - 0.05 * (c.outhaul - 0.35), 0.05, 0.18),
    depthTop: clamp(mainDepth * 0.9 - 0.02 * c.backstay, 0.05, 0.16),
    draft: mainDraft,
    leech: mainLeech,
    entry: entryAngle(mainDepth, mainDraft),
    groove: grooveWidth(mainDepth, mainDraft),
  };

  // ---- gennaker (headsail sheet drives it when hoisted)
  const gAngle = 16 + Math.pow(1 - c.jibSheet, 1.05) * 88;
  const gennaker: SailShape = {
    angle: gAngle,
    twist: 10 + (1 - c.jibSheet) * 10,
    depth: 0.2,
    depthBottom: 0.19,
    depthTop: 0.2,
    draft: 0.45,
    leech: c.jibSheet,
    entry: entryAngle(0.2, 0.45),
    groove: 12,
  };

  // ---- slot between jib leech and main luff
  const slot = jib.angle + 0.5 * jib.twist - (boomAngle + 0.5 * mainTwist) + 1.5;
  // the slot chokes progressively below ~8 deg: the jib's leech flow lands on the main's lee side
  // and backwinds its luff. Healthy slot 7-9 deg; past ~3 deg the main is badly backwinded.
  const backwind = clamp(Math.max(0, (8 - slot) / 7) ** 1.4, 0, 1.5);

  const mainCunnNeed = clamp((awsKn - 9) / 12, 0.05, 0.9);
  const jibLuffFold = clamp(halyardError / 0.35 + 0.15 * forestaySag * clamp((awsKn - 8) / 8, 0, 1), 0, 1);
  const mainLuffFold = clamp((mainCunnNeed - c.cunningham) / 0.45, 0, 1);
  return { jib, main, gennaker, forestaySag, slot, backwind, halyardError, boomAngle, boomLift, jibLuffFold, mainLuffFold };
}

// ---------------------------------------------------------------- section aerodynamics

function sectionCoeffs(alpha: number, depth: number, entry: number, groove: number) {
  const clmax = 0.85 + 5.2 * depth;
  const a = alpha - entry;
  let cl: number;
  let cd = 0.018 + 0.25 * depth * depth;
  let flow: Flow = 'ok';
  let quality: number;
  let attached: number | undefined;
  if (a < -7) {
    cl = 0.05;
    cd += 0.11;
    flow = 'flog';
    quality = 0;
  } else if (a < 0) {
    const t = 1 + a / 7; // 0..1
    cl = 0.58 * clmax * t * t;
    cd += 0.09 * (1 - t);
    flow = a < -2.5 ? 'luff' : 'luff';
    quality = 0.55 * t;
  } else if (a <= groove) {
    const t = a / groove;
    cl = clmax * (0.58 + 0.42 * Math.sin((t * Math.PI) / 2));
    quality = t < 0.2 ? 0.75 + 1.25 * t : 1 - 0.15 * Math.max(0, (t - 0.85) / 0.15);
    flow = 'ok';
  } else {
    // past the groove the leeward flow separates from the leech forward: the leeward telltales
    // stall within a couple of degrees, lift stops growing and drag climbs fast
    const t = a - groove;
    const s = Math.min(1, t / 10);
    cl = clmax * (1 - 0.36 * s);
    cd += 0.31 * s;
    flow = 'stall';
    quality = clamp(0.85 - 1.7 * s, 0.05, 1);
    // still much of the cloth carries flow (and damps the roll) in a mild stall
    attached = clamp(0.85 - 0.75 * s, 0.05, 1);
  }
  // high angle: lift decays, drag grows towards flat-plate values
  if (alpha > 38) {
    cl *= clamp((92 - alpha) / 54, 0, 1);
    cd += 1.05 * clamp((alpha - 30) / 60, 0, 1);
    flow = 'stall';
  }
  return { cl, cd, flow, quality, a, attached: attached ?? quality };
}

const JIB_SECTIONS = [
  { h: 0.15, w: 0.47 },
  { h: 0.5, w: 0.35 },
  { h: 0.85, w: 0.18 },
];
const MAIN_SECTIONS = [
  { h: 0.15, w: 0.41 },
  { h: 0.5, w: 0.36 },
  { h: 0.85, w: 0.23 },
];
const GEN_SECTIONS = [
  { h: 0.2, w: 0.4 },
  { h: 0.55, w: 0.38 },
  { h: 0.88, w: 0.22 },
];

/** Apparent wind (heeled plane) at height z. */
function apparentAt(tws: number, twa: number, v: number, heel: number, z: number) {
  const zRef = 10;
  // wind gradient is steeper in light air (less mixing) -> more apparent-wind twist aloft
  const expo = 0.11 + 0.1 * clamp((10 - tws) / 7, 0, 1);
  const gradient = Math.pow(clamp(z, 0.8, 14) / zRef, expo);
  const t = tws * gradient;
  const fwd = t * Math.cos(twa * DEG) + v;
  const side = t * Math.sin(twa * DEG) * Math.cos(heel * DEG);
  return { aws: Math.hypot(fwd, side), awa: Math.atan2(side, fwd) / DEG };
}

interface SailCalcOpts {
  shape: SailShape;
  sections: { h: number; w: number }[];
  area: number;
  zBase: number;
  span: number;
  ceX: number;
  aspect: number;
  alphaShift: (h: number) => number;
  efficiencyFactor: number;
  extraCd: number;
  /** 0..1: the luff is backwinded (bubbling) - low sections lose flow quality and lift */
  luffBubble?: number;
  /** chord angle (deg from centreline) past which a section is forward of square: luffs and drags */
  chordLimit?: number;
  env: EnvInput;
  st: DynState;
}

function computeSail(o: SailCalcOpts): SailResult {
  const sections: SectionResult[] = [];
  let drive = 0;
  let side = 0;
  let heelMoment = 0;
  let yawMoment = 0;
  let qual = 0;
  let att = 0;
  let clSum = 0;
  let pitchMoment = 0;
  const jitterAmp = o.env.sea * 0.9;
  const phase = o.env.wavePhase ?? 0;
  for (const s of o.sections) {
    const z = o.zBase + s.h * o.span;
    const ap = apparentAt(o.env.tws, o.env.twa, o.st.v, o.st.heel, z);
    const awa = ap.awa + jitterAmp * Math.sin(phase) * (0.3 + s.h);
    const depth = s.h < 0.3 ? o.shape.depthBottom : s.h > 0.7 ? o.shape.depthTop : o.shape.depth;
    const alpha = awa - o.shape.angle - o.shape.twist * s.h + o.alphaShift(s.h);
    const entry = entryAngle(depth, o.shape.draft);
    const k = sectionCoeffs(alpha, depth, entry, o.shape.groove);
    if (o.luffBubble) {
      // the jib's exit flow lands on the main's lee side: the luff bubbles (worst low down)
      const b = clamp(o.luffBubble, 0, 1) * (1 - 0.55 * s.h);
      k.quality *= 1 - 0.7 * b;
      k.cl *= 1 - 0.12 * b;
      if (b > 0.35 && k.flow === 'ok') k.flow = 'luff';
    }
    // a section twisted past square (no vang downwind: the head goes forward of the beam) cannot
    // fly: it luffs, folds round the shrouds and only makes drag
    const over = o.chordLimit !== undefined ? Math.max(0, o.shape.angle + o.shape.twist * s.h - o.chordLimit) : 0;
    const cl = (k.cl * o.efficiencyFactor) / (1 + over / 8);
    // a hooked (over-tight) leech separates at the trailing edge, worse at low speed
    const hook = o.shape.twist < 5 ? (5 - o.shape.twist) * 0.02 * (1 + clamp((10 - ap.aws) / 10, 0, 1)) * s.h : 0;
    const cd = k.cd + o.extraCd + hook + over * 0.012 + (cl * cl) / (Math.PI * o.aspect);
    const q = 0.5 * RHO_AIR * (ap.aws * KN) ** 2;
    const A = o.area * s.w;
    const L = q * A * cl;
    const D = q * A * cd;
    const ar = awa * DEG;
    const fx = L * Math.sin(ar) - D * Math.cos(ar);
    const fy = L * Math.cos(ar) + D * Math.sin(ar);
    drive += fx;
    side += fy;
    heelMoment += fy * (z + 0.75);
    pitchMoment += fx * (z + 0.75);
    // CE moves aft as the sail stalls/eases (chordwise centre of pressure)
    yawMoment += fy * o.ceX + fx * Math.sin(o.st.heel * DEG) * z * 0.55;
    qual += k.quality * s.w;
    att += k.attached * s.w;
    clSum += cl * s.w;
    sections.push({ h: s.h, z, awa, alpha, a: k.a, cl, cd, flow: k.flow, quality: k.quality });
  }
  return { sections, drive, side, heelMoment, yawMoment, force: Math.hypot(drive, side), efficiency: qual, attached: att, cl: clSum, pitchMoment };
}

// ---------------------------------------------------------------- hull

const WAVE_TABLE: [number, number][] = [
  [0, 0],
  [0.15, 0.0006],
  [0.2, 0.0018],
  [0.25, 0.0042],
  [0.3, 0.0075],
  [0.35, 0.0135],
  [0.4, 0.025],
  [0.45, 0.044],
  [0.5, 0.062],
  [0.55, 0.076],
  [0.6, 0.078],
  [0.7, 0.075],
  [0.8, 0.07],
  [1.0, 0.064],
  [1.3, 0.06],
];
function waveCoef(fr: number) {
  if (fr <= 0) return 0;
  for (let i = 1; i < WAVE_TABLE.length; i++) {
    if (fr <= WAVE_TABLE[i][0]) {
      const [x0, y0] = WAVE_TABLE[i - 1];
      const [x1, y1] = WAVE_TABLE[i];
      return lerp(y0, y1, (fr - x0) / (x1 - x0));
    }
  }
  return WAVE_TABLE[WAVE_TABLE.length - 1][1];
}

/** crew righting lever, m: hike 0 = crew to LEEWARD (light air: heel the boat), 0.25 = sitting
 *  in on the centreline side, 1 = full hike on the windward rail */
export function crewArm(p: BoatProfile, hike: number) {
  return hike < 0.25 ? lerp(-0.6, p.crewArmInboard, hike / 0.25) : lerp(p.crewArmInboard, p.crewArmHiked, (hike - 0.25) / 0.75);
}

export function rightingMoment(p: BoatProfile, heel: number, hike: number) {
  const h = heel * DEG;
  const gz = p.gm * Math.sin(h) * (1 - 0.3 * (heel / 60) ** 2);
  const arm = crewArm(p, hike);
  return p.displacement * G * gz + p.crewMass * G * arm * Math.cos(h);
}

// ---------------------------------------------------------------- full force evaluation

export function evaluate(
  p: BoatProfile,
  c: Controls,
  env: EnvInput,
  st: DynState,
  plan: SailPlanState = DEFAULT_PLAN,
): ForceResult {
  const v = Math.max(0, st.v);
  const deckAw = apparentAt(env.tws, env.twa, v, st.heel, 4);
  const shapes = computeShapes(c, deckAw.aws);
  const gennakerUp = plan.headsail === 'gennaker';
  // LIGHT AIR: below ~7 kn there is not enough pressure to hold the cloth's shape. Upright, the
  // sails sag and the flow will not stay on; heeled a few degrees (crew to leeward) gravity lets
  // them fall into shape. Above ~7 kn the wind does it on its own.
  const lightness = clamp((7 - env.tws) / 3, 0, 1);
  // only heel to LEEWARD lets the cloth fall into shape (heeled to windward it falls the wrong way)
  const heelShape = clamp(st.heel / 6, 0, 1);
  const lightShape = 1 - 0.22 * lightness * (1 - heelShape);
  // luff folds only cost once there is breeze to load the luff
  const breeze = clamp((env.tws - 8) / 8, 0, 1);

  // main first (its circulation creates upwash on the jib)
  const backwindShift = gennakerUp ? 0.6 * (plan.kiteMainBackwind ?? 0) : shapes.backwind;
  const main = computeSail({
    shape: shapes.main,
    sections: MAIN_SECTIONS,
    area: p.mainArea,
    zBase: p.boomHeight,
    span: p.mastHeight - p.boomHeight - 0.3,
    ceX: p.mainCEx,
    aspect: 6.2,
    alphaShift: (h) => -6.5 * backwindShift * (1 - 0.5 * h),
    chordLimit: 82,
    efficiencyFactor: lightShape,
    extraCd: 0.05 * backwindShift + 0.02 * shapes.mainLuffFold * breeze,
    luffBubble: backwindShift,
    env,
    st: { v, heel: st.heel },
  });

  const blanket = clamp(1 - (env.twa - 115) / 45, 0.2, 1);
  const upwash = clamp(main.cl / 1.25, 0, 1.3) * 2.8;

  let jibCdExtra = 0;
  if (shapes.halyardError > 0.12) jibCdExtra += (shapes.halyardError - 0.12) * 0.12; // scallops
  // a sagging forestay in breeze: the jib's entry goes round and full, its middle bags and the leech
  // hooks - drag and lost pointing. Nothing in light air (you want the depth); real cost once loaded.
  jibCdExtra += 0.045 * shapes.forestaySag ** 2 * clamp((deckAw.aws - 10) / 10, 0, 1.4);
  if (shapes.halyardError < -0.4) jibCdExtra += (-shapes.halyardError - 0.4) * 0.05; // luff crease
  let jibEff = 1;
  let jibShift = (_h: number) => upwash;
  if (gennakerUp) jibEff = 0; // jib furled / dropped
  if (plan.jibReleased) {
    jibEff = 0.04;
    jibCdExtra += 0.12;
  }
  if (plan.jibBacked) {
    // sheeted on the old (now windward) side: big negative angle of attack, pure drag + pushes the bow
    jibShift = () => -2 * shapes.jib.angle - 10;
  }
  const jib = computeSail({
    shape: shapes.jib,
    sections: JIB_SECTIONS,
    area: p.jibArea,
    zBase: 0.6,
    span: 7.4,
    ceX: p.jibCEx,
    aspect: 5.4,
    alphaShift: jibShift,
    efficiencyFactor: jibEff * blanket * lightShape,
    extraCd: gennakerUp ? -0.02 : jibCdExtra + 0.012 * shapes.jibLuffFold * breeze,
    env,
    st: { v, heel: st.heel },
  });
  if (gennakerUp) {
    jib.drive = 0;
    jib.side = 0;
    jib.heelMoment = 0;
    jib.yawMoment = 0;
    jib.force = 0;
    jib.pitchMoment = 0;
  }
  if (plan.jibBacked) {
    // backed jib: force acts to windward -> yaw the bow away and brake
    const f = jib.force;
    jib.drive = -0.35 * f;
    jib.pitchMoment = jib.drive * 4;
    jib.side = -0.6 * f;
    jib.heelMoment = -0.6 * f * 4;
    jib.yawMoment = -0.6 * f * p.jibCEx; // pushes bow down to (new) leeward
    jib.efficiency = 0;
  }

  let gennaker: SailResult | null = null;
  if (gennakerUp) {
    gennaker = computeSail({
      shape: shapes.gennaker,
      sections: GEN_SECTIONS,
      area: p.gennakerArea,
      zBase: 0.4,
      span: p.mastHeight * 0.92,
      ceX: p.gennakerCEx,
      aspect: 3.2,
      alphaShift: () => 0,
      // a curl past the trimmer's lip folds the front of the kite back on itself: lost area and drag
      efficiencyFactor: (1 - 0.5 * (1 - lightShape)) * (plan.gennakerCollapsed ? 0.15 : 1) * (1 - 0.45 * clamp(((plan.kiteCurl ?? 0) - 0.25) / 0.75, 0, 1)) * (1 - 0.08 * (plan.kiteLeechFlap ?? 0)) * (1 - 0.08 * (plan.kiteLuffFlap ?? 0)),
      extraCd: (plan.gennakerCollapsed ? 0.15 : 0) + 0.05 * clamp((plan.kiteCurl ?? 0) - 0.25, 0, 1),
      env,
      st: { v, heel: st.heel },
    });
  }

  const drive = main.drive + jib.drive + (gennaker?.drive ?? 0);
  const side = main.side + jib.side + (gennaker?.side ?? 0);
  const heelMoment = main.heelMoment + jib.heelMoment + (gennaker?.heelMoment ?? 0);
  let yawMoment = main.yawMoment + jib.yawMoment + (gennaker?.yawMoment ?? 0);

  // ---- hull resistance
  const vms = v * KN;
  const mass = p.displacement + p.crewMass;
  const fr = vms / Math.sqrt(G * p.lwl);
  const re = Math.max(1e4, (vms * p.lwl * 0.7) / 1.19e-6);
  const cf = 0.075 / (Math.log10(re) - 2) ** 2;
  const absHeel = Math.abs(st.heel);
  const heelFactor = 1 + 0.25 * (absHeel / 30) ** 2 + (absHeel > 22 ? 0.55 * ((absHeel - 22) / 10) ** 2 : 0);
  // crew fore/aft: forward helps in light air (lifts transom), aft helps when fast (lifts bow)
  let trimFactor = 1;
  if (v < 4.5) trimFactor -= 0.06 * plan.crewFore;
  else if (v > 7) trimFactor += 0.08 * plan.crewFore;
  else trimFactor += 0.02 * Math.abs(plan.crewFore);
  // a few degrees of heel lift the flat run of the hull out: less wetted surface, worth it in light air
  const rFriction = 0.5 * RHO_WATER * p.wettedArea * vms * vms * cf * (1 - 0.07 * lightness * clamp(st.heel / 8, 0, 1));
  const rWaveMaking = mass * G * waveCoef(fr);
  const rHull = (rFriction + rWaveMaking) * heelFactor * trimFactor;
  const headSea = 0.5 + 0.5 * Math.cos(env.twa * DEG);
  const rWaves = mass * G * 0.0035 * env.sea ** 1.5 * headSea * clamp(v / 5, 0.2, 1.3);

  // ---- keel: leeway required to produce the horizontal side force
  const qw = 0.5 * RHO_WATER * Math.max(vms, 0.25) ** 2;
  const fyH = Math.abs(side * Math.cos(st.heel * DEG));
  const keelArea = p.keelArea * Math.cos(st.heel * DEG);
  const lambdaLin = fyH / (qw * keelArea * 5.0);
  const stall = 9 * DEG;
  let lambda = lambdaLin;
  let keelStalled = false;
  if (lambdaLin > stall) {
    lambda = stall + (lambdaLin - stall) * 2.2;
    keelStalled = true;
  }
  lambda = Math.min(lambda, 35 * DEG);
  // once stalled, the excess side force mostly makes the boat slide sideways; forward drag is bounded
  const rInduced = fyH * Math.min(lambda, stall) * 0.55 + (keelStalled ? Math.min(fyH * (lambda - stall) * 0.6, qw * keelArea * 0.12) : 0);

  // ---- rudder balance
  const rudderDenom = Math.max(qw, 60) * p.rudderArea * 4.2 * p.rudderLever;
  // heel-induced weather helm already in yawMoment through drive offset; add hull asymmetry with heel
  // asymmetric heeled waterplane: the hull itself wants to luff as it heels
  yawMoment += side * 0.004 * absHeel * (absHeel / 15);
  const rudder = (yawMoment / rudderDenom) / DEG;
  const rudderStalled = Math.abs(rudder) > p.rudderStall;
  const rudderLift = Math.abs(yawMoment) / p.rudderLever;
  const rudderLiftEff = Math.min(rudderLift, Math.max(qw, 60) * p.rudderArea * 1.2);
  const rRudder = rudderLiftEff * Math.min(Math.abs(rudder), p.rudderStall) * DEG * 0.5 + 0.5 * RHO_WATER * vms * vms * p.rudderArea * 0.012 + (rudderStalled ? rudderLiftEff * 0.3 : 0);

  const resistance = rHull + rWaves + rInduced + rRudder;
  const rm = rightingMoment(p, st.heel, c.hike);

  // static equilibrium heel for current moment (for steady-state solving)
  const heelEq = solveHeel(p, heelMoment, c.hike, st.heel);

  const jibLoadForce = gennakerUp ? (gennaker?.force ?? 0) : plan.jibReleased ? 0 : jib.force;
  return {
    shapes,
    aws: deckAw.aws,
    awa: deckAw.awa,
    jib,
    main,
    gennaker,
    drive,
    side,
    heelMoment,
    rightingMoment: rm,
    yawMoment,
    resistance,
    rHull,
    rInduced,
    rRudder,
    rWaves,
    leeway: lambda / DEG,
    keelStalled,
    rudder,
    rudderStalled,
    heelEq,
    // jib: the sheet carries ~2× the sail force (the clew is pulled back AND down, a small angle to the
    // leech): ~1.2–1.5 kN at 17 kn, ~450 N at 10 kn on a J/80
    jibSheetLoad: jibLoadForce * (gennakerUp ? 0.45 : 2.4),
    mainSheetLoad: main.force * 0.55 * (0.3 + 0.7 * c.mainSheet),
  };
}

/** Heel where righting moment equals the (cos²-scaled) heeling moment. */
export function solveHeel(p: BoatProfile, heelMomentAtCurrent: number, hike: number, currentHeel: number) {
  // heeling moment scales roughly with cos²(heel); normalise to upright
  const c0 = Math.cos(currentHeel * DEG) ** 2;
  const hm0 = heelMomentAtCurrent / Math.max(c0, 0.2);
  let lo = -25;
  let hi = 85;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const f = hm0 * Math.cos(mid * DEG) ** 2 - rightingMoment(p, mid, hike);
    if (f > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------- steady state

export interface SteadyResult {
  v: number;
  heel: number;
  f: ForceResult;
  vmg: number;
}

/** Solve for steady boat speed and heel at fixed controls and TWA. */
export function steadyState(
  p: BoatProfile,
  c: Controls,
  env: EnvInput,
  plan: SailPlanState = DEFAULT_PLAN,
): SteadyResult {
  let heel = 10;
  let lo = 0.05;
  let hi = 18;
  let f: ForceResult = evaluate(p, c, env, { v: 4, heel }, plan);
  for (let it = 0; it < 20; it++) {
    const mid = (lo + hi) / 2;
    // two heel fixed-point passes per speed iterate
    for (let k = 0; k < 3; k++) {
      f = evaluate(p, c, env, { v: mid, heel }, plan);
      heel = 0.5 * heel + 0.5 * f.heelEq;
    }
    if (f.drive - f.resistance > 0) lo = mid;
    else hi = mid;
  }
  const v = (lo + hi) / 2;
  f = evaluate(p, c, env, { v, heel }, plan);
  const vmg = v * Math.cos((env.twa + f.leeway) * DEG);
  return { v, heel, f, vmg };
}

// ---------------------------------------------------------------- optimiser (targets & coaching)

export const CONTROL_KEYS: (keyof Controls)[] = [
  'jibSheet',
  'mainSheet',
  'traveller',
  'jibLead',
  'jibHalyard',
  'backstay',
  'vang',
  'outhaul',
  'cunningham',
  'hike',
];

export const NEUTRAL_UPWIND: Controls = {
  jibSheet: 0.82,
  jibLead: 0.5,
  jibHalyard: 0.5,
  mainSheet: 0.8,
  traveller: 0.5,
  vang: 0.2,
  outhaul: 0.6,
  cunningham: 0.1,
  backstay: 0.3,
  hike: 0.8,
};

export const NEUTRAL_REACH: Controls = {
  jibSheet: 0.5,
  jibLead: 0.4,
  jibHalyard: 0.5,
  mainSheet: 0.45,
  traveller: 0.4,
  vang: 0.5,
  outhaul: 0.4,
  cunningham: 0.1,
  backstay: 0.1,
  hike: 1,
};

export const NEUTRAL_DOWNWIND: Controls = {
  jibSheet: 0.45,
  jibLead: 0.5,
  jibHalyard: 0.5,
  mainSheet: 0.15,
  traveller: 0.5,
  vang: 0.45,
  outhaul: 0.35,
  cunningham: 0,
  backstay: 0.05,
  hike: 0.4,
};

function objective(r: SteadyResult, p: BoatProfile) {
  // speed, with penalties for helm load and extreme heel (crew/helm comfort, safety)
  let j = r.v;
  const rud = Math.abs(r.f.rudder);
  if (rud > p.rudderComfort - 2) j -= 0.03 * (rud - (p.rudderComfort - 2)) ** 2;
  if (r.heel > 26) j -= 0.04 * (r.heel - 26) ** 2;
  if (r.heel < -2) j -= 0.05 * (-2 - r.heel) ** 2;
  return j;
}

/** Coordinate-descent optimisation of all controls for best speed at fixed TWA. */
export function optimiseTrim(
  p: BoatProfile,
  env: EnvInput,
  plan: SailPlanState = DEFAULT_PLAN,
  start?: Controls,
): { controls: Controls; result: SteadyResult } {
  const env0 = { ...env, wavePhase: 0 };
  const starts: Controls[] = start
    ? [start]
    : env.twa > 100
      ? [NEUTRAL_DOWNWIND]
      : env.twa > 52
        ? [NEUTRAL_REACH, NEUTRAL_UPWIND]
        : [NEUTRAL_UPWIND];
  let c: Controls = { ...starts[0] };
  let best = steadyState(p, c, env0, plan);
  let bestJ = objective(best, p);
  for (const s0 of starts.slice(1)) {
    const r = steadyState(p, s0, env0, plan);
    const j = objective(r, p);
    if (j > bestJ) {
      c = { ...s0 };
      best = r;
      bestJ = j;
    }
  }
  const keys = CONTROL_KEYS.filter((k) => !(plan.headsail === 'gennaker' && (k === 'jibLead' || k === 'jibHalyard')));
  for (const step of [0.16, 0.08, 0.04, 0.02]) {
    for (let pass = 0; pass < 2; pass++) {
      let improved = false;
      for (const k of keys) {
        for (const dir of [1, -1]) {
          let moved = false;
          for (let n = 0; n < 6; n++) {
            const trial = { ...c, [k]: clamp(c[k] + dir * step, 0, 1) };
            if (trial[k] === c[k]) break;
            const r = steadyState(p, trial, env0, plan);
            const j = objective(r, p);
            if (j > bestJ + 1e-4) {
              c = trial;
              best = r;
              bestJ = j;
              moved = true;
              improved = true;
            } else break;
          }
          if (moved) break;
        }
      }
      if (!improved) break;
    }
  }
  return { controls: c, result: best };
}
