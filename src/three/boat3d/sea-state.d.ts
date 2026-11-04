export interface Wave { dx: number; dy: number; L: number; a: number }
export function buildWaves(o?: { twsKn?: number; twdDeg?: number; fetchM?: number; n?: number; spread?: number; scale?: number }): { waves: Wave[]; hs: number; tp: number };
export function seaFromWind(uMs: number, fetchM: number): { hs: number; fp: number; tp: number };
