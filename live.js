
const D = __DATA__;
const P = D.P;
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, lineOnTop };
const F = G.frameOf([E.XF, 0, E.ZA], [-1, 0, 0], [0, 0, 1], [0, 1, 0]);
const PARTS = makeParts(K, G, P, { F, E, fanBlades: E.FAN_BLADES });
const TAU = Math.PI * 2;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (sel) => svg.querySelector(sel);
const $$ = (sel) => [...svg.querySelectorAll(sel)];
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (t) => t * t * (3 - 2 * t);

const el = {
  fanBack: $('[data-part="fan-back"]'),
  fanFront: $('[data-part="fan-front"]'),
  stripes: $('[data-part="spinner-stripes"]'),
  rotors: $$("[data-rotor]"),
  carriage: $('[data-part="carriage"]'),
  rodFront: $('[data-part="rod-front"]'),
  rodRear: $('[data-part="rod-rear"]'),
  needle: $('[data-part="needle"]'),
  lever: $('[data-part="lever"]'),
};
const ROTORS = [...E.BOOSTER.map((g) => ({ g, hp: false })), ...E.HPC.map((g) => ({ g, hp: true })), ...E.HPT.map((g) => ({ g, hp: true })), ...E.LPT.map((g) => ({ g, hp: false }))];
// rotor paths were emitted in spool order: booster, compressor, turbines
const ROTOR_ORDER = [...E.SPOOLS.flatMap((sp) => [...sp.rings].sort((a, b) => a.s - b.s).map((g) => ({ g, hp: sp.name.startsWith("hp") })))];
const bins = [];
for (const path of $$("[data-bin]")) {
  const b = Number(path.dataset.bin);
  bins[b] ??= {};
  bins[b][path.dataset.stream] = path;
}
for (const b of bins) {
  if (!b) continue;
  const hot = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hot.setAttribute("class", "ge-hot");
  b.core.parentNode.insertBefore(hot, b.core);
  b.hot = hot;
}

const stations = D.stations;
const stationAt = (index) => stations[clamp(index, 0, stations.length - 1)];
const throttleSlot = { a: iso([E.THROTTLE.x0, E.THROTTLE.y, 8], P), b: iso([E.THROTTLE.x1, E.THROTTLE.y, 8], P) };
const axisA = iso(PARTS.pt(-30, 0, 0), P);
const axisB = iso(PARTS.pt(606, 0, 0), P);

const st = {
  throttle: 1,
  throttleTarget: 1,
  station: 0,
  xc: E.REST_X,
  ins: 1,
  phaseLP: 0,
  phaseHP: 0,
  tour: !still.matches,
  tourClock: 0,
  idleTimer: 0,
  drag: false,
  visible: false,
  frame: 0,
  last: 0,
  text: "",
};

// particles
const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const COUNT = { core: 150, bypass: 200 };
const particles = [];
for (const stream of ["core", "bypass"]) {
  for (let i = 0; i < COUNT[stream]; i++) particles.push({ stream, s: -70 + rand() * (stream === "core" ? 770 : 540), f: rand(), th: stream === "core" ? rand() * TAU : PARTS.A0 + 0.05 + rand() * (PARTS.A1 - PARTS.A0 - 0.1), v: 40 });
}
const areaOf = (band) => Math.PI * (band[1] * band[1] - band[0] * band[0]);
const REF = { core: E.coreBand(-10), bypass: E.bypassBand(-10) };

function velocity(stream, s, c) {
  const band = stream === "core" ? E.coreBand(s) : E.bypassBand(s);
  let rho;
  if (stream === "core") {
    const state = M.stateAt(c, s);
    rho = state.p / state.T;
  } else {
    rho = s < 55 ? (1 + (c.fanPr - 1) * clamp(s / 50, 0, 1)) / (288 + (c.tFan - 288) * clamp(s / 50, 0, 1)) : c.fanPr / c.tFan;
  }
  const ref = REF[stream];
  const v = 84 * (c.massFlow / 1350) * (((1 / 288) * areaOf(ref)) / (rho * areaOf(band)));
  return clamp(v, 10, 150);
}

function stepFlow(dt, c) {
  for (const p of particles) {
    p.v = velocity(p.stream, p.s, c);
    p.s += p.v * dt;
    if (p.s > (p.stream === "core" ? 700 : 470)) {
      p.s = -70;
      p.f = rand();
      p.th = p.stream === "core" ? rand() * TAU : PARTS.A0 + 0.05 + rand() * (PARTS.A1 - PARTS.A0 - 0.1);
    }
  }
}

