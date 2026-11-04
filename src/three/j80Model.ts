// Procedural J/80-type boat for the 3D trimmer view: hull, deck, rig, sails, sheets, telltale
// ribbons. Pure three.js, no React, no simulation logic — `TrimmerScene` feeds it the snapshot.
//
// Boat frame (the group's local space): +X forward, +Y up, +Z starboard. Origin on the
// centreline at the mast, at the waterline. The deck at the mast is DECK above the water.

import * as THREE from 'three';

export const DECK = 0.78;
// rig points measured off the J/80 model (see j80Mesh.ts) and mapped into the boat frame
export const MAST_H = 9.95;
export const BOOM_H = 0.68; // gooseneck above DECK
export const FORESTAY_BASE = new THREE.Vector3(2.5, 0.53, 0);
export const FORESTAY_TOP = new THREE.Vector3(0.03, 9.93, 0);
/** jib tack: on the forestay line, on a short tack pennant above the stem */
export const TACK = new THREE.Vector3().copy(FORESTAY_BASE).lerp(FORESTAY_TOP, 0.034);
export const SPRIT_END = new THREE.Vector3(4.4, 0.62, 0);
export const WINCH = { x: -2.25, y: 0.66, z: 0.86 };
const TRANSOM_X = -5.45;
const STEM_X = 2.53;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function halfBreadth(x: number) {
  const u = (x - TRANSOM_X) / (STEM_X - TRANSOM_X);
  if (u >= 0.42) return 1.25 * Math.pow(Math.max(0, 1 - ((u - 0.42) / 0.58) ** 2), 0.62);
  return 1.25 - 0.22 * ((0.42 - u) / 0.42) ** 2;
}
export function sheerAt(x: number) {
  const u = (x - TRANSOM_X) / (STEM_X - TRANSOM_X);
  return DECK - 0.07 + 0.22 * Math.pow(u, 2.5);
}
function bottomAt(x: number) {
  const u = (x - TRANSOM_X) / (STEM_X - TRANSOM_X);
  const b = -0.05 - 0.3 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)), 0.8);
  return b + (sheerAt(x) - 0.2 - b) * smooth(0.86, 1, u);
}

// ---------------------------------------------------------------- hull

