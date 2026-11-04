import type * as THREE from 'three';
export class WaterFX {
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, opts?: { reflect?: boolean; size?: number; quality?: 'high' | 'ultra'; normalMap?: string | null });
  mesh: THREE.Mesh;
  uniforms: Record<string, { value: any }>;
  enabled: boolean;
  setWaves(waves: { dx: number; dy: number; L: number; a: number }[]): void;
  setGusts(puffs: { x: number; z: number; s: number }[], dir?: [number, number], U?: number, along?: number): void;
  setCutters(list: { x: number; z: number; s: number; dx: number; dz: number; v: number }[]): void;
  setSkyMap(tex: THREE.Texture | null, yaw?: number): void;
  setSky(top: number, horizon: number): void;
  setSun(v: THREE.Vector3): void;
  trail(id: string, x: number, z: number, tSec: number, speedKn?: number): void;
  clearTrail(): void;
  update(camera: THREE.Camera, tSeconds: number, span?: number, anchor?: THREE.Vector3 | null): void;
  dispose(): void;
}
