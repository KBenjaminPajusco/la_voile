// Lesson-lab presets expressed RELATIVE to the optimal trim for the preset's wind and angle
// ("main eased 6 points", "car up 20"), so they keep their meaning when the physics is retuned.
// One table for both languages, by lesson id and preset index; it overrides the controls written
// in the lesson files. `delta` is added to the optimum, `set` gives absolute values.
import type { Controls } from './types';

export interface PresetTune {
  delta?: Partial<Controls>;
  set?: Partial<Controls>;
}

export const LAB_TUNING: Record<string, PresetTune[]> = {
  mainsheet: [{ delta: { mainSheet: -0.06 } }, { delta: { mainSheet: 0.03 } }, { delta: { mainSheet: 0.15 } }],
  vang: [{ set: { vang: 0 }, delta: { mainSheet: -0.05 } }, { delta: { mainSheet: -0.05 } }, { set: { vang: 1 }, delta: { mainSheet: 0.02 } }],
  'main-leech': [{ delta: { mainSheet: -0.07 } }, {}, { set: { vang: 0.6 }, delta: { mainSheet: 0.16 } }],
  'main-twist': [{ delta: { mainSheet: 0.1 } }, {}, { delta: { mainSheet: -0.07 }, set: { backstay: 1 } }],
  'heel-angle': [
    { set: { hike: 0.1 }, delta: { backstay: -0.3 } },
    { set: { hike: 1 }, delta: { backstay: -0.3 } },
    { set: { hike: 1 } },
  ],
  'weather-helm': [{ set: { hike: 0.6 }, delta: { mainSheet: 0.12, traveller: 0.2, jibSheet: -0.08 } }, {}, { delta: { mainSheet: -0.05, traveller: -0.2 } }],
  'rudder-load': [
    { set: { hike: 0.6 }, delta: { mainSheet: 0.05, traveller: 0.12, jibSheet: -0.04 } },
    {},
    // the 16-kn trim, unchanged, hit by 21 kn
    { set: { mainSheet: 0.8, traveller: 0.51, jibSheet: 0.84, backstay: 0.94, hike: 1 } },
  ],
  'speed-acceleration': [{ delta: { jibSheet: -0.08, mainSheet: -0.04 } }, { delta: { jibSheet: 0.06, mainSheet: 0.08 } }, {}],
  'apparent-wind': [{}, {}, {}],
  'main-jib-balance': [{ set: { jibLead: 0.25 }, delta: { jibSheet: 0.12 } }, {}, { delta: { mainSheet: 0.15, traveller: 0.15, jibSheet: -0.06 } }],
  'crew-weight': [{ set: { hike: 0 } }, { set: { hike: 1 } }, { set: { hike: 0 } }],
  'jib-draft-twist': [{ delta: { jibSheet: -0.08 }, set: { jibHalyard: 0.35 } }],
  'upwind-downwind-modes': [
    { delta: { jibSheet: 0.02, mainSheet: 0.02, backstay: 0.05 } },
    { delta: { mainSheet: -0.01, traveller: -0.04, backstay: -0.07 } },
    {},
  ],
};

export function tunePreset(id: string, i: number, base: Controls, controls: Partial<Controls>): Controls {
  const t = LAB_TUNING[id]?.[i];
  if (!t) return { ...base, ...controls };
  const out = { ...base };
  for (const [k, d] of Object.entries(t.delta ?? {})) (out as any)[k] = Math.max(0, Math.min(1, (out as any)[k] + (d as number)));
  return { ...out, ...(t.set ?? {}) };
}
