// A SYMMETRIC spinnaker, built parametrically every frame: hung from the masthead, tacked at the end
// of the pole (windward) and sheeted at the clew (leeward). Its four edges - the windward luff (pole
// end to head), the leeward luff (clew to head), the foot (pole end to clew) and the head (a point) -
// are curves; the cloth between them is a Coons patch plus a round belly that fills forward. On top:
// the windward luff curling back when eased, gravity swinging the free cloth to the low side, a
// collapse, and a slight breathing so it never looks like a shell.
// Telltales, sheets and force arrows sample it through `sample(h, t)` (h up the sail, t across from
// the pole side to the clew side), like the asymmetric kite mold.
import * as THREE from 'three';

const NU = 22; // across (pole side -> clew side)
const NV = 26; // up (foot -> head)

export interface SymKiteDeform {
  tack: THREE.Vector3; // pole end
  head: THREE.Vector3;
  clew: THREE.Vector3;
  /** leeward z sign */
  side: number;
  /** belly depth as a fraction of the foot length */
  depth: number;
  /** windward luff curl 0..1.5 (eased past the trim point) */
  curl: number;
  /** gravity swing (rad, + to leeward) */
  swing: number;
  collapse: number;
  time: number;
}

const bez = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) => {
  const u = 1 - t;
  return out.set(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y, u * u * a.z + 2 * u * t * c.z + t * t * b.z);
};

export class SymKite {
  mesh: THREE.Mesh;
  private pos: THREE.BufferAttribute;

  constructor(material: THREE.Material) {
    const n = (NU + 1) * (NV + 1);
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    g.setAttribute('position', this.pos);
    const uv = new Float32Array(n * 2);
    for (let j = 0; j <= NV; j++)
      for (let i = 0; i <= NU; i++) {
        const k = j * (NU + 1) + i;
        uv[k * 2] = i / NU;
        uv[k * 2 + 1] = j / NV;
      }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const idx: number[] = [];
    for (let j = 0; j < NV; j++)
      for (let i = 0; i < NU; i++) {
        const a = j * (NU + 1) + i;
        const b = a + 1;
        const c = a + NU + 1;
        const d = c + 1;
        idx.push(a, b, d, a, d, c);
      }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  private L = new THREE.Vector3();
  private R = new THREE.Vector3();
  private F = new THREE.Vector3();
  private P = new THREE.Vector3();

  deform(k: SymKiteDeform) {
    const { tack, head, clew } = k;
    const arr = this.pos.array as Float32Array;
    const foot = tack.distanceTo(clew);
    const fwd = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);
    const lee = new THREE.Vector3(0, 0, k.side);
    // edge control points: both luffs bow forward and outward, the foot bows forward and a little down
    // wide shoulders: the luff curves bulge high up and well outboard (a symmetric kite is round, not a triangle)
    const midL = tack.clone().lerp(head, 0.62).addScaledVector(fwd, 1.7).addScaledVector(lee, -1.5);
    const midR = clew.clone().lerp(head, 0.62).addScaledVector(fwd, 1.7).addScaledVector(lee, 1.5);
    const midF = tack.clone().lerp(clew, 0.5).addScaledVector(fwd, 1.5).addScaledVector(up, -0.35);
    const collapse = k.collapse;
    const depth = k.depth * foot * (1 - 0.75 * collapse);
    const tm = k.time;
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      bez(tack, midL, head, v, this.L);
      bez(clew, midR, head, v, this.R);
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        bez(tack, midF, clew, u, this.F);
        // Coons patch: the top edge is the head (a point)
        const P = this.P;
        P.set(
          (1 - u) * this.L.x + u * this.R.x + (1 - v) * this.F.x + v * head.x - ((1 - u) * (1 - v) * tack.x + u * (1 - v) * clew.x + v * head.x),
          (1 - u) * this.L.y + u * this.R.y + (1 - v) * this.F.y + v * head.y - ((1 - u) * (1 - v) * tack.y + u * (1 - v) * clew.y + v * head.y),
          (1 - u) * this.L.z + u * this.R.z + (1 - v) * this.F.z + v * head.z - ((1 - u) * (1 - v) * tack.z + u * (1 - v) * clew.z + v * head.z),
        );
        // the belly fills forward: deepest in the middle, less aloft
        const b = Math.sin(Math.PI * u) * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.05 + 0.02)), 0.7) * (1 - 0.15 * v);
        P.addScaledVector(fwd, depth * b);
        P.addScaledVector(up, -0.15 * depth * b * (1 - v));
        // windward luff curl: eased past the trim point the luff folds back on itself, smoothly
        if (k.curl > 0.01 && u < 0.3) {
          const w = Math.pow(1 - u / 0.3, 2) * Math.pow(Math.sin(Math.PI * Math.min(0.98, Math.max(0.02, v))), 0.7);
          const c = Math.min(1.5, k.curl) * w * (0.92 + 0.08 * Math.sin(tm * 2.6 + v * 5));
          P.addScaledVector(fwd, -0.9 * c);
          P.addScaledVector(lee, 0.55 * c);
        }
        // gravity: the free cloth hangs to the low side, the middle and the head more than the corners
        if (k.swing !== 0) P.addScaledVector(lee, k.swing * 3.2 * Math.sin(Math.PI * v) * (0.5 + 0.5 * Math.sin(Math.PI * u)));
        // breathing / collapse flutter
        const br = 0.03 * Math.sin(tm * 1.8 + v * 5 + u * 3) * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
        P.addScaledVector(fwd, br);
        if (collapse > 0) {
          P.addScaledVector(lee, collapse * 0.35 * Math.sin(tm * 6 + u * 5 + v * 4) * Math.sin(Math.PI * u));
          P.addScaledVector(up, -collapse * 0.8 * Math.sin(Math.PI * u) * (1 - v));
        }
        const q = (j * (NU + 1) + i) * 3;
        arr[q] = P.x;
        arr[q + 1] = P.y;
        arr[q + 2] = P.z;
      }
    }
    this.pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /** a point on the kite at height fraction h and across fraction t (0 = pole side, 1 = clew) */
  sample(h: number, t: number, out: THREE.Vector3) {
    const arr = this.pos.array as Float32Array;
    const gv = THREE.MathUtils.clamp(h, 0, 1) * NV;
    const gu = THREE.MathUtils.clamp(t, 0, 1) * NU;
    const j0 = Math.min(NV - 1, Math.floor(gv));
    const i0 = Math.min(NU - 1, Math.floor(gu));
    const fv = gv - j0;
    const fu = gu - i0;
    out.set(0, 0, 0);
    const add = (i: number, j: number, w: number) => {
      const q = (j * (NU + 1) + i) * 3;
      out.x += arr[q] * w;
      out.y += arr[q + 1] * w;
      out.z += arr[q + 2] * w;
    };
    add(i0, j0, (1 - fu) * (1 - fv));
    add(i0 + 1, j0, fu * (1 - fv));
    add(i0, j0 + 1, (1 - fu) * fv);
    add(i0 + 1, j0 + 1, fu * fv);
    return out;
  }
}
