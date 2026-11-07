// "Stabilise" as a small VPP: for the present wind and angle, the boat speed each control would give
// over its whole range (the other controls left where they are), with where you are, the top of the
// curve and the polar's optimum. Click a curve to put that control there.
import { useEffect, useRef, useState } from 'react';
import { Anchor, X } from 'lucide-react';
import type { ControlKey, Controls } from '../content/types';
import type { Snapshot } from '../sim/engine';
import { CONTROL_RATES } from '../sim/engine';
import { solve } from '../sim/advisor';
import { optimalControls } from '../sim/polar';
import { L } from '../i18n';

const KEYS_JIB: ControlKey[] = ['jibSheet', 'jibLead', 'jibHalyard', 'mainSheet', 'traveller', 'vang', 'outhaul', 'cunningham', 'backstay', 'hike'];
const KEYS_KITE: ControlKey[] = ['jibSheet', 'mainSheet', 'traveller', 'vang', 'outhaul', 'backstay', 'hike'];
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
  const keys = kite ? KEYS_KITE : KEYS_JIB;
  const c0: Controls = { ...snap.targets };
  const tws = snap.tws;
  const twa = snap.twa;
  const plan = snap.plan;
  const opt = optimalControls(tws, Math.abs(twa), plan.headsail);
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

  const vMax = Math.max(...data.curves.flatMap((c) => c.vs), data.target);
  const vMin = Math.max(0, Math.min(...data.curves.flatMap((c) => c.vs)));
  const lo = Math.max(vMin, vMax - Math.max(1.2, (vMax - vMin) * 0.6));
  const W = 150;
  const H = 54;
  const PX = (x: number) => 4 + x * (W - 8);
  const PY = (v: number) => 4 + (1 - (Math.max(lo, v) - lo) / Math.max(0.05, vMax - lo)) * (H - 8);
  const label = (k: ControlKey) => (kite && k === 'jibSheet' ? L('Kite sheet', 'Écoute de spi') : CONTROL_RATES[k].label);

  return (
    <div className="rounded-lg border border-cyan-300/25 bg-navy-950/90 p-2 shadow-2xl backdrop-blur">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200">{L('Speed per setting (VPP)', 'Vitesse par réglage (VPP)')}</div>
          <div className="text-[10px] text-slate-400">
            {L(`${snap.tws.toFixed(1)} kn true, ${Math.abs(snap.twa).toFixed(0)}° · target ${data.target.toFixed(2)} kn · click a curve to set it`, `${snap.tws.toFixed(1)} nds réels, ${Math.abs(snap.twa).toFixed(0)}° · cible ${data.target.toFixed(2)} nds · clique une courbe pour régler`)}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onAll} className="btn-ghost !px-2 !py-1 text-xs text-good" title={L('Every control to the polar optimum (P)', 'Tous les réglages à l’optimum de la polaire (P)')}>
            <Anchor size={12} /> {L('All to optimum', 'Tout à l’optimum')}
          </button>
          <button onClick={onClose} className="btn-ghost !px-1.5 !py-1" aria-label={L('Close', 'Fermer')}>
            <X size={13} />
          </button>
        </div>
      </div>
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
                  const x = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width * W - 4) / (W - 8)));
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
    </div>
  );
}
