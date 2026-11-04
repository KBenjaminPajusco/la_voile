// The gennaker drawn from a MOLD: the kite of the J/80 model (its shape is right), extracted by a
// script into public/3d/j80/kite.json and deformed slightly every frame from the physics:
//   - re-anchored on the scene's tack (sprit end) and head, scaled to the luff length
//   - swung about the luff by the sheet (the leech moves, the luff stays)
//   - luff curl when it is eased to (or past) the luffing point
//   - collapse: the cloth falls in and flutters
//   - a small breathing of the cloth so it never looks like a shell
//   - mirrored to the other side on the other gybe
// Telltales, clew, sheet and force arrows sample the deformed surface through `sample(h, t)`.
import * as THREE from 'three';

const BASE = (import.meta as any).env?.BASE_URL ?? './';

interface MoldData {
  tack: [number, number, number];
  head: [number, number, number];
  clew: [number, number, number];
  angleMid: number;
  pos: number[];
  uv: number[];
  h: number[];
  t: number[];
  index: number[];
}

let cache: Promise<MoldData> | null = null;
function loadData() {
  if (!cache)
    cache = fetch(`${BASE}3d/j80/kite.json`).then((r) => {
      if (!r.ok) throw new Error(`kite mold ${r.status}`);
      return r.json() as Promise<MoldData>;
    });
  return cache;
}

export interface KiteDeform {
  tack: THREE.Vector3;
  head: THREE.Vector3;
  side: number; // leeward z sign
  angle: number; // chord angle wanted at mid height, deg
  curl: number; // 0..1
  collapse: number; // 0..1
  /** leech flutter 0..1 (main eased too far: the kite's exit flow no longer follows the main) */
  leechFlap?: number;
  /** luff flutter 0..1 (main eased too far: the flow between main and kite goes back and forth) */
  luffFlap?: number;
  time: number;
}

const GRID = 24;

export class KiteMold {
  mesh: THREE.Mesh;
  private base: Float32Array; // mold positions relative to the mold tack (starboard)
  private h: Float32Array;
  private t: Float32Array;
  private moldAxis: THREE.Vector3;
  private moldLen: number;
  private angleMid: number;
  private grid: Int32Array; // nearest vertex per (h, t) cell
  private pos: THREE.BufferAttribute;