function buildHull(): THREE.Object3D {
  const g = new THREE.Group();
  const NS = 56;
  const NA = 26;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const white = new THREE.Color(0xf4f6f8);
  const anti = new THREE.Color(0x0b1d33);
  const stripe = new THREE.Color(0x22d3ee);
  for (let i = 0; i <= NS; i++) {
    const x = TRANSOM_X + ((STEM_X - TRANSOM_X) * i) / NS;
    const b = Math.max(0.004, halfBreadth(x));
    const sh = sheerAt(x);
    const bo = bottomAt(x);
    for (let j = 0; j <= NA; j++) {
      const th = (Math.PI * j) / NA; // 0 = stbd deck edge, pi/2 = keel, pi = port deck edge
      const c = Math.cos(th);
      const z = b * Math.sign(c) * Math.pow(Math.abs(c), 0.45);
      const y = sh + (bo - sh) * Math.pow(Math.max(0, Math.sin(th)), 1.5);
      pos.push(x, y, z);
      const cc = y < 0.03 ? anti : y < 0.11 ? stripe : white;
      col.push(cc.r, cc.g, cc.b);
    }
  }
  for (let i = 0; i < NS; i++)
    for (let j = 0; j < NA; j++) {
      const a = i * (NA + 1) + j;
      const b = a + NA + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  // transom cap
  const centre = pos.length / 3;
  pos.push(TRANSOM_X, (sheerAt(TRANSOM_X) + bottomAt(TRANSOM_X)) / 2, 0);
  col.push(white.r, white.g, white.b);
  for (let j = 0; j < NA; j++) idx.push(centre, j, j + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const hull = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide }));
  g.add(hull);

  // deck: full width forward of the cockpit, side decks alongside it
  const CK0 = -5.15;
  const CK1 = -2.3;
  const CW = 0.74;
  const dpos: number[] = [];
  const didx: number[] = [];
  const NZ = 14;
  const deckY = (x: number, z: number, b: number) => sheerAt(x) + 0.05 * (1 - (z / Math.max(b, 0.01)) ** 2);
  for (let i = 0; i <= NS; i++) {
    const x = TRANSOM_X + ((STEM_X - TRANSOM_X) * i) / NS;
    const b = Math.max(0.004, halfBreadth(x));
    for (let k = 0; k <= NZ; k++) {
      const z = -b + (2 * b * k) / NZ;
      dpos.push(x, deckY(x, z, b), z);
    }
  }
  for (let i = 0; i < NS; i++) {
    const xm = TRANSOM_X + ((STEM_X - TRANSOM_X) * (i + 0.5)) / NS;
    const b = halfBreadth(xm);
    for (let k = 0; k < NZ; k++) {
      const zm = -b + (2 * b * (k + 0.5)) / NZ;
      if (xm > CK0 && xm < CK1 && Math.abs(zm) < CW) continue;
      const a = i * (NZ + 1) + k;
      const c = a + NZ + 1;
      didx.push(a, a + 1, c, a + 1, c + 1, c);
    }
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
  dgeo.setIndex(didx);
  dgeo.computeVertexNormals();
  g.add(new THREE.Mesh(dgeo, new THREE.MeshStandardMaterial({ color: 0xdfe4e8, roughness: 0.9, side: THREE.DoubleSide })));

  // cockpit well (open-top box seen from inside)
  const ck = new THREE.Mesh(new THREE.BoxGeometry(CK1 - CK0, 0.46, CW * 2), new THREE.MeshStandardMaterial({ color: 0xc9d1d8, roughness: 0.85, side: THREE.BackSide }));
  ck.position.set((CK0 + CK1) / 2, sheerAt(-3.6) - 0.2, 0);
  g.add(ck);
  // cabin top
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 1.5), new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.6 }));
  cabin.position.set(-0.9, DECK + 0.1, 0);
  g.add(cabin);
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.62), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.3 }));
  hatch.position.set(-1.3, DECK + 0.19, 0);
  g.add(hatch);

  // keel, bulb, rudder
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.15, 0.09), dark);
  keel.position.set(-0.35, -0.85, 0);
  g.add(keel);
  const bulb = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 1.0, 6, 12), dark);
  bulb.rotation.z = Math.PI / 2;
  bulb.position.set(-0.45, -1.45, 0);
  g.add(bulb);
  return g;
}

// ---------------------------------------------------------------- helpers

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();

/** Unit cylinder along +Y, positioned/stretched between two points by `placeRod`. */
export function rod(r: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 6, 1), mat);
  m.matrixAutoUpdate = true;
  return m;
}
export function placeRod(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  _a.subVectors(b, a);
  const L = _a.length();
  m.position.copy(a).addScaledVector(_a, 0.5);
  if (L < 1e-6) {
    m.scale.set(1, 1e-4, 1);
    return;
  }
  _q.setFromUnitVectors(_up, _b.copy(_a).divideScalar(L));
  m.quaternion.copy(_q);
  m.scale.set(1, L, 1);
}

// ---------------------------------------------------------------- sails

export interface SailState {
  luff: (h: number, out: THREE.Vector3) => THREE.Vector3;
  chord: (h: number) => number;
  angle: (h: number) => number; // deg, chord angle to centreline
  depth: (h: number) => number;
  draft: number;
  side: number; // z sign the camber bulges towards (leeward)
  footRise: number; // m the clew sits above the tack line at the foot
  /** extra displacement along the camber normal, m (flutter, luff bubble, curl) */
  wobble: (h: number, t: number) => number;
  visible: boolean;
  /** a measured / molded surface overrides the analytic one (the kite mold) */
  point?: (h: number, t: number, out: THREE.Vector3) => THREE.Vector3;
}

function camberShape(t: number, p: number) {
  return t < p ? (2 * p * t - t * t) / (p * p) : (1 - 2 * p + 2 * p * t - t * t) / ((1 - p) * (1 - p));
}

/** A point on the sail surface at height fraction h and chord fraction t. */
export function sailPoint(s: SailState, h: number, t: number, out: THREE.Vector3) {
  if (s.point) return s.point(h, t, out);
  s.luff(h, out);
  const c = s.chord(h);
  const th = (s.angle(h) * Math.PI) / 180;
  const ux = -Math.cos(th);
  const uz = s.side * Math.sin(th);
  const nx = Math.sin(th);
  const nz = s.side * Math.cos(th);
  const cam = c * s.depth(h) * camberShape(t, s.draft) + s.wobble(h, t);
  out.x += ux * c * t + nx * cam;
  out.z += uz * c * t + nz * cam;
  out.y += s.footRise * t * (1 - h) * (1 - h);
  return out;
}

