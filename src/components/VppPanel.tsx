// "Stabilise" as a small VPP: for the present wind and angle, the boat speed each control would give
// over its whole range (the other controls left where they are), with where you are, the top of the
// curve and the polar's optimum. Click a curve to put that control there.
import { useEffect, useRef, useState } from 'react';
import { Anchor, Download, Eraser, Play, Square, X } from 'lucide-react';
import type { ControlKey, Controls } from '../content/types';
import type { Snapshot } from '../sim/engine';
import { CONTROL_RATES } from '../sim/engine';
import { solve } from '../sim/advisor';
import { optimalControls } from '../sim/polar';
import { L } from '../i18n';
import { polarSail } from '../sim/physics';

const KEYS_JIB: ControlKey[] = ['jibSheet', 'jibLead', 'jibHalyard', 'mainSheet', 'traveller', 'vang', 'outhaul', 'cunningham', 'backstay', 'hike'];
const KEYS_KITE: ControlKey[] = ['jibSheet', 'mainSheet', 'traveller', 'vang', 'outhaul', 'backstay', 'hike'];
const KEYS_SYM: ControlKey[] = ['jibSheet', 'jibLead', 'jibHalyard', 'mainSheet', 'traveller', 'vang', 'outhaul', 'backstay', 'hike'];
const N = 24;

interface Curve {
  k: ControlKey;
  xs: number[];
  vs: number[];
  cur: number;
  vCur: number;
  best: number;
  vBest: number;
  opt: number;
}

function sweep(snap: Snapshot, sea: number): { curves: Curve[]; target: number } {
  const kite = snap.plan.headsail === 'gennaker';
  const keys = kite ? (snap.plan.kiteSym ? KEYS_SYM : KEYS_KITE) : KEYS_JIB;
  const c0: Controls = { ...snap.targets };
  const tws = snap.tws;
  const twa = snap.twa;
  const plan = snap.plan;
  const opt = optimalControls(tws, Math.abs(twa), polarSail(plan));
  const base = solve(c0, tws, twa, plan, sea);
  const curves = keys.map((k) => {
    const xs: number[] = [];
    const vs: number[] = [];
    let best = c0[k];
    let vBest = base.v;
    for (let i = 0; i <= N; i++) {
      const x = i / N;
      const v = solve({ ...c0, [k]: x }, tws, twa, plan, sea).v;
      xs.push(x);
      vs.push(v);
      if (v > vBest + 1e-3) (vBest = v), (best = x);
    }
    return { k, xs, vs, cur: c0[k], vCur: base.v, best, vBest, opt: opt[k] };
  });
  return { curves, target: base.target };
}

const COLORS: Record<string, string> = {
  jibSheet: '#22d3ee', jibLead: '#a78bfa', jibHalyard: '#f472b6', mainSheet: '#fbbf24', traveller: '#fb923c',
  vang: '#34d399', outhaul: '#60a5fa', cunningham: '#e879f9', backstay: '#f87171', hike: '#cbd5e1',
};

interface PathPoint {
  c: Controls;
  v: number;
  /** seconds since the optimisation started */
  t: number;
}

