// Time-stepping simulator. Owns the evolving boat state, wind, winch/crew energy,
// AI helm and maneuver mechanics. No React here — the UI reads `sim.snapshot()`.

import type { ControlKey, Controls } from '../content/types';
import { J80_PROFILE, type BoatProfile } from './boatProfile';
import {
  clamp,
  DEG,
  evaluate,
  KN,
  NEUTRAL_UPWIND,
  type ForceResult,
  type Headsail,
  type SailPlanState,
} from './physics';
import { bestVmgAngle, optimalControls, targetSpeed } from './polar';
import { WindModel, type WindConfig, type WindEvent } from './wind';
import { L } from '../i18n';

export type HelmMode = 'point' | 'normal' | 'foot' | 'accel';
export type CrewCall = 'pressure' | 'lull' | 'foot' | 'point' | 'speed-ok' | 'hike' | 'ease-hike';
export type Gear = 'high' | 'low';
export type CrewFore = -1 | 0 | 1;
export type Speaker = 'helm' | 'pit' | 'tactician' | 'coach' | 'system';

export interface SimMessage {
  t: number;
  from: Speaker;
  text: string;
  tone: 'info' | 'warn' | 'alarm' | 'good';
  key?: string;
}

export interface ActionLog {
  t: number;
  kind: 'adjust' | 'call' | 'mode' | 'release' | 'gear' | 'sprint' | 'crew' | 'command' | 'prep';
  key?: string;
  value?: number;
  from?: number;
  label: string;
  /** English label (language-independent): label-based checks in criteria/debrief test this */
  tag?: string;
  reversal?: boolean;
}

export interface Sample {
  t: number;
  v: number;
  target: number;
  perf: number; // v / target
  heel: number;
  rudder: number;
  tws: number;
  twa: number; // signed
  awa: number;
  energy: number;
  jibEff: number;
  mainEff: number;
  jibFlow: string;
  slot: number;
  vmg: number;
  accel: number;
  maneuver: string | null;
  backed: boolean;
  collapsed: boolean;
  gust: number;
  jibSheet: number;
  mainSheet: number;
}

export type ManeuverKind = 'tack' | 'gybe' | 'bear-away' | 'harden-up';

export interface Maneuver {
  kind: ManeuverKind;
  start: number;
  targetTwa: number; // signed target after the maneuver
  done: boolean;
  crossedAt?: number; // time bow (tack) / stern (gybe) crossed the wind
  releasedAt?: number;
  releaseTwa?: number;
  autoReleased?: boolean;
  hoist?: boolean;
  douse?: boolean;
  sailChangeAt?: number;
  minSpeed?: number;
  entrySpeed: number;
}

export interface SimConfig {
  profile?: BoatProfile;
  wind: WindConfig;
  sea: number;
  twa: number; // signed initial TWA (+ = starboard tack)
  v?: number;
  heel?: number;
  controls?: Partial<Controls>;
  headsail?: Headsail;
  helmMode?: HelmMode;
  /** If set, the helm holds this |TWA| instead of the VMG angle (e.g. reaching scenarios). */
  fixedTwa?: number;
  crewFore?: CrewFore;
  energy?: number;
  gear?: Gear;
  /** Helm auto-feathers in gusts (good helm). Default true. */
  helmFeathers?: boolean;
}

export const CONTROL_RATES: Record<ControlKey, { up: number; down: number; energy: number; label: string }> = {
  jibSheet: { up: 0, down: 0, energy: 0, label: L('Jib sheet', 'Écoute de foc') }, // winch-driven, special-cased
  mainSheet: { up: 0.3, down: 0.9, energy: 0.9, label: L('Mainsheet', 'Écoute de GV') },
  traveller: { up: 0.9, down: 0.9, energy: 0.15, label: L('Traveller', 'Chariot de GV') },
  jibLead: { up: 0.22, down: 0.22, energy: 0.2, label: L('Jib lead', 'Chariot de foc') },
  jibHalyard: { up: 0.18, down: 0.5, energy: 1.2, label: L('Jib halyard', 'Drisse de foc') },
  backstay: { up: 0.45, down: 0.9, energy: 0.5, label: L('Backstay', 'Pataras') },
  vang: { up: 0.3, down: 0.9, energy: 0.6, label: L('Vang', 'Hale-bas') },
  outhaul: { up: 0.25, down: 0.6, energy: 0.4, label: L('Outhaul', 'Bordure') },
  cunningham: { up: 0.3, down: 0.8, energy: 0.4, label: L('Cunningham', 'Cunningham') },
  hike: { up: 0.6, down: 0.8, energy: 0, label: L('Crew weight (lee - hike)', 'Poids équipage (sous le vent - rappel)') },
};

const WINCH = { highMA: 7, lowMA: 22, highMaxRope: 0.36, lowMaxRope: 0.13, handleForce: 190 };

export interface Snapshot {
  t: number;
  v: number;
  target: number;
  perf: number;
  heel: number;
  heelRate: number; // deg/s
  pitch: number; // deg, + bow up
  pitchRate: number;
  rollDamping: number;
  /** gennaker luff curl 0..1.5 and over-trim 0..1 (0 when the jib is up) */
  kiteCurl: number;
  kiteOver: number;
  /** gennaker leech flutter 0..1 from an over-trimmed main */
  kiteLeechFlap: number;
  /** main luff backwinded by the kite 0..1 (main over-trimmed under the gennaker) */
  kiteMainBackwind: number;
  autoTrim: boolean;
  manualHelm: boolean;
  /** controls the player has caught (not on auto) while the auto crew is on */
  manualKeys: ControlKey[];
  /** gennaker luff flutter 0..1 from a main eased too far */
  kiteLuffFlap: number;
  accel: number; // kn/s
  heading: number;
  twa: number;
  tws: number;
  twd: number;
  aws: number;
  awa: number;
  vmg: number;
  rudder: number;
  energy: number;
  gear: Gear;
  sprint: boolean;
  controls: Controls;
  targets: Controls;
  f: ForceResult;
  plan: SailPlanState;
  helmMode: HelmMode;
  maneuver: Maneuver | null;
  messages: SimMessage[];
  winchState: 'idle' | 'tailing' | 'grinding' | 'stalled' | 'easing';
  gust: number;
  upcoming?: WindEvent;
  /** the wind the boat will meet over the next ~15 s (every 0.5 s): drawn as puffs on the water */
  windAhead?: { t: number; tws: number; twd: number }[];
  x: number;
  y: number;
  roundUp: boolean;
  crewFore: CrewFore;
  dist: number; // metres sailed
}

