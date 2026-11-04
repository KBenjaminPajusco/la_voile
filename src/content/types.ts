// Shared content types. Training content (lessons, quiz, scenarios) lives in
// src/content and is kept independent from the simulation engine (src/sim).

/**
 * Sail-control keys used by the simulator. All values are normalised 0..1.
 *  jibSheet   0 = fully eased .......... 1 = maximum trim (block-to-block)
 *  jibLead    0 = car fully forward .... 1 = car fully aft (0.5 = neutral)
 *  jibHalyard 0 = very soft luff ....... 1 = maximum halyard tension
 *  mainSheet  0 = fully eased .......... 1 = maximum trim
 *  traveller  0 = car full leeward ..... 0.5 = centred ..... 1 = full windward
 *  vang       0 = off .................. 1 = maximum
 *  outhaul    0 = eased (deep foot) .... 1 = max (flat foot)
 *  cunningham 0 = off .................. 1 = max
 *  backstay   0 = off .................. 1 = max (mast bend, forestay tension)
 *  hike       0 = crew inboard/centre .. 1 = full hike
 */
export type ControlKey =
  | 'jibSheet'
  | 'jibLead'
  | 'jibHalyard'
  | 'mainSheet'
  | 'traveller'
  | 'vang'
  | 'outhaul'
  | 'cunningham'
  | 'backstay'
  | 'hike';

export type Controls = Record<ControlKey, number>;

export type SkillKey =
  | 'headsail' // jib / gennaker trim
  | 'mainsail' // main shape and power controls
  | 'balance' // heel, helm, crew weight
  | 'maneuvers' // tacks, gybes, roundings, acceleration
  | 'reaction' // gusts, lulls, timing
  | 'energy' // winch & crew energy management
  | 'tactics'; // match-racing awareness & communication

export type QuizCategory =
  | 'headsail'
  | 'mainsail'
  | 'balance'
  | 'maneuvers'
  | 'conditions'
  | 'matchrace'
  | 'physics';

export interface QuizAnswer {
  id: string; // 'a' | 'b' | ...
  text: string;
  /** Decision quality 0..100. Best answer = 100, reasonable-but-suboptimal 40-70, wrong 0-20. */
  score: number;
  /** Why this choice is appropriate or inappropriate. 1-3 sentences. */
  verdict: string;
  /** What physically happens to sail / boat if you do this. 1-3 sentences. */
  consequence: string;
}

export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  /** Training level 1..8 at which this question is introduced. */
  level: number;
  skill: SkillKey;
  title: string;
  conditions: {
    tws: number; // knots
    sea: string; // e.g. 'flat', 'short chop', '1 m swell'
    leg: string; // e.g. 'upwind, starboard tack', 'pre-start', 'downwind gennaker'
  };
  boatState: string;
  sailConfig: string;
  symptoms: string[];
  question: string;
  answers: QuizAnswer[]; // 3-5 answers
  /** The physics underlying the right answer. 2-4 sentences. */
  physics: string;
  /** Other valid actions, and in which order. */
  alternatives: string;
  /** When the right answer would change (conditions, boat, sea state...). */
  whenItChanges: string;
}

/** Shape / performance outputs a lesson lab can highlight. */
export type LabFocus =
  | 'headsailSplit'
  | 'sheetLoad'
  | 'jibDepth'
  | 'jibDraft'
  | 'jibTwist'
  | 'jibAoA'
  | 'mainDepth'
  | 'mainDraft'
  | 'mainTwist'
  | 'mainAoA'
  | 'forestaySag'
  | 'slot'
  | 'heel'
  | 'rudder'
  | 'speed'
  | 'drive'
  | 'heelMoment';

/** Built-in illustration types the UI can draw for a lesson. */
export type DiagramKind =
  | 'twist' // sail sections at 3 heights showing twist
  | 'draft' // section showing camber depth and draft position
  | 'aoa' // angle of attack, telltales, luffing vs stall
  | 'slot' // jib / main slot and backwind
  | 'heel' // stern view: heeling vs righting moment
  | 'apparent' // apparent wind triangle
  | 'balance' // centre of effort vs centre of lateral resistance
  | 'telltales' // telltale reading chart
  | 'mastbend' // mast bend vs backstay
  | 'lead'; // jib lead fore/aft and sheeting vector

export interface LabPreset {
  name: string;
  description: string;
  controls: Partial<Controls>;
  tws?: number;
  twa?: number;
}

export interface LessonLab {
  /** Which controls the user can move in the interactive lab. */
  controls: ControlKey[];
  /** Which outputs to highlight. */
  focus: LabFocus[];
  tws: number; // initial true wind speed (kn)
  twa: number; // initial true wind angle (deg, 30..180)
  /** 2-3 configurations to compare side by side. */
  presets: LabPreset[];
  /** Headsail in use for the lab (default jib). 'gennaker' = jib furled, kite set on the jib-sheet control. */
  headsail?: 'jib' | 'gennaker';
}

export interface LessonCheck {
  question: string;
  options: string[];
  correct: number; // index in options
  explanation: string;
}

export interface Lesson {
  id: string;
  module: 'headsail' | 'mainsail' | 'behavior';
  title: string;
  /** French name (or alternative name), e.g. 'Bordure', 'Pataras'. */
  altName?: string;
  level: number; // 1..8
  skill: SkillKey;
  summary: string; // one sentence
  /** Main teaching body — each section has a heading and 1-3 paragraphs (use \n\n between paragraphs). */
  sections: { heading: string; body: string }[];
  /** The underlying physics in plain but precise language. */
  physics: string;
  /** What this control does to the sail itself. */
  effects: { target: string; effect: string }[];
  /** How this control interacts with OTHER controls. */
  interactions: { control: string; relation: string }[];
  mistakes: string[];
  keyPoints: string[];
  diagram: DiagramKind;
  lab?: LessonLab;
  check: LessonCheck[]; // 2-3 quick check questions
}
