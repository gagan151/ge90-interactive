import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = "/Users/gagan/.claude/skills/anatomy";
const k = await import(`${KIT}/kit/iso-kit.mjs`);
const G = await import(`${KIT}/kit/lathe.mjs`);
const { kitScript } = await import(`${KIT}/scripts/inline-kit.mjs`);
import * as E from "./engine.mjs";
import * as M from "./model.mjs";
import { makeParts } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const W = 1000;
const H = 600;

const PLATE = { x: -350, y: -120, w: 760, d: 360, r: 12 };
const PLATE_H = 12;
const FOOT_H = 6;
const RAIL_Y = [196, 214];
const RAIL_Z = 6;
const CARRIAGE_Y = 205;
const ARM_Z = E.ZA;

const AZ = 66;
const EL = 24;
const F = G.frameOf([E.XF, 0, E.ZA], [-1, 0, 0], [0, 0, 1], [0, 1, 0]);
const P0 = k.fitProjection([[0, 0, 0]], W, H, { azimuth: AZ, elevation: EL });
const V0 = G.viewOf(P0);
const PHI = Math.atan2(V0[1], V0[2]);
const extremes = [];
for (let i = 0; i <= 24; i++) {
  const th = PHI + Math.PI / 2 + (Math.PI * i) / 24;
  for (const [s, r] of [[-34, 171], [60, 162], [330, 139], [560, 106], [656, 4]]) extremes.push(G.pointOf(F, s, r, th));
  const full = (i / 24) * Math.PI * 2;
  extremes.push(G.pointOf(F, 22, 161, full), G.pointOf(F, -44, 4, full));
}
const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...extremes, [E.XF + 40, 300, 20]], W, H, { pad: 26, azimuth: AZ, elevation: EL });
const parts = makeParts(k, G, P, { F, E, fanBlades: E.FAN_BLADES });
const { V, pt, at, depth, S, Ln } = parts;
const D3 = (p) => k.iso(p, P);
const items = [];
const put = (key, svg, extra = {}) => items.push({ key, svg, ...extra });
const axisKey = (s) => depth(pt(s, 0, 0));

// ---------- stand ----------
function stand() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  const feet = k.corners(PLATE, 30).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 9, -PLATE_H - FOOT_H, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(Ln(k.planOutline(k.insetPlan(PLATE, 7), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 14);
  out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 3, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(k.dotsSvg(screws.map(([x, y]) => at([x, y, 0])), { size: 0.7 }));
  // ruler strip along the front edge, a tick every 10, a major every 50 and a mark at every station
  const strip = { x: -330, y: 224 - 9, w: 720, d: 9, r: 1.5 };
  out.push(S(k.slabOf(strip, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 6, strip.x + strip.w - 6, 10, 5, strip.y + 0.8, 0.8, [2.5, 5], P);
  out.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  out.push(k.dotsSvg([at([strip.x + 3, strip.y + 4.5, 0.8]), at([strip.x + strip.w - 3, strip.y + 4.5, 0.8])], { size: 0.6 }));
  // station marks on the strip (where the probe parks)
  const marks = E.STATION_S.map((s) => k.lineOnTop([E.XF - s, strip.y + 0.6], [E.XF - s, strip.y + strip.d - 0.6], 0.8, P)).join("");
  out.push(Ln(marks, { tone: "hi" }));
  return out.join("");
}

function cradles() {
  const out = [];
  for (const s of [118, 506]) {
    const x = E.XF - s;
    const r = s < 300 ? 164 : 96;
    const top = E.ZA - r - 4;
    const base = { x: x - 22, y: -64, w: 44, d: 128, r: 4 };
    out.push(S(k.slabOf(base, 0, 10, P, 4, 1), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 16, y: -54, w: 32, d: 108, r: 3 }, 10, top - 10 - 14, P, 4, 1), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 22, y: -56, w: 44, d: 112, r: 4 }, top - 14, 14, P, 4, 1), { tone: "hi" }));
    out.push(Ln(k.planOutline(k.insetPlan({ x: x - 22, y: -56, w: 44, d: 112, r: 4 }, 4), top, P, 3), { tone: "faint" }));
    out.push(k.dotsSvg([[x - 14, -44], [x + 14, -44], [x - 14, 44], [x + 14, 44]].map(([xx, yy]) => at([xx, yy, 10])), { size: 0.7 }));
    out.push(k.dotsSvg([[x - 14, -46], [x + 14, -46], [x - 14, 46], [x + 14, 46]].map(([xx, yy]) => at([xx, yy, top])), { size: 0.7 }));
  }
  return out.join("");
}

