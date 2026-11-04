// Eight training levels, from basic sail controls to expert match racing.
import { L } from '../i18n';

export interface LevelDef {
  level: number;
  name: string;
  xp: number; // XP required to reach this level
  focus: string;
  goals: string[];
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: L('Deckhand', 'Équipier de pont'), xp: 0, focus: L('Basic sail controls & telltales', 'Réglages de base & penons'), goals: [L('Jib sheet, lead and halyard lessons', 'Leçons écoute, chariot et drisse de foc'), L('Read telltales', 'Lire les penons'), L('Level-1 quiz questions', 'Questions du quiz niveau 1')] },
  { level: 2, name: L('Sheet hand', 'Équipier écoutes'), xp: 250, focus: L('Headsail shape and the main controls', 'Forme du foc et réglages de GV'), goals: [L('Draft, twist, leech', 'Creux, vrillage, chute'), L('Mainsheet & traveller', 'Écoute et chariot de GV'), L('Over-trimming recovery', 'Corriger le sur-bordé')] },
  { level: 3, name: L('Trimmer', 'Régleur'), xp: 650, focus: L('Shape controls: vang, outhaul, backstay, cunningham', 'Réglages de forme : hale-bas, bordure, pataras, cunningham'), goals: [L('Scenario F — over-trimming', 'Scénario F — sur-bordé'), L('Mainsail shape lessons', 'Leçons de forme de GV'), L('Level-3 quiz', 'Quiz niveau 3')] },
  { level: 4, name: L('Power manager', 'Gestionnaire de puissance'), xp: 1250, focus: L('Heel, balance, gusts and lulls', 'Gîte, équilibre, risées et molles'), goals: [L('Scenario A — overpowered', 'Scénario A — trop de puissance'), L('Gust & lull drills', 'Exercices risées & molles'), L('Upwind acceleration', 'Accélération au près')] },
  { level: 5, name: L('Maneuver specialist', 'Spécialiste des manœuvres'), xp: 2100, focus: L('Tacks, acceleration, modes, winch energy', 'Virements, accélération, modes, énergie au winch'), goals: [L('Tack drill ≥ 80', 'Exercice de virement ≥ 80'), L('Scenario B & C', 'Scénarios B & C'), L('Mode transitions', 'Transitions de mode')] },
  { level: 6, name: L('Race trimmer', 'Régleur de course'), xp: 3200, focus: L('Downwind, gybes, roundings, chop', 'Portant, empannages, passages de bouée, clapot'), goals: [L('Gennaker gybe', 'Empannage sous gennaker'), L('Mark roundings', 'Passages de bouée'), L('Scenario D & E', 'Scénarios D & E')] },
  { level: 7, name: L('Pressure player', 'Joueur de pression'), xp: 4600, focus: L('High-pressure decisions & pre-starts', 'Décisions sous pression & pré-départs'), goals: [L('Pre-start acceleration', 'Accélération de pré-départ'), L('Scenario G — kite gust', 'Scénario G — risée sous spi'), L('Level-7 quiz', 'Quiz niveau 7')] },
  { level: 8, name: L('Match racer', 'Match racer'), xp: 6300, focus: L('Complete match races', 'Match races complets'), goals: [L('Win the Grade 2 race', 'Gagner la course Grade 2'), L('Win the World Tour race', 'Gagner la course World Tour'), L('All skills ≥ 80', 'Toutes les compétences ≥ 80')] },
];

export function levelForXp(xp: number): LevelDef {
  let l = LEVELS[0];
  for (const d of LEVELS) if (xp >= d.xp) l = d;
  return l;
}

export function nextLevel(xp: number): LevelDef | undefined {
  return LEVELS.find((d) => d.xp > xp);
}
