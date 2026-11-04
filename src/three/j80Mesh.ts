// The detailed J/80 hull, deck and rig (a Sketchfab model supplied by the user, cleaned up by
// scripts outside the app: static sails, sheets, boom, tiller, rudder, sprit and forestay removed
// because the scene animates its own; texture decals painted out).
//
// Model space: metres, +Y up, +Z bow, +X port, about 0.78 x real size. It is mapped into the boat
// frame used everywhere else (+X bow, +Y up, +Z starboard, origin at the mast on the waterline).
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const BASE = (import.meta as any).env?.BASE_URL ?? './';
/** model -> real size: hull 6.19 model units long, J/80 LOA 8.0 m */
export const MODEL_SCALE = 1.29;
const MAST_Z = 1.32; // model z of the mast
const WATERLINE_Y = -0.4; // model y of the waterline (freeboard ~0.75 m amidships)

let cache: Promise<THREE.Group> | null = null;

function load(): Promise<THREE.Group> {
  if (cache) return cache;
  cache = new Promise((resolve, reject) => {
    const tl = new THREE.TextureLoader();
    const tex = (f: string, srgb = false) => {
      const t = tl.load(`${BASE}3d/j80/${f}`);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };
    const base = new THREE.MeshStandardMaterial({
      map: tex('base_D.jpg', true),
      normalMap: tex('base_N.jpg'),
      roughnessMap: tex('base_R.jpg'),
      metalnessMap: tex('base_MT.jpg'),
      roughness: 1,
      metalness: 1,
      side: THREE.DoubleSide,
    });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 });
    new OBJLoader().load(
      `${BASE}3d/j80/j80.obj`,
      (o) => {
        o.traverse((m) => {
          const mesh = m as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const mapped = mats.map((mm) => (/glass/i.test(mm.name) ? glass : base));
          mesh.material = mapped.length === 1 ? mapped[0] : mapped;
        });
        resolve(o);
      },
      undefined,
      (e) => {
        cache = null;
        reject(e);
      },
    );
  });
  return cache;
}

/** A new instance of the J/80, already placed in the boat frame. Geometry and materials are shared. */
export async function loadJ80(): Promise<THREE.Group> {
  const src = await load();
  const inst = src.clone();
  inst.rotation.y = Math.PI / 2; // model +Z (bow) -> +X, model +X (port) -> -Z
  inst.scale.setScalar(MODEL_SCALE);
  inst.position.set(-MAST_Z * MODEL_SCALE, -WATERLINE_Y * MODEL_SCALE, 0);
  const g = new THREE.Group();
  g.add(inst);
  g.userData.shared = true; // do not dispose: other scenes reuse the geometry and materials
  return g;
}