function drawFlow() {
  const core = [], bypass = [], hot = [];
  for (const p of particles) {
    const band = p.stream === "core" ? E.coreBand(p.s) : E.bypassBand(p.s);
    let r = band[0] + p.f * (band[1] - band[0]);
    const p3 = PARTS.pt(p.s, r, p.th);
    const b = clamp(Math.floor((PARTS.depth(p3) - D.bins.lo) / D.bins.size), 0, D.bins.count - 1);
    const [x, y] = iso(p3, P);
    const back = PARTS.pt(p.s - p.v * 0.09, r, p.th);
    const [x0, y0] = iso(back, P);
    const dot = `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}`;
    (p.stream === "core" ? core : bypass)[b] = ((p.stream === "core" ? core : bypass)[b] ?? "") + dot;
    if (p.stream === "core" && p.s > 346 && p.s < 392) hot[b] = (hot[b] ?? "") + dot;
  }
  for (let b = 0; b < D.bins.count; b++) {
    const e = bins[b];
    if (!e) continue;
    const set = (node, d) => { if (node.__d !== d) { node.__d = d; node.setAttribute("d", d); } };
    set(e.core, core[b] ?? "");
    set(e.bypass, bypass[b] ?? "");
    set(e.hot, hot[b] ?? "");
  }
}

let lastBlades = -1;
function drawRotors() {
  const lp = st.phaseLP, hp = st.phaseHP;
  el.rotors.forEach((path, i) => {
    const r = ROTOR_ORDER[i];
    path.setAttribute("d", PARTS.rotorLines(r.g, r.hp ? hp : lp));
  });
  const key = Math.round((lp % (TAU / E.FAN_BLADES)) * 400);
  const blades = PARTS.fanBlades(lp);
  el.fanBack.innerHTML = blades.back;
  el.fanFront.innerHTML = blades.front;
  el.stripes.setAttribute("d", PARTS.spinnerStripes(lp));
}

function drawProbe(c) {
  const target = stationAt(st.station);
  const dx = st.xc - E.REST_X;
  el.carriage.setAttribute("transform", translateAlong(P, [dx, 0, 0]));
  const out = Math.max(target.r + 60, 150);
  const tip = out + (target.r - out) * smooth(clamp(st.ins, 0, 1));
  const rod = PARTS.probeRod(E.REST_X - 10, tip);
  el.rodFront.innerHTML = rod.front;
  el.rodRear.innerHTML = rod.rear;
  const s = E.XF - st.xc;
  const state = M.stateAt(c, s);
  el.needle.setAttribute("d", PARTS.needleAt(E.REST_X + 15, 205, 21.2, state.p, 10.6));
  const lever = E.THROTTLE.x0 + (E.THROTTLE.x1 - E.THROTTLE.x0) * st.throttle;
  el.lever.setAttribute("transform", translateAlong(P, [lever - E.THROTTLE.x0, 0, 0]));
  return state;
}

function say(c, state) {
  const target = stationAt(st.station);
  const arrived = st.ins > 0.85;
  const head = arrived ? target.name : "→ " + target.name;
  const tail = `N1 ${c.n1.toFixed(0)}% · ${c.thrustKn.toFixed(0)} kN`;
  const text = arrived ? `${head} · ${state.p.toFixed(state.p < 10 ? 2 : 1)} : 1 · ${Math.round(state.T)} K · ${tail}` : `${head} · ${tail}`;
  if (text !== st.text) {
    st.text = text;
    readout.textContent = text;
    stage.setAttribute("aria-valuenow", String(st.station));
    stage.setAttribute("aria-valuetext", text);
  }
}