  private constructor(d: MoldData, material: THREE.Material) {
    this.base = Float32Array.from(d.pos);
    this.h = Float32Array.from(d.h);
    this.t = Float32Array.from(d.t);
    const tack = new THREE.Vector3(...d.tack);
    const head = new THREE.Vector3(...d.head);
    this.moldAxis = head.clone().sub(tack).normalize();
    this.moldLen = head.distanceTo(tack);
    this.angleMid = d.angleMid;
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(this.base.length), 3);
    g.setAttribute('position', this.pos);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
    g.setIndex(d.index);
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    // nearest vertex in (h, t) for each grid node, for sampling
    this.grid = new Int32Array((GRID + 1) * (GRID + 1));
    const n = this.h.length;
    for (let i = 0; i <= GRID; i++)
      for (let j = 0; j <= GRID; j++) {
        const hh = i / GRID;
        const tt = j / GRID;
        let best = 0;
        let bd = 1e9;
        for (let k = 0; k < n; k++) {
          const dh = (this.h[k] - hh) * 1.6;
          const dt = this.t[k] - tt;
          const dd = dh * dh + dt * dt;
          if (dd < bd) {
            bd = dd;
            best = k;
          }
        }
        this.grid[i * (GRID + 1) + j] = best;
      }
  }

  static async load(): Promise<KiteMold> {
    const d = await loadData();
    const tl = new THREE.TextureLoader();
    const map = tl.load(`${BASE}3d/j80/sail_D.jpg`);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const normalMap = tl.load(`${BASE}3d/j80/sail_N.jpg`);
    const mat = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.55, side: THREE.DoubleSide, transparent: true, opacity: 0.93, depthWrite: false });
    return new KiteMold(d, mat);
  }

  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private r = new THREE.Vector3();
  private scale = 1;
  private tack = new THREE.Vector3();
  private side = 1;

  deform(k: KiteDeform) {
    const sceneAxis = k.head.clone().sub(k.tack);
    this.scale = sceneAxis.length() / this.moldLen;
    sceneAxis.normalize();
    this.q.setFromUnitVectors(this.moldAxis, sceneAxis);
    this.tack.copy(k.tack);
    this.side = k.side;
    const swing = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(k.angle - this.angleMid, -25, 45));
    const ax = this.moldAxis;
    const n = this.h.length;
    const arr = this.pos.array as Float32Array;
    const v = this.v;
    const r = this.r;
    const tm = k.time;
    for (let i = 0; i < n; i++) {
      const h = this.h[i];
      const t = this.t[i];
      v.set(this.base[i * 3], this.base[i * 3 + 1], this.base[i * 3 + 2]);
      // the leech swings with the sheet, the luff stays put
      let rot = swing * Math.pow(t, 0.9);
      // collapse: the whole sail falls in and flutters
      if (k.collapse > 0) rot -= k.collapse * (0.35 * t + 0.12 * Math.sin(tm * 6 + t * 5 + h * 3) * t);
      // leech flutter: the last fifth of the chord shakes when the main chokes the exit flow
      const lf = k.leechFlap ?? 0;
      if (lf > 0 && t > 0.75) rot += lf * 0.09 * ((t - 0.75) / 0.25) * Math.sin(tm * 17 + h * 11) * (0.6 + 0.4 * Math.sin(tm * 3.1));
      // luff breathing: the front third goes in and out as the flow between main and kite pumps
      const uf = k.luffFlap ?? 0;
      if (uf > 0 && t < 0.32) rot += uf * 0.13 * (1 - t / 0.32) * Math.sin(tm * 9 + h * 6) * (0.55 + 0.45 * Math.sin(tm * 2.2 + h * 2));
      if (rot !== 0) v.applyAxisAngle(ax, rot);
      // radial breathing (away from the luff axis): the cloth is never a rigid shell
      const along = v.dot(ax);
      r.copy(v).addScaledVector(ax, -along);
      const rl = r.length();
      if (rl > 1e-4) {
        const breathe = 0.035 * Math.sin(tm * 1.9 + h * 5 + t * 3) * 4 * t * (1 - t) + 0.018 * Math.sin(tm * 3.3 + h * 9) * t;
        const fall = 1 - 0.3 * k.collapse * t;
        v.addScaledVector(ax, 0).addScaledVector(r, (fall - 1) + breathe / rl);
      }
      v.multiplyScalar(this.scale).applyQuaternion(this.q);
      if (this.side < 0) v.z = -v.z;
      arr[i * 3] = v.x + k.tack.x;
      arr[i * 3 + 1] = v.y + k.tack.y;
      arr[i * 3 + 2] = v.z + k.tack.z;
    }
    if (k.curl > 0.005) this.rollLuff(k);
    this.pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * The luff curl: past the trim point the front of the kite folds back ON ITSELF, towards
   * windward, like the lip of a breaking wave. For each height the cloth forward of the break line
   * is wrapped round a cylinder tangent to the sail there. It starts mid-luff and spreads up and
   * down as the sheet is eased further; the lip flickers with the pressure.
   */
  private rollLuff(k: KiteDeform) {
    const arr = this.pos.array as Float32Array;
    const n = this.h.length;
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    const U = new THREE.Vector3();
    const Hh = new THREE.Vector3();
    const N = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    // per-height break geometry, cached by band
    const bands = 24;
    const cache: ({ a: THREE.Vector3; u: THREE.Vector3; nW: THREE.Vector3; R: number; tc: number; phiMax: number } | null)[] = new Array(bands + 1).fill(null);
    const done = new Array(bands + 1).fill(false);
    const bandFor = (h: number) => {
      const b = Math.round(h * bands);
      if (done[b]) return cache[b];
      done[b] = true;
      const hh = b / bands;
      // the curl is strongest mid-luff and grows with the ease; it flickers with the gusts of pressure
      const amount = k.curl * Math.pow(Math.sin(Math.PI * Math.min(0.98, Math.max(0.02, hh))), 0.8) * (0.9 + 0.1 * Math.sin(k.time * 2.7 + hh * 5));
      if (amount < 0.02) return (cache[b] = null), null;
      const tc = Math.min(0.42, 0.05 + 0.24 * Math.min(1.2, amount));
      this.sample(hh, tc, A);
      this.sample(hh, Math.max(0, tc - 0.03), B);
      U.subVectors(A, B).normalize(); // along the chord, pointing aft
      this.sample(Math.min(1, hh + 0.03), tc, tmp);
      Hh.subVectors(tmp, A).normalize();
      N.crossVectors(Hh, U).normalize();
      if (Math.sign(N.z) === Math.sign(k.side)) N.negate(); // windward
      this.sample(hh, 1, tmp);
      const chord = tmp.distanceTo(this.sample(hh, 0, B));
      const len = tc * chord; // cloth forward of the break
      const phiMax = Math.min(Math.PI * 1.15, amount * Math.PI * 1.3); // how far over it rolls
      const R = len / Math.max(0.3, phiMax);
      const e = { a: A.clone(), u: U.clone(), nW: N.clone(), R, tc, phiMax };
      cache[b] = e;
      return e;
    };
    // every break line is measured on the un-rolled sail first, then smoothed along the luff and
    // interpolated between bands, so the roll is one continuous lip and not steps
    for (let b = 0; b <= bands; b++) bandFor(b / bands);
    type Band = { a: THREE.Vector3; u: THREE.Vector3; nW: THREE.Vector3; R: number; tc: number; phiMax: number };
    const sm: (Band | null)[] = cache.map((e, b) => {
      if (!e) return null;
      const nb = [cache[b - 1], e, cache[b + 1]].filter((x): x is Band => !!x);
      const avg = (f: (x: Band) => THREE.Vector3) => nb.reduce((acc, x) => acc.add(f(x)), new THREE.Vector3()).divideScalar(nb.length);
      return { a: avg((x) => x.a), u: avg((x) => x.u).normalize(), nW: avg((x) => x.nW).normalize(), R: nb.reduce((q, x) => q + x.R, 0) / nb.length, tc: nb.reduce((q, x) => q + x.tc, 0) / nb.length, phiMax: nb.reduce((q, x) => q + x.phiMax, 0) / nb.length };
    });
    const P = new THREE.Vector3();
    const Q = new THREE.Vector3();
    const place = (e: Band, t: number, out: THREE.Vector3) => {
      const phi = Math.min(e.phiMax, ((e.tc - Math.min(t, e.tc)) / e.tc) * e.phiMax);
      return out.copy(e.a).addScaledVector(e.u, -e.R * Math.sin(phi)).addScaledVector(e.nW, e.R * (1 - Math.cos(phi)));
    };
    for (let i = 0; i < n; i++) {
      const h = this.h[i];
      const t = this.t[i];
      const fb = h * bands;
      const b0 = Math.min(bands - 1, Math.floor(fb));
      const w = fb - b0;
      const e0 = sm[b0];
      const e1 = sm[b0 + 1];
      if (!e0 && !e1) continue;
      const tc = (e0 ? e0.tc : 0) * (1 - w) + (e1 ? e1.tc : 0) * w;
      if (t >= tc) continue;
      // each neighbouring band's roll, blended; a band without curl leaves the cloth where it is
      const cur = Q.set(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]);
      P.set(0, 0, 0);
      const tmp2 = new THREE.Vector3();
      P.addScaledVector(e0 && t < e0.tc ? place(e0, t, tmp2) : cur, 1 - w);
      P.addScaledVector(e1 && t < e1.tc ? place(e1, t, tmp2) : cur, w);
      // keep the luff attached near the head and the tack
      const keep = Math.min(1, Math.min(h, 1 - h) / 0.08);
      arr[i * 3] += (P.x - arr[i * 3]) * keep;
      arr[i * 3 + 1] += (P.y - arr[i * 3 + 1]) * keep;
      arr[i * 3 + 2] += (P.z - arr[i * 3 + 2]) * keep;
    }
  }

  /** a point on the deformed sail at height fraction h and chord fraction t (bilinear on the grid) */
  sample(h: number, t: number, out: THREE.Vector3) {
    const arr = this.pos.array as Float32Array;
    const gh = THREE.MathUtils.clamp(h, 0, 1) * GRID;
    const gt = THREE.MathUtils.clamp(t, 0, 1) * GRID;
    const i0 = Math.min(GRID - 1, Math.floor(gh));
    const j0 = Math.min(GRID - 1, Math.floor(gt));
    const fh = gh - i0;
    const ft = gt - j0;
    out.set(0, 0, 0);
    const add = (i: number, j: number, w: number) => {
      const k = this.grid[i * (GRID + 1) + j];
      out.x += arr[k * 3] * w;
      out.y += arr[k * 3 + 1] * w;
      out.z += arr[k * 3 + 2] * w;
    };
    add(i0, j0, (1 - fh) * (1 - ft));
    add(i0 + 1, j0, fh * (1 - ft));
    add(i0, j0 + 1, (1 - fh) * ft);
    add(i0 + 1, j0 + 1, fh * ft);
    return out;
  }
}
