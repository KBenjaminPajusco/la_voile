// 3D illustrations for the quiz: each question gets the situation rendered in the live 3D view
// (same physics, solved to steady state). Controls are given as deltas from the optimal trim for
// the "trim" wind/angle, so the telltales and shapes show the intended symptom on any polar.
//
// twa is SIGNED: + = starboard tack (wind over the starboard side), − = port tack.
import type { Controls } from './types';
import { L } from '../i18n';

export type QuizView = 'trimmer' | 'leeward' | 'main' | 'helm' | 'chase';

export interface QuizScene {
  tws: number;
  twa: number;
  /** wind and angle the sails were trimmed for (default = tws / twa): gusts, lulls, headers */
  trimTws?: number;
  trimTwa?: number;
  headsail?: 'jib' | 'gennaker';
  delta?: Partial<Controls>;
  set?: Partial<Controls>;
  sea?: number; // 0..3
  view?: QuizView;
  forces?: boolean;
  jibReleased?: boolean;
  gennakerCollapsed?: boolean;
  crewFore?: -1 | 0 | 1;
  /** what to look at, one short line */
  look: string;
}

export const QUIZ_SCENES: Record<string, QuizScene> = {
  q01: { tws: 10, twa: 40, delta: { jibSheet: -0.17 }, look: L('Windward (green) telltales lifting and spinning at all heights.', 'Penons au vent (verts) qui se lèvent et tournent à toutes les hauteurs.') },
  q02: { tws: 9, twa: -46, trimTwa: -37, set: { jibSheet: 1 }, view: 'leeward', look: L('Leeward (green, starboard face on port tack) telltales drooping.', 'Penons sous le vent (verts, face tribord en bâbord amures) qui retombent.') },
  q03: { tws: 12, twa: 40, set: { mainSheet: 1, backstay: 0.15 }, view: 'main', look: L('Main top leech telltale (yellow) curled behind the leech.', 'Penon de chute haut de GV (jaune) enroulé derrière la chute.') },
  q04: { tws: 14, twa: -40, set: { hike: 0.25 }, view: 'chase', forces: true, look: L('Heel and heeling force with the crew sitting in.', 'Gîte et force de gîte avec l\'équipage assis à l\'intérieur.') },
  q05: { tws: 10, twa: 37, trimTwa: 41, delta: { jibLead: 0.45, jibSheet: -0.03 }, look: L('Top windward telltale lifts first: the upper leech is open.', 'Le penon au vent du haut décroche en premier : le haut de la chute est ouvert.') },
  q06: { tws: 13, twa: -40, set: { jibHalyard: 0.2 }, look: L('Draft drifting aft with a soft halyard: read the draft stripes.', 'Creux qui recule avec une drisse molle : lisez les bandes de creux.') },
  q07: { tws: 6, twa: 40, set: { outhaul: 1, backstay: 0 }, view: 'main', look: L('Flat lower main (look at the bottom draft stripe).', 'Bas de GV plat (regardez la bande de creux du bas).') },
  q08: { tws: 12, twa: 28, jibReleased: true, look: L('Jib released and flogging as the bow passes head to wind.', 'Foc largué qui faseye pendant que l\'étrave passe face au vent.') },
  q09: { tws: 12, twa: 140, headsail: 'gennaker', delta: { jibSheet: -0.09 }, look: L('Gennaker luff rolling back on itself: the sheet is now too eased for the faster apparent wind.', 'Guindant du gennaker qui s\'enroule : l\'écoute est maintenant trop choquée pour le vent apparent plus fort.') },
  q10: { tws: 11, twa: -37, trimTwa: -41, delta: { jibLead: -0.45 }, look: L('Lead forward: a deep, round foot and a closed upper leech (compare the draft stripes).', 'Chariot avancé : bordure creuse et ronde, haut de chute fermé (comparez les bandes de creux).') },
  q11: { tws: 15, twa: 40, delta: { mainSheet: 0.04 }, view: 'chase', forces: true, look: L('Heel slightly high; main twist correct.', 'Gîte un peu forte ; vrillage de GV correct.') },
  q12: { tws: 10, twa: -40, set: { jibSheet: 1, backstay: 0.5 }, sea: 2, look: L('Jib trimmed hard in chop: watch the pitch and the telltales alternate.', 'Foc bordé à bloc dans le clapot : observez le tangage et les penons qui alternent.') },
  q13: { tws: 11, twa: -45, trimTwa: -38, set: { jibSheet: 1, mainSheet: 0.95 }, view: 'leeward', look: L('Full trim too early: leeward telltales stalled.', 'Bordé à fond trop tôt : penons sous le vent décrochés.') },
  q14: { tws: 4, twa: 40, crewFore: 0, view: 'chase', look: L('Light air: the boat is upright, the sails barely hold their shape.', 'Petit temps : le bateau est à plat, les voiles tiennent à peine leur forme.') },
  q15: { tws: 16, twa: 40, set: { backstay: 0.1 }, forces: true, look: L('Forestay sagging to leeward, round jib entry.', 'Étai qui flèche sous le vent, entrée du foc ronde.') },
  q16: { tws: 14, twa: 90, set: { vang: 0 }, view: 'chase', forces: true, look: L('No vang: the upper main twists off and luffs.', 'Pas de hale-bas : le haut de la GV vrille et faseye.') },
  q17: { tws: 18, twa: 40, trimTws: 13, view: 'trimmer', forces: true, look: L('Gust: heel and heeling force jump with the sails still on the 13 kn trim.', 'Risée : la gîte et la force de gîte bondissent avec les voiles encore réglées pour 13 nds.') },
  q18: { tws: 12, twa: 135, headsail: 'gennaker', delta: { jibSheet: 0.16 }, look: L('Gennaker luff straight and firm: over-trimmed, no curl.', 'Guindant du gennaker droit et ferme : sur-bordé, pas de frisé.') },
  q19: { tws: 11, twa: -40, look: L('On target. Look upwind for the darker water (use the chase view).', 'Sur la cible. Cherchez l\'eau plus sombre au vent (utilisez la vue arrière).') },
  q20: { tws: 14, twa: -40, set: { backstay: 0, mainSheet: 1 }, view: 'main', forces: true, look: L('Main upper leech hooked: big main heeling force, heavy helm.', 'Haut de chute de GV fermé : forte force de gîte de la GV, barre dure.') },
  q21: { tws: 17, twa: 40, set: { backstay: 0.85, cunningham: 0 }, view: 'main', look: L('Main draft drifted aft with the cunningham off.', 'Creux de GV reculé avec le cunningham relâché.') },
  q22: { tws: 13, twa: 165, headsail: 'gennaker', view: 'chase', look: L('Dead downwind before the gybe: kite still full on the old sheet.', 'Plein vent arrière avant l\'empannage : spi encore plein sur l\'ancienne écoute.') },
  q23: { tws: 15, twa: 40, delta: { jibSheet: -0.05 }, sea: 1, look: L('Jib a few centimetres off its mark while speed builds.', 'Foc quelques centimètres en dessous de sa marque pendant que la vitesse monte.') },
  q24: { tws: 9, twa: -34, set: { jibSheet: 1, mainSheet: 1 }, view: 'chase', forces: true, look: L('Full trim at low speed: large side force, the keel cannot hold it.', 'Bordé à fond à basse vitesse : grosse force latérale, la quille ne tient pas.') },
  q25: { tws: 9, twa: -42, trimTws: 14, delta: { jibSheet: 0.08 }, look: L('Lull with the sails still on the breeze settings: the boat comes upright and slows. Flat, twisted sails no longer carry the power.', 'Molle avec les voiles encore sur les réglages de brise : le bateau se redresse et ralentit. Des voiles plates et vrillées ne portent plus la puissance.') },
  q26: { tws: 8, twa: 40, set: { mainSheet: 1, traveller: 0.5, backstay: 0 }, view: 'main', look: L('Main block-to-block: top telltale stalled, tight leech.', 'GV bordée à bloc : penon du haut décroché, chute fermée.') },
  q27: { tws: 12, twa: -50, set: { jibSheet: 0.3 }, sea: 1, look: L('Rounding up with the jib still on the reaching trim: it luffs.', 'On lofe avec le foc encore réglé pour le travers : il faseye.') },
  q28: { tws: 10, twa: 30, set: { jibSheet: 0.1, mainSheet: 0.1 }, view: 'chase', look: L('Dial-up: both sails luffing, the boat nearly stopped.', 'Dial-up : les deux voiles faseyent, le bateau presque arrêté.') },
  q29: { tws: 18, twa: 105, trimTws: 13, headsail: 'gennaker', view: 'chase', forces: true, look: L('Gust on the reach: the kite force is largely sideways, heel and helm jump.', 'Risée au travers : la force du spi est surtout latérale, la gîte et la barre bondissent.') },
  q30: { tws: 12, twa: 34, trimTwa: 44, look: L('Header: the jib is suddenly over-eased, windward telltales lifting.', 'Refusante : le foc est soudain trop choqué, penons au vent qui se lèvent.') },
  q31: { tws: 6, twa: 44, trimTwa: 40, delta: { jibLead: -0.5, jibSheet: 0.25 }, look: L('Strong gradient: the top of the jib stalls while the bottom flows.', 'Fort gradient : le haut du foc décroche pendant que le bas écoule.') },
  q32: { tws: 11, twa: 40, view: 'chase', look: L('Pre-start, close-hauled and trimmed before the luff.', 'Pré-départ, au près et bordé avant le lof.') },
  q33: { tws: 10, twa: 45, set: { jibSheet: 0.3, mainSheet: 0.2 }, look: L('Pre-start: both sails eased and luffing, ready to accelerate.', 'Pré-départ : les deux voiles choquées et faseyantes, prêt à accélérer.') },
  q37: { tws: 20, twa: -40, set: { traveller: 0.15, hike: 1, backstay: 0.5 }, sea: 2, view: 'chase', forces: true, look: L('Overpowered in 20 kn: main luff bubbling, heel still high.', 'Trop de puissance dans 20 nds : guindant de GV qui bulle, gîte encore forte.') },
  q34: { tws: 14, twa: 40, sea: 1, look: L('Tacking duel: the jib near its mark, the crew working.', 'Duel de virements : le foc près de sa marque, l\'équipage au travail.') },
  q35: { tws: 16, twa: -40, sea: 1, forces: true, look: L('On the layline with breeze arriving: note the heeling share.', 'Sur la layline avec la brise qui arrive : notez la part de gîte.') },
  q36: { tws: 20, twa: 140, headsail: 'gennaker', sea: 3, view: 'chase', forces: true, look: L('Surfing under the kite: the force points almost straight forward.', 'Au surf sous spi : la force pointe presque droit vers l\'avant.') },
  q38: { tws: 13, twa: -55, set: { jibSheet: 0.45 }, sea: 1, look: L('Jib flying at the leeward mark exit: it needs trim as the boat comes up.', 'Foc qui vole en sortie de bouée sous le vent : il faut border pendant que le bateau remonte.') },
};
