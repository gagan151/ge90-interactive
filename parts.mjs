// Geometry shared by the build and the live page. k = kit core, G = lathe, P = projection, D = shared data.
export function makeParts(k, G, P, D) {
  const { F, E } = D;
  const V = G.viewOf(P);
  const TAU = Math.PI * 2;
  const pt = (s, r, th) => G.pointOf(F, s, r, th);
  const at = (p) => k.iso(p, P);
  const depth = (p) => G.dot3(p, V);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const phi = Math.atan2(V[1], V[2]);
  const A0 = phi + Math.PI / 2;
  const A1 = phi + (3 * Math.PI) / 2;
  const facing = (th) => V[2] * Math.cos(th) + V[1] * Math.sin(th);

  const area = (pts) => pts.reduce((sum, p, i) => sum + (p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1]), 0);
  const poly = (pts) => k.pathOf(area(pts) < 0 ? [...pts].reverse() : pts, true);
  const quadTone = (a, b, c, d) => {
    let n = G.unit3(G.cross3(G.sub3(b, a), G.sub3(d, a)));
    if (G.dot3(n, V) < 0) n = G.mul3(n, -1);
    return G.toneOf(n, P);
  };
  const bucketsOf = () => [[], [], [], [], []];
  const finish = (buckets, fill, outline, crease = "") => ({ fill: fill.join(""), outline, crease, top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) });

  // The back half of a turned shell, seen from inside: the casing with its near half cut away.
  function shell(profile, t, { arcs } = {}) {
    const rMax = Math.max(...profile.map((p) => p[1]));
    const J = arcs ?? Math.max(12, Math.round(rMax / 2.4));
    const th = (j) => A0 + (Math.PI * j) / J;
    const grid = profile.map(([s, r]) => Array.from({ length: J + 1 }, (_, j) => pt(s, r, th(j))));
    const buckets = bucketsOf();
    const fill = [];
    const add = (a, b, c, d) => {
      const pts = [a, b, c, d].map(at);
      const path = poly(pts);
      fill.push(path);
      buckets[quadTone(a, b, c, d)].push(path);
    };
    for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < J; j++) add(grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]);
    // cut faces at both ends of the arc, and the first end face
    for (const j of [0, J]) {
      for (let i = 0; i < profile.length - 1; i++) {
        const [s0, r0] = profile[i];
        const [s1, r1] = profile[i + 1];
        const a = pt(s0, r0, th(j));
        const b = pt(s1, r1, th(j));
        const c = pt(s1, r1 + t, th(j));
        const d = pt(s0, r0 + t, th(j));
        add(a, b, c, d);
      }
    }
    const [sf, rf] = profile[0];
    for (let j = 0; j < J; j++) add(pt(sf, rf, th(j)), pt(sf, rf, th(j + 1)), pt(sf, rf + t, th(j + 1)), pt(sf, rf + t, th(j)));
    const line = (pts) => k.pathOf(pts.map(at));
    const edges = [
      line(grid[0]),
      line(grid[profile.length - 1]),
      line(Array.from({ length: J + 1 }, (_, j) => pt(sf, rf + t, th(j)))),
      line(grid.map((row) => row[0])),
      line(grid.map((row) => row[J])),
      line(profile.map(([s, r]) => pt(s, r + t, th(0)))),
      line(profile.map(([s, r]) => pt(s, r + t, th(J)))),
    ].join("");
    const mid = profile[Math.floor(profile.length / 2)];
    return { paths: finish(buckets, fill, edges), key: depth(pt(mid[0], mid[1] * 0.64, phi + Math.PI)), s: mid[0] };
  }

  // Vanes of a stator row, only on the back half (the front half is cut away).
  function vanes(s, r0, r1, count) {
    const n = Math.max(2, Math.round((count * 0.5)));
    return G.spokesOf(F, s, r0, r1, n, P, { from: A0 + 0.02, to: A1 - 0.02 + (A1 - A0) / n * 0 });
  }

  function ring(s0, s1, rIn, rOut, style = {}) {
    return S(G.ringBand(s0, s1, rIn, rOut, F, P), { tone: "hi", ...style });
  }

  function rotorLines(stage, phase) {
    return G.spokesOf(F, stage.s, stage.hub + 0.4, stage.tip - 0.4, Math.round(stage.count * 0.5), P, { phase, sweep: 0.12 });
  }

  // Fan blades: 22 twisted sheets, split into those behind the hub and those in front of it.
  function fanBlades(angle) {
    const items = [];
    const stations = [58.5, 76, 100, 124, 146, 160];
    for (let b = 0; b < D.fanBlades; b++) {
      const th0 = angle + (b * TAU) / D.fanBlades;
      const rows = stations.map((r, i) => {
        const f = i / (stations.length - 1);
        const chord = 44 - 8 * f;
        const gamma = (55 + 25 * f) * (Math.PI / 180);
        const sLE = 3 - 5 * f * f;
        const le = pt(sLE, r, th0);
        const te = pt(sLE + chord * Math.cos(gamma), r, th0 + (chord * Math.sin(gamma)) / r);
        return [le, te];
      });
      const buckets = bucketsOf();
      const fill = [];
      for (let i = 0; i < rows.length - 1; i++) {
        const [a, b2] = [rows[i][0], rows[i][1]];
        const [c, d] = [rows[i + 1][1], rows[i + 1][0]];
        const path = poly([a, b2, c, d].map(at));
        fill.push(path);
        buckets[quadTone(a, b2, c, d)].push(path);
      }
      const le = k.pathOf(rows.map(([l]) => at(l)));
      const te = k.pathOf(rows.map(([, t]) => at(t)));
      const outline = k.pathOf([...rows.map(([l]) => at(l)), ...rows.map(([, t]) => at(t)).reverse()], true);
      const centre = G.add3(rows[2][0], rows[2][1]).map((v) => v / 2);
      items.push({ front: facing(th0 + 0.15) > 0, key: depth(centre), svg: S(finish(buckets, fill, outline), { tone: "hi", crease: "none" }) });
    }
    items.sort((a, b) => a.key - b.key);
    return { back: items.filter((i) => !i.front).map((i) => i.svg).join(""), front: items.filter((i) => i.front).map((i) => i.svg).join("") };
  }

  // A stripe winding over the spinner cone, only where it faces you.
  function spinnerStripes(phase) {
    const sp = E.SPINNER;
    const rAt = (s) => spinnerR(s);
    const out = [];
    for (let m = 0; m < 3; m++) {
      let run = [];
      const flush = () => {
        if (run.length > 1) out.push(k.pathOf(run));
        run = [];
      };
      for (let i = 0; i <= 40; i++) {
        const s = sp.s0 + ((sp.s1 - sp.s0) * i) / 40;
        const x = (s - sp.s0) / (sp.s1 - sp.s0);
        const th = phase + (m * TAU) / 3 + 1.9 * x;
        const slope = spinnerSlope(s);
        const radial = G.radialOf(F, th);
        const normal = G.unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]);
        if (G.dot3(normal, V) > 0.04) run.push(at(pt(s, rAt(s) * 1.0, th)));
        else flush();
      }
      flush();
    }
    return out.join("");
  }

  const SP = E.SPINNER;
  const spinnerR = (s) => {
    const x = Math.min(1, Math.max(0, (s - SP.s0) / (SP.s1 - SP.s0)));
    return SP.r * Math.sin((x * Math.PI) / 2) ** 0.85;
  };
  const spinnerSlope = (s) => {
    const h = 0.05;
    return (spinnerR(s + h) - spinnerR(s - h)) / (2 * h);
  };
  const spinnerProfile = () => {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const s = SP.s0 + ((SP.s1 - SP.s0) * (i / 28) ** 1.0);
      pts.push([s, i === 0 ? 0 : spinnerR(s), i && i < 28 ? 1 : 0]);
    }
    return pts;
  };


  // The probe rod slides through the sleeve on the carriage: one piece in front of it, one behind it.
  function probeRod(x0, tipY) {
    const Fy = G.frameAlong([x0, 0, E.ZA], [0, 1, 0]);
    const [s0, s1] = E.SLEEVE;
    const front = [];
    const rear = [];
    if (tipY < s0 - 0.5) front.push(S(G.disc(tipY, s0, E.ROD_R, Fy, P, { steps: 16 }), { tone: "hi", crease: "none", lit: true }));
    const end = tipY + E.ROD_L;
    if (end > s1 + 0.5) rear.push(S(G.disc(s1, end, E.ROD_R, Fy, P, { steps: 16 }), { tone: "hi", crease: "none", lit: true }));
    rear.push(S(G.disc(end, end + 10, 4.6, Fy, P, { steps: 24, bevel: 0.5 }), { tone: "mid" }));
    rear.push(Ln(G.ribsOf(Fy, end + 0.5, end + 9.5, 4.6, 14, P, { least: 0.25 }), { tone: "lo" }));
    front.push(S(G.sphereOf([x0, tipY - 1.4, E.ZA], 3.4, P, { steps: 24 }), { tone: "hi", lit: true }));
    return { front: front.join(""), rear: rear.join("") };
  }

  const dialAng = (value) => ((-135 + (270 * Math.log(value)) / Math.log(45)) * Math.PI) / 180;
  const onDial = (cx, cy, ang, r) => [cx + Math.sin(ang) * r, cy - Math.cos(ang) * r];
  function needleAt(cx, cy, z, value, radius) {
    const ang = dialAng(Math.min(45, Math.max(1, value)));
    return k.lineOnTop(onDial(cx, cy, ang + Math.PI, 3.4), onDial(cx, cy, ang, radius), z, P);
  }

  // seam arc on the inside of a case, back half only
  const arcIn = (s, r, extra = {}) => G.arcOf(F, s, r, P, { inward: true, ...extra });
  // bolt dots round a flange, on the half that was not cut away
  const backDots = (s, r, count) => {
    const out = [];
    for (let i = 0; i < count; i++) {
      const th = A0 + 0.1 + ((A1 - A0 - 0.2) * (i + 0.5)) / count;
      out.push(at(pt(s, r, th)));
    }
    return out;
  };
  // a thick strut across a duct, at angle th
  function strut(s0, s1, r0, r1, th, w) {
    const c = Math.cos(th), n = Math.sin(th);
    const poly = [[r0 * c - w * n, r0 * n + w * c], [r1 * c - w * n, r1 * n + w * c], [r1 * c + w * n, r1 * n - w * c], [r0 * c + w * n, r0 * n - w * c]];
    return { svg: S(G.prismOf(F, poly, s0, s1, P), { tone: "hi" }), key: depth(pt((s0 + s1) / 2, (r0 + r1) / 2, th)) };
  }
  return { arcIn, backDots, strut, probeRod, dialAng, onDial, needleAt, V, pt, at, depth, shell, vanes, ring, rotorLines, fanBlades, spinnerStripes, spinnerR, spinnerSlope, spinnerProfile, A0, A1, phi, facing, S, Ln };
}
