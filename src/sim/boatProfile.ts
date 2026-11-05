// Reference boat profile. Every number the physics model uses about the boat lives
// here so the simulator can later be calibrated for a specific 20–30 ft monohull.
// Defaults approximate a J/80-type heavy-displacement match-racing keelboat.

export interface BoatProfile {
  name: string;
  /** Displacement incl. rig, kg (crew added separately). */
  displacement: number;
  crewMass: number; // kg
  lwl: number; // waterline length, m
  wettedArea: number; // m²
  /** Static stability: righting arm GZ ≈ gm·sin(φ)·(1 − (φ/φv)²·k). */
  gm: number; // m
  /** Crew righting lever at full hike / inboard, m. */
  crewArmHiked: number;
  crewArmInboard: number;
  mastHeight: number; // above deck, m
  boomHeight: number; // m
  mainArea: number; // m²
  jibArea: number; // m²
  gennakerArea: number; // m²
  /** Longitudinal centre of effort positions relative to CLR (+ aft), m. */
  mainCEx: number;
  jibCEx: number;
  gennakerCEx: number;
  /** Effective keel+rudder lateral area and rudder data. */
  keelArea: number; // m²
  rudderArea: number; // m²
  rudderLever: number; // m aft of CLR
  rudderStall: number; // deg — beyond this the rudder loses grip
  /** Helm comfort limit, deg of rudder before the helm "fights". */
  rudderComfort: number;
  /** Jib winch: max rope speed (m/s) in high/low gear, and power-limited load. */
  winch: { highGearRate: number; lowGearRate: number; highGearMaxLoad: number; lowGearMaxLoad: number; tailRate: number };
  /** Jib sheet travel from fully eased to block-to-block, m of rope. */
  jibSheetTravel: number;
  mainSheetTravel: number;
}

export const J80_PROFILE: BoatProfile = {
  name: 'Reference 26 ft match-racing keelboat (J/80 type)',
  displacement: 1330,
  crewMass: 330,
  lwl: 6.6,
  wettedArea: 15.5,
  gm: 0.95,
  crewArmHiked: 1.15,
  crewArmInboard: 0.35,
  mastHeight: 10.4,
  boomHeight: 1.1,
  mainArea: 25.3,
  jibArea: 13.8,
  gennakerArea: 64,
  mainCEx: 0.78,
  jibCEx: -1.55,
  gennakerCEx: -1.9,
  keelArea: 1.25,
  rudderArea: 0.36,
  rudderLever: 2.6,
  rudderStall: 13,
  rudderComfort: 7,
  winch: { highGearRate: 0.32, lowGearRate: 0.13, highGearMaxLoad: 900, lowGearMaxLoad: 2600, tailRate: 0.9 },
  jibSheetTravel: 2.6,
  mainSheetTravel: 2.2,
};