// ---------- engine: shells (back half of every case, seen from inside) ----------
function nacelle() {
  const prof = E.NACELLE;
  const cuts = [0, 3, 5, 7, 9];
  for (let i = 0; i < cuts.length - 1; i++) {
    const seg = prof.slice(cuts[i], cuts[i + 1] + 1);
    const sh = parts.shell(seg, 6);
    put(sh.key, S(sh.paths, { tone: "lo" }), { name: `nacelle.${i}` });
  }
}
function casings() {
  for (const c of E.CASINGS) {
    const sh = parts.shell(c.profile, c.t);
    put(sh.key, S(sh.paths, { tone: "mid" }), { name: c.name });
  }
  for (const f of E.FLANGES) {
    const sh = parts.shell([[f.s, f.r0], [f.s + f.th, f.r0]], f.w);
    put(sh.key, S(sh.paths, { tone: "mid" }), { name: `flange.${f.s}` });
  }
  for (const l of E.LINERS) {
    const sh = parts.shell(l.profile, l.t);
    put(sh.key, S(sh.paths, { tone: "hi" }), { name: l.name });
  }
  // dome ring and the fuel nozzles on the back half
  const dome = parts.shell([[340, 41], [346, 41]], 22);
  put(dome.key, S(dome.paths, { tone: "hi" }), { name: "dome" });
  const nz = G.spokesOf(F, 342, 62, 76, E.FUEL_NOZZLES / 2, P, { from: parts.A0 + 0.1, to: parts.A1 - 0.1 });
  put(parts.depth(pt(342, 50, parts.phi + Math.PI)) + 0.2, Ln(nz, { tone: "hi" }), { name: "fuel-nozzles" });
}
function statorRows() {
  const hubOf = (name) => E.SPOOLS.find((sp) => sp.name === name).hub;
  const rows = [
    ...E.BOOSTER.map((g) => [g.sv, hubOf("lp-booster")(g.sv), E.interp([[56, 62], [152, 60]], g.sv), g.vanes]),
    ...E.HPC.map((g) => [g.sv, hubOf("hp-compressor")(g.sv), E.interp([[170, 55.5], [334, 50]], g.sv), g.vanes]),
    ...E.HPT.map((g) => [g.sv, hubOf("hp-turbine")(g.sv), g.sv < 420 ? 72.5 : 75, g.vanes]),
    ...E.LPT.map((g) => [g.sv, hubOf("lp-turbine")(g.sv), E.interp([[448, 80], [566, 100]], g.sv), g.vanes]),
  ];
  for (const [s, r0, r1, n] of rows) {
    const key = depth(pt(s, (r0 + r1) / 2 * 0.64, parts.phi + Math.PI));
    put(key, Ln(parts.vanes(s, Math.max(2, r0 - 5), r1, n) + parts.arcIn(s, r1), { tone: "lo" }), { name: `vanes.${s}` });
  }
  // outlet guide vanes in the bypass duct
  const ogv = parts.vanes(62, 64.5, 160.5, 44) + parts.arcIn(62, 160.5) + parts.arcIn(62, 64.5);
  put(depth(pt(62, 90, parts.phi + Math.PI)), Ln(ogv, { tone: "mid" }), { name: "ogv" });
}
function flangeBolts() {
  for (const s of [60, 200, 280]) {
    const r = E.interp(E.NACELLE, s);
    const sh = parts.shell([[s, r], [s + 5, r]], 9);
    put(sh.key + 0.1, S(sh.paths, { tone: "mid" }) + k.dotsSvg(parts.backDots(s, r + 4.5, 36), { size: 0.5 }), { name: `nacelle.flange.${s}` });
  }
  for (const f of E.FLANGES) {
    const sh = parts.shell([[f.s, f.r0], [f.s + f.th, f.r0]], f.w);
    put(sh.key + 0.2, k.dotsSvg(parts.backDots(f.s, f.r0 + f.w / 2, Math.round(f.r0 / 4)), { size: 0.45 }), { name: `bolts.${f.s}` });
  }
  const struts = [0.12, 0.31, 0.5, 0.69, 0.88].map((u) => parts.strut(574, 581, 62.5, 99, parts.A0 + (parts.A1 - parts.A0) * u, 1.6));
  struts.forEach((st, i) => put(st.key, st.svg, { name: `rear-strut.${i}` }));
}

