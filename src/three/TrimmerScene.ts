// The 3D trimmer's-eye scene. Reads a simulator `Snapshot` every frame and draws:
//   - the J/80-type boat (j80Model.ts), heeled, pitched and heaving on the waves
//   - jib / main / gennaker shaped from the physics shapes (angle, twist, depth, draft)
//   - telltale ribbons on both faces of the jib (seen through clear windows), main leech
//     telltales and kite luff telltales, all driven by the section angle of attack
//   - optional force arrows: each sail's aero force split into drive and heeling force
//   - an inertial head camera: the eye lags the boat so acceleration and roll are felt
// Water and sky come from the boat3d project (src/three/boat3d, copied verbatim).

import * as THREE from 'three';
import type { Snapshot } from '../sim/engine';
import type { ControlKey } from '../content/types';
import type { SectionResult } from '../sim/physics';
import { WaterFX } from './boat3d/water-fx.js';
import { loadJ80 } from './j80Mesh';
import { KiteMold } from './kiteMold';
import { L } from '../i18n';
import { buildWaves, type Wave } from './boat3d/sea-state.js';
import {
  BOOM_H,
  DECK,
  FORESTAY_BASE,
  FORESTAY_TOP,
  WINCH,
  MAST_H,
  Ribbon,
  SPRIT_END,
  SailMesh,
  TACK,
  buildHull,
  crewFigure,
  placeRod,
  rod,
  sailPoint,
  sailTextures,
  sheerAt,
  halfBreadth,
  type SailState,
  type RibbonDrive,
} from './j80Model';

export type CamView = 'trimmer' | 'leeward' | 'main' | 'helm' | 'chase' | 'astern';

const DEG = Math.PI / 180;
const jibChord = (h: number) => 3.05 * Math.pow(1 - h, 0.95) + 0.12 * h;
/** chord fraction of the jib telltales: ~30 cm behind the luff */
const jibT0 = (h: number) => Math.min(0.3, Math.max(0.08, 0.3 / jibChord(h)));
const KN = 0.514444;
const BASE = (import.meta as any).env?.BASE_URL ?? './';

/** Same telltale logic as the 2D widget, but continuous (0..1) so ribbons move progressively. */
export function telltaleDrive(sec: { a: number; flow: string }, groove: number) {
  const lift = Math.min(1, Math.max(0, (0.12 * groove - sec.a) / (0.12 * groove + 4)));
  const stall = Math.min(1, Math.max(0, (sec.a - groove) / 5));
  const flog = sec.flow === 'flog' ? 1 : 0;
  return { lift, stall, flog };
}

function interpSection(secs: SectionResult[], h: number) {
  if (h <= secs[0].h) return secs[0];
  if (h >= secs[secs.length - 1].h) return secs[secs.length - 1];
  for (let i = 0; i < secs.length - 1; i++) {
    const a = secs[i];
    const b = secs[i + 1];
    if (h >= a.h && h <= b.h) {
      const t = (h - a.h) / (b.h - a.h);
      return { ...a, a: a.a + (b.a - a.a) * t, alpha: a.alpha + (b.alpha - a.alpha) * t, flow: t < 0.5 ? a.flow : b.flow, quality: a.quality + (b.quality - a.quality) * t };
    }
  }
  return secs[1];
}

function depthAt(h: number, bottom: number, mid: number, top: number) {
  if (h < 0.5) return bottom + (mid - bottom) * Math.max(0, (h - 0.15) / 0.35);
  return mid + (top - mid) * Math.min(1, (h - 0.5) / 0.35);
}

const SKY_FRAG = `
  uniform sampler2D map; uniform float useMap;
  uniform vec3 top; uniform vec3 horizon;
  varying vec3 vP;
  void main() {
    vec3 d = normalize(vP);
    float h = d.y;
    vec3 c = mix(horizon, top, pow(max(h, 0.0), 0.55));
    if (useMap > 0.5) {
      float a = atan(d.z, d.x);
      vec2 uv = vec2(a * 0.15915494 + 0.5, asin(clamp(max(h, 0.002), -1.0, 1.0)) * 0.31830989 + 0.5);
      c = texture2D(map, uv).rgb;
    }
    gl_FragColor = vec4(c, 1.0);
    #if defined( TONE_MAPPING )
    if (useMap > 0.5) gl_FragColor.rgb = toneMapping(gl_FragColor.rgb);
    #endif
    if (useMap > 0.5) gl_FragColor = linearToOutputTexel(gl_FragColor);
  }`;

export interface SceneOptions {
  view: CamView;
  forces: boolean;
  xray: boolean;
  inertia: boolean;
  /** draggable 3D handles on the trim controls */
  handles: boolean;
  /** only these controls get a handle (a lesson lab offers just its own) */
  handleKeys?: ControlKey[];
}

/** jib tracks: on the side deck, between the cabin top and the shrouds (J/80) */
const JIB_TRACK_Z = 0.63;

export type HandleId = 'jibCar' | 'jibClew' | 'winch' | 'jibHead' | 'forestay' | 'backstay' | 'mainsheet' | 'traveller' | 'vang' | 'outhaul' | 'cunningham' | 'kiteClew';

/** What each handle drives, and how many metres of drag along its axis cover the full 0..1 range. */
export const HANDLE_DEFS: Record<HandleId, { key: ControlKey; label: string; L: number; color: number }> = {
  jibCar: { key: 'jibLead', label: L('Jib car (lead)', 'Chariot de foc'), L: 0.55, color: 0x22d3ee },
  jibClew: { key: 'jibSheet', label: L('Jib clew (sheet)', 'Point d’écoute de foc (écoute)'), L: 1.9, color: 0x22d3ee },
  winch: { key: 'jibSheet', label: L('Winch (drag down: trim · up: ease)', 'Winch (vers le bas : border · vers le haut : choquer)'), L: 0.9, color: 0x22d3ee },
  jibHead: { key: 'jibHalyard', label: L('Jib halyard', 'Drisse de foc'), L: 0.6, color: 0x22d3ee },
  forestay: { key: 'backstay', label: L('Forestay tension (backstay) - pull down', 'Tension d’étai (pataras) - tirer vers le bas'), L: 0.6, color: 0xf59e0b },
  backstay: { key: 'backstay', label: L('Backstay - pull down to tension', 'Pataras - tirer vers le bas pour tendre'), L: 0.6, color: 0xf59e0b },
  mainsheet: { key: 'mainSheet', label: L('Mainsheet', 'Écoute de GV'), L: 3.6, color: 0xa78bfa },
  traveller: { key: 'traveller', label: L('Traveller', 'Chariot de GV'), L: 1.5, color: 0xa78bfa },
  vang: { key: 'vang', label: L('Vang', 'Hale-bas'), L: 0.4, color: 0xa78bfa },
  outhaul: { key: 'outhaul', label: L('Outhaul', 'Bordure'), L: 0.3, color: 0xa78bfa },
  cunningham: { key: 'cunningham', label: L('Cunningham', 'Cunningham'), L: 0.25, color: 0xa78bfa },
  kiteClew: { key: 'jibSheet', label: L('Kite sheet', 'Écoute de spi'), L: 3.5, color: 0xfbbf24 },
};

interface Handle {
  id: HandleId;
  vis: THREE.Mesh;
  hit: THREE.Mesh;
  pos: THREE.Vector3; // boat frame
  axis: THREE.Vector3; // boat frame, unit, direction of increasing control
  active: boolean;
}