export function VppPanel({ snap, sea, onSet, onAll, onClose }: { snap: Snapshot; sea: number; onSet: (k: ControlKey, v: number) => void; onAll: () => void; onClose: () => void }) {
  const kite = snap.plan.headsail === 'gennaker';
  const [data, setData] = useState(() => sweep(snap, sea));
  // the wind and the trims move: refresh every 1.5 s
  const snapRef = useRef(snap);
  snapRef.current = snap;
  useEffect(() => {
    const id = window.setInterval(() => setData(sweep(snapRef.current, sea)), 1500);
    return () => window.clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- continuous optimisation: from the present trim, every control moves at most 2 points per
  // step towards the top of ITS speed curve (the others as they are), then the curves are redrawn;
  // a step that does not gain is halved. It stops when the speed stops rising: Vmax at this angle,
  // reached by a continuous path from where you started. A boat too badly trimmed to have any slope
  // (stopped) first walks towards the polar optimum, still 2 points at a time.
  // The boat follows for real; the path is kept for the curves (and the CSV).
  const keysFor = (k: boolean) => (k ? (snap.plan.kiteSym ? KEYS_SYM : KEYS_KITE) : KEYS_JIB);
  const [running, setRunning] = useState(false);
  const [path, setPath] = useState<PathPoint[]>([]);
  const [done, setDone] = useState(false);
  const run = useRef<{ c: Controls; tws: number; twa: number; step: number; quiet: number; t0: number } | null>(null);
  const start = () => {
    const sn = snapRef.current;
    const c = { ...sn.targets };
    run.current = { c, tws: sn.tws, twa: sn.twa, step: 0.02, quiet: 0, t0: performance.now() };
    setPath([{ c: { ...c }, v: solve(c, sn.tws, sn.twa, sn.plan, sea).v, t: 0 }]);
    setDone(false);
    setRunning(true);
  };
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const r = run.current;
      if (!r) return;
      const plan = snapRef.current.plan;
      const keys = keysFor(plan.headsail === 'gennaker');
      const v = (c: Controls) => solve(c, r.tws, r.twa, plan, sea).v;
      const v0 = v(r.c);
      const next = { ...r.c };
      let moved = false;
      for (const k of keys) {
        let bx = r.c[k];
        let bv = v0;
        for (let i = 0; i <= 16; i++) {
          const x = i / 16;
          const vx = v({ ...r.c, [k]: x });
          if (vx > bv + 1e-4) (bv = vx), (bx = x);
        }
        const d = bx - r.c[k];
        if (Math.abs(d) > 1e-3) moved = true;
        next[k] = r.c[k] + Math.sign(d) * Math.min(Math.abs(d), r.step);
      }
      if (!moved && v0 / Math.max(0.1, solve(r.c, r.tws, r.twa, plan, sea).target) < 0.6) {
        // no slope anywhere (boat stopped): walk towards the polar optimum
        const o = optimalControls(r.tws, Math.abs(r.twa), polarSail(plan));
        for (const k of keys) next[k] = r.c[k] + Math.sign(o[k] - r.c[k]) * Math.min(Math.abs(o[k] - r.c[k]), 0.02);
      }
      const v1 = v(next);
      let finished = false;
      if (v1 <= v0 + 1e-5 && moved) {
        r.step *= 0.5;
        if (r.step < 0.0025) finished = true;
      } else if (v1 <= v0 + 1e-5) finished = true;
      else {
        r.c = next;
        r.quiet = v1 - v0 < 0.001 ? r.quiet + 1 : 0;
        for (const k of keys) onSet(k, Math.round(next[k] * 1000) / 1000);
        setPath((p) => [...p, { c: { ...next }, v: v1, t: (performance.now() - r.t0) / 1000 }]);
        if (r.quiet >= 8 || path.length > 400) finished = true;
      }
      if (finished) {
        setRunning(false);
        setDone(true);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  const exportCsv = () => {
    const keys = keysFor(kite);
    const rows = [['step', 'time_s', 'speed_kn', ...keys].join(','), ...path.map((p, i) => [i, p.t.toFixed(2), p.v.toFixed(3), ...keys.map((k) => p.c[k].toFixed(3))].join(','))];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join(String.fromCharCode(10))], { type: 'text/csv' }));
    a.download = `trimmaster-vmax-${snap.tws.toFixed(0)}kn-${Math.abs(snap.twa).toFixed(0)}deg.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const vMax = Math.max(...data.curves.flatMap((c) => c.vs), data.target);
  const vMin = Math.max(0, Math.min(...data.curves.flatMap((c) => c.vs)));
  const lo = Math.max(vMin, vMax - Math.max(1.2, (vMax - vMin) * 0.6));
  const W = 150;
  const H = 54;
  const PX = (x: number) => 4 + x * (W - 8);
  const PY = (v: number) => 4 + (1 - (Math.max(lo, v) - lo) / Math.max(0.05, vMax - lo)) * (H - 8);
  const label = (k: ControlKey) =>
    kite && k === 'jibSheet' ? L('Kite sheet', 'Écoute de spi') : kite && snap.plan.kiteSym && k === 'jibLead' ? L('Guy (pole)', 'Bras (tangon)') : kite && snap.plan.kiteSym && k === 'jibHalyard' ? L('Pole height', 'Hauteur tangon') : CONTROL_RATES[k].label;

  // two views in the same layout: "speed per setting" (the VPP curves), and once an optimisation has
  // run, "setting vs time" for each control (zoomed on its own range). Clear goes back to the VPP.
  const optView = path.length > 0;
  const clear = () => {
    setRunning(false);
    setPath([]);
    setDone(false);
    run.current = null;
    setData(sweep(snapRef.current, sea));
  };
  const n = path.length - 1;
  const T = optView ? Math.max(0.2, path[n].t) : 1;
  const vs = path.map((p) => p.v);
  const tLabel = (t: number) => `${t < 10 ? t.toFixed(1) : t.toFixed(0)}s`;
  // one tile of the "vs time" view: a series zoomed on its own range, with its axis labels
  const timeTile = (key: string, title: string, color: string, ys: number[], fmt: (y: number) => string, startEnd: string) => {
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const span = Math.max(y1 - y0, Math.abs(y1) * 0.04, 0.02);
    const lo2 = (y0 + y1) / 2 - span * 0.6;
    const hi2 = (y0 + y1) / 2 + span * 0.6;
    const L0 = 26;
    const R0 = 4;
    const sx = (t: number) => L0 + (t / T) * (W - L0 - R0);
    const sy = (y: number) => 4 + (1 - (y - lo2) / (hi2 - lo2)) * (H - 14);
    const pts = path.map((p, i) => `${sx(p.t).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join(' ');
    return (
      <div key={key} className="rounded border border-cyan-300/10 bg-navy-900/70 px-1.5 pb-1 pt-1">
        <div className="flex items-baseline justify-between gap-1 text-[10.5px]">
          <span className="truncate font-semibold uppercase" style={{ color }}>
            {title}
          </span>
          <span className="num shrink-0 text-white">{startEnd}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
          {[hi2 - span * 0.1, (lo2 + hi2) / 2, lo2 + span * 0.1].map((g, i) => (
            <g key={i}>
              <line x1={L0} x2={W - R0} y1={sy(g)} y2={sy(g)} stroke="rgba(148,163,184,0.14)" />
              <text x={L0 - 2} y={sy(g) + 2.5} fontSize={7} textAnchor="end" fill="#64748b">
                {fmt(g)}
              </text>
            </g>
          ))}
          <line x1={L0} x2={W - R0} y1={H - 10} y2={H - 10} stroke="rgba(148,163,184,0.3)" />
          <text x={L0} y={H - 2} fontSize={7} fill="#64748b">0s</text>
          <text x={W - R0} y={H - 2} fontSize={7} textAnchor="end" fill="#64748b">{tLabel(T)}</text>
          <polyline points={pts} fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
          <circle cx={sx(path[n].t)} cy={sy(ys[n])} r={2.2} fill={color} />
        </svg>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-cyan-300/25 bg-navy-950/90 p-2 shadow-2xl backdrop-blur">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200">
            {optView ? L('Continuous optimisation · setting vs time', 'Optimisation continue · réglage vs temps') : L('Speed per setting (VPP)', 'Vitesse par réglage (VPP)')}
          </div>
          <div className="text-[10px] text-slate-400">
            {optView ? (
              <span className="num">
                {vs[0].toFixed(2)} → <span className="text-good">{Math.max(...vs).toFixed(2)} {L('kn', 'nds')}</span> · {T.toFixed(1)} s · {n} {L('steps', 'pas')}
                {running ? <span className="ml-1 text-warn">· {L('running…', 'en cours…')}</span> : done ? <span className="ml-1 text-good">· {L('Vmax reached', 'Vmax atteinte')}</span> : null}
              </span>
            ) : (
              L(`${snap.tws.toFixed(1)} kn true, ${Math.abs(snap.twa).toFixed(0)}° · target ${data.target.toFixed(2)} kn · click a curve to set it`, `${snap.tws.toFixed(1)} nds réels, ${Math.abs(snap.twa).toFixed(0)}° · cible ${data.target.toFixed(2)} nds · clique une courbe pour régler`)
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => (running ? (setRunning(false), setDone(true)) : start())} className={`btn-ghost !px-2 !py-1 text-xs ${running ? 'text-warn' : 'text-cyan-200'}`} title={L('From the present trim, every control a little at a time up the speed gradient until Vmax at this angle', 'Depuis le réglage actuel, tous les réglages un peu à la fois dans le sens qui fait gagner le plus, jusqu’à la Vmax de cet angle')}>
            {running ? <Square size={12} /> : <Play size={12} />} {running ? L('Stop', 'Arrêter') : L('Continuous optimisation', 'Optimisation continue')}
          </button>
          {optView ? (
            <>
              <button onClick={exportCsv} className="btn-ghost !px-2 !py-1 text-xs">
                <Download size={12} /> CSV
              </button>
              <button onClick={clear} className="btn-ghost !px-2 !py-1 text-xs" title={L('Back to speed per setting', 'Revenir à la vitesse par réglage')}>
                <Eraser size={12} /> {L('Clear', 'Effacer')}
              </button>
            </>
          ) : (
            <button onClick={onAll} className="btn-ghost !px-2 !py-1 text-xs text-good" title={L('Every control to the polar optimum (P)', 'Tous les réglages à l’optimum de la polaire (P)')}>
              <Anchor size={12} /> {L('All to optimum', 'Tout à l’optimum')}
            </button>
          )}
          <button onClick={onClose} className="btn-ghost !px-1.5 !py-1" aria-label={L('Close', 'Fermer')}>
            <X size={13} />
          </button>
        </div>
      </div>

      {optView ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
          {path.length > 1 ? (
            <>
              {timeTile('speed', L('Boat speed', 'Vitesse bateau'), '#ffffff', vs, (y) => y.toFixed(2), `${vs[0].toFixed(2)}→${vs[n].toFixed(2)}`)}
              {keysFor(kite).map((k) =>
                timeTile(
                  k,
                  label(k),
                  COLORS[k],
                  path.map((p) => p.c[k] * 100),
                  (y) => `${y.toFixed(Math.abs(y) < 10 ? 1 : 0)}%`,
                  `${Math.round(path[0].c[k] * 100)}→${Math.round(path[n].c[k] * 100)}%`,
                ),
              )}
            </>
          ) : (
            <div className="col-span-full py-6 text-center text-xs text-slate-400">{L('Starting…', 'Démarrage…')}</div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {data.curves.map((c) => {
              const gain = c.vBest - c.vCur;
              const pts = c.xs.map((x, i) => `${PX(x).toFixed(1)},${PY(c.vs[i]).toFixed(1)}`).join(' ');
              return (
                <div key={c.k} className="rounded border border-cyan-300/10 bg-navy-900/70 px-1.5 pb-1 pt-1">
                  <div className="flex items-baseline justify-between gap-1 text-[10.5px]">
                    <span className="truncate font-semibold uppercase text-slate-300">{label(c.k)}</span>
                    <span className="num shrink-0 text-white">{Math.round(c.cur * 100)}%</span>
                  </div>
                  <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="block w-full cursor-crosshair"
                    onClick={(e) => {
                      const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                      const x = Math.max(0, Math.min(1, (((e.clientX - r.left) / r.width) * W - 4) / (W - 8)));
                      onSet(c.k, Math.round(x * 100) / 100);
                      window.setTimeout(() => setData(sweep(snapRef.current, sea)), 60);
                    }}
                  >
                    <line x1={4} x2={W - 4} y1={PY(data.target)} y2={PY(data.target)} stroke="rgba(148,163,184,0.3)" strokeDasharray="2 3" />
                    <line x1={PX(c.opt)} x2={PX(c.opt)} y1={2} y2={H - 2} stroke="#67e8f9" strokeOpacity={0.6} strokeDasharray="2 2" />
                    <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth={1.6} />
                    <line x1={PX(c.cur)} x2={PX(c.cur)} y1={2} y2={H - 2} stroke="#fff" strokeWidth={1.2} />
                    <circle cx={PX(c.best)} cy={PY(c.vBest)} r={2.6} fill="#34d399" />
                  </svg>
                  <div className="flex justify-between text-[10px]">
                    <span className="num text-slate-400">{c.vCur.toFixed(2)} kn</span>
                    {gain > 0.02 ? (
                      <span className="num text-good">
                        → {Math.round(c.best * 100)}% +{gain.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-500">{L('on top', 'au sommet')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-400">
            <span>
              <span className="mr-1 inline-block h-2 w-0.5 bg-white align-middle" />
              {L('you', 'toi')}
            </span>
            <span>
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" />
              {L('top of the curve (others as they are)', 'sommet de la courbe (les autres réglages tels quels)')}
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-0.5 bg-cyan-300/60 align-middle" />
              {L('polar optimum', 'optimum de la polaire')}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
