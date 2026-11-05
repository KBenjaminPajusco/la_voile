// SVG visualisations driven by simulation output: top view, sail sections, telltales, stern view.
import type { ForceResult, SailShape, SectionResult, Flow } from '../sim/physics';
import { L } from '../i18n';

const DEG = Math.PI / 180;
export const flowColor: Record<Flow, string> = { ok: '#22d3ee', luff: '#f59e0b', stall: '#ef4444', flog: '#64748b' };
const flowWord: Record<Flow, string> = { ok: L('OK', 'OK'), luff: L('LUFF', 'FASSEYE'), stall: L('STALL', 'DÉCROCHÉ'), flog: L('FLOG', 'BAT') };
const TML = [L('TOP', 'HAUT'), L('MID', 'MILIEU'), L('LOW', 'BAS')];
const TML2 = [L('Top', 'Haut'), L('Mid', 'Milieu'), L('Low', 'Bas')];

function sailPath(x0: number, y0: number, angleDeg: number, chord: number, depth: number, draft: number, lee: number) {
  // chord runs aft from (x0,y0), rotated to leeward by angle
  const a = angleDeg * DEG;
  const dx = lee * Math.sin(a);
  const dy = Math.cos(a);
  const x1 = x0 + dx * chord;
  const y1 = y0 + dy * chord;
  // perpendicular toward leeward
  const px = lee * Math.cos(a);
  const py = -Math.sin(a);
  const bulge = depth * chord * 2.0;
  const cx = x0 + dx * chord * draft + px * bulge * Math.sign(lee) * lee;
  const cy = y0 + dy * chord * draft + py * bulge * lee * Math.sign(lee);
  return { d: `M${x0.toFixed(1)},${y0.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`, x1, y1 };
}

export interface TopViewProps {
  twa: number; // signed
  awa: number; // magnitude
  tws: number;
  aws: number;
  heel: number;
  f: ForceResult;
  headsail: 'jib' | 'gennaker';
  backed?: boolean;
  released?: boolean;
  collapsed?: boolean;
  gust?: number;
  size?: number;
  compact?: boolean;
}

