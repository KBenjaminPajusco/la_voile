// Sea state from the author's boat3d project (lib/sea-state.js).
// La mer, construite depuis le vent.
//
// Jusqu'ici les six houles de l'eau étaient écrites à la main : des longueurs et des
// amplitudes choisies parce qu'elles rendaient bien, tournées en bloc vers un axe. Ça donne
// une jolie mer, mais toujours LA MÊME — la même à huit nœuds qu'à vingt-cinq, alors que
// c'est précisément la différence qu'on vient lire.
//
// Ici la mer se déduit du vent mesuré, par le chemin qu'emploie l'océanographie :
//
//   JONSWAP donne la répartition de l'énergie par fréquence pour une mer levée par un vent
//   d'une vitesse donnée sur un FETCH donné. C'est la version à fetch limité de
//   Pierson-Moskowitz, et c'est elle qu'il faut ici : un plan d'eau de course est un abri de
//   quelques kilomètres, jamais une mer pleinement levée. À 15 nœuds, Pierson-Moskowitz
//   annoncerait 1,2 m de creux significatif ; avec 8 km de fetch, JONSWAP en donne 0,35 —
//   et c'est ce qu'on voit à Naples.
//
//   L'ÉTALEMENT DIRECTIONNEL en cos^2s répartit ces fréquences autour du lit du vent. Une mer
//   dont toutes les composantes vont dans le même sens se lit comme des stries, pas comme une
//   mer : c'est le croisement des directions qui fait les pyramides et les creux irréguliers.
//
//   L'ÉCHANTILLONNAGE À ÉNERGIE ÉGALE choisit les N houles. Découper la bande de fréquences
//   en parts régulières met la plupart des composantes là où il n'y a pas d'énergie ; on
//   découpe donc le SPECTRE en N parts d'énergie égale, si bien que chaque houle porte le
//   même poids et qu'aucune n'est du bruit.
//
// Références : Hasselmann et al. (JONSWAP, 1973) pour le spectre et les lois de croissance,
// Pierson & Moskowitz (1964) pour la mer pleinement levée.

const G = 9.81;

/**
 * Les paramètres de la mer, depuis le vent et le fetch.
 *
 * @param {number} uMs    vitesse du vent, m/s
 * @param {number} fetchM longueur du fetch, m
 * @returns {{hs:number, fp:number, tp:number}} creux significatif (m), fréquence et période
 *   du pic
 */
export function seaFromWind(uMs, fetchM) {
  const u = Math.max(0.5, uMs);
  // Fetch adimensionné. C'est lui qui porte toute la différence entre un lac et l'Atlantique.
  const xt = (G * Math.max(100, fetchM)) / (u * u);
  // Lois de croissance JONSWAP. Bornées par la mer pleinement levée : passé un certain fetch
  // le vent ne lève plus rien de plus, et sans cette borne un grand fetch donnerait une mer
  // plus forte que ce que le vent peut soutenir.
  const hsFetch = (0.0016 * Math.sqrt(xt) * u * u) / G;
  const hsFull = (0.2182 * u * u) / G;          // Pierson-Moskowitz
  const hs = Math.min(hsFetch, hsFull);
  const fpFetch = 3.5 * (G / u) * Math.pow(xt, -0.33);
  const fpFull = (0.877 * G) / (2 * Math.PI * u);
  const fp = Math.max(fpFetch, fpFull);
  return { hs, fp, tp: 1 / fp };
}

/** Le spectre JONSWAP, en énergie par hertz. */
function jonswap(f, fp, alpha, gamma) {
  if (f <= 0) return 0;
  const sigma = f <= fp ? 0.07 : 0.09;
  const r = Math.exp(-((f - fp) ** 2) / (2 * sigma * sigma * fp * fp));
  const base = (alpha * G * G) / ((2 * Math.PI) ** 4 * f ** 5);
  return base * Math.exp(-1.25 * (fp / f) ** 4) * Math.pow(gamma, r);
}

/**
 * Bâtir N houles de Gerstner qui, ensemble, font la mer de ce vent.
 *
 * @param {object} o
 * @param {number} o.twsKn    vent réel, nœuds
 * @param {number} o.twdDeg   d'où vient le vent, degrés
 * @param {number} o.fetchM   fetch, mètres
 * @param {number} o.n        nombre de composantes
 * @param {number} o.spread   paramètre s de l'étalement cos^2s ; grand = mer rangée
 * @param {number} o.scale    facteur sur le creux, pour ajuster à l'œil
 * @returns {{waves:Array, hs:number, tp:number}} chaque houle : {dx, dy, L, a}
 */