export class SailMesh {
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
  constructor(
    public nh: number,
    public nc: number,
    material: THREE.Material,
  ) {
    const n = (nh + 1) * (nc + 1);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const uv = new Float32Array(n * 2);
    const idx: number[] = [];
    for (let i = 0; i <= nh; i++)
      for (let j = 0; j <= nc; j++) {
        const k = i * (nc + 1) + j;
        uv[k * 2] = j / nc;
        uv[k * 2 + 1] = i / nh;
        if (i < nh && j < nc) idx.push(k, k + 1, k + nc + 1, k + 1, k + nc + 2, k + nc + 1);
      }
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }
  update(s: SailState) {
    this.mesh.visible = s.visible;
    if (!s.visible) return;
    const p = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i <= this.nh; i++) {
      const h = i / this.nh;
      for (let j = 0; j <= this.nc; j++) {
        sailPoint(s, h, j / this.nc, v);
        if (!Number.isFinite(v.x + v.y + v.z)) {
          if (!(this as any)._warned) {
            (this as any)._warned = true;
            console.warn('[trimmaster3d] NaN in sail', this.mesh.name, h, j / this.nc, s.chord(h), s.angle(h), s.depth(h), s.draft, s.wobble(h, j / this.nc));
          }
          v.set(0, 0, 0);
        }
        p.setXYZ(i * (this.nc + 1) + j, v.x, v.y, v.z);
      }
    }
    p.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }
}

/** Sail cloth texture: draft stripes, telltale windows (transparent), seams. */
export function sailTextures(opts: { base: string; stripes: number[]; windows?: { h: number; t: number; rT: number; rH: number }[]; seams?: number; panels?: string[] }) {
  const W = 256;
  const H = 512;
  const cm = document.createElement('canvas');
  cm.width = W;
  cm.height = H;
  const c = cm.getContext('2d')!;
  if (opts.panels) {
    opts.panels.forEach((p, i) => {
      c.fillStyle = p;
      c.fillRect(0, (H * i) / opts.panels!.length, W, H / opts.panels!.length + 1);
    });
  } else {
    c.fillStyle = opts.base;
    c.fillRect(0, 0, W, H);
  }
  c.strokeStyle = 'rgba(30,41,59,0.18)';
  c.lineWidth = 1;
  for (let i = 1; i < (opts.seams ?? 8); i++) {
    const y = (H * i) / (opts.seams ?? 8);
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }
  c.strokeStyle = '#0b1a2e';
  c.lineWidth = 3;
  for (const h of opts.stripes) {
    const y = (1 - h) * H;
    c.beginPath();
    c.moveTo(W * 0.04, y);
    c.lineTo(W * 0.96, y);
    c.stroke();
  }
  // leech line
  c.fillStyle = '#334155';
  c.fillRect(W - 4, 0, 4, H);
  const am = document.createElement('canvas');
  am.width = W;
  am.height = H;
  const a = am.getContext('2d')!;
  a.fillStyle = '#ffffff';
  a.fillRect(0, 0, W, H);
  for (const w of opts.windows ?? []) {
    const cx = w.t * W;
    const cy = (1 - w.h) * H;
    a.fillStyle = '#141414';
    a.beginPath();
    a.ellipse(cx, cy, w.rT * W, w.rH * H, 0, 0, Math.PI * 2);
    a.fill();
    c.strokeStyle = '#475569';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(cx, cy, w.rT * W, w.rH * H, 0, 0, Math.PI * 2);
    c.stroke();
  }
  const map = new THREE.CanvasTexture(cm);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const alpha = new THREE.CanvasTexture(am);
  return { map, alpha };
}

// ---------------------------------------------------------------- telltale ribbons

const NSEG = 9;
export interface RibbonDrive {
  lift: number; // windward telltale lifting (0..1)
  stall: number; // leeward telltale stalled (0..1)
  flog: number; // sail flogging (0..1)
  curl: number; // leech telltale curling behind the sail (0..1)
}