// ---------- engine: rotors ----------
const rotorLinePaths = [];
function spools() {
  for (const sp of E.SPOOLS) {
    const rings = [...sp.rings].sort((a, b) => a.s - b.s);
    let cur = sp.s0;
    const piece = (a, b) => {
      const profile = [[a, sp.hub(a)], [b, sp.hub(b)]];
      put(axisKey((a + b) / 2), S(G.solidOf(profile, F, P), { tone: sp.tone }), { name: `${sp.name}.drum${Math.round(a)}` });
    };
    for (const g of rings) {
      if (g.s > cur + 0.1) piece(cur, g.s);
      const idx = rotorLinePaths.length;
      const hp = sp.name.startsWith("hp");
      rotorLinePaths.push({ stage: g, hp });
      put(axisKey(g.s + g.th / 2) + 0.01, `<g>${S(G.disc(g.s, g.s + g.th, g.tip, F, P), { tone: "hi" })}<path class="iso-line" data-tone="lo" data-rotor="${idx}" d="${parts.rotorLines(g, 0)}"/></g>`, { name: `${sp.name}.ring${idx}` });
      cur = g.s + g.th;
    }
    if (sp.s1 > cur + 0.1) piece(cur, sp.s1);
  }
  // LP shaft where it comes out of the booster drum and the HP shaft
  for (const [a, b, r] of E.LP_SHAFT) put(axisKey((a + b) / 2), S(G.solidOf([[a, r], [b, r]], F, P), { tone: "mid" }), { name: `lp-shaft.${a}` });
  // HP shaft front face: the LP shaft goes in through its bore
  put(axisKey(173), S(G.ringBand(172, 176, 13, 34.5, F, P), { tone: "hi" }), { name: "hp-shaft.front" });
  // tail cone
  const T = E.TAIL;
  const prof = Array.from({ length: 26 }, (_, i) => {
    const x = i / 25;
    return [T.s0 + (T.s1 - T.s0) * x, T.r * (1 - x) ** 0.85, i && i < 25 ? 1 : 0];
  });
  const slope = (s) => {
    const x = Math.min(0.995, (s - T.s0) / (T.s1 - T.s0));
    return (-T.r * 0.85 * (1 - x) ** -0.15) / (T.s1 - T.s0);
  };
  put(axisKey(610), S(G.solidOf(prof, F, P, { smooth: { slope } }), { tone: "hi" }), { name: "tail-cone" });
  // fan hub and spinner
  put(axisKey(25), S(G.solidOf([[0, 56], [4, 58.5], [46, 58.5], [50, 56]], F, P), { tone: "hi" }) + Ln(G.arcOf(F, 6, 58.5, P), { tone: "faint" }), { name: "fan.hub" });
  put(axisKey(-22), `<g>${S(G.solidOf(parts.spinnerProfile(), F, P, { smooth: { slope: parts.spinnerSlope } }), { tone: "hi", lit: false })}<path class="iso-line" data-tone="mid" data-part="spinner-stripes" d="${parts.spinnerStripes(0)}"/></g>`, { name: "spinner" });
  const blades = parts.fanBlades(0);
  put(axisKey(25) - 0.05, `<g data-part="fan-back">${blades.back}</g>`, { name: "fan.back" });
  put(axisKey(25) + 0.05, `<g data-part="fan-front">${blades.front}</g>`, { name: "fan.front" });
}