export class TrimmerScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(68, 1, 0.05, 4000);
  opts: SceneOptions = { view: 'trimmer', forces: false, xray: false, inertia: true, handles: true };
  /** handle under the pointer / being dragged (highlighted) */
  hoverHandle: HandleId | null = null;
  /** the control being dragged: drawn as a small 3D gauge along the handle's axis */
  gauge: { id: HandleId; target: number; opt: number } | null = null;
  private gaugeObj = new THREE.Group();
  private gaugeFill: THREE.Mesh;
  private gaugeBar: THREE.Mesh;
  private gaugeTgt: THREE.Mesh;
  private gaugeOpt: THREE.Mesh;
  private handles: Handle[] = [];
  private raycaster = new THREE.Raycaster();
  /** mouse look offsets (rad) */
  look = { yaw: 0, pitch: 0, fov: 72, dolly: 0 };

  private fx: WaterFX;
  private sky: THREE.Mesh;
  private boat = new THREE.Group();
  /** procedural hull + fixed rig, hidden once the detailed J/80 model is loaded */
  private staticRig = new THREE.Group();
  private disposed = false;
  private kiteMold: KiteMold | null = null;
  private waves: Wave[] = [];
  private waveKey = '';
  private waveTws = 0;
  private waveTwd = 0;
  private seaScale = 1;
  private time = 0;

  // rig parts updated per frame
  private boomPivot = new THREE.Group();
  private jib: SailMesh;
  private main: SailMesh;
  private kite: SailMesh;
  private jibMat: THREE.MeshStandardMaterial;
  private forestay: THREE.Line;
  private jibSheet: THREE.Mesh;
  private jibSheet2: THREE.Mesh;
  private jibLazy: THREE.Mesh;
  private kiteSheet: THREE.Mesh;
  private kiteSheet2: THREE.Mesh;
  private sprit: THREE.Mesh;
  private mainSheet: THREE.Mesh;
  private vang: THREE.Mesh;
  private travCar: THREE.Mesh;
  private jibCars: THREE.Mesh[] = [];
  private jibTracks: THREE.Mesh[] = [];
  /** deck height under the jib track (fitted on the J/80 model once loaded): y = a + b x */
  private trackDeck = { a: 0, b: 0, ok: false };
  private windex = new THREE.Group();
  private tiller = new THREE.Group();
  private crew: THREE.Group[] = [];
  private jibTT: { h: number; port: Ribbon; stbd: Ribbon }[] = [];
  private kiteTT: { h: number; port: Ribbon; stbd: Ribbon }[] = [];
  private leechTT: { h: number; r: Ribbon }[] = [];
  private arrows: Record<string, { drive: THREE.ArrowHelper; side: THREE.ArrowHelper; total: THREE.ArrowHelper }> = {};

  // smoothed / dynamic state
  private heelS = 0;
  private headingS = 0;
  private wSide = 1;
  private first = true;
  private vPrev = 0;
  private surgeAcc = 0;
  private rollRate = 0;
  private heavePrev = 0;
  private heaveRate = 0;
  private rollAccF = 0;
  private heaveAccF = 0;
  private head = { o: new THREE.Vector3(), v: new THREE.Vector3(), roll: 0, rollV: 0 };
  private fovKick = 0;
  private kiteBlend = 0;
  private waveMo = { heave: 0, pitch: 0, roll: 0 };
  private mainLeechAim = new THREE.Vector3(-2.3, DECK + 5.5, 0);
  /** jib camera aim: between the luff telltales and the leech, low-mid height (both in frame) */
  private jibAim = new THREE.Vector3(0.3, DECK + 2.8, 0.6);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;

    // ---- sky + light
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { map: { value: null }, useMap: { value: 0 }, top: { value: new THREE.Color(0x2a5f9e) }, horizon: { value: new THREE.Color(0x9fc4e0) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: SKY_FRAG,
      }),
    );
    this.sky.renderOrder = -2;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    const sunDir = new THREE.Vector3(0.565, 0.735, 0.375).normalize();
    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x1d3b52, 0.8);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sun.position.copy(sunDir).multiplyScalar(100);
    this.scene.add(sun);
    this.scene.add(sun.target);

    this.fx = new WaterFX(this.renderer, this.scene, { reflect: true, size: 512, quality: 'high', normalMap: `${BASE}3d/waternormals.jpg` });
    this.fx.setSun(sunDir);
    this.scene.add(this.fx.mesh);
    new THREE.TextureLoader().load(`${BASE}3d/sky.jpg`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.wrapS = THREE.RepeatWrapping;
      const u = (this.sky.material as THREE.ShaderMaterial).uniforms;
      u.map.value = tex;
      u.useMap.value = 1;
      const pm = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pm.fromEquirectangular(tex).texture;
      pm.dispose();
      this.fx.setSkyMap(tex, 0);
    });

    // ---- boat
    this.boat.rotation.order = 'YXZ';
    this.scene.add(this.boat);
    this.boat.add(this.staticRig);
    this.staticRig.add(buildHull());
    const metal = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.7, roughness: 0.35 });
    const blackMetal = new THREE.MeshStandardMaterial({ color: 0x1f2933, metalness: 0.4, roughness: 0.5 });
    const wire = new THREE.MeshStandardMaterial({ color: 0x8b95a1, metalness: 0.8, roughness: 0.3 });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, MAST_H, 12), metal);
    mast.position.set(0, DECK + MAST_H / 2, 0);
    this.staticRig.add(mast);
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const shroudTop = v(0.02, DECK + 8.85, 0);
    const spreader = DECK + 4.0;
    for (const s of [-1, 1]) {
      const tip = v(0.01, spreader, s * 1.33);
      const chain = v(-0.58, sheerAt(-0.58) + 0.02, s * 0.75);
      const sp = rod(0.022, metal);
      placeRod(sp, v(0, spreader, 0), tip);
      this.staticRig.add(sp);
      for (const [a, b] of [
        [shroudTop, tip],
        [tip, chain],
        [v(0, DECK + 5.1, 0), v(0.15, sheerAt(0.15) + 0.02, s * 1.1)],
      ] as const) {
        const r = rod(0.0055, wire);
        placeRod(r, a, b);
        this.staticRig.add(r);
      }
      // jib + kite winches
      const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.16, 16), blackMetal);
      winch.position.set(WINCH.x, WINCH.y - 0.06, s * WINCH.z);
      this.staticRig.add(winch);
      // lifelines
      const ll = rod(0.004, wire);
      placeRod(ll, v(1.9, sheerAt(1.9) + 0.62, s * halfBreadth(1.9)), v(-5.3, sheerAt(-5.3) + 0.62, s * halfBreadth(-5.3)));
      this.staticRig.add(ll);
      for (const x of [1.2, -1.2, -3.4, -5.3]) {
        const st = rod(0.012, metal);
        placeRod(st, v(x, sheerAt(x), s * halfBreadth(x) * 0.97), v(x, sheerAt(x) + 0.62, s * halfBreadth(x)));
        this.staticRig.add(st);
      }
    }
    const backstay = rod(0.005, wire);
    placeRod(backstay, v(-0.02, DECK + MAST_H, 0), v(-5.35, sheerAt(-5.35) + 0.05, 0));
    this.staticRig.add(backstay);
    const pulpit = rod(0.012, metal);
    placeRod(pulpit, v(2.25, sheerAt(2.25) + 0.6, 0), v(2.45, sheerAt(2.45), 0));
    this.staticRig.add(pulpit);

    this.forestay = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 14 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0x64748b }));
    this.forestay.frustumCulled = false;
    this.boat.add(this.forestay);

    // boom
    this.boomPivot.position.set(-0.08, DECK + BOOM_H, 0);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.07), metal);
    boom.position.x = -1.9;
    this.boomPivot.add(boom);
    this.boat.add(this.boomPivot);
    this.vang = rod(0.012, blackMetal);
    this.boat.add(this.vang);
    const trav = rod(0.02, blackMetal);
    placeRod(trav, v(-3.55, 0.45, -0.74), v(-3.55, 0.45, 0.74));
    trav.rotation.z = 0;
    this.boat.add(trav);
    this.travCar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.1), blackMetal);
    // jib tracks on the side decks (one per side), between the cabin top and the shrouds
    for (const sd of [-1, 1]) {
      const tr = rod(0.012, blackMetal);
      placeRod(tr, v(-0.4, sheerAt(-0.4) + 0.015, sd * JIB_TRACK_Z), v(-1.15, sheerAt(-1.15) + 0.015, sd * JIB_TRACK_Z));
      this.boat.add(tr);
      this.jibTracks.push(tr);
      const car = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.07), new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.4, metalness: 0.3 }));
      this.jibCars.push(car);
      this.boat.add(car);
    }
    this.boat.add(this.travCar);
    const ropeMat = () => new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
    this.mainSheet = rod(0.008, ropeMat());
    this.jibSheet = rod(0.009, ropeMat());
    this.jibSheet2 = rod(0.009, this.jibSheet.material as THREE.Material);
    this.jibLazy = rod(0.007, new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 }));
    this.kiteSheet = rod(0.008, new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.8 }));
    this.kiteSheet2 = rod(0.008, this.kiteSheet.material as THREE.Material);
    this.sprit = rod(0.035, blackMetal);
    placeRod(this.sprit, v(2.2, 0.78, 0), SPRIT_END);
    for (const m of [this.mainSheet, this.jibSheet, this.jibSheet2, this.jibLazy, this.kiteSheet, this.kiteSheet2, this.sprit]) this.boat.add(m);

    // tiller (rotates with the rudder)
    this.tiller.position.set(-5.45, 0.66, 0);
    const tbar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.6 }));
    tbar.position.x = 0.65;
    this.tiller.add(tbar);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
    blade.position.set(-0.05, -0.85, 0);
    this.tiller.add(blade);
    this.boat.add(this.tiller);

    // windex
    const vane = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 8), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
    vane.rotation.z = -Math.PI / 2;
    vane.position.x = 0.15;
    this.windex.add(vane);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.01), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    tail.position.x = -0.15;
    this.windex.add(tail);
    this.windex.position.set(0, DECK + MAST_H + 0.08, 0);
    this.boat.add(this.windex);

    // crew: helm, main trimmer, bow
    for (const jacket of [0x1e3a5f, 0x7f1d1d, 0x14532d]) {
      const c = crewFigure(jacket);
      this.crew.push(c);
      this.boat.add(c);
    }

    // ---- sails
    const jt = sailTextures({ base: '#f1f4f7', stripes: [0.22, 0.5, 0.78], seams: 9, windows: [0.22, 0.5, 0.78].map((h) => ({ h, t: jibT0(h) + 0.13 / jibChord(h), rT: Math.min(0.32, 0.24 / jibChord(h)), rH: 0.036 })) });
    this.jibMat = new THREE.MeshStandardMaterial({ map: jt.map, alphaMap: jt.alpha, transparent: true, opacity: 0.94, side: THREE.DoubleSide, depthWrite: false, roughness: 0.75 });
    this.jib = new SailMesh(16, 22, this.jibMat);
    const mt = sailTextures({ base: '#eef2f6', stripes: [0.25, 0.5, 0.75], seams: 10 });
    this.main = new SailMesh(18, 20, new THREE.MeshStandardMaterial({ map: mt.map, alphaMap: mt.alpha, transparent: true, opacity: 0.93, side: THREE.DoubleSide, depthWrite: false, roughness: 0.75 }));
    const kt = sailTextures({ base: '#0e7490', stripes: [0.3, 0.6], seams: 12, panels: ['#0f172a', '#22d3ee', '#0e7490', '#f8fafc', '#0e7490', '#22d3ee'] });
    this.kite = new SailMesh(18, 24, new THREE.MeshStandardMaterial({ map: kt.map, alphaMap: kt.alpha, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6 }));
    this.jib.mesh.name = 'jib';
    this.main.mesh.name = 'main';
    this.kite.mesh.name = 'kite';
    this.boat.add(this.jib.mesh, this.main.mesh, this.kite.mesh);

    // ---- telltales: red = port face, green = starboard face (the real-world convention)
    for (const h of [0.22, 0.5, 0.78]) {
      const t = { h, port: new Ribbon(0xef4444, 0.42, 0.045), stbd: new Ribbon(0x22c55e, 0.42, 0.045) };
      this.jibTT.push(t);
      this.boat.add(t.port.mesh, t.stbd.mesh);
    }
    for (const h of [0.45, 0.7]) {
      const t = { h, port: new Ribbon(0xef4444, 0.45, 0.04), stbd: new Ribbon(0x22c55e, 0.45, 0.04) };
      this.kiteTT.push(t);
      this.boat.add(t.port.mesh, t.stbd.mesh);
    }
    for (const h of [0.3, 0.55, 0.8]) {
      const t = { h, r: new Ribbon(0xdc2626, 0.36, 0.036) };
      this.leechTT.push(t);
      this.boat.add(t.r.mesh);
    }

    // ---- force arrows
    for (const k of ['jib', 'main', 'kite']) {
      const mk = (c: number) => {
        const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, c, 0.3, 0.18);
        // transparent so they sort after the (transparent) sails and stay visible through them
        for (const m of [a.line.material as THREE.Material, a.cone.material as THREE.Material]) {
          m.depthTest = false;
          m.transparent = true;
        }
        a.renderOrder = 10;
        a.line.renderOrder = 10;
        a.cone.renderOrder = 10;
        this.boat.add(a);
        return a;
      };
      this.arrows[k] = { drive: mk(0x34d399), side: mk(0xf59e0b), total: mk(0x22d3ee) };
    }
    {
      const mk = (c: number, o: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthTest: false }));
        m.renderOrder = 13;
        this.gaugeObj.add(m);
        return m;
      };
      this.gaugeBar = mk(0x0b1a2e, 0.65);
      this.gaugeFill = mk(0x22d3ee, 0.9);
      // optimal = a green diamond (the spot to aim for); your pull = a flat white tick
      this.gaugeOpt = mk(0x34d399, 1);
      this.gaugeOpt.geometry.dispose();
      this.gaugeOpt.geometry = new THREE.OctahedronGeometry(0.5);
      this.gaugeTgt = mk(0xffffff, 1);
      this.gaugeObj.visible = false;
      this.boat.add(this.gaugeObj);
    }
    for (const id of Object.keys(HANDLE_DEFS) as HandleId[]) {
      const d = HANDLE_DEFS[id];
      const vis = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.9, depthTest: false }));
      vis.renderOrder = 12;
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
      vis.add(hit);
      this.boat.add(vis);
      this.handles.push({ id, vis, hit, pos: new THREE.Vector3(), axis: new THREE.Vector3(1, 0, 0), active: false });
    }
    this.attachModel();
  }

  /** handle under the normalised device coordinates, or null */
  pickHandle(ndcX: number, ndcY: number): HandleId | null {
    const act = this.handles.filter((h) => h.active);
    if (!act.length) return null;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObjects(act.map((h) => h.hit), false);
    if (!hits.length) return null;
    return act.find((h) => h.hit === hits[0].object)?.id ?? null;
  }

  /** control change (0..1 units) for a pointer move of (dx, dy) px while dragging a handle */
  handleDelta(id: HandleId, dx: number, dy: number, w: number, h: number) {
    const hd = this.handles.find((x) => x.id === id);
    if (!hd) return 0;
    const p = this.boat.localToWorld(hd.pos.clone()).project(this.camera);
    const q = this.boat.localToWorld(hd.pos.clone().addScaledVector(hd.axis, 0.1)).project(this.camera);
    const ax = ((q.x - p.x) * w) / 2 / 0.1; // px per metre along the axis
    const ay = (-(q.y - p.y) * h) / 2 / 0.1;
    const a2 = ax * ax + ay * ay;
    // axis pointing at the camera: fall back to a vertical drag
    const metres = a2 < 400 ? -dy / 220 : (dx * ax + dy * ay) / a2;
    return metres / HANDLE_DEFS[id].L;
  }

  /** where a handle is on screen, px */
  handleScreen(id: HandleId, w: number, h: number) {
    const hd = this.handles.find((x) => x.id === id);
    if (!hd || !hd.active) return null;
    const p = this.boat.localToWorld(hd.pos.clone()).project(this.camera);
    if (p.z > 1) return null;
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
  }

  private attachModel() {
    loadJ80()
      .then((g) => {
        if (this.disposed) return;
        this.boat.add(g);
        this.staticRig.visible = false;
        this.fitTrackDeck(g);
      })
      .catch((e) => console.warn('[trimmaster3d] J/80 model not loaded, keeping the simple boat', e));
    KiteMold.load()
      .then((m) => {
        if (this.disposed) return;
        this.kiteMold = m;
        m.mesh.visible = false;
        this.boat.add(m.mesh);
      })
      .catch((e) => console.warn('[trimmaster3d] kite mold not loaded, keeping the procedural kite', e));
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    this.fx.dispose();
    const shared = new Set<THREE.Object3D>();
    this.scene.traverse((o) => {
      if (o.userData.shared) o.traverse((c) => shared.add(c));
    });
    this.scene.traverse((o) => {
      if (shared.has(o)) return;
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
    this.renderer.dispose();
  }

  private waveHeight(x: number, z: number, t: number) {
    let y = 0;
    for (const w of this.waves) {
      const k = (2 * Math.PI) / Math.max(0.5, w.L);
      const c = Math.sqrt(9.81 / k);
      const len = Math.hypot(w.dx, w.dy) || 1;
      y += w.a * Math.sin(k * ((w.dx / len) * x + (w.dy / len) * z) - c * k * t);
    }
    return y;
  }

  render(s: Snapshot, dt: number) {
    dt = Math.min(0.1, Math.max(0, dt));
    this.time += dt;
    const t = this.time;
    const f = s.f;
    const sgn = Math.sign(s.twa) || 1;
    const Ls = -sgn; // leeward z sign
    const W = sgn; // windward z sign
    const kiteUp = s.plan.headsail === 'gennaker';

    // ---- sea (rebuilt only on a real change of wind, or the swell would jump)
    if (!this.waves.length || Math.abs(s.tws - this.waveTws) > 2.5 || Math.abs(((s.twd - this.waveTwd + 540) % 360) - 180) > 12 || this.waveKey === '') {
      this.waveKey = 'ok';
      this.waveTws = s.tws;
      this.waveTwd = s.twd;
      this.waves = buildWaves({ twsKn: s.tws, twdDeg: s.twd, fetchM: 3000, n: 8, scale: this.seaScale }).waves;
      this.fx.setWaves(this.waves);
    }

    // ---- boat pose
    if (this.first) {
      this.heelS = s.heel;
      this.headingS = s.heading;
      this.wSide = W;
      this.vPrev = s.v;
      this.first = false;
    }
    this.heelS += (s.heel - this.heelS) * Math.min(1, dt * 7);
    let dh = s.heading - this.headingS;
    dh = ((dh + 540) % 360) - 180;
    this.headingS += dh * Math.min(1, dt * 12);
    const hr = this.headingS * DEG;
    const fwd = new THREE.Vector3(Math.sin(hr), 0, -Math.cos(hr));
    const bx = s.x;
    const bz = -s.y;
    const hBow = this.waveHeight(bx + fwd.x * 2.3, bz + fwd.z * 2.3, t);
    const hStern = this.waveHeight(bx - fwd.x * 5.2, bz - fwd.z * 5.2, t);
    const hP = this.waveHeight(bx - fwd.z * 1.1, bz + fwd.x * 1.1, t);
    const hS = this.waveHeight(bx + fwd.z * 1.1, bz - fwd.x * 1.1, t);
    // a 1.6 t keelboat does not follow every ripple: its inertia filters the short chop, so the
    // wave-following motion is low-passed (time constant ~0.5 s) and kept gentle
    const kf = Math.min(1, dt * 2);
    this.waveMo.heave += (0.5 * (hBow + hStern + hP + hS) / 4 - this.waveMo.heave) * kf;
    this.waveMo.pitch += (Math.atan2(hBow - hStern, 7.5) * 0.35 - this.waveMo.pitch) * kf;
    this.waveMo.roll += (Math.atan2(hS - hP, 2.2) * 0.12 - this.waveMo.roll) * kf;
    const heave = this.waveMo.heave;
    const wavePitch = this.waveMo.pitch;
    const waveRoll = this.waveMo.roll;
    const roll = Ls * this.heelS * DEG + waveRoll;
    const pitch = (s.pitch ?? 0) * DEG + wavePitch;
    // the hull floats 25 cm higher than the model was drawn: J/80 freeboard ~0.9 m, deck dry to ~30° heel
    this.boat.position.set(bx, heave + 0.25, bz);
    this.boat.rotation.set(roll, Math.PI / 2 - hr, pitch, 'YXZ');
    this.boat.updateMatrixWorld(true);

    // boat-frame accelerations for the inertial head
    const vms = s.v * KN;
    const surgeA = (vms - this.vPrev * KN) / Math.max(dt, 1e-3);
    this.vPrev = s.v;
    this.surgeAcc += (surgeA - this.surgeAcc) * Math.min(1, dt * 6);
    // roll acceleration from the sim's own heel rate (smooth, physical), filtered
    const rollRateNow = Ls * (s.heelRate ?? 0) * DEG;
    const rawRollAcc = (rollRateNow - this.rollRate) / Math.max(dt, 1e-3);
    this.rollRate = rollRateNow;
    this.rollAccF += (rawRollAcc - this.rollAccF) * Math.min(1, dt * 6);
    const rollAcc = this.rollAccF;
    const hvr = (heave - this.heavePrev) / Math.max(dt, 1e-3);
    this.heavePrev = heave;
    const hvrF = this.heaveRate + (hvr - this.heaveRate) * Math.min(1, dt * 8);
    const rawHeaveAcc = (hvrF - this.heaveRate) / Math.max(dt, 1e-3);
    this.heaveRate = hvrF;
    this.heaveAccF += (rawHeaveAcc - this.heaveAccF) * Math.min(1, dt * 6);
    const heaveAcc = this.heaveAccF;

    // trimmer and crew move across in tacks/gybes
    this.wSide += (W - this.wSide) * Math.min(1, dt * 1.3);
    const ws = this.wSide;
    const hike = s.controls.hike;
    const crewPos: [number, number][] = [
      [-4.6, 1.05],
      [-3.6, 1.05],
      [0.5, 1.0],
    ];
    this.crew.forEach((c, i) => {
      const [x, zr] = crewPos[i];
      // hike 0 = to leeward, 0.25 = in, 1 = full hike (same mapping as the physics)
      const zSide = hike < 0.25 ? -0.75 + (hike / 0.25) * (zr - 0.35 + 0.75) : zr - 0.35 + ((hike - 0.25) / 0.75) * (0.35 + 0.12);
      c.position.set(x + s.crewFore * 0.35, sheerAt(x) - 0.02, ws * zSide);
      c.rotation.set(ws * (hike > 0.25 ? 0.25 + 0.65 * (hike - 0.25) / 0.75 : -0.15), 0, 0);
    });

    // ---- sails
    const sh = f.shapes;
    const jibSide = s.plan.jibBacked ? W : Ls;
    const released = s.plan.jibReleased;
    const jHead = new THREE.Vector3().copy(TACK).lerp(FORESTAY_TOP, 0.93);
    const sag = sh.forestaySag;
    const jibSecs = f.jib.sections;
    const jibState: SailState = {
      visible: !kiteUp,
      side: jibSide,
      draft: sh.jib.draft,
      // a SHEET, not an inhauler: easing lets the clew ride up and forward along the sheeting line
      // (the leech opens), trimming pulls it down to the car. Car aft: the pull is along the foot,
      // so an eased clew climbs even more.
      footRise: released ? 0.9 : 0.26 + (1 - s.controls.jibSheet) * (0.55 + 0.45 * s.controls.jibLead),
      luff: (h, o) => {
        o.copy(TACK).lerp(jHead, h);
        const b = Math.sin(Math.PI * h);
        o.x -= sag * 0.1 * b;
        o.z += jibSide * sag * 0.17 * b;
        return o;
      },
      chord: jibChord,
      angle: (h) => (released ? 3 + 5 * h : sh.jib.angle + sh.jib.twist * h),
      // a loose-footed jib's foot is tied at tack and clew: its camber dies out towards the foot
      // (and more so with the car aft, the sheet pulling along the foot)
      depth: (h) => (released ? 0.035 : depthAt(h, sh.jib.depthBottom, sh.jib.depth, sh.jib.depthTop) * (h < 0.22 ? 1 - (0.32 + 0.18 * s.controls.jibLead) * (1 - h / 0.22) ** 1.5 : 1)),
      wobble: (h, tt) => {
        const c = jibChord(h);
        const sec = interpSection(jibSecs, h);
        const flog = released ? 1 : sec.flow === 'flog' ? 1 : 0;
        let w = flog * c * 0.07 * Math.sin(t * 15 - tt * 9 + h * 5) * Math.pow(tt, 0.8);
        const bubble = Math.min(1, Math.max(0, -sec.a / 5)) * (1 - flog);
        // luff folds: short horizontal wrinkles just behind the luff, between the hanks
        if (sh.jibLuffFold > 0.02 && tt < 0.16) w += sh.jibLuffFold * 0.035 * Math.sin(h * Math.PI * 2 * 13) * Math.sin((Math.PI * tt) / 0.16) * (1 - flog);
        // luffing: the bubble sits just AFT of the luff - the luff itself stays hanked on the forestay
        const bump = tt < 0.38 ? Math.sin((Math.PI * tt) / 0.38) ** 1.3 : 0;
        w -= c * 0.095 * bubble * bump * (0.75 + 0.25 * Math.sin(t * 9 + h * 3));
        return w;
      },
    };
    this.jib.update(jibState);
    {
      // the jib's leech is THE reading for the sheet: aim at the middle of the leech, pulled
      // towards the luff so the telltales stay in frame too
      const leech = sailPoint(jibState, 0.42, 0.97, new THREE.Vector3());
      const luff = sailPoint(jibState, 0.42, 0.12, new THREE.Vector3());
      this.jibAim.lerp(leech.lerp(luff, 0.35), 0.15);
    }
    this.jibMat.opacity = this.opts.xray ? 0.45 : 0.94;

    const bend = Math.min(1, 0.85 * s.controls.backstay + 0.15 * s.controls.vang * s.controls.mainSheet);
    const mainSecs = f.main.sections;
    const backwind = kiteUp ? 0.6 * (s.kiteMainBackwind ?? 0) : sh.backwind;
    const mainChord = (h: number) => 3.7 * (1 - h) + 0.22 * h + 0.45 * Math.sin(Math.PI * h) * (1 - h);
    const lift = (sh.boomLift ?? 0) * DEG;
    const mainState: SailState = {
      visible: true,
      side: Ls,
      draft: sh.main.draft,
      // the foot follows the boom when it lifts (no vang): the clew rises
      footRise: mainChord(0) * Math.tan(lift),
      luff: (h, o) => o.set(-0.08 + bend * 0.14 * Math.sin(Math.PI * h * 0.9), DECK + BOOM_H + h * (MAST_H - BOOM_H - 0.25), 0),
      chord: mainChord,
      angle: (h) => sh.main.angle + sh.main.twist * h,
      depth: (h) => depthAt(h, sh.main.depthBottom, sh.main.depth, sh.main.depthTop),
      wobble: (h, tt) => {
        const c = mainChord(h);
        const sec = interpSection(mainSecs, h);
        const flog = sec.flow === 'flog' ? 1 : 0;
        let w = flog * c * 0.05 * Math.sin(t * 12 - tt * 8 + h * 4) * Math.pow(tt, 1.2);
        const bub = Math.min(1, backwind * 1.2 + Math.max(0, -sec.a / 6) * (1 - flog));
        // cunningham off: fine wrinkles from the luff (the luff tension the wind wants is not there)
        if (sh.mainLuffFold > 0.02 && tt < 0.12) w += sh.mainLuffFold * 0.03 * Math.sin(h * Math.PI * 2 * 17) * Math.sin((Math.PI * tt) / 0.12) * (1 - flog);
        // backwinded: a bubble just AFT of the luff, pushed in and fluttering a little - the luff
        // itself never leaves the mast (it is held in the track), so the bulge is zero at tt = 0
        const bump = tt < 0.32 ? Math.sin((Math.PI * tt) / 0.32) ** 1.3 : 0;
        w -= c * 0.075 * bub * bump * (1 - 0.5 * h) * (0.82 + 0.18 * Math.sin(t * 9 + h * 5));
        return w;
      },
    };
    this.main.update(mainState);
    // where the main camera looks: the middle of the leech, a little towards the boom
    sailPoint(mainState, 0.5, 0.85, this.mainLeechAim).lerp(sailPoint(mainState, 0.05, 0.9, new THREE.Vector3()), 0.45);
    this.boomPivot.rotation.set(0, Ls * sh.main.angle * DEG, -lift, 'YXZ'); // boom points along -x: -z rotation lifts its end

    const g = sh.gennaker;
    const gs = f.gennaker?.sections;
    const collapsed = s.plan.gennakerCollapsed;
    const rot = Math.min(1, Math.max(0, (g.angle - 50) / 50));
    const kHead = new THREE.Vector3(0.2, DECK + MAST_H - 0.3, 0);
    const kChord = (h: number) => 5.2 * Math.pow(1 - h, 0.8) + 0.3;
    const kiteState: SailState = {
      visible: kiteUp,
      side: Ls,
      draft: 0.45,
      footRise: 0.6,
      luff: (h, o) => {
        o.copy(SPRIT_END).lerp(kHead, h);
        const b = Math.sin(Math.PI * h) * (collapsed ? 0.5 : 1);
        o.x += (0.7 + 0.6 * rot) * b;
        o.z += Ls * (0.8 - 1.8 * rot) * b;
        return o;
      },
      chord: kChord,
      angle: (h) => Math.min(78, g.angle - 30 * rot) + g.twist * 0.5 * h,
      depth: (h) => (collapsed ? 0.05 : h > 0.5 ? 0.19 : 0.2),
      wobble: (h, tt) => {
        const c = kChord(h);
        const mid = gs ? interpSection(gs, h).a : 5;
        const curl = Math.min(1, Math.max(0, (2 - mid) / 6));
        let w = -c * 0.12 * curl * Math.max(0, 1 - tt / 0.22) ** 2 * (0.85 + 0.15 * Math.sin(t * 7 + h * 2));
        if (collapsed) w += c * 0.14 * Math.sin(t * 6 + tt * 5 + h * 3) * tt;
        return w;
      },
    };
    if (this.kiteMold) {
      const midA = gs ? interpSection(gs, 0.5).a : 5;
      this.kiteMold.mesh.visible = kiteUp;
      if (kiteUp)
        this.kiteMold.deform({
          tack: SPRIT_END,
          head: kHead,
          side: Ls,
          angle: Math.min(78, g.angle - 30 * rot) + g.twist * 0.25,
          curl: Math.min(1.5, s.kiteCurl ?? Math.max(0, (2 - midA) / 6)),
          leechFlap: s.kiteLeechFlap ?? 0,
          luffFlap: s.kiteLuffFlap ?? 0,
          swing: s.kiteSwing ?? 0,
          collapse: collapsed ? 1 : 0,
          time: t,
        });
      const mold = this.kiteMold;
      kiteState.point = (h, tt, o) => mold.sample(h, tt, o);
      this.kite.mesh.visible = false;
    } else this.kite.update(kiteState);
    this.sprit.visible = kiteUp;

    // forestay follows the jib luff sag
    {
      const p = this.forestay.geometry.getAttribute('position') as THREE.BufferAttribute;
      const o = new THREE.Vector3();
      for (let i = 0; i < 14; i++) {
        const h = i / 13;
        o.copy(FORESTAY_BASE).lerp(FORESTAY_TOP, h);
        const b = Math.sin(Math.PI * Math.min(1, h / 0.93));
        if (h <= 0.93) {
          o.x -= sag * 0.1 * b;
          o.z += jibSide * sag * 0.17 * b;
        }
        p.setXYZ(i, o.x, o.y, o.z);
      }
      p.needsUpdate = true;
    }

    // ---- sheets & hardware
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const loadFrac = Math.min(1, f.jibSheetLoad / (kiteUp ? 1300 : 2300));
    const ropeCol = new THREE.Color(0xf1f5f9).lerp(new THREE.Color(0xf97316), loadFrac);
    (this.jibSheet.material as THREE.MeshStandardMaterial).color.copy(ropeCol);
    (this.kiteSheet.material as THREE.MeshStandardMaterial).color.copy(new THREE.Color(0xfbbf24).lerp(new THREE.Color(0xef4444), loadFrac));
    const clew = sailPoint(jibState, 0, 1, new THREE.Vector3());
    // car on the inboard track, aft of the clew on the sheeting line
    const carX = -0.5 - s.controls.jibLead * 0.55;
    const deckY = this.deckUnderTrack(carX);
    const lead = V(carX, deckY + 0.06, jibSide * JIB_TRACK_Z);
    for (const [i, sd] of [-1, 1].entries()) this.jibCars[i].position.set(carX, deckY + 0.035, sd * JIB_TRACK_Z);
    const winchJ = V(WINCH.x, WINCH.y + 0.08, jibSide * WINCH.z);
    this.jibSheet.visible = this.jibSheet2.visible = this.jibLazy.visible = !kiteUp;
    placeRod(this.jibSheet, clew, lead);
    placeRod(this.jibSheet2, lead, winchJ);
    placeRod(this.jibLazy, clew, V(WINCH.x, WINCH.y + 0.08, -jibSide * WINCH.z));
    this.kiteSheet.visible = this.kiteSheet2.visible = kiteUp;
    if (kiteUp) {
      const kclew = sailPoint(kiteState, 0, 1, new THREE.Vector3());
      const block = V(-5.2, sheerAt(-5.2) + 0.05, Ls * 1.0);
      placeRod(this.kiteSheet, kclew, block);
      placeRod(this.kiteSheet2, block, V(WINCH.x, WINCH.y + 0.08, Ls * WINCH.z));
    }
    const carZ = Ls * (0.5 - s.controls.traveller) * 1.5;
    const car = V(-3.55, 0.48, Math.max(-0.7, Math.min(0.7, carZ)));
    this.travCar.position.copy(car);
    const ba = sh.main.angle * DEG;
    const boomAt = (d: number) => V(-0.08 - Math.cos(ba) * d * Math.cos(lift), DECK + BOOM_H + d * Math.sin(lift), Ls * Math.sin(ba) * d * Math.cos(lift));
    placeRod(this.mainSheet, boomAt(3.45), car);
    placeRod(this.vang, boomAt(0.7), V(0, DECK + 0.05, 0));
    this.tiller.rotation.y = -W * Math.max(-25, Math.min(25, s.rudder)) * DEG * 0.8;
    this.windex.rotation.y = -W * s.awa * DEG;

    // ---- draggable handles
    {
      const on = this.opts.handles;
      const put = (id: HandleId, active: boolean, pos: THREE.Vector3, axis: THREE.Vector3) => {
        const h = this.handles.find((x) => x.id === id)!;
        h.active = on && active && (!this.opts.handleKeys || this.opts.handleKeys.includes(HANDLE_DEFS[id].key));
        h.vis.visible = h.active;
        if (!h.active) return;
        h.pos.copy(pos);
        h.axis.copy(axis).normalize();
        h.vis.position.copy(pos);
        const hot = this.hoverHandle === id;
        h.vis.scale.setScalar(hot ? 1.7 : 1 + 0.12 * Math.sin(t * 3));
        const mat = h.vis.material as THREE.MeshBasicMaterial;
        mat.opacity = hot ? 1 : 0.75;
        // game mode: a control you have caught is orange; one the auto crew has is its usual colour
        mat.color.setHex(s.autoTrim && (s.manualKeys ?? []).includes(HANDLE_DEFS[id].key) ? 0xf97316 : HANDLE_DEFS[id].color);
      };
      const jibOn = !kiteUp && !released;
      put('jibCar', !kiteUp, this.jibCars[jibSide < 0 ? 0 : 1].position.clone().add(V(0, 0.06, 0)), V(-1, 0, 0));
      put('jibClew', jibOn, clew, new THREE.Vector3().subVectors(lead, clew));
      // pulling the handle down trims (like cranking and tailing), pushing it up eases
      put('winch', true, V(WINCH.x, WINCH.y + 0.22, (kiteUp ? Ls : jibSide) * WINCH.z), V(0, -1, 0));
      put('jibHead', !kiteUp, sailPoint(jibState, 1, 0, new THREE.Vector3()), new THREE.Vector3().subVectors(FORESTAY_TOP, TACK));
      // at the foot of the forestay, just above the stem: pull it down the stay to tension it
      const fbot = new THREE.Vector3().copy(FORESTAY_BASE).lerp(FORESTAY_TOP, 0.05);
      put('forestay', true, fbot, new THREE.Vector3().subVectors(FORESTAY_BASE, FORESTAY_TOP));
      const bsTop = V(-0.02, DECK + MAST_H, 0);
      const bsBot = V(-5.35, sheerAt(-5.35) + 0.05, 0);
      put('backstay', true, bsBot.clone().lerp(bsTop, 0.12), new THREE.Vector3().subVectors(bsBot, bsTop));
      put('mainsheet', true, boomAt(3.45), V(-Math.sin(ba), 0, -Ls * Math.cos(ba)));
      put('traveller', true, car.clone().add(V(0, 0.08, 0)), V(0, 0, -Ls));
      put('vang', true, boomAt(0.7).lerp(V(0, DECK + 0.05, 0), 0.5), V(0.5, -1, 0));
      put('outhaul', true, sailPoint(mainState, 0, 1, new THREE.Vector3()).add(V(0, 0.16, 0)), V(-Math.cos(ba), 0, Ls * Math.sin(ba)));
      put('cunningham', true, sailPoint(mainState, 0.03, 0, new THREE.Vector3()).add(V(0.05, 0, 0)), V(0, -1, 0));
      if (kiteUp) {
        const kc = sailPoint(kiteState, 0, 1, new THREE.Vector3());
        put('kiteClew', true, kc, new THREE.Vector3().subVectors(V(-5.2, sheerAt(-5.2) + 0.05, Ls * 1.0), kc));
      } else put('kiteClew', false, V(0, 0, 0), V(1, 0, 0));
      // constant on-screen size: a handle next to the eye must not fill the view
      const camLocal = this.boat.worldToLocal(this.camera.position.clone());
      for (const hd of this.handles) {
        if (!hd.active) continue;
        const dist = camLocal.distanceTo(hd.pos);
        hd.vis.scale.multiplyScalar(Math.min(4, Math.max(0.25, dist * 0.33)));
      }
      // the 3D gauge: a slim bar along the drag axis spanning the control's 0..1 range, placed so
      // the handle sits at the current value. cyan = current, white = where you pull, green = optimal
      const gz = this.gauge;
      const hd = gz ? this.handles.find((x) => x.id === gz.id && x.active) : undefined;
      this.gaugeObj.visible = !!hd;
      if (gz && hd) {
        const cur = s.controls[HANDLE_DEFS[gz.id].key];
        const dist = camLocal.distanceTo(hd.pos);
        const Lg = Math.min(2.4, Math.max(0.3, dist * 0.2));
        const w = Lg * 0.035;
        const start = hd.pos.clone().addScaledVector(hd.axis, -Lg * cur);
        this.gaugeObj.position.copy(start);
        this.gaugeObj.quaternion.setFromUnitVectors(V(1, 0, 0), hd.axis);
        this.gaugeBar.scale.set(Lg, w, w);
        this.gaugeBar.position.set(Lg / 2, 0, 0);
        this.gaugeFill.scale.set(Math.max(1e-3, Lg * cur), w * 1.3, w * 1.3);
        this.gaugeFill.position.set((Lg * cur) / 2, 0, 0);
        this.gaugeTgt.scale.set(w * 0.6, w * 4.5, w * 1.2);
        this.gaugeTgt.position.set(Lg * gz.target, 0, 0);
        this.gaugeOpt.scale.set(w * 3.2, w * 3.2, w * 3.2);
        this.gaugeOpt.position.set(Lg * gz.opt, 0, 0);
      }
    }

    // ---- telltales
    const nrm = new THREE.Vector3();
    const P = new THREE.Vector3();
    const Pt = new THREE.Vector3();
    const Ph = new THREE.Vector3();
    const frameAt = (st: SailState, h: number, tt: number) => {
      sailPoint(st, h, tt, P);
      sailPoint(st, h, Math.min(1, tt + 0.02), Pt);
      sailPoint(st, Math.min(1, h + 0.02), tt, Ph);
      const along = new THREE.Vector3().subVectors(Pt, P).normalize();
      const vert = new THREE.Vector3().subVectors(Ph, P);
      nrm.crossVectors(along, vert).normalize();
      if (nrm.z * st.side < 0) nrm.negate(); // nrm points to leeward of this sail
      return { p: P.clone(), along, nLee: nrm.clone() };
    };
    const driveTT = (ribbon: Ribbon, st: SailState, h: number, tt: number, faceSign: number, d: RibbonDrive) => {
      const fr = frameAt(st, h, tt);
      ribbon.mesh.visible = st.visible;
      if (!st.visible) return;
      // faceSign: +1 = starboard face, -1 = port face
      const o = fr.nLee.clone();
      if (Math.sign(o.z) !== faceSign) o.negate();
      const c = st.chord(h);
      ribbon.update(dt, t, d, fr.p.clone().addScaledVector(o, 0.012), fr.along, o, (_k, sLen, out3) => {
        sailPoint(st, h, Math.min(1, tt + sLen / c), out3).addScaledVector(o, 0.012);
      });
    };
    for (const tt of this.jibTT) {
      const sec = interpSection(jibSecs, tt.h);
      const td = telltaleDrive(sec, sh.jib.groove);
      const flog = released ? 1 : td.flog;
      const t0 = jibT0(tt.h);
      for (const face of [-1, 1]) {
        const lee = face === jibSide;
        const d: RibbonDrive = { lift: lee ? 0 : td.lift, stall: lee ? td.stall : 0, flog, curl: 0 };
        driveTT(face === -1 ? tt.port : tt.stbd, jibState, tt.h, t0, face, d);
      }
    }
    for (const tt of this.kiteTT) {
      const curlH = (s.kiteCurl ?? 0) * (0.6 + 0.6 * Math.sin(Math.PI * tt.h));
      const td = { lift: Math.min(1, Math.max(0, (curlH - 0.05) / 0.5)), stall: Math.min(1, s.kiteOver ?? 0), flog: 0.7 * (s.kiteLuffFlap ?? 0) };
      const c = kiteState.chord(tt.h);
      const t0 = Math.min(0.25, 0.5 / c);
      for (const face of [-1, 1]) {
        const lee = face === Ls;
        const d: RibbonDrive = { lift: lee ? 0 : td.lift, stall: lee ? td.stall : 0, flog: collapsed ? 1 : td.flog, curl: 0 };
        driveTT(face === -1 ? tt.port : tt.stbd, kiteState, tt.h, t0, face, d);
      }
    }
    this.leechTT.forEach((tt, i) => {
      // the same section and the same rule as the 2D panel: low / mid / top. Stalled -> the
      // telltale curls away behind the leech; luffing or flogging -> it flaps.
      const sec = mainSecs[Math.min(mainSecs.length - 1, i)];
      const fr = frameAt(mainState, tt.h, 0.995);
      const stalled = sec.flow === 'stall' || sec.a > sh.main.groove + 2 ? 1 : Math.min(1, Math.max(0, (sec.a - sh.main.groove + 1) / 3)) * 0.5;
      const flapping = sec.flow === 'flog' || sec.flow === 'luff' ? 1 : 0;
      const d: RibbonDrive = { lift: 0, stall: 0, flog: flapping, curl: flapping ? 0 : stalled };
      const end = sailPoint(mainState, tt.h, 1, new THREE.Vector3());
      tt.r.update(dt, t, d, end, fr.along, fr.nLee, undefined);
    });

    // ---- force arrows (each sail's aero force split into drive and heel)
    const SCALE = 1 / 260;
    const setArrow = (k: string, visible: boolean, st: SailState, drive: number, side: number) => {
      const a = this.arrows[k];
      const show = this.opts.forces && visible;
      a.drive.visible = a.side.visible = a.total.visible = show;
      if (!show) return;
      const ce = sailPoint(st, 0.36, 0.38, new THREE.Vector3());
      const dv = new THREE.Vector3(drive * SCALE, 0, 0);
      const sv = new THREE.Vector3(0, 0, Ls * side * SCALE);
      const tv = dv.clone().add(sv);
      const put = (arr: THREE.ArrowHelper, vec: THREE.Vector3) => {
        const L = vec.length();
        arr.position.copy(ce);
        if (L < 0.02) {
          arr.visible = false;
          return;
        }
        arr.setDirection(vec.clone().divideScalar(L));
        arr.setLength(Math.min(7, L), Math.min(0.35, L * 0.4), Math.min(0.2, L * 0.25));
      };
      put(a.drive, dv);
      put(a.side, sv);
      put(a.total, tv);
    };
    setArrow('jib', !kiteUp, jibState, f.jib.drive, f.jib.side);
    setArrow('main', true, mainState, f.main.drive, f.main.side);
    setArrow('kite', kiteUp, kiteState, f.gennaker?.drive ?? 0, f.gennaker?.side ?? 0);

    // ---- gust patches on the water
    this.updatePuffs(s, bx, bz, t);

    // ---- wake
    const sternW = this.boat.localToWorld(new THREE.Vector3(-5.4, 0, 0));
    this.fx.trail('rudder', sternW.x, sternW.z, t, s.v * 2.2);
    const bowW = this.boat.localToWorld(new THREE.Vector3(2.3, 0, 0));
    this.fx.setCutters([{ x: bowW.x, z: bowW.z, s: Math.min(0.9, s.v / 7), dx: fwd.x, dz: fwd.z, v: vms }]);

    // ---- camera
    this.placeCamera(s, dt, ws, Ls, kiteUp, { surge: this.surgeAcc, roll, rollAcc, heaveAcc });

    // sky follows the camera
    this.sky.position.copy(this.camera.position);
    this.sky.scale.setScalar(this.camera.far * 0.45);
    this.sky.updateMatrixWorld(true);
    this.fx.update(this.camera, t, undefined, new THREE.Vector3(bx, 0, bz));
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * PUFFS ON THE WATER, as in boat3d (lib/gusts.js): the wind the boat will meet at time t_k is,
   * NOW, upwind of where the boat will be then, at the distance it drifts in the meantime:
   *     X_k = P(t_k) + (direction the wind comes from) x U x (t_k - now),   U = 0.85 x true wind
   * The future wind comes from the simulator's exact forecast (snapshot.windAhead), the past from
   * a short history. A grid of ABSOLUTE times (every 1.5 s) keeps each puff's identity, so it
   * glides in continuously. Darker, rougher water = more wind; smoother, lighter = less.
   */
  private puffHist: { t: number; tws: number; x: number; z: number }[] = [];
  private puffRef = 0;
  private puffRefT = 0;
  private updatePuffs(s: Snapshot, bx: number, bz: number, _t: number) {
    const now = s.t;
    // history of the wind the boat actually met (for the puffs that have gone through)
    const last = this.puffHist[this.puffHist.length - 1];
    if (!last || now - last.t >= 0.5 || now < last.t) {
      if (last && now < last.t) this.puffHist.length = 0;
      this.puffHist.push({ t: now, tws: s.tws, x: bx, z: bz });
      while (this.puffHist.length && now - this.puffHist[0].t > 30) this.puffHist.shift();
    }
    // slow reference wind: a puff is measured against it
    // the reference follows slowly (~25 s), so a puff stands out against it instead of being absorbed
    const dtRef = Math.max(0, Math.min(1, now - this.puffRefT));
    this.puffRefT = now;
    this.puffRef = this.puffRef <= 0 ? s.tws : this.puffRef + (s.tws - this.puffRef) * Math.min(1, dtRef / 25);
    const ref = Math.max(2, this.puffRef);
    const U = 0.85 * ref * KN;
    const twd = s.twd * DEG;
    const from: [number, number] = [Math.sin(twd), -Math.cos(twd)]; // world x/z towards where the wind comes from
    const toward: [number, number] = [-from[0], -from[1]];
    const hr = s.heading * DEG;
    const vms = s.v * KN;
    const ahead = s.windAhead ?? [];
    const windAt = (tk: number) => {
      if (tk >= now) {
        if (!ahead.length) return s.tws;
        if (tk <= ahead[0].t) return s.tws + (ahead[0].tws - s.tws) * ((tk - now) / Math.max(1e-3, ahead[0].t - now));
        for (let i = 0; i < ahead.length - 1; i++) if (tk <= ahead[i + 1].t) return ahead[i].tws + (ahead[i + 1].tws - ahead[i].tws) * ((tk - ahead[i].t) / (ahead[i + 1].t - ahead[i].t));
        return ahead[ahead.length - 1].tws;
      }
      const h = this.puffHist;
      for (let i = h.length - 1; i > 0; i--) if (h[i - 1].t <= tk) return h[i - 1].tws + (h[i].tws - h[i - 1].tws) * ((tk - h[i - 1].t) / Math.max(1e-3, h[i].t - h[i - 1].t));
      return h.length ? h[0].tws : s.tws;
    };
    const posAt = (tk: number): [number, number] => {
      if (tk >= now) return [bx + Math.sin(hr) * vms * (tk - now), bz - Math.cos(hr) * vms * (tk - now)];
      const h = this.puffHist;
      for (let i = h.length - 1; i > 0; i--) if (h[i - 1].t <= tk) return [h[i - 1].x, h[i - 1].z];
      return h.length ? [h[0].x, h[0].z] : [bx, bz];
    };
    const STEP = 1.5;
    const AHEAD = 15;
    const PAST = 20;
    const puffs: { x: number; z: number; s: number }[] = [];
    for (let k = Math.floor((now - PAST) / STEP); k * STEP <= now + AHEAD; k++) {
      const tk = k * STEP;
      const d = tk - now;
      const [px, pz] = posAt(tk);
      const w = windAt(tk);
      const rel = (w - ref) / (0.11 * ref);
      const edge = Math.min(1, (AHEAD - d) / 4, (PAST + d) / 4);
      if (edge <= 0) continue;
      puffs.push({ x: px + from[0] * U * d, z: pz + from[1] * U * d, s: Math.max(-1.2, Math.min(1.2, rel)) * edge });
    }
    // a puff is a band across the wind (wide) and short along it
    this.fx.setGusts(puffs.slice(-48), toward, U, Math.max(8, U * STEP * 0.85));
    this.fx.uniforms.uGustRc.value = 75;
  }

  private deckUnderTrack(x: number) {
    return this.trackDeck.ok ? this.trackDeck.a + this.trackDeck.b * x : sheerAt(x);
  }

  /** find the J/80 model's side-deck height under the jib tracks, so the tracks and cars sit on it */
  private fitTrackDeck(model: THREE.Object3D) {
    this.boat.updateMatrixWorld(true);
    const rc = new THREE.Raycaster();
    const ys: [number, number][] = [];
    for (const x of [-0.35, -1.2]) {
      const hs: number[] = [];
      for (const sd of [-1, 1]) {
        const o = this.boat.localToWorld(new THREE.Vector3(x, DECK + 2, sd * JIB_TRACK_Z));
        const down = this.boat.localToWorld(new THREE.Vector3(x, DECK - 2, sd * JIB_TRACK_Z)).sub(o).normalize();
        rc.set(o, down);
        const hit = rc.intersectObject(model, true)[0];
        if (hit) hs.push(this.boat.worldToLocal(hit.point.clone()).y);
      }
      if (hs.length) ys.push([x, hs.reduce((a, b) => a + b, 0) / hs.length]);
    }
    if (ys.length < 2) return;
    const [[x0, y0], [x1, y1]] = ys;
    const b = (y1 - y0) / (x1 - x0);
    this.trackDeck = { a: y0 - b * x0, b, ok: true };
    this.jibTracks.forEach((tr, i) => {
      const sd = i === 0 ? -1 : 1;
      placeRod(tr, new THREE.Vector3(-0.4, this.deckUnderTrack(-0.4) + 0.008, sd * JIB_TRACK_Z), new THREE.Vector3(-1.15, this.deckUnderTrack(-1.15) + 0.008, sd * JIB_TRACK_Z));
    });
  }

  private placeCamera(s: Snapshot, dt: number, ws: number, Ls: number, kiteUp: boolean, acc: { surge: number; roll: number; rollAcc: number; heaveAcc: number }) {
    const view = this.opts.view;
    const cam = this.camera;
    const h = this.head;
    if (view === 'chase') {
      const hr = this.headingS * DEG;
      const back = new THREE.Vector3(-Math.sin(hr), 0, Math.cos(hr));
      const yaw = this.look.yaw;
      back.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + -ws * 0.45);
      const centre = this.boat.position.clone().add(new THREE.Vector3(0, 4, 0));
      cam.position.copy(centre).addScaledVector(back, 13 + this.look.dolly * 1.5).add(new THREE.Vector3(0, 2.5 + this.look.pitch * 10 + this.look.dolly * 0.4, 0));
      cam.up.set(0, 1, 0);
      cam.lookAt(centre);
      cam.fov = this.look.fov;
      cam.updateProjectionMatrix();
      for (const c of this.crew) c.visible = true;
      return;
    }
    if (view === 'astern') {
      // a chase boat dead astern, on the boat's centreline, at boom height-ish: the main seen from
      // straight behind - its sections, the twist up the leech and the slot with the jib
      const hr = this.headingS * DEG;
      const back = new THREE.Vector3(-Math.sin(hr), 0, Math.cos(hr));
      back.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.look.yaw);
      const aim = this.boat.localToWorld(new THREE.Vector3(-0.6, DECK + 3.9, 0));
      cam.position.copy(aim).addScaledVector(back, 10 + this.look.dolly * 1.5);
      cam.position.y = this.boat.position.y + DECK + 2.7 + this.look.pitch * 10 + this.look.dolly * 0.4;
      cam.up.set(0, 1, 0);
      cam.lookAt(aim);
      cam.fov = this.look.fov;
      cam.updateProjectionMatrix();
      for (const c of this.crew) c.visible = true;
      return;
    }
    // ---- inertial head: spring-damper in the boat frame, driven by the mount's acceleration
    const k = 7;
    const zeta = 0.42;
    // per-axis gains: a keelboat's surge is only 0.1–0.3 m/s², so it is exaggerated to be felt;
    // roll and heave are already large enough
    const on = this.opts.inertia ? 1 : 0;
    const eyeH = 1.7;
    const aFrame = new THREE.Vector3(acc.surge * 30, acc.heaveAcc * 0.5, acc.rollAcc * eyeH * 5).multiplyScalar(on);
    aFrame.clampLength(0, 18);
    const accV = h.o.clone().multiplyScalar(-k * k).addScaledVector(h.v, -2 * zeta * k).sub(aFrame);
    h.v.addScaledVector(accV, dt);
    h.o.addScaledVector(h.v, dt);
    h.o.x = Math.max(-0.35, Math.min(0.35, h.o.x));
    h.o.y = Math.max(-0.2, Math.min(0.2, h.o.y));
    h.o.z = Math.max(-0.35, Math.min(0.35, h.o.z));
    // the head tries to stay level (vestibular reflex) but lags the roll: you feel the heel
    const target = this.opts.inertia ? acc.roll * 0.55 : acc.roll;
    const kr = 6;
    const zr = 0.38;
    h.rollV += (kr * kr * (target - h.roll) - 2 * zr * kr * h.rollV) * dt;
    h.roll += h.rollV * dt;
    const headRollRel = h.roll - acc.roll; // relative to the boat

    let eye: THREE.Vector3;
    let tgt: THREE.Vector3;
    if (view === 'helm') {
      eye = new THREE.Vector3(-4.6, DECK + 0.95, ws * 1.1);
      tgt = new THREE.Vector3(2.5, DECK + 2.6, Ls * 0.4);
    } else if (view === 'main') {
      // main trimmer's look up the leech: from the aft quarter, telltales against the sky
      eye = new THREE.Vector3(-5.3, DECK + 0.95, ws * 1.0);
      tgt = this.mainLeechAim.clone();
    } else if (view === 'leeward') {
      // leeward trim (light air, or reading the luff in a tight lane): crouched on the leeward
      // side deck under the boom, looking up the jib luff — the leeward telltales are right there
      this.kiteBlend += ((kiteUp ? 1 : 0) - this.kiteBlend) * Math.min(1, dt * 1.2);
      const kb = this.kiteBlend;
      // crouched on the leeward side deck, just aft of the clew, as a crew member would: looking
      // UP the jib from under its foot - the draft stripes show the camber at each height and the
      // leech shows the twist up to the head (kite up: same seat, looking out at its luff)
      eye = new THREE.Vector3(-2.7 + 1.4 * kb, DECK + 0.6, -ws * (1.02 + 0.0 * kb));
      const up = new THREE.Vector3(0.7, DECK + 2.5, -ws * 0.2).lerp(this.jibAim, 0.15);
      tgt = up.lerp(new THREE.Vector3(2.6, DECK + 4.2, -ws * 1.6), kb);
    } else {
      const crossing = 1 - Math.min(1, Math.abs(ws));
      // jib: the trimmer sits at the winch on the windward rail. Kite: they move forward of the
      // shrouds to see the luff past the main. The move is smoothed (kiteBlend).
      this.kiteBlend += ((kiteUp ? 1 : 0) - this.kiteBlend) * Math.min(1, dt * 1.2);
      const kb = this.kiteBlend;
      eye = new THREE.Vector3(-2.2 + 1.6 * kb, DECK + 1.0 - 0.3 * crossing, ws * (1.1 - 0.1 * kb));
      // jib: look across at the leech and the slot (the sheet's whole story), not up the forestay
      tgt = this.jibAim.clone().lerp(new THREE.Vector3(3.6, DECK + 4.0, Ls * 0.9), kb);
    }
    eye.add(h.o);
    // mouse look: rotate the gaze about the boat's up axis, then pitch
    const dir = tgt.clone().sub(eye);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.look.yaw);
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    dir.applyAxisAngle(right, this.look.pitch);
    // zoomed out (wheel): step back along the gaze and rise, to see every handle at once
    if (this.look.dolly > 0) {
      const back = dir.clone().normalize();
      eye.addScaledVector(back, -this.look.dolly).add(new THREE.Vector3(0, this.look.dolly * 0.6, 0));
    }
    const eyeW = this.boat.localToWorld(eye.clone());
    const tgtW = this.boat.localToWorld(eye.clone().add(dir));
    // camera up: the boat's up, rolled back by the head's lag
    const fwdW = this.boat.localToWorld(new THREE.Vector3(1, 0, 0)).sub(this.boat.position).normalize();
    const upW = this.boat.localToWorld(new THREE.Vector3(0, 1, 0)).sub(this.boat.position).normalize();
    upW.applyAxisAngle(fwdW, headRollRel);
    cam.position.copy(eyeW);
    cam.up.copy(upW);
    // a crew member right in front of the lens is hidden (you see past them)
    for (const c of this.crew) c.visible = c.position.distanceTo(eye) > 1.0;
    // from the leeward deck the bow crew on the windward rail sits right across the jib: leave them out
    if (view === 'leeward') for (const i of [1, 2]) if (this.crew[i]) this.crew[i].visible = false;
    cam.lookAt(tgtW);
    // acceleration pushes you into the seat: a small FOV kick
    const kick = this.opts.inertia ? Math.max(-4, Math.min(6, (s.accel ?? 0) * 12)) : 0;
    this.fovKick += (kick - this.fovKick) * Math.min(1, dt * 3);
    cam.fov = this.look.fov + this.fovKick + (view === 'leeward' ? 14 : view === 'trimmer' && !kiteUp ? 10 : 0);
    cam.updateProjectionMatrix();
  }

  /** Sim sea state 0 (flat) .. 3 (heavy) scales the wind-sea height. */
  setSeaLevel(sea: number) {
    const sc = 0.55 + 0.5 * sea;
    if (Math.abs(sc - this.seaScale) > 1e-3) {
      this.seaScale = sc;
      this.waveKey = '';
    }
  }
}