export class Ribbon {
  mesh: THREE.Mesh;
  private geo: THREE.BufferGeometry;
  private st: RibbonDrive = { lift: 0, stall: 0, flog: 0, curl: 0 };
  private seed = Math.random() * 100;
  nodes: THREE.Vector3[] = Array.from({ length: NSEG + 1 }, () => new THREE.Vector3());
  constructor(
    color: number,
    public length = 0.3,
    public width = 0.028,
  ) {
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NSEG + 1) * 2 * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < NSEG; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }
  /**
   * @param anchor  point on the sail (already offset onto the right face)
   * @param along   unit vector along the surface towards the leech (the streaming direction)
   * @param out     unit vector away from the sail on this ribbon's face
   * @param surf    optional: node k base positions following the sail surface
   */
  update(dt: number, time: number, target: RibbonDrive, anchor: THREE.Vector3, along: THREE.Vector3, out: THREE.Vector3, surf?: (k: number, s: number, o: THREE.Vector3) => void) {
    const r = Math.min(1, dt * 5);
    this.st.lift += (target.lift - this.st.lift) * r;
    this.st.stall += (target.stall - this.st.stall) * r;
    this.st.flog += (target.flog - this.st.flog) * Math.min(1, dt * 8);
    this.st.curl += (target.curl - this.st.curl) * r;
    const { lift, stall, flog, curl } = this.st;
    const seg = this.length / NSEG;
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(along, out).normalize();
    // keep "up" roughly perpendicular to along in the sail plane
    up.copy(side).multiplyScalar(Math.sign(side.y) || 1);
    const w = time * 1 + this.seed;
    const dev = new THREE.Vector3();
    const d = new THREE.Vector3();
    const base = new THREE.Vector3();
    const pos = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const wv = new THREE.Vector3();
    for (let k = 0; k <= NSEG; k++) {
      const s = k / NSEG;
      if (surf) surf(k, s * this.length, base);
      else base.copy(anchor).addScaledVector(along, s * this.length);
      if (k > 0) {
        // bend increment for this segment, in the local (along, out, up) frame
        d.set(0, 0, 0);
        const ripple = 0.12 * Math.sin(w * 11 - k * 1.1) * s;
        d.addScaledVector(up, ripple * (1 - flog));
        // windward lifting: peels off the cloth and climbs/spins
        const spin = 1.3 + 0.9 * Math.sin(w * 4.3 + k * 0.6);
        d.addScaledVector(out, lift * (0.35 + 0.55 * s) * Math.cos(spin) * 1.4);
        d.addScaledVector(up, lift * (0.35 + 0.55 * s) * Math.sin(spin) * 1.4);
        d.addScaledVector(along, -lift * 0.35 * s);
        // leeward stall: droops, hangs and twitches
        d.addScaledVector(up, -stall * (0.6 + 0.6 * s) * 1.3);
        d.addScaledVector(out, stall * 0.35 * Math.sin(w * 6.1 + k));
        d.addScaledVector(along, -stall * 0.5 * s);
        // leech telltale curling round behind the leech
        d.addScaledVector(out, -curl * (0.5 + s) * 1.2);
        d.addScaledVector(along, -curl * 0.6 * s);
        // flogging: violent random flap
        d.addScaledVector(out, flog * 1.3 * Math.sin(w * 17 + k * 1.7));
        d.addScaledVector(up, flog * 0.9 * Math.sin(w * 13.3 - k * 1.3));
        dev.addScaledVector(d, seg);
      }
      const p = this.nodes[k].copy(base).add(dev);
      // ribbon width direction: lies flat on the cloth while streaming
      wv.copy(up).multiplyScalar(this.width * 0.5 * (1 - 0.3 * s));
      pos.setXYZ(k * 2, p.x + wv.x, p.y + wv.y, p.z + wv.z);
      pos.setXYZ(k * 2 + 1, p.x - wv.x, p.y - wv.y, p.z - wv.z);
    }
    pos.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- crew

export function crewFigure(jacket = 0x1e3a5f) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.45, 4, 10), new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.7 }));
  body.position.y = 0.42;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd6a77a, roughness: 0.8 }));
  head.position.y = 0.92;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
  cap.position.y = 0.95;
  g.add(cap);
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 4, 8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  legs.rotation.z = Math.PI / 2;
  legs.position.set(0, 0.1, 0);
  g.add(legs);
  return g;
}

export { buildHull };
