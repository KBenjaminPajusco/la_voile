// Water shader from the author's boat3d project (lib/water-fx.js).
// Water worth looking at.
//
// Five things together, none of which works on its own:
//
//   Gerstner waves        real displacement, not a normal map. Trochoidal, so crests sharpen
//                         and troughs flatten the way water does. Normals come from the
//                         analytic derivatives of the same sum, so they can never disagree
//                         with the shape.
//   planar reflection     the scene rendered again from a camera mirrored about y = 0, into
//                         a texture the surface samples -- that is what puts the coastline
//                         and the boat IN the water. Perturbed by the wave normal so the
//                         reflection wobbles instead of sitting there like a mirror.
//   Fresnel               water is nearly transparent underfoot and nearly a mirror at the
//                         horizon. Getting this ramp right is most of the look.
//   sun glitter           a tight specular lobe on the detail normals. This is the sparkle.
//   crest foam            where the wave is steep, which is where foam actually is.
//
// A radial grid, dense at the centre and coarse at the rim, re-centred on the camera every
// frame: a regular grid big enough to reach the horizon would have quads far too coarse to
// carry an 8 m wave anywhere near the boat. Waves are evaluated in WORLD space so the sea
// does not swim along with the viewer, and both the wave amplitude and the detail normals
// fade out with distance -- without that, high frequencies alias into a shimmering mess,
// which is exactly what a plain tiled normal map does at grazing angles.

import * as THREE from 'three';
import { buildWaves } from './sea-state.js';

// Les sources de sillage, dans l'ordre des uniformes, et leur demi-largeur selon la vitesse.
// Fines : un safran et un foil de quelques centimetres d'epaisseur, pas une coque.
const WAKE_IDS = ['rudder', 'foilPort', 'foilStbd'];
const WAKE_N = 3, WAKE_P = 24;
// Le bras de foil et le safran qui percent l'eau ne font que quelques dizaines de centimetres :
// a 0,95 m de demi-largeur, la trainee faisait une tache de deux metres derriere le foil.
const WAKE_W = {
  rudder: (kn) => 0.22 + Math.min(1, kn / 35) * 0.3,
  foilPort: (kn) => 0.16 + Math.min(1, kn / 35) * 0.24,
  foilStbd: (kn) => 0.16 + Math.min(1, kn / 35) * 0.24,
};