export function buildWaves({ twsKn = 12, twdDeg = 0, fetchM = 8000,
                             n = 8, spread = 6, scale = 1 } = {}) {
  const u = Math.max(0.5, twsKn * 0.5144);
  const { hs, fp, tp } = seaFromWind(u, fetchM);

  // La bande utile : sous 0,6 fp il n'y a rien, au-delà de 3 fp les longueurs deviennent trop
  // courtes pour la maille et n'ajoutent que du scintillement.
  const f0 = fp * 0.6;
  const f1 = fp * 3.0;

  // alpha est calé pour que le spectre rende le hs voulu, plutôt que pris à sa valeur
  // nominale : les lois de croissance et l'intégrale du spectre ne s'accordent qu'à 10 %
  // près, et c'est le creux qu'on veut juste, pas la constante.
  const gamma = 3.3;
  const STEPS = 240;
  const df = (f1 - f0) / STEPS;
  const raw = [];
  let total = 0;
  for (let i = 0; i < STEPS; i++) {
    const f = f0 + (i + 0.5) * df;
    const s = jonswap(f, fp, 0.0081, gamma) * df;
    raw.push({ f, s });
    total += s;
  }
  if (!(total > 0)) return { waves: [], hs: 0, tp };
  // m0 = variance de la surface ; hs = 4 sqrt(m0).
  const m0Want = (hs * scale / 4) ** 2;
  const k = m0Want / total;

  // Découpe à ÉNERGIE ÉGALE : on avance dans le spectre en coupant à chaque N-ième de
  // l'énergie totale, et la houle prend la fréquence médiane de sa part.
  const per = total / n;
  const waves = [];
  let acc = 0;
  let bucket = 0;
  let fSum = 0;
  let fW = 0;
  const dir0 = ((twdDeg + 180) * Math.PI) / 180;   // là OÙ VA la houle, pas d'où vient le vent
  for (const { f, s } of raw) {
    acc += s;
    fSum += f * s;
    fW += s;
    if (acc >= per * (bucket + 1) || f === raw[raw.length - 1].f) {
      const fm = fW > 0 ? fSum / fW : f;
      const energy = per * k;                       // même énergie pour toutes
      const a = Math.sqrt(2 * energy);              // amplitude d'une sinusoïde d'énergie e
      const omega = 2 * Math.PI * fm;
      const kk = (omega * omega) / G;               // dispersion en eau profonde
      const L = (2 * Math.PI) / kk;

      // Étalement directionnel. On répartit les composantes en éventail autour du lit du vent,
      // et le poids cos^2s décide de l'ouverture : les longues restent alignées, les courtes
      // s'écartent — ce que fait une vraie mer, où le clapot part dans tous les sens pendant
      // que la houle tient son cap.
      // L'éventail s'ouvre EN ALTERNANT les bords, et non de gauche à droite : rangées dans
      // l'ordre des fréquences, les composantes partaient toutes du même côté et la direction
      // moyenne de la mer se retrouvait à dix degrés du vent.
      const j = bucket;
      const half = Math.max(1, Math.floor(n / 2));
      const frac = j === 0 ? 0 : (j % 2 === 1 ? 1 : -1) * (Math.ceil(j / 2) / half);
      const sEff = spread * Math.pow(fp / fm, 2);         // plus étalé vers les hautes fréquences
      const halfAngle = Math.acos(Math.pow(0.5, 1 / (2 * Math.max(0.5, sEff))));
      const th = dir0 + frac * halfAngle;

      waves.push({ dx: Math.sin(th), dy: -Math.cos(th), L, a });
      bucket++;
      fSum = 0;
      fW = 0;
      if (bucket >= n) break;
    }
  }
  return { waves, hs: hs * scale, tp };
}

/**
 * La HOULE : une mer venue d'ailleurs, qui ne doit rien au vent local.
 *
 * Elle arrive du modele (Open-Meteo Marine, voir /env dans serve.py) en creux, periode et
 * direction. Spectre JONSWAP tres pique (gamma 7) sur une bande etroite autour du pic, et un
 * eventail SERRE (s = 30) : une houle tient son cap et sa longueur, c'est ce qui la distingue
 * du clapot. Les N composantes se partagent l'energie a parts egales, comme la mer du vent.
 *
 * @param {object} o
 * @param {number} o.hs        creux significatif de la houle, m
 * @param {number} o.tp        periode du pic, s
 * @param {number} o.fromDeg   d'ou vient la houle, degres (convention meteo)
 * @param {number} o.n         nombre de composantes
 * @returns {{waves:Array, hs:number, tp:number}}
 */
export function buildSwell({ hs = 0, tp = 6, fromDeg = 0, n = 4 } = {}) {
  if (!(hs > 0.02) || !(tp > 1)) return { waves: [], hs: 0, tp };
  const fp = 1 / tp, f0 = fp * 0.8, f1 = fp * 1.5, STEPS = 120, df = (f1 - f0) / STEPS;
  const raw = [];
  let total = 0;
  for (let i = 0; i < STEPS; i++) {
    const f = f0 + (i + 0.5) * df;
    const e = jonswap(f, fp, 0.0081, 7) * df;
    raw.push({ f, e }); total += e;
  }
  const energy = (hs / 4) ** 2 / n;                 // m0 = (hs/4)^2, a parts egales
  const dir0 = ((fromDeg + 180) * Math.PI) / 180;
  const halfAngle = Math.acos(Math.pow(0.5, 1 / 60));   // s = 30
  const waves = [];
  let acc = 0, j = 0, fs = 0, fw = 0;
  for (const { f, e } of raw) {
    acc += e; fs += f * e; fw += e;
    if (acc >= (total / n) * (j + 1) || f === raw[raw.length - 1].f) {
      const fm = fs / fw, omega = 2 * Math.PI * fm;
      const L = (2 * Math.PI * G) / (omega * omega);
      const half = Math.max(1, Math.floor(n / 2));
      const frac = j === 0 ? 0 : (j % 2 === 1 ? 1 : -1) * (Math.ceil(j / 2) / half);
      const th = dir0 + frac * halfAngle;
      waves.push({ dx: Math.sin(th), dy: -Math.cos(th), L, a: Math.sqrt(2 * energy) });
      j++; fs = 0; fw = 0;
      if (j >= n) break;
    }
  }
  return { waves, hs, tp };
}