const wrap180 = (a: number) => {
  let x = ((a + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
};

export class Simulator {
  p: BoatProfile;
  wind: WindModel;
  sea: number;
  t = 0;
  v: number;
  heel: number;
  heelRate = 0;
  /** Pitch (deg, + = bow up) and its rate. Driven by waves, crew position and drive load. */
  pitch = 0;
  pitchRate = 0;
  /** Current roll damping ratio — drops when the sails stall/flog or the kite rolls the boat. */
  rollDamping = 0.95;
  /** best kite sheet for the moment's wind and angle (for the curl / over-trim reading) */
  kiteOptSheet = 0.5;
  /** AUTO CREW: the sails are trimmed to the optimum continuously and the sheets handled in
   *  maneuvers; the user steers (manualHelm) with helmCmd, -1 (bow to port) .. +1 (bow to starboard) */
  autoTrim = false;
  manualHelm = false;
  helmCmd = 0;
  /** controls the auto crew looks after; the ones the player has 'caught' are left alone */
  autoKeys = new Set<ControlKey>(['jibSheet', 'jibLead', 'jibHalyard', 'mainSheet', 'traveller', 'vang', 'outhaul', 'cunningham', 'backstay', 'hike']);
  private autoClock = 0;
  private windAhead: { t: number; tws: number; twd: number }[] = [];
  private windAheadAt = -1;
  private autoHoistSince: number | null = null;
  private autoDouseSince: number | null = null;
  heading: number;
  twd: number;
  tws: number;
  twsSmooth: number;
  gust = 0;
  x = 0;
  y = 0;
  dist = 0;
  accel = 0;
  controls: Controls;
  targets: Controls;
  energy: number;
  gear: Gear;
  sprint = false;
  plan: SailPlanState;
  headsailSide: number; // sign of tack the headsail is set for
  helmMode: HelmMode;
  fixedTwa?: number;
  helmFeathers: boolean;
  maneuver: Maneuver | null = null;
  maneuvers: Maneuver[] = [];
  messages: SimMessage[] = [];
  actions: ActionLog[] = [];
  telemetry: Sample[] = [];
  f: ForceResult;
  winchState: Snapshot['winchState'] = 'idle';
  roundUp = false;
  /** New sheet loaded on the winch with handle ready before a tack/gybe. */
  prepared = false;
  callTimes: Partial<Record<CrewCall, number>> = {};
  private lastSample = -1;
  private cooldown: Record<string, number> = {};
  private lastAdjust: Partial<Record<ControlKey, { t: number; dir: number }>> = {};
  private backedSince: number | null = null;
  private collapseTimer = 0;
  private feather = 0;
  private hoistTimer: number | null = null;
  private wavePhase = 0;
  private overloadTimer = 0;
  private stallTimer = 0;

  constructor(cfg: SimConfig) {
    this.p = cfg.profile ?? J80_PROFILE;
    this.wind = new WindModel(cfg.wind);
    this.sea = cfg.sea;
    this.twd = cfg.wind.twd;
    this.tws = cfg.wind.tws;
    this.twsSmooth = cfg.wind.tws;
    this.heading = wrap180(this.twd - cfg.twa);
    this.v = cfg.v ?? 4;
    this.heel = cfg.heel ?? 0;
    this.controls = { ...NEUTRAL_UPWIND, ...cfg.controls };
    this.targets = { ...this.controls };
    this.energy = cfg.energy ?? 100;
    this.gear = cfg.gear ?? 'high';
    this.plan = {
      headsail: cfg.headsail ?? 'jib',
      gennakerCollapsed: false,
      jibReleased: false,
      jibBacked: false,
      crewFore: cfg.crewFore ?? 0,
    };
    this.headsailSide = Math.sign(cfg.twa) || 1;
    this.helmMode = cfg.helmMode ?? 'normal';
    this.fixedTwa = cfg.fixedTwa;
    this.helmFeathers = cfg.helmFeathers ?? true;
    this.f = evaluate(this.p, this.controls, { tws: this.tws, twa: Math.abs(cfg.twa), sea: this.sea }, { v: this.v, heel: this.heel }, this.plan);
  }

  // ------------------------------------------------------------------ derived
  get twa() {
    return wrap180(this.twd - this.heading);
  }
  get upwind() {
    return Math.abs(this.twa) < 95;
  }
  /** Target speed uses a smoothed wind (a boat cannot accelerate instantly into a gust). */
  target() {
    return Math.max(0.3, targetSpeed(this.twsSmooth, Math.abs(this.twa), this.plan.headsail) * (1 - 0.035 * this.sea));
  }

  say(from: Speaker, text: string, tone: SimMessage['tone'] = 'info', key?: string, cooldown = 6) {
    if (key) {
      const last = this.cooldown[key];
      if (last !== undefined && this.t - last < cooldown) return;
      this.cooldown[key] = this.t;
    }
    this.messages.push({ t: this.t, from, text, tone, key });
    if (this.messages.length > 60) this.messages.shift();
  }

  // ------------------------------------------------------------------ user inputs
  setTarget(key: ControlKey, value: number, label?: string) {
    const v = clamp(value, 0, 1);
    const prev = this.targets[key];
    if (Math.abs(v - prev) < 1e-4) return;
    const dir = Math.sign(v - prev);
    const la = this.lastAdjust[key];
    let isNew = true;
    let reversal = false;
    if (la && this.t - la.t < 1.2 && la.dir === dir) isNew = false;
    if (la && this.t - la.t < 4 && la.dir !== dir) reversal = true;
    this.lastAdjust[key] = { t: this.t, dir };
    this.targets[key] = v;
    if (isNew || reversal) {
      this.actions.push({
        t: this.t,
        kind: 'adjust',
        key,
        value: v,
        from: prev,
        label: label ?? (key === 'hike' ? (v < 0.2 ? L('Crew to leeward', 'Équipage sous le vent') : dir > 0 ? L('Crew hike out', 'Équipage au rappel') : L('Crew come in', 'Équipage rentre')) : `${CONTROL_RATES[key].label} ${dir > 0 ? L('on', '+') : L('off', '−')}`),
        reversal,
      });
    } else {
      const last = [...this.actions].reverse().find((a) => a.key === key);
      if (last) last.value = v;
    }
  }
  nudge(key: ControlKey, delta: number) {
    this.setTarget(key, this.targets[key] + delta);
  }
  holdSheet() {
    this.targets.jibSheet = this.controls.jibSheet;
  }
  setGear(g: Gear) {
    if (g === this.gear) return;
    this.gear = g;
    this.actions.push({ t: this.t, kind: 'gear', label: L(`Winch ${g} gear`, `Winch en ${g === 'low' ? 'petite' : 'grande'} vitesse`), tag: `Winch ${g} gear` });
  }
  setSprint(on: boolean) {
    if (on && !this.sprint) this.actions.push({ t: this.t, kind: 'sprint', label: L('Sprint grind', 'Sprint au moulin') });
    this.sprint = on;
  }
  setMode(mode: HelmMode) {
    if (mode === this.helmMode) return;
    this.helmMode = mode;
    const modeFr: Record<HelmMode, string> = { point: 'cap', normal: 'normal', foot: 'vitesse', accel: 'accélération' };
    this.actions.push({ t: this.t, kind: 'mode', label: L(`Mode: ${mode}`, `Mode : ${modeFr[mode]}`), tag: `Mode: ${mode}` });
    const txt: Record<HelmMode, string> = {
      point: this.upwind ? L('Copy — squeezing up, high mode.', 'Reçu — je serre, mode cap.') : L('Copy — sailing deeper.', 'Reçu — je descends plus bas.'),
      normal: L('Copy — back to target mode.', 'Reçu — retour au mode cible.'),
      foot: this.upwind ? L('Copy — footing, bow down a touch.', 'Reçu — j\'abats un peu pour la vitesse.') : L('Copy — heating it up.', 'Reçu — je lofe pour chauffer.'),
      accel: this.upwind ? L('Copy — bow down, building speed.', 'Reçu — j\'abats, on construit la vitesse.') : L('Copy — heating up to build speed, call me down when we are going.', 'Reçu — je lofe pour prendre de la vitesse, dis-moi d\'abattre quand on avance.'),
    };
    this.say('helm', txt[mode], 'info');
  }
  setCrewFore(c: CrewFore) {
    if (c === this.plan.crewFore) return;
    this.plan.crewFore = c;
    this.actions.push({ t: this.t, kind: 'crew', label: L(`Crew weight ${c === 1 ? 'forward' : c === -1 ? 'aft' : 'normal'}`, `Poids équipage ${c === 1 ? 'avant' : c === -1 ? 'arrière' : 'normal'}`) });
  }
  call(c: CrewCall) {
    this.callTimes[c] = this.t;
    const labels: Record<CrewCall, string> = {
      pressure: L('"Pressure coming!"', '« Pression qui arrive ! »'),
      lull: L('"Lull — soft spot ahead"', '« Molle — zone faible devant »'),
      foot: L('"Foot — I need speed"', '« Abats — j\'ai besoin de vitesse »'),
      point: L('"Speed is good — you can point"', '« La vitesse est bonne — tu peux serrer »'),
      'speed-ok': L('"Speed on target, hold this"', '« Vitesse sur la cible, tiens ça »'),
      hike: L('"Everybody hike!"', '« Tout le monde au rappel ! »'),
      'ease-hike': L('"Come in — ease the hiking"', '« Rentrez — moins de rappel »'),
    };
    const tags: Record<CrewCall, string> = {
      pressure: '"Pressure coming!"',
      lull: '"Lull — soft spot ahead"',
      foot: '"Foot — I need speed"',
      point: '"Speed is good — you can point"',
      'speed-ok': '"Speed on target, hold this"',
      hike: '"Everybody hike!"',
      'ease-hike': '"Come in — ease the hiking"',
    };
    this.actions.push({ t: this.t, kind: 'call', label: L(`Call ${labels[c]}`, `Annonce ${labels[c]}`), tag: `Call ${tags[c]}` });
    switch (c) {
      case 'pressure':
        this.say('helm', this.upwind ? L('Copy, ready to feather on the puff.', 'Reçu, prêt à lofer dans la risée.') : L('Copy, ready to bear away in the puff.', 'Reçu, prêt à abattre dans la risée.'), 'info');
        break;
      case 'lull':
        this.say('helm', L('Copy, I will keep the bow down to hold speed.', 'Reçu, je garde l\'étrave basse pour tenir la vitesse.'), 'info');
        break;
      case 'foot':
        this.setMode('foot');
        break;
      case 'point':
        this.setMode('point');
        break;
      case 'speed-ok':
        this.setMode('normal');
        break;
      case 'hike':
        this.setTarget('hike', 1, L('Crew hike out', 'Équipage au rappel'));
        break;
      case 'ease-hike':
        this.setTarget('hike', 0.3, L('Crew come in', 'Équipage rentre'));
        break;
    }
  }

  /** Load the lazy sheet on the winch, handle in, ready to tail. */
  setAuto(on: boolean) {
    if (on === this.autoTrim && on === this.manualHelm) return;
    this.autoTrim = on;
    this.manualHelm = on;
    this.helmCmd = 0;
    if (on) this.autoKeys = new Set(Object.keys(CONTROL_RATES) as ControlKey[]);
    this.fixedTwa = undefined;
    this.actions.push({ t: this.t, kind: 'mode', label: on ? L('Auto crew on: you steer', 'Équipage auto activé : vous barrez') : L('Auto crew off', 'Équipage auto désactivé'), tag: on ? 'Auto crew on: you steer' : 'Auto crew off' });
    this.say('pit', on ? L('We have the sails — you drive. Arrows to steer.', 'On a les voiles — tu barres. Flèches pour diriger.') : L('Sails are yours again.', 'Les voiles sont de nouveau à toi.'), 'info', 'auto', 2);
  }
  /** game mode: catch a control (the crew lets go of it) or hand it back to the auto crew */
  setAutoKey(key: ControlKey, auto: boolean) {
    if (auto === this.autoKeys.has(key)) return;
    if (auto) this.autoKeys.add(key);
    else this.autoKeys.delete(key);
    this.actions.push({ t: this.t, kind: 'mode', label: L(`${CONTROL_RATES[key].label}: ${auto ? 'back to the crew' : 'you have it'}`, `${CONTROL_RATES[key].label} : ${auto ? "rendu à l'équipage" : 'à vous'}`) });
  }
  setHelmCmd(x: number) {
    this.helmCmd = clamp(x, -1, 1);
  }

  prepareSheet() {
    if (this.prepared) return;
    this.prepared = true;
    this.actions.push({ t: this.t, kind: 'prep', label: L('New sheet loaded, handle ready', 'Nouvelle écoute embraquée, manivelle prête') });
    this.say('pit', L('Lazy sheet loaded — ready.', 'Écoute au repos embraquée — prêt.'), 'good', 'prep', 3);
  }

  /** Trimmer releases the loaded headsail sheet (tack/gybe) — or blows the sheet in an emergency. */
  releaseSheet() {
    const m = this.maneuver;
    this.actions.push({ t: this.t, kind: 'release', label: L('Release old sheet', 'Larguer l\'ancienne écoute') });
    if (m && (m.kind === 'tack' || m.kind === 'gybe') && m.releasedAt === undefined) {
      m.releasedAt = this.t;
      m.releaseTwa = this.twa;
    }
    this.plan.jibReleased = true;
    this.plan.jibBacked = false;
    this.backedSince = null;
    this.controls.jibSheet = 0;
    if (m && (m.kind === 'tack' || m.kind === 'gybe')) this.headsailSide = Math.sign(m.targetTwa);
  }

  // ------------------------------------------------------------------ helm / tactician commands
  commandTack() {
    if (this.maneuver && !this.maneuver.done) return;
    const tgt = -Math.sign(this.twa) * this.helmTarget(true);
    this.startManeuver({ kind: 'tack', start: this.t, targetTwa: tgt, done: false, entrySpeed: this.v });
    this.say('helm', L('Tacking!', 'On vire !'), 'warn');
  }
  commandGybe() {
    if (this.maneuver && !this.maneuver.done) return;
    const tgt = -Math.sign(this.twa) * Math.abs(this.twa);
    this.startManeuver({ kind: 'gybe', start: this.t, targetTwa: tgt, done: false, entrySpeed: this.v });
    this.say('helm', L('Gybing!', 'On empanne !'), 'warn');
  }
  commandBearAway(twaAbs: number, hoist = true) {
    if (this.maneuver && !this.maneuver.done) return;
    const s = Math.sign(this.twa) || 1;
    this.startManeuver({ kind: 'bear-away', start: this.t, targetTwa: s * twaAbs, done: false, hoist, entrySpeed: this.v });
    this.fixedTwa = twaAbs;
    this.say('helm', hoist ? L('Bearing away — hoist on my call!', 'On abat — envoi à mon signal !') : L('Bearing away!', 'On abat !'), 'warn');
  }
  commandHardenUp(douse = true) {
    if (this.maneuver && !this.maneuver.done) return;
    const s = Math.sign(this.twa) || 1;
    this.fixedTwa = undefined;
    const tgt = s * this.helmTargetFor(true, 'normal');
    this.startManeuver({ kind: 'harden-up', start: this.t, targetTwa: tgt, done: false, douse, entrySpeed: this.v });
    this.say('helm', douse ? L('Douse! Hardening up — trim to the turn.', 'Affalage ! On lofe — bordez avec le virage.') : L('Hardening up — trim with me.', 'On lofe — bordez avec moi.'), 'warn');
  }
  private startManeuver(m: Maneuver) {
    m.minSpeed = this.v;
    this.maneuver = m;
    this.maneuvers.push(m);
    const kindFr: Record<ManeuverKind, string> = { tack: 'virement', gybe: 'empannage', 'bear-away': 'abattée', 'harden-up': 'lofée' };
    this.actions.push({ t: this.t, kind: 'command', label: L(`Helm: ${m.kind}`, `Barreur : ${kindFr[m.kind]}`), tag: `Helm: ${m.kind}` });
  }

  helmTargetFor(upwind: boolean, mode: HelmMode, base?: number) {
    const best = base ?? bestVmgAngle(this.tws, upwind).twa;
    if (upwind) {
      const off: Record<HelmMode, number> = { point: -2.5, normal: 0, foot: 3.5, accel: 7 };
      return best + off[mode];
    }
    const off: Record<HelmMode, number> = { point: 8, normal: 0, foot: -9, accel: -14 };
    return clamp(best + off[mode], 90, 175);
  }
  helmTarget(upwind = this.upwind) {
    // a set course (after a bear-away, or a reach) is the base; the mode still moves the helm
    // around it - accel / hot under the kite heats up to build apparent wind, deep goes lower
    if (this.fixedTwa !== undefined) return this.helmTargetFor(this.fixedTwa < 95, this.helmMode, this.fixedTwa);
    return this.helmTargetFor(upwind, this.helmMode);
  }

  // ------------------------------------------------------------------ main step
  step(dt: number) {
    this.t += dt;
    const ws = this.wind.step(this.t, dt);
    if (this.t - this.windAheadAt >= 0.5 - 1e-6) {
      this.windAheadAt = this.t;
      this.windAhead = this.wind.forecast(this.t, 15, dt, 0.5);
    }
    this.tws = ws.tws;
    this.twd = ws.twd;
    this.gust = ws.gustLevel;
    this.twsSmooth += (this.tws - this.twsSmooth) * clamp(dt / 5, 0, 1);
    this.wavePhase += (2 * Math.PI * dt) / 4.2;

    this.updateHelm(dt);
    this.updateHeadsailState(dt);
    if (this.autoTrim) this.updateAutoCrew(dt);
    this.updateControls(dt);

    const twaS = this.twa;
    const env = { tws: this.tws, twa: Math.abs(twaS), sea: this.sea, wavePhase: this.wavePhase };
    // gennaker luff: the trim point is just eased of the best sheet for this wind/angle. Ease past it
    // and the luff curls back on itself; way past it, the kite collapses. That is how a kite is
    // trimmed: ease until it curls, trim back in a touch.
    if (this.plan.headsail === 'gennaker') {
      const opt = optimalControls(this.tws, Math.abs(twaS), 'gennaker').jibSheet;
      const luffPoint = opt - 0.03;
      this.kiteOptSheet = opt;
      this.plan.kiteCurl = this.plan.gennakerCollapsed ? 1.5 : clamp((luffPoint - this.controls.jibSheet) / 0.1, 0, 1.5);
      const optMain = optimalControls(this.tws, Math.abs(twaS), 'gennaker').mainSheet;
      // main too eased: the kite's exit flow no longer runs along the main's leeward side (the slot
      // works like jib/main): first the kite leech flutters, eased further the luff breathes too
      this.plan.kiteLeechFlap = clamp((optMain - this.controls.mainSheet - 0.03) / 0.12, 0, 1);
      this.plan.kiteLuffFlap = clamp((optMain - this.controls.mainSheet - 0.07) / 0.15, 0, 1);
      // main over-trimmed: the kite's exit flow backwinds the main luff
      this.plan.kiteMainBackwind = clamp((this.controls.mainSheet - optMain - 0.08) / 0.2, 0, 1);
    } else {
      this.plan.kiteCurl = 0;
      this.plan.kiteLeechFlap = 0;
      this.plan.kiteLuffFlap = 0;
      this.plan.kiteMainBackwind = 0;
    }
    const f = evaluate(this.p, this.controls, env, { v: this.v, heel: this.heel }, this.plan);
    this.f = f;

    // heel: 2nd order, natural period ~3 s
    const I = 2900;
    const rm = f.rightingMoment;
    // Roll damping is mostly aerodynamic: attached sails resist rolling, stalled or flogging
    // sails don't. Downwind, an over-sheeted main or a stalled kite feeds the roll (death roll).
    const kiteUp = this.plan.headsail === 'gennaker';
    const sailEff = kiteUp && f.gennaker ? 0.5 * f.main.efficiency + 0.5 * f.gennaker.efficiency : 0.5 * f.main.efficiency + 0.5 * (this.plan.jibReleased ? 0.3 : f.jib.efficiency);
    const deep = Math.abs(twaS) > 110;
    let zeta = 0.62 + 0.33 * clamp((sailEff - 0.35) / 0.45, 0, 1);
    let rollForce = 1;
    if (deep) {
      // Downwind the sails are meant to be partly stalled, so damping comes from how the rig is
      // held: a main eased too far with the vang off twists its head forward and drives a roll
      // to windward; an under-sheeted kite flaps and swings. Sheeting both on a bit settles it.
      const opt = optimalControls(this.twsSmooth, Math.abs(twaS), this.plan.headsail);
      const mainLoose = clamp((opt.mainSheet - this.controls.mainSheet - 0.05) / 0.2, 0, 1) * (1 - 0.6 * this.controls.vang);
      const kiteLoose = kiteUp ? clamp((opt.jibSheet - this.controls.jibSheet - 0.04) / 0.12, 0, 1) : 0;
      const collapse = this.plan.gennakerCollapsed ? 0.6 : 0;
      const roll = clamp(0.7 * mainLoose + 0.6 * kiteLoose + collapse, 0, 1) * clamp(this.tws / 14, 0.3, 1.3);
      zeta = 0.85 - 0.5 * roll;
      rollForce += 2.2 * roll;
    }
    zeta = clamp(zeta, 0.12, 0.95);
    this.rollDamping = zeta;
    const seaRoll = (this.sea + (deep && kiteUp ? 0.4 : 0)) * 120 * rollForce * Math.sin(this.wavePhase * 0.7);
    const acc = (f.heelMoment - rm + seaRoll) / I - 2 * zeta * 2.3 * this.heelRate * DEG;
    this.heelRate += (acc / DEG) * dt;
    this.heel = clamp(this.heel + this.heelRate * dt, -30, 50);
    if (Math.abs(this.heel) >= 50) this.heelRate = 0;

    // surge
    const mass = (this.p.displacement + this.p.crewMass) * 1.15;
    const turnDrag = this.maneuver && !this.maneuver.done ? 0.5 * 1025 * (this.v * KN) ** 2 * this.p.rudderArea * 0.06 : 0;
    // pitch: natural period ~1.7 s. Waves force it (hardest upwind), crew weight at the ends
    // makes it worse, attached sails damp it. Drive load presses the bow down; accelerating
    // squats the stern. Hobby-horsing costs speed (pitchDrag).
    const wp = 3.7;
    const headSea = 0.35 + 0.65 * Math.max(0, Math.cos(twaS * DEG));
    const crewEnds = this.plan.crewFore !== 0 ? 1.3 : 1;
    const zp = clamp(0.32 + 0.18 * clamp((sailEff - 0.35) / 0.45, 0, 1) - (this.plan.crewFore === 1 ? 0.05 : 0), 0.15, 0.55);
    // bow-down trim from the sails: each sail's drive times the height it acts at. A twisted main
    // loses drive high up, so its push is lower and the bow comes up; the jib's force is lower and
    // further forward; a kite pulling high from the masthead buries the bow most.
    const sailPitch = f.main.pitchMoment + f.jib.pitchMoment + (f.gennaker?.pitchMoment ?? 0);
    const pitchStatic = -sailPitch * 0.00024 - this.plan.crewFore * 0.5 + this.accel * 0.6;
    const pitchForce = this.sea * headSea * crewEnds * 13 * Math.sin(this.wavePhase * 1.6) + (this.v > 2 ? this.sea * 3 * Math.sin(this.wavePhase * 2.9 + 1) : 0);
    const pAcc = wp * wp * (pitchStatic - this.pitch) - 2 * zp * wp * this.pitchRate + pitchForce;
    this.pitchRate += pAcc * dt;
    this.pitch = clamp(this.pitch + this.pitchRate * dt, -12, 12);
    const pitchDrag = 0.00004 * (this.p.displacement + this.p.crewMass) * 9.81 * Math.min(400, this.pitchRate * this.pitchRate) / 25;
    const rollDrag = this.sea * 25 * Math.abs(Math.sin(this.wavePhase)) + pitchDrag;
    const a = (f.drive - f.resistance - turnDrag - rollDrag) / mass; // m/s²
    const vms = Math.max(0, this.v * KN + a * dt);
    const newV = vms / KN;
    this.accel = this.accel * 0.85 + ((newV - this.v) / dt) * 0.15;
    this.v = newV;

    // position (course over ground includes leeway)
    const cog = (this.heading + Math.sign(twaS) * f.leeway) * DEG;
    const dx = Math.sin(cog) * this.v * KN * dt;
    const dy = Math.cos(cog) * this.v * KN * dt;
    this.x += dx;
    this.y += dy;
    this.dist += Math.hypot(dx, dy);

    if (this.maneuver && !this.maneuver.done) this.maneuver.minSpeed = Math.min(this.maneuver.minSpeed ?? this.v, this.v);

    this.crewChatter(dt);
    if (this.t - this.lastSample >= 0.25) {
      this.lastSample = this.t;
      this.telemetry.push(this.sample());
    }
  }

  private updateHelm(dt: number) {
    const twa = this.twa;
    const s = Math.sign(twa) || 1;
    const absTwa = Math.abs(twa);
    const m = this.maneuver;
    const authority = clamp(this.v / 3.5, 0.25, 1.3); // rudder needs flow
    let desired: number; // signed
    let maxRate = 4 * authority;

    if (m && !m.done) {
      desired = m.targetTwa;
      if (m.kind === 'tack') maxRate = 14 * clamp(this.v / 4, 0.35, 1.1);
      else if (m.kind === 'gybe') maxRate = 11 * authority;
      else maxRate = 8 * authority;
      // bearing away fights an over-trimmed main (weather helm)
      if (m.kind === 'bear-away') {
        const wh = Math.max(0, this.f.rudder);
        maxRate *= clamp(1 - wh / (this.p.rudderStall + 2), 0.12, 1);
        if (wh > this.p.rudderStall * 0.7) this.say('helm', L('I can\'t bear away — ease the main!', 'Je n\'arrive pas à abattre — choquez la GV !'), 'alarm', 'cantbear', 4);
      }
      if (m.kind === 'harden-up') maxRate = 7 * authority;
    } else {
      let tgt = this.helmTarget();
      // a good helm feathers in excess heel (upwind) — but only so much
      if (this.helmFeathers && this.upwind) {
        const want = this.heel > 23 ? clamp((this.heel - 23) * 0.35, 0, 4) : 0;
        const called = this.callTimes.pressure !== undefined && this.t - this.callTimes.pressure < 10 && this.gust > 1 ? 1.5 : 0;
        this.feather += (want + called - this.feather) * clamp(dt * 1.5, 0, 1);
        tgt -= this.feather;
      }
      if (this.callTimes.lull !== undefined && this.t - this.callTimes.lull < 8 && this.gust < -0.5 && this.upwind) tgt += 2;
      desired = s * tgt;
    }

    let err = wrap180(desired - twa); // + means needs larger signed TWA
    // during a tack the shortest way may be the wrong way; force through the wind
    if (m && !m.done && m.kind === 'tack') err = -s * Math.abs(err) * (Math.sign(twa) === Math.sign(m.targetTwa) ? -1 : 1);
    if (m && !m.done && m.kind === 'gybe' && Math.sign(twa) !== Math.sign(m.targetTwa) ) err = s * Math.abs(err);
    if (m && !m.done && m.kind === 'gybe' && Math.sign(twa) === Math.sign(m.targetTwa)) err = wrap180(m.targetTwa - twa);
    let rate = clamp(err * 1.2, -maxRate, maxRate);
    // the user is on the helm: the tiller input sets the turn rate (bow to starboard = TWA down)
    if (this.manualHelm && !(m && !m.done)) rate = -this.helmCmd * 9 * authority;

    // rudder overload: the boat rounds up (TWA magnitude decreases)
    const rud = this.f.rudder;
    this.roundUp = false;
    const limit = this.p.rudderStall;
    if (rud > limit && this.v > 2 && absTwa > 15 && !(m && !m.done && m.kind === 'tack')) {
      const excess = rud - limit;
      rate += -s * clamp(excess * 2.2, 0, 25) * clamp(this.v / 4, 0.3, 1);
      this.roundUp = true;
    }
    // knock-down: at extreme heel the immersed hull shape drives the bow into the wind
    if (Math.abs(this.heel) > 34 && absTwa > 12 && !(m && !m.done && m.kind === 'tack')) {
      rate += -s * (Math.abs(this.heel) - 34) * 1.6;
      this.roundUp = true;
    }
    // stuck head to wind ("in irons"): windage and a crew-backed jib push the bow off
    if (absTwa < 22 && !(m && !m.done && (m.kind === 'tack' || m.kind === 'harden-up'))) {
      rate += s * 3.5 * (1 - absTwa / 22) + s * 1.5;
    }
    // TWA change = -heading change; heading change positive = turning to starboard
    // twa = twd - heading -> d(twa) = -d(heading)
    this.heading = wrap180(this.heading - rate * dt);

    // maneuver progress
    if (m && !m.done) {
      const nt = this.twa;
      if (m.kind === 'tack' && m.crossedAt === undefined && Math.sign(nt) === Math.sign(m.targetTwa)) {
        m.crossedAt = this.t;
      }
      if (m.kind === 'gybe' && m.crossedAt === undefined && Math.sign(nt) === Math.sign(m.targetTwa)) {
        m.crossedAt = this.t;
        this.say('helm', L('Boom coming across!', 'La bôme passe !'), 'warn', 'boom', 2);
        this.heelRate += 6 * Math.sign(nt);
      }
      if (m.kind === 'bear-away' && m.hoist && absTwa > 95 && m.sailChangeAt === undefined && this.hoistTimer === null) {
        this.hoistTimer = this.t;
        this.say('pit', L('Hoisting!', 'Envoi !'), 'info');
      }
      if (m.kind === 'harden-up' && m.douse && absTwa < 125 && m.sailChangeAt === undefined && this.plan.headsail === 'gennaker') {
        m.sailChangeAt = this.t;
        this.plan.headsail = 'jib';
        this.plan.gennakerCollapsed = false;
        this.controls.jibSheet = Math.min(this.controls.jibSheet, 0.25);
        this.say('pit', L('Gennaker down — jib is yours!', 'Gennaker affalé — le foc est à toi !'), 'info');
      }
      if (Math.abs(wrap180(m.targetTwa - nt)) < 3 && Math.sign(nt) === Math.sign(m.targetTwa)) {
        m.done = true;
        if (m.kind === 'tack' || m.kind === 'gybe') this.say('helm', L('Settled — build speed!', 'Stabilisé — construis la vitesse !'), 'info');
        this.prepared = false;
      }
      if (this.t - m.start > 25) m.done = true;
    }
    if (this.hoistTimer !== null && this.t - this.hoistTimer > 3.5) {
      this.hoistTimer = null;
      this.plan.headsail = 'gennaker';
      this.plan.gennakerCollapsed = false;
      this.controls.jibSheet = 0.35;
      this.targets.jibSheet = Math.max(this.targets.jibSheet, 0.35);
      if (this.maneuver) this.maneuver.sailChangeAt = this.t;
      this.say('pit', L('Gennaker up — trim it!', 'Gennaker envoyé — borde-le !'), 'info');
    }
  }

  private updateHeadsailState(dt: number) {
    const s = Math.sign(this.twa) || 1;
    // headsail sheeted for the other tack -> backed (unless released)
    if (!this.plan.jibReleased && this.headsailSide !== s) {
      // for a gybe, the old gennaker sheet only "backs" once the stern is well through
      const deep = Math.abs(this.twa) > 160 && this.plan.headsail === 'gennaker';
      if (!deep) {
        this.plan.jibBacked = true;
        if (this.backedSince === null) this.backedSince = this.t;
      }
    } else {
      this.plan.jibBacked = false;
      this.backedSince = null;
    }
    if (this.plan.jibBacked && this.plan.headsail === 'gennaker') this.plan.gennakerCollapsed = true;
    if (this.backedSince !== null && this.t - this.backedSince > 2.6) {
      this.say('pit', L('Old sheet was still on — I blew it for you!', 'L\'ancienne écoute était encore bordée — je l\'ai larguée pour toi !'), 'alarm');
      const m = this.maneuver;
      if (m) m.autoReleased = true;
      this.releaseSheet();
      this.actions[this.actions.length - 1].label = L('Pit released old sheet (late)', 'Piano a largué l\'ancienne écoute (en retard)');
    }
    if (this.plan.jibReleased && this.headsailSide === s && this.controls.jibSheet > 0.28) {
      this.plan.jibReleased = false;
    }
    if (this.plan.jibReleased && this.headsailSide !== s && !this.maneuver) {
      // released outside a maneuver: blown sheet; becomes normal once re-trimmed
      this.headsailSide = s;
    }

    // gennaker collapse when over-eased (luff curls past the point of no return)
    if (this.plan.headsail === 'gennaker' && !this.plan.jibBacked) {
      const g = this.f.gennaker;
      const luffA = g ? g.sections[1].a : 0;
      if (!this.plan.gennakerCollapsed) {
        if (luffA < -6 || (this.plan.kiteCurl ?? 0) > 1.05) this.collapseTimer += dt;
        else this.collapseTimer = Math.max(0, this.collapseTimer - dt);
        if (this.collapseTimer > 1.3) {
          this.plan.gennakerCollapsed = true;
          this.collapseTimer = 0;
          this.say('pit', L('Kite collapsed! Trim — trim — trim!', 'Spi fermé ! Borde — borde — borde !'), 'alarm', 'collapse', 3);
        }
      } else {
        // refills once trimmed back to a positive angle of attack
        const curlNow = clamp((this.kiteOptSheet - 0.03 - this.controls.jibSheet) / 0.1, 0, 1.5);
        const ok = g && curlNow < 0.45 && luffA > -2;
        if (ok) this.collapseTimer += dt;
        if (this.collapseTimer > 1.2) {
          this.plan.gennakerCollapsed = false;
          this.collapseTimer = 0;
          this.say('pit', L('Kite is full.', 'Le spi est plein.'), 'good', 'refill', 3);
        }
      }
    }
  }

  /** the auto crew: trim to the polar's optimum, handle the sheets through tacks and gybes, and
   *  hoist / drop the kite when the helm bears away / heads up far enough */
  private updateAutoCrew(dt: number) {
    const twaAbs = Math.abs(this.twa);
    const m = this.maneuver && !this.maneuver.done ? this.maneuver : null;
    // sheets through a tack or gybe: new sheet loaded early, old one off the moment it backs
    if ((m && (m.kind === 'tack' || m.kind === 'gybe')) || (this.upwind && twaAbs < 28) || twaAbs > 165) this.prepareSheet();
    if (this.plan.jibBacked && !this.plan.jibReleased) this.releaseSheet();
    // kite up / down follows the helm when the user is steering
    if (this.manualHelm && !m) {
      if (this.plan.headsail === 'jib' && twaAbs > 118 && this.hoistTimer === null) {
        this.autoHoistSince ??= this.t;
        if (this.t - this.autoHoistSince > 2) {
          this.hoistTimer = this.t;
          this.autoHoistSince = null;
          this.say('pit', L('Deep enough — hoisting!', 'Assez bas — envoi !'), 'info', 'autohoist', 4);
        }
      } else this.autoHoistSince = null;
      if (this.plan.headsail === 'gennaker' && twaAbs < 100) {
        this.autoDouseSince ??= this.t;
        if (this.t - this.autoDouseSince > 1.5) {
          this.autoDouseSince = null;
          this.plan.headsail = 'jib';
          this.plan.gennakerCollapsed = false;
          this.controls.jibSheet = Math.min(this.controls.jibSheet, 0.25);
          this.say('pit', L('Too high for the kite — it is down, jib is drawing.', 'Trop haut pour le spi — il est affalé, le foc porte.'), 'info', 'autodouse', 4);
        }
      } else this.autoDouseSince = null;
    }
    // trim: four times a second, straight to the optimum (the winches and crew still take their time)
    this.autoClock += dt;
    if (this.autoClock < 0.25) return;
    this.autoClock = 0;
    const o = optimalControls(this.tws, twaAbs, this.plan.headsail);
    for (const k of Object.keys(o) as ControlKey[]) {
      if (!this.autoKeys.has(k)) continue;
      let v = o[k];
      // the kite is flown with a small curl on the luff, as a trimmer does
      if (k === 'jibSheet' && this.plan.headsail === 'gennaker') v -= 0.045;
      this.targets[k] = clamp(v, 0, 1);
    }
    if (this.plan.jibReleased && this.autoKeys.has('jibSheet')) this.targets.jibSheet = Math.max(this.targets.jibSheet, 0.3);
  }

  private updateControls(dt: number) {
    const c = this.controls;
    const tg = this.targets;
    let energyUse = 0;
    // ---- headsail winch
    const travel = this.p.jibSheetTravel * (this.plan.headsail === 'gennaker' ? 3 : 1);
    const ds = tg.jibSheet - c.jibSheet;
    this.winchState = 'idle';
    if (ds < -0.002) {
      const rate = (1.0 / travel) * dt;
      c.jibSheet = Math.max(tg.jibSheet, c.jibSheet - rate);
      this.winchState = 'easing';
    } else if (ds > 0.002) {
      const load = this.plan.jibReleased || this.plan.jibBacked ? 20 : this.f.jibSheetLoad;
      const fatigue = 0.35 + 0.65 * (this.energy / 100);
      let ropeSpeed: number;
      let power = 0;
      if (load < 200) {
        const inManeuver = this.maneuver && !this.maneuver.done && (this.maneuver.kind === 'tack' || this.maneuver.kind === 'gybe');
        ropeSpeed = this.p.winch.tailRate * (0.6 + 0.4 * fatigue) * (inManeuver ? (this.prepared ? 1.15 : 0.6) : 1);
        this.winchState = 'tailing';
        energyUse += 0.35;
      } else {
        const ma = this.gear === 'high' ? WINCH.highMA : WINCH.lowMA;
        const maxRope = this.gear === 'high' ? WINCH.highMaxRope : WINCH.lowMaxRope;
        const handleMax = WINCH.handleForce * (this.sprint ? 1.45 : 1) * (0.55 + 0.45 * fatigue);
        const handleForce = load / ma;
        const P = (95 + 210 * (this.energy / 100)) * (this.sprint ? 1.8 : 1);
        if (handleForce > handleMax) {
          ropeSpeed = 0;
          this.winchState = 'stalled';
          this.stallTimer += dt;
          if (this.stallTimer > 0.8)
            this.say('pit', this.gear === 'high' ? L('Too loaded for high gear — switch to low gear!', 'Trop chargé pour la grande vitesse — passe en petite vitesse !') : L('Winch is stalled — ease the load or sprint!', 'Winch bloqué — soulage la charge ou sprinte !'), 'warn', 'stall', 5);
          energyUse += this.sprint ? 3.5 : 1.6;
        } else {
          this.stallTimer = 0;
          ropeSpeed = Math.min(maxRope * (this.sprint ? 1.25 : 1), P / load) * fatigue;
          power = ropeSpeed * load;
          this.winchState = 'grinding';
          energyUse += Math.max(0.3, (power - 60) / 75) * (this.sprint ? 1.6 : 1);
        }
      }
      c.jibSheet = Math.min(tg.jibSheet, c.jibSheet + (ropeSpeed / travel) * dt);
    }
    // ---- other controls (move toward targets with rates; some cost crew energy)
    for (const k of Object.keys(CONTROL_RATES) as ControlKey[]) {
      if (k === 'jibSheet') continue;
      const r = CONTROL_RATES[k];
      const d = tg[k] - c[k];
      if (Math.abs(d) < 1e-4) continue;
      let rate = d > 0 ? r.up : r.down;
      if (k === 'jibLead' && this.f.jibSheetLoad > 600) rate *= 0.3; // loaded car barely moves
      if (k === 'jibHalyard' && d > 0) rate *= clamp(1.3 - this.f.aws / 30, 0.3, 1);
      if (k === 'mainSheet' && d > 0) rate *= clamp(1.25 - this.f.mainSheetLoad / 2500, 0.35, 1);
      const step = Math.sign(d) * Math.min(Math.abs(d), rate * dt);
      c[k] += step;
      if (d > 0) energyUse += r.energy;
    }
    // ---- energy
    if (energyUse > 0.05) this.energy = clamp(this.energy - energyUse * dt, 0, 100);
    else this.energy = clamp(this.energy + 1.7 * dt, 0, 100);
    if (this.energy < 15) this.say('pit', L('You are cooked — pace your grinding!', 'Tu es cuit — dose ton moulinage !'), 'warn', 'tired', 12);
  }

  private crewChatter(dt: number) {
    const f = this.f;
    if (f.rudder > this.p.rudderComfort + 2) this.overloadTimer += dt;
    else this.overloadTimer = Math.max(0, this.overloadTimer - dt);
    if (this.overloadTimer > 1.5) this.say('helm', L('Heavy helm! I need the main eased / traveller down.', 'Barre dure ! Il me faut la GV choquée / le chariot descendu.'), 'alarm', 'helm-heavy', 7);
    if (this.roundUp) this.say('helm', L('She\'s rounding up — depower NOW!', 'Il part au lof — choquez tout MAINTENANT !'), 'alarm', 'roundup', 4);
    if (this.heel > 28) this.say('helm', L('Way too much heel!', 'Beaucoup trop de gîte !'), 'alarm', 'heel', 6);
    if (f.keelStalled && this.v < 3.5 && this.upwind && (!this.maneuver || this.maneuver.done))
      this.say('coach', L('Low speed: keel is stalling — ease to build speed before pointing.', 'Vitesse faible : la quille décroche — choquez pour prendre de la vitesse avant de serrer.'), 'warn', 'keel', 12);
    if (!this.plan.jibBacked && this.plan.headsail === 'jib' && !this.plan.jibReleased && this.upwind) {
      const mid = f.jib.sections[1];
      if (mid.flow === 'stall') this.say('coach', L('Jib leeward telltales stalling — over-trimmed?', 'Penons sous le vent du foc qui décrochent — sur-bordé ?'), 'warn', 'jibstall', 10);
      if (f.shapes.backwind > 0.45) this.say('helm', L('Main is backwinding — the jib leech is closing the slot.', 'La GV est déventée — la chute du foc ferme la fente.'), 'warn', 'backwind', 10);
    }
    const up = this.wind.upcoming(this.t, 7);
    if (up && up.kind === 'gust' && up.start - this.t < 6) this.say('tactician', L(`Pressure on the water, ${Math.round(up.start - this.t)} seconds.`, `Pression sur l'eau, ${Math.round(up.start - this.t)} secondes.`), 'info', `gust-${up.start}`, 30);
    if (up && up.kind === 'lull' && up.start - this.t < 6) this.say('tactician', L(`Soft patch ahead, ${Math.round(up.start - this.t)} seconds.`, `Zone molle devant, ${Math.round(up.start - this.t)} secondes.`), 'info', `lull-${up.start}`, 30);
    if (up && up.kind === 'shift' && up.start - this.t < 5)
      this.say('tactician', up.label ?? (up.amount > 0 ? L('Shift coming.', 'Bascule qui arrive.') : L('Shift coming.', 'Bascule qui arrive.')), 'info', `shift-${up.start}`, 30);
  }

  sample(): Sample {
    const f = this.f;
    const target = this.target();
    return {
      t: this.t,
      v: this.v,
      target,
      perf: this.v / target,
      heel: this.heel,
      rudder: f.rudder,
      tws: this.tws,
      twa: this.twa,
      awa: f.awa,
      energy: this.energy,
      jibEff: this.plan.headsail === 'gennaker' ? (f.gennaker?.efficiency ?? 0) : f.jib.efficiency,
      mainEff: f.main.efficiency,
      jibFlow: (this.plan.headsail === 'gennaker' ? f.gennaker?.sections[1].flow : f.jib.sections[1].flow) ?? 'ok',
      slot: f.shapes.slot,
      vmg: this.v * Math.cos((Math.abs(this.twa) + f.leeway) * DEG),
      accel: this.accel,
      maneuver: this.maneuver && !this.maneuver.done ? this.maneuver.kind : null,
      backed: this.plan.jibBacked,
      collapsed: this.plan.gennakerCollapsed,
      gust: this.gust,
      jibSheet: this.controls.jibSheet,
      mainSheet: this.controls.mainSheet,
    };
  }

  snapshot(): Snapshot {
    const target = this.target();
    return {
      t: this.t,
      v: this.v,
      target,
      perf: this.v / target,
      heel: this.heel,
      heelRate: this.heelRate,
      pitch: this.pitch,
      pitchRate: this.pitchRate,
      rollDamping: this.rollDamping,
      kiteCurl: this.plan.headsail === 'gennaker' ? this.plan.kiteCurl ?? 0 : 0,
      kiteOver: this.plan.headsail === 'gennaker' ? clamp((this.controls.jibSheet - this.kiteOptSheet - 0.06) / 0.1, 0, 1) : 0,
      kiteLeechFlap: this.plan.headsail === 'gennaker' ? this.plan.kiteLeechFlap ?? 0 : 0,
      kiteMainBackwind: this.plan.headsail === 'gennaker' ? this.plan.kiteMainBackwind ?? 0 : 0,
      autoTrim: this.autoTrim,
      manualHelm: this.manualHelm,
      manualKeys: this.autoTrim ? (Object.keys(CONTROL_RATES) as ControlKey[]).filter((k) => !this.autoKeys.has(k)) : [],
      kiteLuffFlap: this.plan.headsail === 'gennaker' ? this.plan.kiteLuffFlap ?? 0 : 0,
      accel: this.accel,
      heading: this.heading,
      twa: this.twa,
      tws: this.tws,
      twd: this.twd,
      aws: this.f.aws,
      awa: this.f.awa,
      vmg: this.v * Math.cos((Math.abs(this.twa) + this.f.leeway) * DEG),
      rudder: this.f.rudder,
      energy: this.energy,
      gear: this.gear,
      sprint: this.sprint,
      controls: { ...this.controls },
      targets: { ...this.targets },
      f: this.f,
      plan: { ...this.plan },
      helmMode: this.helmMode,
      maneuver: this.maneuver ? { ...this.maneuver } : null,
      messages: this.messages,
      winchState: this.winchState,
      gust: this.gust,
      upcoming: this.wind.upcoming(this.t, 8),
      windAhead: this.windAhead,
      x: this.x,
      y: this.y,
      roundUp: this.roundUp,
      crewFore: this.plan.crewFore as CrewFore,
      dist: this.dist,
    };
  }
}