/** Radial grid, unit outer radius, dense at the centre. */
function radialGrid(rings, sectors, rMin) {
  const pos = [0, 0, 0];
  for (let i = 1; i <= rings; i++) {
    const r = rMin * Math.pow(1 / rMin, i / rings);
    for (let j = 0; j < sectors; j++) {
      const a = (j / sectors) * Math.PI * 2;
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  const idx = [];
  for (let j = 0; j < sectors; j++) idx.push(0, 1 + ((j + 1) % sectors), 1 + j);
  for (let i = 1; i < rings; i++) {
    const a0 = 1 + (i - 1) * sectors;
    const b0 = 1 + i * sectors;
    for (let j = 0; j < sectors; j++) {
      const j1 = (j + 1) % sectors;
      idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// Huit houles de Gerstner, et elles ne sont PLUS ECRITES ICI.
//
// Elles etaient en dur : des longueurs et des amplitudes choisies parce qu'elles rendaient
// bien. La mer etait donc la meme a huit noeuds qu'a vingt-cinq, alors que c'est justement la
// difference qu'on vient lire. Elles arrivent maintenant en uniforme, baties depuis le vent
// mesure par `lib/sea-state.js` -- spectre JONSWAP a fetch limite, echantillonne a energie
// egale, etale en direction autour du lit du vent.
//
// Chaque vec4 porte : direction (xy, normalisee et ABSOLUE -- elle inclut deja la direction
// du vent), longueur d'onde en metres, amplitude en metres.
// huit pour la mer du vent, quatre pour la houle (sea-state.js, buildSwell)
const NWAVES = 12;
const WAVES = `
  const int NW = ${NWAVES};
  uniform vec4 uWaves[NW];
`;

const CUT = `
// L'EAU QUE COUPENT LES APPENDICES. Pour chaque piece qui traverse la surface -- foil sous le
// vent, safran, coque quand elle touche -- un champ de hauteur local au point d'entree :
//   bourrelet  juste devant, l'eau repoussee par la piece ;
//   creux      juste derriere, la cavite qu'elle laisse ;
//   deux cretes en V, qui se referment avec la vitesse (a haut nombre de Froude le sillage
//   d'un mince appendice est un coin etroit, pas l'eventail de Kelvin d'une coque lente).
// Le detail fin (dizaines de cm) passe par la NORMALE et l'ecume, calculees au pixel : la
// grille de la mer est bien trop lache a vingt metres de l'oeil pour le porter en geometrie.
// Chaque coupeur : uCut = (x, z, intensite, -), uCutDir = (dx, dz, vitesse m/s, -).
// (Pas d'accent grave dans ce bloc : il vit dans un litteral de gabarit.)
const int NCUT = 4;
uniform vec4 uCut[4];
uniform vec4 uCutDir[4];
uniform int uCutN;
// L'AILE A FLEUR D'EAU : quand le bras ET le bout d'aile percent la surface, le morceau d'aile
// entre les deux court juste dessous et souleve l'eau. Une gaussienne allongee le long du
// segment qui joint les deux perçages, centree au milieu, d'autant plus forte qu'ils sont
// ecartes (plus d'aile pres de la surface). uBulge = (x, z, hauteur, demi-longueur),
// uBulgeDir = (dx, dz le long du segment, demi-largeur, -).
uniform vec4 uBulge[2];
uniform vec4 uBulgeDir[2];
uniform int uBulgeN;
float cutField(vec2 p, out float foam) {
  float h = 0.0;
  foam = 0.0;
  for (int i = 0; i < NCUT; i++) {
    if (i >= uCutN) break;
    vec2 r = p - uCut[i].xy;
    if (dot(r, r) > 3600.0) continue;
    float s = uCut[i].z;
    vec2 d = uCutDir[i].xy;
    float v = max(uCutDir[i].z, 0.5);
    float a = -dot(r, d);                       // distance derriere la piece (> 0 a l'arriere)
    float c = dot(r, vec2(-d.y, d.x));          // ecart lateral
    float A = 0.22 * s * clamp(v / 14.0, 0.2, 1.0);
    float behind = smoothstep(0.0, 0.4, a);
    float bump = 0.8 * exp(-(a + 0.35) * (a + 0.35) / 0.12 - c * c / 0.06);
    float trough = -exp(-c * c / (0.05 + 0.02 * max(a, 0.0))) * behind * exp(-max(a, 0.0) / (3.0 + 0.2 * v));
    float t = clamp(2.2 / v, 0.10, 0.35);
    float w = 0.18 + 0.03 * max(a, 0.0);
    float rd = abs(c) - max(a, 0.0) * t;
    float ridgeE = exp(-rd * rd / (w * w)) * behind * exp(-max(a, 0.0) / (6.0 + 0.35 * v));
    h += A * (bump + trough + 0.7 * ridgeE);
    // ecume FINE : une ligne nette sur chaque crete et un fil turbulent dans le creux -- une
    // tache large et floue se lisait comme une lueur, pas comme de l'eau dechiree
    float rdf = rd / (0.45 * w);
    foam = max(foam, s * (0.9 * exp(-rdf * rdf) * behind * exp(-max(a, 0.0) / (4.0 + 0.2 * v))
                         + 0.75 * behind * exp(-c * c / 0.025) * exp(-max(a, 0.0) / (2.5 + 0.15 * v))));
  }
  for (int i = 0; i < 2; i++) {
    if (i >= uBulgeN) break;
    vec2 r = p - uBulge[i].xy;
    vec2 d = uBulgeDir[i].xy;
    float al = dot(r, d) / uBulge[i].w;
    float ac = dot(r, vec2(-d.y, d.x)) / uBulgeDir[i].z;
    float g = exp(-al * al - ac * ac);
    h += uBulge[i].z * g;
    // l'eau qui roule sur le dos de l'aile : un liseré blanc sur le pourtour de la bosse
    foam = max(foam, clamp(uBulge[i].z / 0.18, 0.0, 1.0) * 0.7 * g * (1.0 - g) * 4.0 * 0.6);
  }
  return h;
}
`;

const GUST = `
// LES RISEES (lib/gusts.js) : des taches etirees dans le lit du vent, + risee / - molle. Une
// risee fronce l'eau (vaguelettes plus fortes) et l'assombrit ; une molle la lisse et l'eclaircit.
// Bords dechires par la carte de normales, qui derive avec le vent.
// uGust = (x, z, intensite, -) ; uGustWind = (dx, dz vers ou va le vent, vitesse m/s, rayon long)
const int NGUST = 48;
uniform vec4 uGust[48];
uniform int uGustN;
uniform vec4 uGustWind;
uniform float uGustRc;
float gustField(vec2 p) {
  if (uGustN == 0) return 0.0;
  vec2 d = uGustWind.xy;
  float g = 0.0;
  for (int i = 0; i < NGUST; i++) {
    if (i >= uGustN) break;
    vec2 r = p - uGust[i].xy;
    float a = dot(r, d), c = dot(r, vec2(-d.y, d.x));
    float e = a * a / (uGustWind.w * uGustWind.w) + c * c / (uGustRc * uGustRc);
    if (e < 9.0) g += uGust[i].z * exp(-e);
  }
  return clamp(g, -1.2, 1.2);
}
`;

const VERT = `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFade;
  uniform float uChop;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDist;
  varying float vCrest;
  varying float vJac;
  varying float vGust;
  ${WAVES}
  ${CUT}
  ${GUST}

  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vDist = length(w.xz - cameraPosition.xz);
    // fade the swell out with distance: past a few hundred metres the grid cannot carry it
    float fade = uAmp * exp(-vDist / uFade);

    vec3 p = vec3(w.x, 0.0, w.z);
    // DANS UNE RISEE LA MER DU VENT GROSSIT (jusqu'a +60 %), dans une molle elle s'aplatit ;
    // la houle, venue d'ailleurs, n'y est pour rien (composantes 8 et plus).
    float gv = gustField(w.xz);
    vGust = gv;
    float windAmp = clamp(1.0 + 0.6 * gv, 0.5, 1.6);
    vec3 dpdx = vec3(1.0, 0.0, 0.0);
    vec3 dpdz = vec3(0.0, 0.0, 1.0);
    float crest = 0.0;

    for (int i = 0; i < NW; i++) {
      // La direction est deja celle du vent du moment : le spectre la porte, il n'y a plus
      // rien a faire tourner ici.
      // (Pas d'accent grave dans ces commentaires : ils vivent dans un litteral de gabarit,
      //  et le moindre backtick y termine la chaine -- le shader ne se charge plus du tout.)
      vec2 d = normalize(uWaves[i].xy);
      float L = max(0.5, uWaves[i].z);
      float aN = uWaves[i].w;                      // nominal amplitude
      float a = aN * fade * (i < 8 ? windAmp : 1.0);   // what is actually drawn here
      float k = 6.28318530718 / L;
      float c = sqrt(9.81 / k);                    // deep-water phase speed
      float f = k * dot(d, vec2(w.x, w.z)) - c * k * uTime;
      float s = sin(f), co = cos(f);
      // Steepness from the NOMINAL amplitude, and capped. Deriving it from the faded one
      // sent it to infinity as the waves flattened with distance, which is what turned the
      // horizon into shattered peaks.
      float q = min(uChop / (k * aN * float(NW)), 1.0);

      p.x += q * a * d.x * co;
      p.z += q * a * d.y * co;
      p.y += a * s;
      crest += a * s;

      dpdx += vec3(-q * a * d.x * d.x * k * s, a * d.x * k * co, -q * a * d.y * d.x * k * s);
      dpdz += vec3(-q * a * d.x * d.y * k * s, a * d.y * k * co, -q * a * d.y * d.y * k * s);
    }

    vWorld = p;
    vNormal = normalize(cross(dpdz, dpdx));
    vCrest = crest;

    // Le JACOBIEN du deplacement horizontal. C'est le critere qu'emploient les oceans de
    // production : la ou la surface se COMPRIME, l'eau se replie sur elle-meme et c'est
    // exactement la qu'elle blanchit. J < 1 = compression, J > 1 = etirement.
    //
    // L'ecume calee sur la seule pente, comme avant, blanchissait tout un flanc de vague
    // uniformement -- une pente, ca ne mousse pas ; un deferlement, si. Le jacobien met le
    // blanc sur la face avant des cretes et nulle part ailleurs.
    vJac = dpdx.x * dpdz.z - dpdx.z * dpdz.x;
    // la forme d'ensemble de l'eau coupee par les appendices (le detail est au pixel)
    if (uCutN + uBulgeN > 0) { float fo; p.y += cutField(p.xz, fo); }
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = `
  // GLSL3 has no gl_FragColor, and this three.js build does not alias one in either -- the
  // shader has to declare its own output or it silently fails to compile and the sea comes
  // out a flat colour, which is exactly what happened.
  out vec4 fragColour;
  varying float vGust;
  ${CUT}
  ${GUST}

  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uSun;
  uniform float uSunPower;
  uniform sampler2D uReflect;
  uniform float uHasReflect;
  // Les vaguelettes : une carte de normales (three.js, examples/textures/waternormals.jpg,
  // MIT) en trois couches d'echelles, de directions et de derives differentes. Le bruit de
  // valeur qui les faisait avant etait cale sur une grille carree, et la grille SE VOYAIT.
  uniform sampler2D uNormalMap;
  uniform float uHasNormalMap;
  uniform float uLayers;
  // Le ciel reflechi : la photo equirectangulaire du dome (boat-scene), meme convention.
  uniform sampler2D uSkyMap;
  uniform float uHasSkyMap;
  uniform float uSkyYaw;
  uniform float uReflectStrength;
  uniform float uDetail;
  uniform float uFoam;
  uniform float uOpacity;
  uniform vec2 uResolution;
  uniform vec4 uViewport;
  uniform mat4 uReflectMatrix;
  // Le sillage : les dernieres positions du bateau, en monde (xz) plus leur age en secondes.
  // Un bateau a 40 noeuds laisse derriere lui une trainee blanche qui est, de loin, le
  // meilleur indicateur de vitesse qu'on ait -- c'est elle qui donne l'echelle du mouvement.
  // TROIS trainees (safran, foil babord, foil tribord), chacune partant du point ou la piece
  // coupe l'eau -- et non plus une seule tiree du centre du bateau. NP points chacune.
  const int NT = 3;
  const int NP = 24;
  uniform vec3 uWake[72];
  uniform int uWakeN[3];
  uniform float uWakeWidth[3];
  // L'emprise de la trainee, elargie de sa largeur maximale. Le sillage ne couvre qu'une
  // poignee d'hectares au milieu d'une mer qui va jusqu'a l'horizon : sans ce test prealable,
  // chaque pixel de l'ecran paie trente et une distances a un segment pour finir a zero.
  uniform vec4 uWakeBox[3];
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDist;
  varying float vCrest;
  varying float vJac;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  // ripple too small to be geometry, as a normal perturbation. Faded hard with distance,
  // because this is exactly the term that aliases into shimmer if it is left on far away.
  vec3 detailNormal(vec2 p, float t) {
    float e = 0.35;
    vec2 q = p * 0.9 + vec2(t * 0.35, -t * 0.21);
    float h = vnoise(q) + 0.5 * vnoise(q * 2.17 + 11.0) + 0.25 * vnoise(q * 4.51 - 7.0);
    float hx = vnoise(q + vec2(e, 0.0)) + 0.5 * vnoise((q + vec2(e, 0.0)) * 2.17 + 11.0);
    float hz = vnoise(q + vec2(0.0, e)) + 0.5 * vnoise((q + vec2(0.0, e)) * 2.17 + 11.0);
    return normalize(vec3(-(hx - h) / e, 1.0, -(hz - h) / e));
  }

  vec3 skyColour(vec3 d) {
    float h = clamp(d.y, 0.0, 1.0);
    if (uHasSkyMap > 0.5) {
      float a = atan(d.z, d.x) + uSkyYaw;
      vec2 uv = vec2(a * 0.15915494 + 0.5, asin(max(h, 0.002)) * 0.31830989 + 0.5);
      return texture(uSkyMap, uv).rgb;
    }
    return mix(uSkyHorizon, uSkyTop, pow(h, 0.55));
  }

  vec2 nm(vec2 uv) { return texture(uNormalMap, uv).rg * 2.0 - 1.0; }

  // Quatre couches qui ne partagent ni echelle, ni orientation, ni derive : leur somme ne se
  // repete plus a l'oeil. Les pentes s'ajoutent (pas les normales), puis on renormalise.
  vec3 mapNormal(vec2 p, float t) {
    const mat2 R1 = mat2(0.8, -0.6, 0.6, 0.8);
    const mat2 R2 = mat2(-0.28, 0.96, -0.96, -0.28);
    vec2 g = nm(p / 17.0 + vec2(t * 0.021, t * 0.013)) * 0.9
           + nm(R1 * p / 6.3 - vec2(t * 0.037, -t * 0.029)) * 0.55;
    if (uLayers > 2.5) g += nm(R2 * p / 2.1 + vec2(-t * 0.071, t * 0.053)) * 0.32;
    g += nm(p / 61.0 + vec2(-t * 0.006, t * 0.009)) * 0.6;
    return normalize(vec3(g.x, 1.25, g.y));
  }

  void main() {
    float near = exp(-vDist / 260.0);
    // les vaguelettes tiennent bien plus loin quand elles viennent d'une carte : ses mipmaps
    // font le filtrage que le bruit procedural ne savait pas faire
    // Les vaguelettes s'eteignent plus tot avec la distance (600 m au lieu de 1400) : au loin un
    // pixel couvre plusieurs vaguelettes, son orientation change a chaque image et la mer
    // clignotait sous le soleil -- « agressant », a juste titre.
    float ripple = uHasNormalMap > 0.5 ? exp(-vDist / 600.0) : near;
    // risee / molle : bords dechires par la texture qui derive avec le vent
    float gust = 0.0;
    if (uGustN > 0) {
      vec2 drift = uGustWind.xy * uGustWind.z * uTime;
      float tear = uHasNormalMap > 0.5 ? texture(uNormalMap, (vWorld.xz - drift) / 160.0).r : 0.5;
      gust = gustField(vWorld.xz) * (0.45 + 1.1 * tear);
      ripple *= clamp(1.0 + 1.8 * gust, 0.25, 3.0);
    }
    vec3 dn = uHasNormalMap > 0.5 ? mapNormal(vWorld.xz, uTime) : detailNormal(vWorld.xz, uTime);
    vec3 N = normalize(mix(vNormal, normalize(vNormal + (dn - vec3(0.0, 1.0, 0.0)) * uDetail),
                           ripple));
    // l'eau coupee : sa pente au pixel tord la normale (c'est elle qui deforme les reflets),
    // et son ecume s'ajoute plus bas
    float cutFoam = 0.0, cutH = 0.0;
    if (uCutN + uBulgeN > 0) {
      float f0, f1, f2, f3;
      cutH = cutField(vWorld.xz, cutFoam);
      const float E = 0.06;
      float gx = (cutField(vWorld.xz + vec2(E, 0.0), f0) - cutField(vWorld.xz - vec2(E, 0.0), f1)) / (2.0 * E);
      float gz = (cutField(vWorld.xz + vec2(0.0, E), f2) - cutField(vWorld.xz - vec2(0.0, E), f3)) / (2.0 * E);
      N = normalize(N + vec3(-gx, 0.0, -gz) * 1.8);
    }

    vec3 V = normalize(cameraPosition - vWorld);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);                                  // never sample below the horizon

    // Fresnel: almost clear underfoot, almost a mirror towards the horizon
    float f0 = 0.02;
    float fres = f0 + (1.0 - f0) * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);

    vec3 refl = skyColour(R);
    if (uHasReflect > 0.5) {
      // Le point d'eau se cherche dans l'image réfléchie en le PROJETANT par la caméra miroir
      // -- c'est ce que fait le Reflector de three.js. Le prendre à sa position écran supposait
      // que l'image miroir soit l'écran retourné pixel pour pixel ; elle ne l'est pas (un miroir
      // inverse gauche et droite), et les reflets tournaient à contresens des objets dès que la
      // caméra ou le décor pivotaient. On projette le point du plan d'eau (y = 0), pas la crête
      // de la vague : sinon le reflet ondule deux fois.
      vec4 rp = uReflectMatrix * vec4(vWorld.x, 0.0, vWorld.z, 1.0);
      vec2 uv = rp.xy / rp.w * 0.5 + 0.5;
      uv += N.xz * 0.022 * ripple;
      vec3 planar = texture(uReflect, clamp(uv, 0.001, 0.999)).rgb;
      // dans une molle l'eau se lisse et devient miroir : le reflet y prend plus de place
      refl = mix(refl, planar, min(1.0, uReflectStrength * (1.0 + 0.6 * clamp(-gust, 0.0, 1.0)))
                               * smoothstep(0.0, 0.25, fres));
    }

    // The body of the water. Real sea is not black: even looking straight down it carries
    // the skylight scattered back out of it, and without that term the surface reads as a
    // hole. The crest tint lightens what is stirred up.
    // contraste creux / cretes : c'est lui qui fait lire la houle a vingt metres
    float stir = clamp(vCrest * 4.5 + 0.5, 0.0, 1.0);
    vec3 body = mix(uDeep * 0.8, uShallow * 1.15, stir * 0.85);
    // sub-surface skylight ; le ciel photo est bien plus lumineux que le degrade, d'ou un
    // dosage a part -- sinon la mer vire au lait
    body += skyColour(vec3(0.0, 1.0, 0.0)) * (uHasSkyMap > 0.5 ? 0.025 : 0.13);

    // La photo du ciel a un horizon presque blanc : reflechie telle quelle a incidence rasante
    // elle delavait toute la mer. On la teinte vers le bleu du large et on l'assombrit un peu.
    if (uHasSkyMap > 0.5) refl *= vec3(0.46, 0.6, 0.74);
    vec3 col = mix(body, refl, fres);

    // DIFFUSION SOUS LA SURFACE. Une crete mince prise a contre-jour s'allume : la lumiere la
    // traverse au lieu de s'y reflechir, et c'est ce vert-turquoise dans le dos des vagues qui
    // fait lire de l'eau plutot qu'une tole peinte en bleu. Le terme ne s'allume que quand on
    // regarde VERS le soleil, et proportionnellement a la hauteur de la crete.
    vec3 L = normalize(uSun);
    float back = pow(clamp(dot(V, -L) * 0.5 + 0.5, 0.0, 1.0), 4.0);
    float thin = clamp(vCrest * 5.0, 0.0, 1.0) * clamp(1.0 - N.y, 0.0, 1.0) * 6.0;
    col += vec3(0.16, 0.52, 0.42) * back * clamp(thin, 0.0, 1.0) * 0.55 * near;

    // Le scintillement, en DEUX lobes : un large qui pose la nappe brillante, un tres etroit
    // qui fait les etincelles. Un seul lobe donnait soit une flaque laiteuse, soit des points
    // isoles ; c'est leur superposition qui ressemble a une mer au soleil.
    float sun = max(dot(R, L), 0.0);
    // Eclat solaire CALME : la nappe large garde sa place, les etincelles fines sont trois fois
    // plus faibles et moins serrees (elles faisaient le scintillement), et l'eclat s'eteint avec
    // les vaguelettes au loin. Dans une molle, une seule nappe lisse.
    float calm = clamp(-gust, 0.0, 1.0);
    float glare = pow(sun, uSunPower * 0.25) * 0.3
                + pow(sun, uSunPower * 1.5) * 0.6 * (1.0 - 0.7 * calm) * mix(0.3, 1.0, ripple);
    col += vec3(1.0, 0.97, 0.90) * glare * 1.1;

    // L'ECUME. Trois sources qui ne se confondent pas :
    //   la compression (jacobien) : le deferlement, sur la face avant des cretes ;
    //   la crete meme : la dentelle sur les tout hauts ;
    //   le sillage : notre trainee.
    float breaking = smoothstep(0.92, 0.55, vJac);
    float lace = smoothstep(0.06, 0.15, vCrest) * smoothstep(0.02, 0.06, 1.0 - vNormal.y);
    float foam = clamp(breaking * 1.15 + lace * 0.55, 0.0, 1.0) * near;
    // Un grain, sinon l'ecume est une nappe lisse -- et un grain qui DERIVE avec la houle,
    // sans quoi la mousse glisse sous la vague au lieu d'etre portee par elle.
    float grain = uHasNormalMap > 0.5
      ? clamp(0.5 + 1.6 * (texture(uNormalMap, vWorld.xz / 3.7 - vec2(uTime * 0.02, uTime * 0.011)).r - 0.5), 0.0, 1.0)
      : 0.38 + 0.62 * vnoise(vWorld.xz * 2.3 - vec2(uTime * 0.25, uTime * 0.11));
    foam *= grain;
    // la risee moutonne : plus d'ecume sur les cretes, d'autant plus qu'elle est forte
    foam *= 1.0 + 1.4 * clamp(vGust, 0.0, 1.0);

    // Le sillage : distance au segment le plus proche de la trainee, elargi et estompe avec
    // l'age. On prend le MINIMUM plutot qu'une somme, sinon deux segments voisins cumulent
    // leur blanc et la trainee double d'intensite dans les virages.
    float wake = 0.0;
    for (int tr = 0; tr < NT; tr++) {
    vec4 box = uWakeBox[tr];
    bool inWake = uWakeN[tr] > 1
      && vWorld.x > box.x && vWorld.x < box.z
      && vWorld.z > box.y && vWorld.z < box.w;
    for (int i = 0; inWake && i + 1 < NP; i++) {
      if (i + 1 >= uWakeN[tr]) break;
      vec2 a = uWake[tr * NP + i].xz;
      vec2 b = uWake[tr * NP + i + 1].xz;
      vec2 ab = b - a;
      float ll = max(dot(ab, ab), 1e-4);
      float t = clamp(dot(vWorld.xz - a, ab) / ll, 0.0, 1.0);
      float d = length(vWorld.xz - (a + ab * t));
      float age = mix(uWake[tr * NP + i].y, uWake[tr * NP + i + 1].y, t);
      // La trainee s'elargit en vieillissant et s'efface : c'est ce qui lui donne sa forme de
      // coin, et c'est ce coin qui se lit comme de la vitesse.
      // L'elargissement avec l'age, mais MODESTE. A 0.55 par seconde, une trainee de quatorze
      // secondes finissait huit fois plus large que son origine -- trente metres de blanc
      // derriere un bateau qui vole sur un foil et un safran. Un bateau a foils laisse une trace etroite.
      float w = uWakeWidth[tr] * (1.0 + age * 0.08);
      float k = smoothstep(w, w * 0.25, d) * smoothstep(14.0, 2.0, age);
      wake = max(wake, k);
    }
    }
    // le sillage reste une trainee de mousse, pas une nappe : le grain le dechire
    foam = clamp(foam + wake * (0.25 + 0.6 * grain), 0.0, 1.0);

    // risee : eau plus sombre et plus froide ; molle : plus claire, plus lisse
    // assez franc pour se lire a l'horizon depuis la poursuite, la ou arrivent les risees
    col *= mix(vec3(1.0), vec3(0.42, 0.52, 0.68), clamp(gust, 0.0, 1.0));
    col = mix(col, col * 1.35 + vec3(0.04, 0.06, 0.07), clamp(-gust, 0.0, 1.0) * 0.8);
    // la cavite derriere la piece : de l'eau plus sombre, et de l'ecume dechiree par le grain
    col *= 1.0 + clamp(cutH, -0.3, 0.0) * 1.2;
    foam = clamp(foam + cutFoam * (0.35 + 0.65 * grain), 0.0, 1.0);
    col = mix(col, vec3(0.93, 0.96, 0.98), clamp(foam * uFoam, 0.0, 0.88));

    fragColour = vec4(col, mix(1.0, uOpacity, near));
    // Avec le ciel photo, tout est en lineaire et doit sortir converti, comme le reste de la
    // scene. Sans lui on garde le rendu d'origine.
    #if defined( TONE_MAPPING )
    if (uHasSkyMap > 0.5) fragColour.rgb = toneMapping(fragColour.rgb);
    #endif
    if (uHasSkyMap > 0.5) fragColour = linearToOutputTexel(fragColour);
  }
`;

export class WaterFX {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene   the scene to mirror into the reflection
   * @param {object} opts
   */
  constructor(renderer, scene, { reflect = true, size = 1024, quality = 'high', normalMap = null } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.enabled = true;
    this.quality = quality;
    const ultra = quality === 'ultra';
    this.wakeScale = ultra ? 0.8 : 1;

    this.uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 1.0 },
      // Les houles, remplacees des que le vent change franchement. Un tableau d'uniformes
      // plutot qu'une constante du shader : on rebatit la mer sans recompiler quoi que ce soit.
      uWaves: { value: Array.from({ length: NWAVES }, () => new THREE.Vector4(1, 0, 10, 0)) },
      // Relief plus marque (retour Benjamin : « la mer est pas hyper marquee ») sans toucher au
      // creux, qui est mesure : cretes plus pointues, et un relief qui tient plus loin de l'oeil.
      uFade: { value: 700 },
      uChop: { value: 0.85 },
      uDeep: { value: new THREE.Color(0x123a55) },
      uShallow: { value: new THREE.Color(0x2f7f9e) },
      uSkyTop: { value: new THREE.Color(0x2a5f9e) },
      uSkyHorizon: { value: new THREE.Color(0x9fc4e0) },
      uSun: { value: new THREE.Vector3(0.45, 0.62, 0.35).normalize() },
      uSunPower: { value: 480 },
      uReflect: { value: null },
      uHasReflect: { value: 0 },
      uNormalMap: { value: null },
      uHasNormalMap: { value: 0 },
      uLayers: { value: 2 },
      uSkyMap: { value: null },
      uHasSkyMap: { value: 0 },
      uSkyYaw: { value: 0 },
      // Léger : un reflet trop franc fait de la mer un miroir d'huile.
      uReflectStrength: { value: 0.45 },
      uReflectMatrix: { value: new THREE.Matrix4() },
      uDetail: { value: 0.55 },
      uFoam: { value: 0.85 },
      uOpacity: { value: 0.94 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uViewport: { value: new THREE.Vector4(0, 0, 1, 1) },
      // Le sillage. `y` porte l'age en secondes, pas une hauteur : la trainee vit sur le plan
      // d'eau, seule sa position au sol et son anciennete comptent.
      uWake: { value: Array.from({ length: WAKE_N * WAKE_P }, () => new THREE.Vector3(0, 99, 0)) },
      uWakeN: { value: [0, 0, 0] },
      uWakeWidth: { value: [1, 1, 1] },
      uWakeBox: { value: Array.from({ length: WAKE_N }, () => new THREE.Vector4(1, 1, -1, -1)) },
      uCut: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
      uCutDir: { value: Array.from({ length: 4 }, () => new THREE.Vector4(1, 0, 0, 0)) },
      uCutN: { value: 0 },
      uBulge: { value: [new THREE.Vector4(), new THREE.Vector4()] },
      uBulgeDir: { value: [new THREE.Vector4(1, 0, 1, 0), new THREE.Vector4(1, 0, 1, 0)] },
      uBulgeN: { value: 0 },
      uGust: { value: Array.from({ length: 48 }, () => new THREE.Vector4()) },
      uGustN: { value: 0 },
      uGustWind: { value: new THREE.Vector4(1, 0, 0, 30) },
      uGustRc: { value: 110 },
    };

    // La trainee, du plus recent au plus ancien. Un point toutes les demi-secondes couvre
    // seize secondes de sillage, soit environ trois cents metres a quarante noeuds : de quoi
    // voir d'ou l'on vient sans que le coin ne parte jusqu'a l'horizon.
    this._vp = new THREE.Vector4(0, 0, 1, 1);
    // une trainee par source, rangee a sa place dans les uniformes
    this._trails = WAKE_IDS.map(() => ({ pts: [], at: 0, broken: false }));

    if (normalMap) {
      const t = new THREE.TextureLoader().load(normalMap);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = ultra ? 16 : 8;
      this.uniforms.uNormalMap.value = t;
      this.uniforms.uHasNormalMap.value = 1;
      this.uniforms.uLayers.value = ultra ? 3 : 2;
      this.uniforms.uDetail.value = ultra ? 0.6 : 0.5;
    }
    // Plus de reflet, plus net, en ultra : image miroir a pleine resolution, eclat solaire
    // plus serre et plus fort.
    this.uniforms.uReflectStrength.value = ultra ? 0.8 : 0.6;
    if (ultra) this.uniforms.uSunPower.value = 900;

    this.mesh = new THREE.Mesh(ultra ? radialGrid(280, 360, 4e-5) : radialGrid(150, 180, 4e-5), new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    }));
    // Une mer par defaut, tout de suite. Les houles arrivent du vent mesure, mais ce vent
    // peut manquer -- pas de flux, un rejeu qui n'a pas fini de charger, une seance au ponton
    // -- et une amplitude nulle donne alors un plan d'eau parfaitement LISSE, ce qui se lit
    // comme une eau cassee et non comme une absence de donnee. Douze noeuds en attendant.
    this.setWaves(buildWaves({ twsKn: 12, twdDeg: 0, fetchM: 8000, n: 8 }).waves);

    this.mesh.frustumCulled = false;
    // Voir boat-scene.js : apres les opaques, sinon la mer ne masque rien.
    this.mesh.renderOrder = 0;

    if (reflect) {
      this.reflectScale = ultra ? 1 : 0.5;   // the reflection is blurred by the ripple anyway
      this.target = new THREE.WebGLRenderTarget(size, size, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
        type: THREE.HalfFloatType, depthBuffer: true,
      });
      this.reflectCam = new THREE.PerspectiveCamera();
      this.uniforms.uReflect.value = this.target.texture;
      // everything under the water is not in its reflection
      this.clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.0);
    }
  }

  /**
   * Poser le sillage d'une source -- 'rudder', 'foilPort' ou 'foilStbd'.
   *
   * Chaque source part de SON point d'entree dans l'eau : c'est le safran et le foil sous le
   * vent qui marquent l'eau d'un bateau qui vole, pas le centre de sa coque. Echantillonne dans
   * le temps (un point par demi-seconde), le shader relie les segments.
   *
   * @param {string} id
   * @param {number} x
   * @param {number} z
   * @param {number} tSec   temps courant, en secondes
   * @param {number} speedKn
   */
  trail(id, x, z, tSec, speedKn = 0) {
    // ancienne signature trail(x, z, t, kn) (apps/wuhu-chase) : une seule trainee, au safran
    if (typeof id === 'number') return this.trail('rudder', id, x, z, tSec);
    const slot = WAKE_IDS.indexOf(id);
    if (slot < 0 || !Number.isFinite(x) || !Number.isFinite(z)) return;
    const T = this._trails[slot];
    // ressortie de l'eau puis replongee : une NOUVELLE trainee, sans quoi le shader tirerait un
    // trait blanc d'un point d'entree a l'autre, par-dessus l'eau que la piece n'a pas touchee
    if (T.broken) { T.pts.length = 0; T.broken = false; }
    T.gapAt = 0;
    if (tSec - T.at >= 0.5 || !T.pts.length) {
      T.at = tSec;
      T.pts.unshift({ x, z, t: tSec });
      if (T.pts.length > WAKE_P) T.pts.length = WAKE_P;
    } else {
      // le point de tete suit la piece entre deux echantillons : la trainee part d'elle
      T.pts[0].x = x; T.pts[0].z = z;
    }
    const w = (WAKE_W[id] || WAKE_W.rudder)(speedKn) * this.wakeScale;
    this._uploadTrail(slot, tSec, w);
  }

  /** La source n'est plus dans l'eau : sa trainee vieillit et s'efface, puis repartira a neuf. */
  trailGap(id, tSec) {
    const slot = WAKE_IDS.indexOf(id);
    if (slot < 0) return;
    const T = this._trails[slot];
    // une image ou deux sans contact (bruit d'attitude, vitesse au seuil) ne coupe rien : la
    // trainee ne repart a neuf qu'apres une vraie seconde hors de l'eau
    if (!T.gapAt) T.gapAt = tSec;
    if (tSec - T.gapAt > 1.0) T.broken = true;
    if (T.pts.length) this._uploadTrail(slot, tSec, this.uniforms.uWakeWidth.value[slot]);
  }

  _uploadTrail(slot, tSec, width) {
    const T = this._trails[slot], u = this.uniforms.uWake.value, o = slot * WAKE_P;
    for (let i = 0; i < T.pts.length; i++) u[o + i].set(T.pts[i].x, tSec - T.pts[i].t, T.pts[i].z);
    this.uniforms.uWakeN.value[slot] = T.pts.length;
    this.uniforms.uWakeWidth.value[slot] = width;
    // L'emprise, elargie de la largeur en fin de vie : le shader saute tout pixel hors boite.
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const q of T.pts) {
      if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x;
      if (q.z < z0) z0 = q.z; if (q.z > z1) z1 = q.z;
    }
    const pad = width * 3 + 4;
    this.uniforms.uWakeBox.value[slot].set(x0 - pad, z0 - pad, x1 + pad, z1 + pad);
  }

  /** Oublier le sillage -- changement de course, de mode, ou saut dans le temps. */
  clearTrail() {
    for (let k = 0; k < this._trails.length; k++) {
      this._trails[k].pts.length = 0;
      this.uniforms.uWakeN.value[k] = 0;
    }
  }

  /**
   * Poser la mer.
   *
   * @param {Array} waves  {dx, dy, L, a}, au plus NWAVES
   */
  setWaves(waves) {
    const u = this.uniforms.uWaves.value;
    for (let i = 0; i < u.length; i++) {
      const w = waves && waves[i];
      if (w) u[i].set(w.dx, w.dy, w.L, w.a);
      else u[i].set(1, 0, 10, 0);      // amplitude nulle : la houle n'existe pas
    }
  }

  /**
   * Les pieces qui coupent l'eau a cette image (4 au plus) : [{x, z, s, dx, dz, v}], en monde.
   * s = intensite (0..1), (dx, dz) = cap unitaire, v = vitesse en m/s.
   */
  setCutters(list) {
    const n = Math.min(4, (list || []).length);
    for (let i = 0; i < n; i++) {
      const c = list[i];
      this.uniforms.uCut.value[i].set(c.x, c.z, c.s, 0);
      this.uniforms.uCutDir.value[i].set(c.dx, c.dz, c.v, 0);
    }
    this.uniforms.uCutN.value = n;
  }

  /**
   * Les ailes a fleur d'eau (2 au plus) : [{x, z, h, len, dx, dz, w}] en monde -- centre, hauteur
   * de la bosse (m), demi-longueur le long du segment bras-bout d'aile, sa direction, demi-largeur.
   */
  setBulges(list) {
    const n = Math.min(2, (list || []).length);
    for (let i = 0; i < n; i++) {
      const b = list[i];
      this.uniforms.uBulge.value[i].set(b.x, b.z, b.h, b.len);
      this.uniforms.uBulgeDir.value[i].set(b.dx, b.dz, b.w, 0);
    }
    this.uniforms.uBulgeN.value = n;
  }

  /**
   * Les risees (lib/gusts.js) : [{x, z, s}] en monde, s dans [-1, 1] ; dir = vers ou souffle le
   * vent, U = sa vitesse de derive (m/s), along = demi-longueur d'une tache dans le lit du vent.
   */
  setGusts(puffs, dir = [1, 0], U = 0, along = 30) {
    const n = Math.min(48, (puffs || []).length);
    for (let i = 0; i < n; i++) this.uniforms.uGust.value[i].set(puffs[i].x, puffs[i].z, puffs[i].s, 0);
    this.uniforms.uGustN.value = n;
    this.uniforms.uGustWind.value.set(dir[0], dir[1], U, along);
  }

  /** Le ciel photo du dome, pour les reflets (voir BoatScene.setSkyImage). */
  setSkyMap(tex, yaw = 0) {
    this.uniforms.uSkyMap.value = tex;
    this.uniforms.uHasSkyMap.value = tex ? 1 : 0;
    this.uniforms.uSkyYaw.value = yaw;
    // en sortie convertie, les couleurs d'origine paraissaient delavees : un large plus
    // profond, bleu-vert, comme la Mediterranee sous un ciel d'ete
    this.uniforms.uDeep.value.setHex(tex ? 0x062438 : 0x123a55);
    this.uniforms.uShallow.value.setHex(tex ? 0x0f5466 : 0x2f7f9e);
  }

  setSky(top, horizon) {
    this.uniforms.uSkyTop.value.setHex(top);
    this.uniforms.uSkyHorizon.value.setHex(horizon);
  }

  /** Sun direction, as the scene's key light has it. */
  setSun(v) {
    this.uniforms.uSun.value.copy(v).normalize();
  }

  /**
   * Render the reflection and place the sheet under the camera.
   * Called once per pane, immediately before that pane draws.
   */
  /**
   * D'ou vient la mer.
   *
   * @param {number} deg  direction VERS laquelle les vagues avancent, en degres, comptee
   *   depuis le nord et dans le sens des aiguilles -- la meme convention que les caps.
   */
  setWaveHeading(deg) {
    if (!Number.isFinite(deg)) return;
    // Le monde a +X vers l'est et +Z vers le sud ; un cap B y pointe donc vers
    // (sin B, -cos B) dans le plan xz, ce que cette rotation applique aux six houles.
    const a = (deg * Math.PI) / 180;
    this.uniforms.uCosDir.value = Math.cos(a);
    this.uniforms.uSinDir.value = Math.sin(a);
  }

  update(camera, tSeconds, span, anchor = null) {
    this.uniforms.uTime.value = tSeconds;
    const s = Math.max(400, Math.min(span || Infinity, camera.far * 1.2));
    // Le centre vient de l'appelant : plafonnee, la nappe se cale sur le bateau et non sur
    // l'oeil, sinon elle recouvre le decor des qu'on prend du recul.
    const mid = anchor || camera.position;
    this.mesh.position.set(mid.x, 0, mid.z);
    this.mesh.scale.set(s, 1, s);
    this.mesh.updateMatrixWorld(true);

    if (!this.target) return;

    // The target must follow the canvas, or the reflection is sampled at the wrong aspect
    const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    // Le rectangle REELLEMENT dessine, et non le canevas entier. Une vignette -- le plan
    // arriere en bas a gauche -- occupe un coin de l'ecran ; sa mer y cherchait sa reflexion
    // a la position de ce coin dans le canevas, donc dans un morceau d'image qui ne la
    // regardait pas. D'ou un reflet decale et ecrase dans la vignette, et des raccords
    // etranges des qu'une vue partagee l'ecran.
    this.renderer.getCurrentViewport(this._vp);
    if (this._vp.z < 1 || this._vp.w < 1) this._vp.set(0, 0, db.x, db.y);
    this.uniforms.uViewport.value.copy(this._vp);
    this.uniforms.uResolution.value.copy(db);
    const tw = Math.max(64, Math.round(db.x * this.reflectScale));
    const th = Math.max(64, Math.round(db.y * this.reflectScale));
    if (this.target.width !== tw || this.target.height !== th) this.target.setSize(tw, th);

    // Mirror the camera about y = 0. Position flips, pitch flips, everything else holds.
    const c = this.reflectCam;
    c.copy(camera);
    c.position.set(camera.position.x, -camera.position.y, camera.position.z);
    const look = new THREE.Vector3();
    camera.getWorldDirection(look);
    // Le HAUT se retourne AUSSI. Il etait laisse tel quel, ce qui n'a pas d'importance tant
    // que la camera est droite -- mais les vues embarquees roulent avec la gite, et un miroir
    // dont le haut ne roule pas dans l'autre sens rend une image tournee de deux fois l'angle.
    // C'est ce qui mettait dans l'eau une silhouette de bateau aplatie et de travers, qui
    // changeait avec la rotation de la camera.
    c.up.set(camera.up.x, -camera.up.y, camera.up.z);
    c.lookAt(camera.position.x + look.x,
             -(camera.position.y + look.y),
             camera.position.z + look.z);
    c.near = camera.near;
    c.far = camera.far;
    c.updateProjectionMatrix();

    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevClip = r.clippingPlanes;
    this.mesh.visible = false;
    // Ce qui flotte dans l'air sans être un objet -- les lignes du dévent -- ne se reflète pas :
    // des milliers de fils doublés sous l'eau, ondulés par la houle, brouillaient tout.
    const noReflect = [];
    for (const o of this.scene.children) {
      if (o.userData && o.userData.noReflect && o.visible) { o.visible = false; noReflect.push(o); }
    }
    r.clippingPlanes = [this.clip];
    r.setRenderTarget(this.target);
    r.clear();
    r.render(this.scene, c);
    r.setRenderTarget(prevTarget);
    r.clippingPlanes = prevClip;
    for (const o of noReflect) o.visible = true;
    this.mesh.visible = this.enabled;
    // La projection de la caméra miroir, pour que le shader y retrouve chaque point d'eau.
    c.updateMatrixWorld();
    this.uniforms.uReflectMatrix.value.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
    this.uniforms.uHasReflect.value = 1;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    if (this.target) this.target.dispose();
  }
}
