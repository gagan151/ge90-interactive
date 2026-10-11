// Fixed dimensions of the figure, in cm-ish world units. s runs along the flow, from the spinner tip back to the tail.
export const XF = 330; // world x of s = 0 (fan face)
export const ZA = 250; // axis height above the plate
export const FAN_BLADES = 22;

export const interp = (table, s) => {
  if (s <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (s <= table[i][0]) {
      const [s0, v0] = table[i - 1];
      const [s1, v1] = table[i];
      const t = (s - s0) / (s1 - s0 || 1);
      return v0 + (v1 - v0) * t;
    }
  }
  return table[table.length - 1][1];
};

export const NACELLE = [[-34, 171], [-30, 166], [-23, 162], [-10, 160.5], [0, 161.5], [60, 162], [120, 159], [200, 152], [280, 144], [330, 139]];
export const CASINGS = [
  { name: "booster case", profile: [[56, 62], [152, 60]], t: 4 },
  { name: "hpc case", profile: [[170, 55.5], [334, 50]], t: 4 },
  { name: "combustor case", profile: [[340, 72], [394, 72]], t: 4 },
  { name: "hpt case", profile: [[398, 74], [444, 76]], t: 4 },
  { name: "lpt case", profile: [[448, 80], [566, 100]], t: 4 },
  { name: "exhaust duct", profile: [[570, 100], [604, 92]], t: 3 },
];
export const FLANGES = [
  { s: 152, r0: 60, w: 16, th: 4 },
  { s: 334, r0: 50, w: 22, th: 4 },
  { s: 394, r0: 72, w: 5, th: 4 },
  { s: 444, r0: 76, w: 5, th: 4 },
  { s: 566, r0: 100, w: 5, th: 4 },
];
export const LINERS = [
  { name: "outer liner", profile: [[344, 62], [390, 58]], t: 2 },
  { name: "inner liner", profile: [[344, 42], [390, 40]], t: 2 },
];

// stages: rotor ring at s (thickness th) from hub to tip; stator vanes at sv
const stage = (s, hub, tip, count, sv, vanes) => ({ s, th: 4, hub, tip, count, sv, vanes });
export const BOOSTER = [0, 1, 2, 3].map((i) => stage(74 + 20 * i, 47, 60 - 0.6 * i, 64 + 6 * i, 84 + 20 * i, 58));
export const HPC = Array.from({ length: 9 }, (_, i) => stage(186 + 17.4 * i, 34 + 1.15 * i, 54.2 - 0.62 * i, 52 + 4 * i, 195 + 17.4 * i, 44 + 3 * i));
export const HPT = [stage(410, 50, 71, 70, 400, 30), stage(430, 52, 75, 78, 420, 36)];
export const LPT = Array.from({ length: 6 }, (_, i) => stage(466 + 17.6 * i, 57 + 1.7 * i, 79 + 3.7 * i, 96 + 8 * i, 456 + 17.6 * i, 80 + 6 * i));
export const FUEL_NOZZLES = 30;

// spool bodies (hub radius along s) used for the drum pieces between rings
export const SPOOLS = [
  { name: "lp-booster", s0: 50, s1: 152, rings: BOOSTER, hub: () => 47, tone: "hi" },
  { name: "hp-compressor", s0: 174, s1: 334, rings: HPC, hub: (s) => 34 + (1.15 * (s - 186)) / 17.4, tone: "hi" },
  { name: "hp-turbine", s0: 336, s1: 440, rings: HPT, hub: (s) => interp([[336, 36], [378, 36], [400, 49], [410, 50], [430, 52], [440, 52]], s), tone: "hi" },
  { name: "lp-turbine", s0: 456, s1: 570, rings: LPT, hub: (s) => 57 + (1.7 * (s - 466)) / 17.6, tone: "hi" },
];
export const LP_SHAFT = [[152, 172, 13], [440, 458, 20]];
export const TAIL = { s0: 570, s1: 656, r: 62 };
export const SPINNER = { s0: -44, s1: 0, r: 56 };

// flow bands for the particles
const T = (...p) => p;
const CORE_LO = [T(-70, 6), T(-44, 4), T(0, 60), T(48, 60), T(62, 49.5), T(152, 49.5), T(172, 36.5), T(334, 46), T(344, 44), T(390, 42), T(402, 46), T(442, 53), T(458, 58), T(568, 68), T(572, 64), T(604, 42), T(640, 10), T(720, 2)];
const CORE_HI = [T(-70, 26), T(-44, 30), T(0, 82), T(48, 82), T(62, 60), T(152, 58), T(172, 53.5), T(334, 48.5), T(344, 60), T(390, 56), T(402, 71), T(444, 74), T(448, 78), T(566, 98), T(604, 90), T(720, 88)];
const CASE_OUT = [T(62, 66), T(160, 66), T(330, 78), T(396, 80), T(446, 86), T(560, 106), T(720, 104)];
const NAC_IN = [T(0, 160.5), T(60, 162), T(120, 159), T(200, 152), T(280, 144), T(330, 139), T(420, 128), T(560, 112), T(720, 100)];
export const coreBand = (s) => [interp(CORE_LO, s), interp(CORE_HI, s)];
export const bypassBand = (s) => {
  const hi = s < 0 ? 158 : interp(NAC_IN, s) - 3;
  const lo = s < 62 ? interp(CORE_HI, s) + 3 : interp(CASE_OUT, s) + 3;
  return [Math.min(lo, hi - 4), hi];
};

export const STATIONS = [
  { id: "inlet", name: "Inlet", s: -30, r: 92 },
  { id: "fan", name: "Fan exit", s: 55, r: 63 },
  { id: "booster", name: "Booster exit", s: 156, r: 54 },
  { id: "hpc", name: "Compressor exit", s: 336, r: 47.5 },
  { id: "burner", name: "Combustor exit", s: 397, r: 58 },
  { id: "hpt", name: "HP turbine exit", s: 443, r: 64 },
  { id: "lpt", name: "LP turbine exit", s: 573, r: 82 },
  { id: "nozzle", name: "Nozzle", s: 606, r: 68 },
];
export const STATION_S = STATIONS.map((x) => x.s);

export const CAR_Y = 205;
export const SLEEVE = [196, 214];
export const ROD_L = 172;
export const ROD_R = 2.2;
export const THROTTLE = { x0: -318, x1: -236, y: 158 };
export const REST_X = XF - STATIONS[0].s;