export function BoatTopView({ twa, awa, tws, aws, heel, f, headsail, backed, released, collapsed, gust = 0, compact }: TopViewProps) {
  const s = Math.sign(twa) || 1;
  const lee = -s; // sails on the leeward side (x)
  const sh = f.shapes;
  const twaR = twa * DEG;
  const awaR = s * awa * DEG;
  const arrow = (ang: number, r0: number, r1: number) => ({ x0: Math.sin(ang) * r0, y0: -Math.cos(ang) * r0, x1: Math.sin(ang) * r1, y1: -Math.cos(ang) * r1 });
  const tw = arrow(twaR, 98, 70);
  const aw = arrow(awaR, 92, 62);
  const mast = { x: 0, y: -18 };
  const mainLower = sailPath(mast.x, mast.y, sh.main.angle, 58, sh.main.depthBottom, sh.main.draft, lee);
  const mainUpper = sailPath(mast.x, mast.y, sh.main.angle + sh.main.twist, 40, sh.main.depthTop, sh.main.draft, lee);
  const jibAngle = backed ? -sh.jib.angle : sh.jib.angle;
  const jibLee = backed ? -lee : lee;
  const jibLower = sailPath(0, -78, jibAngle, 50, sh.jib.depthBottom, sh.jib.draft, jibLee);
  const jibUpper = sailPath(0, -78, jibAngle + sh.jib.twist, 26, sh.jib.depthTop, sh.jib.draft, jibLee);
  const gen = sailPath(0, -96, sh.gennaker.angle, 70, collapsed ? 0.04 : 0.2, 0.45, lee);
  const mFlow = f.main.sections[1]?.flow ?? 'ok';
  const jFlow = backed ? 'stall' : released ? 'flog' : (f.jib.sections[1]?.flow ?? 'ok');
  const gFlow: Flow = collapsed ? 'flog' : (f.gennaker?.sections[1]?.flow ?? 'ok');
  const heelScale = Math.cos(heel * DEG);
  return (
    <svg viewBox="-110 -110 220 220" className="h-full w-full">
      <defs>
        <radialGradient id="sea" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#0f2a4a" />
          <stop offset="100%" stopColor="#07101f" />
        </radialGradient>
        <marker id="arrT" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
        </marker>
        <marker id="arrA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#22d3ee" />
        </marker>
      </defs>
      <circle r="108" fill="url(#sea)" stroke="rgba(103,232,249,0.12)" />
      {[30, 60, 90].map((r) => (
        <circle key={r} r={r} fill="none" stroke="rgba(103,232,249,0.05)" />
      ))}
      {/* compass ticks relative to bow */}
      {Array.from({ length: 36 }).map((_, i) => {
        const a = i * 10 * DEG;
        const r0 = i % 3 === 0 ? 100 : 104;
        return <line key={i} x1={Math.sin(a) * r0} y1={-Math.cos(a) * r0} x2={Math.sin(a) * 108} y2={-Math.cos(a) * 108} stroke="rgba(103,232,249,0.25)" strokeWidth={i % 3 === 0 ? 1 : 0.5} />;
      })}
      {gust > 0.8 && <circle r="104" fill="none" stroke="rgba(239,68,68,0.35)" strokeWidth={4} className="pulse" />}
      {gust < -0.8 && <circle r="104" fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth={4} className="pulse" />}
      {/* wind arrows */}
      <line x1={tw.x0} y1={tw.y0} x2={tw.x1} y2={tw.y1} stroke="#94a3b8" strokeWidth={2.2} markerEnd="url(#arrT)" />
      <line x1={aw.x0} y1={aw.y0} x2={aw.x1} y2={aw.y1} stroke="#22d3ee" strokeWidth={2.2} markerEnd="url(#arrA)" />
      {!compact && (
        <>
          <text x={tw.x0 * 0.92} y={tw.y0 * 0.92 - 4} fontSize={7} fill="#94a3b8" textAnchor="middle">
            {L('TW', 'VR')} {tws.toFixed(0)}
          </text>
          <text x={aw.x0 * 0.85} y={aw.y0 * 0.85 + 10} fontSize={7} fill="#22d3ee" textAnchor="middle">
            {L('AW', 'VA')} {aws.toFixed(0)}
          </text>
        </>
      )}
      {/* hull (foreshortened with heel) */}
      <g transform={`scale(${heelScale.toFixed(3)},1)`}>
        <path d="M0,-92 C18,-60 22,-10 18,40 L14,62 L-14,62 L-18,40 C-22,-10 -18,-60 0,-92 Z" fill="#dbe7f5" stroke="#9fb3c8" strokeWidth={1} />
        <path d="M0,-80 C12,-55 14,-10 12,35 L10,52 L-10,52 L-12,35 C-14,-10 -12,-55 0,-80 Z" fill="#c4d3e4" />
        <rect x={-9} y={20} width={18} height={30} rx={3} fill="#a9bbcf" />
      </g>
      {/* sails */}
      {headsail === 'gennaker' ? (
        <path d={gen.d} fill="none" stroke={flowColor[gFlow]} strokeWidth={collapsed ? 2 : 4} strokeLinecap="round" opacity={0.95} />
      ) : (
        <>
          <path d={jibUpper.d} fill="none" stroke={flowColor[jFlow]} strokeWidth={1.4} opacity={0.5} strokeDasharray="3 2" />
          <path d={jibLower.d} fill="none" stroke={flowColor[jFlow]} strokeWidth={3.2} strokeLinecap="round" className={released ? 'flutter' : ''} />
        </>
      )}
      <path d={mainUpper.d} fill="none" stroke={flowColor[f.main.sections[2]?.flow ?? 'ok']} strokeWidth={1.4} opacity={0.55} strokeDasharray="3 2" />
      <path d={mainLower.d} fill="none" stroke={flowColor[mFlow]} strokeWidth={3.4} strokeLinecap="round" />
      <line x1={mast.x} y1={mast.y} x2={mainLower.x1} y2={mainLower.y1} stroke="#e2e8f0" strokeWidth={1.4} opacity={0.6} />
      <circle cx={mast.x} cy={mast.y} r={3} fill="#0f172a" stroke="#e2e8f0" />
      {/* rudder */}
      <line x1={0} y1={62} x2={Math.sin(-f.rudder * DEG * Math.sign(twa)) * 14} y2={62 + Math.cos(f.rudder * DEG) * 14} stroke={Math.abs(f.rudder) > 7 ? '#ef4444' : '#f8fafc'} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- sail sections

export function SailSections({
  shape,
  sections,
  label,
  awaTag = true,
  height = 230,
}: {
  shape: SailShape;
  sections: SectionResult[];
  label: string;
  awaTag?: boolean;
  height?: number;
}) {
  // Boat centreline horizontal, bow to the LEFT, leeward = down. Each row is one height.
  const rows = [...sections].reverse(); // top first
  return (
    <svg viewBox="0 0 200 240" width="100%" height={height}>
      <defs>
        <marker id="arrS" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
        </marker>
      </defs>
      <text x={6} y={12} fontSize={10} fill="#67e8f9" letterSpacing={1.5}>
        {label}
      </text>
      {rows.map((sec, i) => {
        const y = 42 + i * 72;
        const x0 = 52;
        const LEN = 105;
        const ang = (shape.angle + shape.twist * sec.h) * DEG;
        const depth = sec.h < 0.3 ? shape.depthBottom : sec.h > 0.7 ? shape.depthTop : shape.depth;
        const cx = x0 + Math.cos(ang) * LEN * shape.draft - Math.sin(ang) * depth * 2 * LEN;
        const cy = y + Math.sin(ang) * LEN * shape.draft + Math.cos(ang) * depth * 2 * LEN;
        const x1 = x0 + Math.cos(ang) * LEN;
        const y1 = y + Math.sin(ang) * LEN;
        const wa = sec.awa * DEG;
        const col = flowColor[sec.flow];
        return (
          <g key={i}>
            <line x1={10} y1={y} x2={195} y2={y} stroke="rgba(148,163,184,0.22)" strokeDasharray="2 3" />
            <line x1={x0 - 42 * Math.cos(wa)} y1={y - 42 * Math.sin(wa)} x2={x0 - 5 * Math.cos(wa)} y2={y - 5 * Math.sin(wa)} stroke="#94a3b8" strokeWidth={1.4} markerEnd="url(#arrS)" />
            <path d={`M${x0},${y} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round" />
            <text x={196} y={y - 14} textAnchor="end" fontSize={8.5} fill="#cbd5e1" className="num">
              {TML[i]} · {L('AoA', 'Inc.')} {sec.alpha.toFixed(0)}° · {flowWord[sec.flow] ?? sec.flow.toUpperCase()}
            </text>
            {awaTag && (
              <text x={196} y={y + 30} textAnchor="end" fontSize={8} fill="#64748b" className="num">
                AWA {sec.awa.toFixed(0)}° · {L('sheeted', 'bordé')} {(ang / DEG).toFixed(0)}° · {L('depth', 'creux')} {(depth * 100).toFixed(0)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- jib / main coherence

/** one sail section in boat metres (x forward from the mast, y to leeward), luff first */
function sectionPts(lx: number, angDeg: number, chord: number, depth: number, draft: number, n = 18): [number, number][] {
  const a = angDeg * DEG;
  const u = [-Math.cos(a), Math.sin(a)];
  const nv = [Math.sin(a), Math.cos(a)];
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const f = t < draft ? 1 - ((draft - t) / draft) ** 2 : 1 - ((t - draft) / (1 - draft)) ** 2;
    const c = depth * chord * f;
    out.push([lx + chord * t * u[0] + c * nv[0], chord * t * u[1] + c * nv[1]]);
  }
  return out;
}

/** The jib and the main seen as the two skins of ONE wing: the jib is the leeward skin at the front, the main
 *  the windward skin behind it. The dashed lines close the imaginary wing (leading edge from the jib luff to the
 *  mast, trailing edge from the jib leech to the main leech). Coherent = the jib leech runs parallel to the main
 *  (an even slot); choked = it points into the main (backwind); open = the two skins split apart. */
export function SlotCoherence({ f, height = 230 }: { f: ForceResult; height?: number }) {
  const sh = f.shapes;
  const jr = [...f.jib.sections].reverse();
  const mr = [...f.main.sections].reverse();
  const depthOf = (s: SailShape, h: number) => (h < 0.3 ? s.depthBottom : h > 0.7 ? s.depthTop : s.depth);
  const rows = jr.map((js, i) => {
    const ms = mr[i] ?? mr[mr.length - 1];
    const ja = sh.jib.angle + sh.jib.twist * js.h;
    const ma = sh.main.angle + sh.main.twist * ms.h;
    const jib = sectionPts(2.9 * (1 - 0.92 * js.h), ja, 3.25 * (1 - js.h) + 0.15, depthOf(sh.jib, js.h), sh.jib.draft);
    const main = sectionPts(0, ma, 3.5 * (1 - 0.72 * ms.h) + 0.15, depthOf(sh.main, ms.h), sh.main.draft);
    return { js, ms, ja, ma, jib, main };
  });
  // one scale for all three rows (fit the widest), so the heights compare
  const xs = rows.flatMap((r) => [...r.jib, ...r.main].map((p) => p[0]));
  const ysAll = rows.flatMap((r) => [...r.jib, ...r.main].map((p) => p[1]));
  const xMax = Math.max(...xs);
  const xMin = Math.min(...xs);
  const SC = Math.min(186 / (xMax - xMin), 44 / Math.max(0.5, Math.max(...ysAll)));
  const X = (x: number) => 8 + (xMax - x) * SC;
  const Y = (y0: number, y: number) => y0 + y * SC;
  return (
    <svg viewBox="0 0 200 240" width="100%" height={height}>
      <text x={6} y={12} fontSize={10} fill="#67e8f9" letterSpacing={1.5}>
        {L('JIB + MAIN = ONE WING', 'FOC + GV = UNE AILE')}
      </text>
      {rows.map(({ js, ms, ja, ma, jib, main }, i) => {
        const y0 = 30 + i * 72;
        const slot = ja - ma + 1.5;
        const state = slot < 3.5 ? 'choked' : slot < 6 ? 'closed' : slot <= 11 ? 'ok' : 'open';
        const col = state === 'ok' ? '#34d399' : state === 'choked' ? '#ef4444' : '#f59e0b';
        const word =
          state === 'ok' ? L('coherent', 'cohérent') : state === 'choked' ? L('choked — main backwinded', 'étranglé — GV en contre-vent') : state === 'closed' ? L('closing', 'se ferme') : L('skins split — too open', 'les faces s’écartent');
        const jl = jib[jib.length - 1];
        const ml = main[main.length - 1];
        // gap: jib leech to the main
        const gap = Math.min(...main.map((p) => Math.hypot(p[0] - jl[0], p[1] - jl[1])));
        // where the jib's exit flow goes: its leech tangent carried on to the main leech station
        const jp = jib[jib.length - 2];
        const dx = jl[0] - jp[0];
        const dy = jl[1] - jp[1];
        const k = (ml[0] - jl[0]) / dx;
        const ex = [jl[0] + dx * k, jl[1] + dy * k];
        const P = (pts: [number, number][]) => pts.map((p, j) => `${j ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(y0, p[1]).toFixed(1)}`).join(' ');
        const wing = `${P(jib)} L${X(ml[0]).toFixed(1)},${Y(y0, ml[1]).toFixed(1)} ${P([...main].reverse()).replace('M', 'L')} Z`;
        return (
          <g key={i}>
            <line x1={4} y1={y0} x2={196} y2={y0} stroke="rgba(148,163,184,0.18)" strokeDasharray="2 3" />
            <path d={wing} fill={col} fillOpacity={0.12} stroke="none" />
            {/* the invisible lines: leading edge (jib luff → mast) and trailing edge (jib leech → main leech) */}
            <line x1={X(jib[0][0])} y1={Y(y0, jib[0][1])} x2={X(0)} y2={Y(y0, 0)} stroke={col} strokeWidth={1} strokeDasharray="3 2" opacity={0.8} />
            <line x1={X(jl[0])} y1={Y(y0, jl[1])} x2={X(ml[0])} y2={Y(y0, ml[1])} stroke={col} strokeWidth={1} strokeDasharray="3 2" opacity={0.8} />
            {/* the jib's exit flow carried on */}
            <line x1={X(jl[0])} y1={Y(y0, jl[1])} x2={X(ex[0])} y2={Y(y0, ex[1])} stroke="#e2e8f0" strokeWidth={0.8} strokeDasharray="1 2" opacity={0.7} />
            <path d={P(main)} fill="none" stroke={flowColor[ms.flow]} strokeWidth={2.6} strokeLinecap="round" />
            <path d={P(jib)} fill="none" stroke={flowColor[js.flow]} strokeWidth={2.6} strokeLinecap="round" />
            <circle cx={X(0)} cy={Y(y0, 0)} r={2} fill="#0f172a" stroke="#e2e8f0" strokeWidth={0.8} />
            <text x={196} y={y0 - 10} textAnchor="end" fontSize={8.5} fill="#cbd5e1" className="num">
              {TML[i]} · {L('slot', 'fente')} {slot.toFixed(0)}° · {Math.round(gap * 100)} cm
            </text>
            <text x={196} y={y0 + 55} textAnchor="end" fontSize={8.5} fill={col} className="num">
              {word}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- telltales

function telltaleState(sec: SectionResult, groove: number) {
  const windward: 'flow' | 'lift' | 'flog' = sec.flow === 'flog' ? 'flog' : sec.a < 0.12 * groove ? 'lift' : 'flow';
  const leeward: 'flow' | 'stall' | 'flog' = sec.flow === 'flog' ? 'flog' : sec.a > groove ? 'stall' : 'flow';
  return { windward, leeward };
}

function Tell({ state, side }: { state: string; side: 'W' | 'L' }) {
  const color = state === 'flow' ? '#34d399' : state === 'flog' ? '#64748b' : side === 'W' ? '#f59e0b' : '#ef4444';
  const rot = state === 'flow' ? 0 : state === 'lift' ? -55 : state === 'stall' ? 70 : 30;
  return (
    <svg width="34" height="16" viewBox="0 0 34 16">
      <circle cx="4" cy="8" r="2.5" fill="#cbd5e1" />
      <g transform={`rotate(${rot} 4 8)`}>
        <path d="M4,8 C12,6 20,10 30,8" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" className={state === 'flog' ? 'flutter' : ''} />
      </g>
    </svg>
  );
}

export function Telltales({ f, headsail, collapsed, curl = 0, over = 0, luffFlap = 0, leechFlap = 0, mainBackwind = 0 }: { f: ForceResult; headsail: 'jib' | 'gennaker'; collapsed?: boolean; curl?: number; over?: number; luffFlap?: number; leechFlap?: number; mainBackwind?: number }) {
  if (headsail === 'gennaker') {
    const g = f.gennaker;
    const mid = g?.sections[1];
    // read from the luff curl (ease until it curls, trim back a touch), not from the section angle
    const word = collapsed ? L('COLLAPSED', 'AFFALÉ') : !mid ? '-' : curl > 0.9 ? L('FOLDING — trim now!', 'IL SE REPLIE — borde vite !') : curl > 0.35 ? L('CURLING HARD — trim a little', 'LE GUINDANT CASSE FORT — borde un peu') : curl > 0.02 ? L('CURL — PERFECT, hold it', 'LE GUINDANT ROULE — PARFAIT, garde-le') : over > 0.3 ? L('OVER-TRIMMED (stall) — ease', 'TROP BORDÉ (décroché) — choque') : L('NO CURL — ease until it curls', 'PAS DE ROULEAU — choque jusqu’à ce que le guindant roule');
    const tone = collapsed || curl > 0.9 ? 'text-alarm' : curl > 0.35 ? 'text-warn' : curl > 0.02 ? 'text-good' : over > 0.3 ? 'text-alarm' : 'text-cyan-300';
    return (
      <div className="space-y-2 text-xs">
        <div className="text-slate-400">{L('Gennaker luff', 'Guindant du spi')}</div>
        <div className={`num text-sm font-semibold ${tone}`}>{word}</div>
        {leechFlap > 0.2 && <div className="text-warn">{L('Kite leech fluttering — trim the main a little so the flow follows its leeward side', 'La chute du spi vibre — borde un peu la GV pour que le flux suive son extrados')}</div>}
        {luffFlap > 0.2 && <div className="text-warn">{L('Luff breathing in and out — main well too eased, trim it', 'Le guindant respire — GV bien trop choquée, borde-la')}</div>}
        {mainBackwind > 0.2 && <div className="text-warn">{L('Main luff backwinded by the kite — ease the main', 'Guindant de GV en contre-vent du spi — choque la GV')}</div>}
        <MainLeech f={f} />
      </div>
    );
  }
  const rows = [...f.jib.sections].reverse();
  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-[40px_1fr_1fr] items-center gap-x-2 gap-y-1">
        <span />
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{L('Windward', 'Au vent')}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{L('Leeward', 'Sous le vent')}</span>
        {rows.map((s, i) => {
          const st = telltaleState(s, f.shapes.jib.groove);
          return (
            <div key={i} className="contents">
              <span className="text-[10px] text-slate-400">{TML2[i]}</span>
              <Tell state={st.windward} side="W" />
              <Tell state={st.leeward} side="L" />
            </div>
          );
        })}
      </div>
      <MainLeech f={f} />
    </div>
  );
}

function MainLeech({ f }: { f: ForceResult }) {
  const rows = [...f.main.sections].reverse();
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">{L('Main leech telltales', 'Penons de chute GV')}</div>
      <div className="flex gap-2">
        {rows.map((s, i) => {
          const st = s.flow === 'stall' || s.a > f.shapes.main.groove + 2 ? 'stall' : s.flow === 'flog' || s.flow === 'luff' ? 'flog' : 'flow';
          return (
            <div key={i} className="flex flex-col items-center">
              <Tell state={st} side="L" />
              <span className="text-[9px] text-slate-500">{TML2[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- stern view

export function SternView({ heel, heelMoment, rightingMoment, hike, rudder }: { heel: number; heelMoment: number; rightingMoment: number; hike: number; rudder: number }) {
  const h = heel;
  const rmMax = 14000;
  const hm = Math.min(1, Math.abs(heelMoment) / rmMax);
  const rm = Math.min(1, Math.abs(rightingMoment) / rmMax);
  const crewX = -22 - hike * 14;
  return (
    <svg viewBox="-80 -95 160 135" width="100%" height="100%">
      <line x1={-80} y1={20} x2={80} y2={20} stroke="#1e3d63" strokeWidth={1} />
      <path d="M-80,20 Q-40,16 0,20 T80,20 L80,40 L-80,40 Z" fill="#0b2340" />
      <g transform={`rotate(${h.toFixed(1)} 0 15)`}>
        {/* keel */}
        <path d="M-3,24 L-2,38 L-6,42 L6,42 L2,38 L3,24 Z" fill="#94a3b8" />
        {/* hull */}
        <path d="M-30,8 Q-28,22 0,26 Q28,22 30,8 Z" fill="#dbe7f5" />
        {/* mast */}
        <line x1={0} y1={8} x2={0} y2={-88} stroke="#e2e8f0" strokeWidth={2} />
        <line x1={0} y1={-88} x2={-28} y2={8} stroke="#475569" strokeWidth={0.6} />
        <line x1={0} y1={-88} x2={28} y2={8} stroke="#475569" strokeWidth={0.6} />
        {/* crew on windward rail (left side in this view = windward) */}
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={crewX + i * 5 * (1 - hike * 0.6)} cy={2 - i * 1.5} r={3.4} fill="#f59e0b" />
        ))}
      </g>
      {/* moment bars */}
      <g transform="translate(-74,-90)">
        <text x={0} y={0} fontSize={6} fill="#94a3b8">
          {L('HEELING', 'GÎTE')}
        </text>
        <rect x={0} y={3} width={40} height={4} fill="rgba(239,68,68,0.15)" />
        <rect x={0} y={3} width={40 * hm} height={4} fill="#ef4444" />
        <text x={0} y={16} fontSize={6} fill="#94a3b8">
          {L('RIGHTING', 'REDRESSEMENT')}
        </text>
        <rect x={0} y={19} width={40} height={4} fill="rgba(52,211,153,0.15)" />
        <rect x={0} y={19} width={40 * rm} height={4} fill="#34d399" />
      </g>
      <text x={74} y={-82} textAnchor="end" fontSize={11} className="num" fill={heel > 26 ? '#ef4444' : heel > 22 ? '#f59e0b' : '#fff'}>
        {heel.toFixed(0)}°
      </text>
      <text x={74} y={-72} textAnchor="end" fontSize={6} fill="#94a3b8">
        {L('HEEL', 'GÎTE')}
      </text>
      <text x={74} y={-60} textAnchor="end" fontSize={8} className="num" fill={rudder > 7 ? '#ef4444' : '#cbd5e1'}>
        {rudder.toFixed(1)}°
      </text>
      <text x={74} y={-52} textAnchor="end" fontSize={6} fill="#94a3b8">
        {L('RUDDER', 'SAFRAN')}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------- gauges

export function ArcGauge({
  value,
  min,
  max,
  label,
  unit,
  zones = [],
  decimals = 1,
  target,
  size = 120,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  unit?: string;
  zones?: { from: number; to: number; color: string }[];
  decimals?: number;
  target?: number;
  size?: number;
}) {
  const a0 = -120;
  const a1 = 120;
  const ang = (v: number) => a0 + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (a1 - a0);
  const pt = (a: number, r: number) => ({ x: 50 + Math.sin(a * DEG) * r, y: 52 - Math.cos(a * DEG) * r });
  const arc = (from: number, to: number, r: number) => {
    const p0 = pt(ang(from), r);
    const p1 = pt(ang(to), r);
    const large = ang(to) - ang(from) > 180 ? 1 : 0;
    return `M${p0.x},${p0.y} A${r},${r} 0 ${large} 1 ${p1.x},${p1.y}`;
  };
  const needle = pt(ang(value), 34);
  const tgt = target !== undefined ? pt(ang(target), 42) : null;
  const tgt2 = target !== undefined ? pt(ang(target), 47) : null;
  return (
    <svg viewBox="0 0 100 90" width={size} height={size * 0.9}>
      <path d={arc(min, max, 42)} stroke="rgba(103,232,249,0.12)" strokeWidth={6} fill="none" />
      {zones.map((z, i) => (
        <path key={i} d={arc(z.from, z.to, 42)} stroke={z.color} strokeWidth={6} fill="none" opacity={0.75} />
      ))}
      {tgt && tgt2 && <line x1={tgt.x} y1={tgt.y} x2={tgt2.x} y2={tgt2.y} stroke="#fff" strokeWidth={2} />}
      <line x1={50} y1={52} x2={needle.x} y2={needle.y} stroke="#22d3ee" strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={50} cy={52} r={3} fill="#22d3ee" />
      <text x={50} y={74} textAnchor="middle" fontSize={15} className="num" fill="#fff" fontWeight={600}>
        {value.toFixed(decimals)}
      </text>
      <text x={50} y={85} textAnchor="middle" fontSize={7} fill="#94a3b8" letterSpacing={1}>
        {label.toUpperCase()} {unit ? `(${unit})` : ''}
      </text>
    </svg>
  );
}