const base = [stand(), cradles()].join("");
nacelle();
casings();
statorRows();
flangeBolts();
spools();

// flow bins (filled by the live page)
const depths = items.map((i) => i.key);
const lo = Math.min(...depths) - 20;
const hi = Math.max(...depths) + 60;
const BIN = 6;
const bins = Math.ceil((hi - lo) / BIN);
for (let b = 0; b < bins; b++) put(lo + (b + 0.5) * BIN, `<path class="ge-flow" data-tone="mid" data-bin="${b}" data-stream="bypass" d=""/><path class="ge-flow ge-core" data-tone="lit" data-bin="${b}" data-stream="core" d=""/>`, { name: `bin${b}`, bin: b });
items.sort((a, b) => a.key - b.key);

// ---------- front of the stand: rail, probe carriage, throttle quadrant ----------
const DIAL = { dx: 15, dy: E.CAR_Y, r: 14, z: 14, h: 7 };
function rail() {
  const out = [];
  for (const y of E.RAIL_Y ?? RAIL_Y) {
    out.push(S(k.slabOf({ x: -332, y: y - 3, w: 728, d: 6, r: 1.5 }, 0, RAIL_Z, P, 3, 0.4), { tone: "mid" }));
    out.push(k.dotsSvg([-318, -150, 20, 190, 360].map((x) => at([x, y, RAIL_Z])), { size: 0.5 }));
  }
  for (const x of [-338, 392]) {
    out.push(S(k.slabOf({ x, y: 188, w: 8, d: 34, r: 1.5 }, 0, 18, P, 3, 0.6), { tone: "mid" }));
    out.push(k.dotsSvg([at([x + 4, 194, 18]), at([x + 4, 216, 18])], { size: 0.6 }));
  }
  return out.join("");
}
function carriage() {
  const x0 = E.REST_X;
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan({ x: x0 - 26, y: 188, w: 52, d: 34, r: 3 }, 3), RAIL_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const y of RAIL_Y) for (const dx of [-16, 16]) out.push(S(k.slabOf({ x: x0 + dx - 6, y: y - 4.5, w: 12, d: 9, r: 1.5 }, RAIL_Z, 4, P, 3, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x0 - 26, y: 188, w: 52, d: 34, r: 3 }, RAIL_Z + 4, 8, P, 4, 0.6), { tone: "mid" }));
  out.push(Ln(k.planOutline(k.insetPlan({ x: x0 - 26, y: 188, w: 52, d: 34, r: 3 }, 3), RAIL_Z + 12, P, 3), { tone: "faint" }));
  out.push(k.dotsSvg([[-21, 193], [21, 193], [-21, 217], [21, 217]].map(([dx, y]) => at([x0 + dx, y, RAIL_Z + 12])), { size: 0.5 }));
  // post and sleeve that carry the probe rod
  const post = [x0 - 10, E.CAR_Y];
  out.push(S(k.cylinder(post[0], post[1], 7, RAIL_Z + 12, 4, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(post[0], post[1], 4.6, RAIL_Z + 16, E.ZA - 8 - (RAIL_Z + 16), P, 24), { tone: "mid", crease: "none" }));
  out.push(Ln([90, 150, 200].map((z) => k.sideArc(post[0], post[1], 4.6, z, P, 14)).join(""), { tone: "faint" }));
  return out.join("");
}
function sleeve() {
  const x0 = E.REST_X;
  const Fy = G.frameAlong([x0 - 10, 0, E.ZA], [0, 1, 0]);
  const [a, b] = E.SLEEVE;
  const out = [S(G.disc(a, b, 7.2, Fy, P, { steps: 28, bevel: 0.4 }), { tone: "mid" })];
  out.push(Ln(G.arcOf(Fy, a + 3, 7.2, P), { tone: "faint" }), Ln(G.arcOf(Fy, b - 3, 7.2, P), { tone: "faint" }));
  return out.join("");
}
function dial() {
  const x0 = E.REST_X;
  const cx = x0 + DIAL.dx;
  const cy = DIAL.dy;
  const top = DIAL.z + DIAL.h;
  const out = [S(k.cylinder(cx, cy, DIAL.r, DIAL.z, DIAL.h, P, 48, 0.6), { tone: "hi", crease: "lo" })];
  out.push(Ln(k.knurl(cx, cy, DIAL.r, top - 2.6, top, 64, P, 0.3), { tone: "lo" }));
  out.push(Ln(k.ring(cx, cy, DIAL.r - 1.8, top, P, 48), { tone: "lo" }));
  const major = [1, 2, 5, 10, 20, 40].map((v) => k.lineOnTop(parts.onDial(cx, cy, parts.dialAng(v), DIAL.r - 2.2), parts.onDial(cx, cy, parts.dialAng(v), DIAL.r - 5.6), top, P)).join("");
  const minor = [1.5, 3, 4, 7, 15, 30, 45].map((v) => k.lineOnTop(parts.onDial(cx, cy, parts.dialAng(v), DIAL.r - 2.2), parts.onDial(cx, cy, parts.dialAng(v), DIAL.r - 4), top, P)).join("");
  out.push(Ln(minor, { tone: "lo" }), Ln(major, { tone: "mid" }));
  out.push(k.dotsSvg([at([cx, cy, top])], { size: 0.8, tone: "hi" }));
  return out.join("");
}
function throttle() {
  const T = E.THROTTLE;
  const out = [];
  const plan = { x: T.x0 - 18, y: T.y - 26, w: T.x1 - T.x0 + 36, d: 52, r: 5 };
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, 0, 8, P)}" style="filter:blur(5px)"/>`);
  out.push(S(k.slabOf(plan, 0, 8, P, 5, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf({ x: T.x0 - 8, y: T.y - 5, w: T.x1 - T.x0 + 16, d: 10, r: 4 }, 8, 0.8, P, 6), { tone: "lo", crease: "none" }));
  out.push(Ln(k.planOutline({ x: T.x0 - 8, y: T.y - 5, w: T.x1 - T.x0 + 16, d: 10, r: 4 }, 8.8, P, 6), { tone: "faint" }));
  out.push(S(k.slabOf({ x: T.x0 - 4, y: T.y - 23, w: T.x1 - T.x0 + 8, d: 6, r: 1 }, 8, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(T.x0, T.x1, (T.x1 - T.x0) / 10, 5, T.y - 22.4, 8.6, [2.2, 4], P);
  out.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "hi" }));
  out.push(k.dotsSvg([[T.x0 - 12, T.y - 20], [T.x1 + 12, T.y - 20], [T.x0 - 12, T.y + 20], [T.x1 + 12, T.y + 20]].map(([x, y]) => at([x, y, 8])), { size: 0.55 }));
  return out.join("");
}
function lever() {
  const T = E.THROTTLE;
  const out = [S(k.slabOf({ x: T.x0 - 5, y: T.y - 7, w: 10, d: 14, r: 2 }, 8, 4, P, 3, 0.4), { tone: "mid" })];
  out.push(S(k.cylinder(T.x0, T.y, 2.6, 12, 22, P, 20), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(T.x0, T.y, 6.5, 34, 11, P, 32, 0.6), { tone: "hi", lit: true }));
  out.push(Ln(k.knurl(T.x0, T.y, 6.5, 34, 45, 28, P, 0.3), { tone: "lo" }));
  return out.join("");
}
const rodRest = parts.probeRod(E.REST_X - 10, E.STATIONS[0].r + 60);
const front = [
  rail(),
  throttle(),
  `<g data-part="lever" transform="${k.translateAlong(P, [0, 0, 0])}">${lever()}</g>`,
  `<g data-part="carriage" transform="${k.translateAlong(P, [0, 0, 0])}">`,
  carriage(),
  `<g data-part="rod-front">${rodRest.front}</g>`,
  sleeve(),
  `<g data-part="rod-rear">${rodRest.rear}</g>`,
  dial(),
  `<path class="iso-line" data-tone="lit" data-free="start" data-part="needle" style="stroke-width:1" d="${parts.needleAt(E.REST_X + DIAL.dx, DIAL.dy, DIAL.z + DIAL.h + 0.2, 1, DIAL.r - 3.4)}"/>`,
  `</g>`,
].join("");

