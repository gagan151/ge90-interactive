// GE90-115B cycle model: one pure module drives the readout, the caption numbers and every moving part.
// Anchors are published takeoff figures; stage splits and part-power scaling are illustrative.
export const ANCHOR = {
  thrustKn: 513, // 115,300 lbf
  bypass: 9,
  opr: 42,
  fanPr: 1.6,
  boosterPr: 1.4,
  hpcPr: 19,
  fanBlades: 22,
  boosterStages: 4,
  hpcStages: 9,
  hptStages: 2,
  lptStages: 6,
  t0: 288,
  t4: 1700,
};
const GAMMA_C = 1.4, GAMMA_H = 1.33, ETA = 0.9;
const EXP_C = (GAMMA_C - 1) / GAMMA_C / ETA;
const EXP_H = ((GAMMA_H - 1) / GAMMA_H) * ETA;
const CP_C = 1005, CP_H = 1150;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// throttle 0..1: idle to takeoff
export function cycle(throttle) {
  const t = clamp(throttle, 0, 1);
  const n1 = 22 + 78 * t;
  const n2 = 62 + 38 * t;
  const g = 0.37 + 0.63 * t ** 1.3;
  const lnOpr = Math.log(ANCHOR.opr) * g;
  const share = { fan: Math.log(ANCHOR.fanPr), booster: Math.log(ANCHOR.boosterPr), hpc: Math.log(ANCHOR.hpcPr) };
  const sum = share.fan + share.booster + share.hpc;
  const fanPr = Math.exp((lnOpr * share.fan) / sum);
  const boosterPr = Math.exp((lnOpr * share.booster) / sum);
  const hpcPr = Math.exp((lnOpr * share.hpc) / sum);
  const t0 = ANCHOR.t0;
  const tFan = t0 * fanPr ** EXP_C;
  const tBoost = tFan * boosterPr ** EXP_C;
  const tHpc = tBoost * hpcPr ** EXP_C;
  const t4 = 950 + (ANCHOR.t4 - 950) * t ** 1.2;
  const hptDrop = ((tHpc - tBoost) * CP_C) / CP_H;
  const tHpt = t4 - hptDrop;
  const pHptRatio = (t4 / tHpt) ** (1 / EXP_H);
  const bypassFanRise = tFan - t0;
  const lptDrop = ((ANCHOR.bypass * bypassFanRise + (tBoost - t0)) * CP_C) / CP_H;
  const tLpt = tHpt - lptDrop;
  const pLptRatio = (tHpt / tLpt) ** (1 / EXP_H);
  const opr = fanPr * boosterPr * hpcPr;
  const pBurner = opr * 0.95;
  const pHpt = Math.max(1.2, pBurner / pHptRatio);
  const pLpt = Math.max(1.04, pHpt / pLptRatio);
  const massFlow = 1350 * (0.2 + 0.8 * (n1 / 100) ** 1.1);
  const thrustKn = ANCHOR.thrustKn * (0.06 + 0.94 * t ** 2.3);
  return { throttle: t, n1, n2, fanPr, boosterPr, hpcPr, opr, t4, thrustKn, massFlow, tFan, tBoost, tHpc, tHpt, tLpt, pBurner, pHpt, pLpt, hptDrop, lptDrop };
}

// pressure ratio (to ambient) and temperature (K) of the core stream at axial position s
export function stateAt(c, s) {
  const t0 = ANCHOR.t0;
  const lerp = (a, b, f) => a + (b - a) * clamp(f, 0, 1);
  const lnl = (a, b, f) => Math.exp(lerp(Math.log(a), Math.log(b), f));
  const fp = c.fanPr * c.boosterPr;
  if (s < 0) return { p: 1, T: t0, name: "Inlet" };
  if (s < 50) return { p: lnl(1, c.fanPr, s / 50), T: lerp(t0, c.tFan, s / 50), name: "Fan" };
  if (s < 150) return { p: lnl(c.fanPr, fp, (s - 62) / 88), T: lerp(c.tFan, c.tBoost, (s - 62) / 88), name: "Booster" };
  if (s < 330) return { p: lnl(fp, c.opr, (s - 170) / 160), T: lerp(c.tBoost, c.tHpc, (s - 170) / 160), name: "High-pressure compressor" };
  if (s < 392) return { p: c.pBurner, T: lerp(c.tHpc, c.t4, (s - 335) / 40), name: "Combustor" };
  if (s < 440) return { p: lnl(c.pBurner, c.pHpt, (s - 395) / 40), T: lerp(c.t4, c.tHpt, (s - 395) / 40), name: "High-pressure turbine" };
  if (s < 570) return { p: lnl(c.pHpt, c.pLpt, (s - 445) / 120), T: lerp(c.tHpt, c.tLpt, (s - 445) / 120), name: "Low-pressure turbine" };
  return { p: lnl(c.pLpt, 1, (s - 575) / 60), T: lerp(c.tLpt, c.tLpt * 0.97, (s - 575) / 60), name: "Nozzle" };
}

export const fmtK = (k) => `${Math.round(k)} K`;