function tick(now) {
  const dt = st.last ? Math.min((now - st.last) / 1000, 1 / 30) : 1 / 60;
  st.last = now;
  const calm = still.matches;
  if (st.tour) {
    st.tourClock += dt;
    const slot = 4.6;
    const n = Math.floor(st.tourClock / slot);
    const lap = Math.floor(n / stations.length);
    st.station = n % stations.length;
    st.throttleTarget = lap % 2 === 0 ? 1 : 0.35;
  }
  st.throttle += (st.throttleTarget - st.throttle) * (calm ? 1 : 1 - Math.exp(-dt / 0.6));
  if (Math.abs(st.throttle - st.throttleTarget) < 0.001) st.throttle = st.throttleTarget;
  const c = M.cycle(st.throttle);
  // probe: pull out, slide, push in
  const goal = stationAt(st.station).x;
  const moving = Math.abs(goal - st.xc) > 0.4;
  const insGoal = moving ? 0 : 1;
  st.ins += (insGoal - st.ins) * (calm ? 1 : 1 - Math.exp(-dt / 0.15));
  if (Math.abs(st.ins - insGoal) < 0.002) st.ins = insGoal;
  if (moving && st.ins < 0.06) st.xc += (goal - st.xc) * (calm ? 1 : 1 - Math.exp(-dt / 0.2));
  if (Math.abs(goal - st.xc) < 0.4) st.xc = goal;
  if (!calm) {
    st.phaseLP += dt * TAU * 0.13 * (c.n1 / 100);
    st.phaseHP += dt * TAU * 0.13 * 4.6 * (c.n2 / 100) * 0.5;
    stepFlow(dt, c);
  }
  drawRotors();
  drawFlow();
  const state = drawProbe(c);
  say(c, state);
  st.frame = st.visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!st.frame && st.visible) { st.last = 0; st.frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { st.visible = entries[entries.length - 1].isIntersecting; if (st.visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

const point = (event) => {
  const box = svg.getBoundingClientRect();
  return [((event.clientX - box.left) / box.width) * P.width ?? 1000, ((event.clientY - box.top) / box.height) * 600];
};
const toView = (event) => {
  const box = svg.getBoundingClientRect();
  return [((event.clientX - box.left) / box.width) * 1000, ((event.clientY - box.top) / box.height) * 600];
};
const grab = () => { st.tour = false; clearTimeout(st.idleTimer); st.idleTimer = setTimeout(() => { if (!still.matches) { st.tour = true; st.tourClock = st.station * 4.6; } run(); }, 4200); run(); };
const throttleAt = (p) => {
  const ax = st.throttleSlot ?? throttleSlot;
  const dx = ax.b[0] - ax.a[0], dy = ax.b[1] - ax.a[1];
  return clamp(((p[0] - ax.a[0]) * dx + (p[1] - ax.a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
};
stage.addEventListener("pointerdown", (event) => {
  const p = toView(event);
  const knob = iso([E.THROTTLE.x0 + (E.THROTTLE.x1 - E.THROTTLE.x0) * st.throttle, E.THROTTLE.y, 40], P);
  if (Math.hypot(p[0] - knob[0], p[1] - knob[1]) < 34) {
    st.drag = true;
    stage.setAttribute("data-drag", "");
    stage.setPointerCapture(event.pointerId);
    st.throttleTarget = throttleAt(p);
    grab();
  }
});
stage.addEventListener("pointerup", () => { st.drag = false; stage.removeAttribute("data-drag"); });
stage.addEventListener("pointermove", (event) => {
  const p = toView(event);
  if (st.drag) { st.throttleTarget = throttleAt(p); grab(); return; }
  const dx = axisB[0] - axisA[0], dy = axisB[1] - axisA[1];
  const t = ((p[0] - axisA[0]) * dx + (p[1] - axisA[1]) * dy) / (dx * dx + dy * dy);
  const s = -30 + t * 636;
  let best = 0;
  stations.forEach((station, i) => { if (Math.abs(station.s - s) < Math.abs(stations[best].s - s)) best = i; });
  if (best !== st.station) { st.station = best; }
  grab();
});
stage.addEventListener("keydown", (event) => {
  let handled = true;
  if (event.key === "ArrowRight") st.station = clamp(st.station - 1, 0, stations.length - 1);
  else if (event.key === "ArrowLeft") st.station = clamp(st.station + 1, 0, stations.length - 1);
  else if (event.key === "ArrowUp") st.throttleTarget = clamp(st.throttleTarget + 0.1, 0, 1);
  else if (event.key === "ArrowDown") st.throttleTarget = clamp(st.throttleTarget - 0.1, 0, 1);
  else if (event.key === "Home") st.station = 0;
  else if (event.key === "End") st.station = stations.length - 1;
  else handled = false;
  if (!handled) return;
  event.preventDefault();
  grab();
});
if (still.matches) { st.tour = false; }
st.xc = stationAt(0).x;
tick(performance.now());