const svg = k.figureSvg({
  width: W,
  height: H,
  label: "A GE90-115B turbofan on a test stand with its near half cut away. A probe on a rail reads pressure and temperature at each station; a throttle lever sets the power.",
  body: [base, `<g data-layer="engine">${items.map((i) => i.svg).join("")}</g>`, front],
});

const strip = (file) => readFileSync(join(HERE, file), "utf8");
const wrap = (name, source) => {
  const names = [...source.matchAll(/^export (?:const|function) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
  return `const ${name} = (() => {${source.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };})();\n`;
};
const latheSource = readFileSync(`${KIT}/kit/lathe.mjs`, "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, sphereOf, prismOf, circleOf, arcOf, spokesOf, ribsOf, dotsOf, solidOf, lathe, dot3, add3, sub3, mul3, unit3, cross3, len3, lightOf, toneOf, radialOf };})();\n`;
const partsScript = strip("parts.mjs").replace(/^export /gm, "");
const DATA = { P, bins: { lo, size: BIN, count: bins }, stations: E.STATIONS.map((s) => ({ ...s, x: E.XF - s.s })) };
const live = strip("live.js").replace("__DATA__", JSON.stringify(DATA));
const css = strip("ge90.css");

const body = `<style>${css}</style>` + k.plateHtml({
  fig: "Fig 1",
  title: "GE90-115B",
  hint: "Hover: probe · drag the lever · ← → ↑ ↓",
  readout: "inlet · 1.00 : 1 · 288 K",
  keys: [
    { mark: "lit", label: "Core air: through the compressor, combustor and both turbines" },
    { mark: "raised", label: "Bypass air: around the core, 9 times the mass" },
  ],
  caption:
    "A GE90-115B with its near half cut away, mounted on a test stand. The 22 composite fan blades, 3.25 m across, push most of the air around the core; the core air is squeezed by a 4-stage booster and a 9-stage compressor, burned with fuel, and expanded through a 2-stage high-pressure turbine, which drives the compressor, and a 6-stage low-pressure turbine, which drives the fan and booster through the inner shaft. Move the probe to read the air at each station and slide the throttle lever; at takeoff power the engine makes 115,300 lbf (513 kN) with an overall pressure ratio of about 42 : 1. Stage-by-stage splits and part-power values are modelled from those anchors, and the rotors are drawn in slow motion.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="GE90 engine: arrow left and right move the probe between stations, up and down move the throttle" aria-valuemin="0" aria-valuemax="7" aria-valuenow="0">${svg}</div>`,
});
const page = k.pageHtml({
  title: "GE90-115B",
  theme: THEME,
  body,
  script: kitScript() + latheScript + wrap("E", strip("engine.mjs")) + wrap("M", strip("model.mjs")) + partsScript + live,
  width: 1000,
});
const name = THEME === "light" ? "ge90-light.html" : "ge90.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, items.length, "items", `${(page.length / 1024).toFixed(0)} KB`, "scale", P.scale.toFixed(3));
