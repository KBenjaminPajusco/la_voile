import { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import type { ControlKey, Controls, LabFocus, Lesson } from '../content/types';
import { J80_PROFILE } from '../sim/boatProfile';
import { DEFAULT_PLAN, steadyState, type SteadyResult } from '../sim/physics';
import { optimalControls, targetSpeed } from '../sim/polar';
import { mainOnControls } from '../sim/advisor';
import { CONTROL_RATES } from '../sim/engine';
import { LessonDiagram } from './diagrams';
import { Panel } from '../ui/kit';
import { L } from '../i18n';
import { labSnapshot } from '../three/staticSnapshot';
import type { CamView } from '../three/TrimmerScene';

const Boat3DView = lazy(() => import('./Boat3DView'));

/** which 3D camera shows a lesson best */
function labView(lesson: Lesson): { view: CamView; forces: boolean; second?: CamView } {
  const byId: Record<string, { view: CamView; forces: boolean }> = {
    'jib-telltales': { view: 'trimmer', forces: false },
    'jib-over-under-trim': { view: 'trimmer', forces: false },
    'heel-angle': { view: 'chase', forces: true },
    'weather-helm': { view: 'chase', forces: true },
    'rudder-load': { view: 'chase', forces: true },
    'main-jib-balance': { view: 'chase', forces: true },
    'crew-weight': { view: 'chase', forces: true },
    'speed-acceleration': { view: 'chase', forces: true },
    'apparent-wind': { view: 'trimmer', forces: true },
    'upwind-downwind-modes': { view: 'trimmer', forces: true },
    'kite-pressure-heel': { view: 'leeward', forces: true },
  };
  // jib and main lessons: two views side by side - the trimmer's seat, and the one that shows the
  // sail's shape (jib from the leeward deck, main from dead astern)
  if (lesson.module === 'headsail') return { view: 'trimmer', forces: false, second: 'leeward' };
  if (lesson.module === 'mainsail') return { view: 'main', forces: false, second: 'astern' };
  if (byId[lesson.id]) return byId[lesson.id];
  return { view: 'chase', forces: true };
}

const FLOW_LABEL: Record<string, string> = { flog: L('flog', 'bat'), luff: L('luff', 'faseye'), ok: 'ok', stall: L('stall', 'décroché') };

const FOCUS_LABEL: Record<LabFocus, string> = {
  headsailSplit: L('Headsail pull: forward / sideways', 'Traction voile d\'avant : avant / latérale'),
  sheetLoad: L('Headsail sheet load', 'Charge d\'écoute de voile d\'avant'),
  jibDepth: L('Jib depth', 'Creux du foc'),
  jibDraft: L('Jib draft position', 'Position du creux du foc'),
  jibTwist: L('Jib twist', 'Vrillage du foc'),
  jibAoA: L('Jib angle of attack (mid)', 'Incidence du foc (milieu)'),
  mainDepth: L('Main depth', 'Creux de GV'),
  mainDraft: L('Main draft position', 'Position du creux de GV'),
  mainTwist: L('Main twist', 'Vrillage de GV'),
  mainAoA: L('Main angle of attack (mid)', 'Incidence de GV (milieu)'),
  forestaySag: L('Forestay sag', 'Flèche d\'étai'),
  slot: L('Slot angle', 'Angle de la fente'),
  heel: L('Heel', 'Gîte'),
  rudder: L('Rudder (weather helm)', 'Safran (barre ardente)'),
  speed: L('Boat speed', 'Vitesse du bateau'),
  drive: L('Drive force', 'Force propulsive'),
  heelMoment: L('Heeling moment', 'Moment de gîte'),
};

export function focusValue(k: LabFocus, r: SteadyResult): string {
  const f = r.f;
  switch (k) {
    case 'headsailSplit': {
      const h = f.gennaker ?? f.jib;
      const tot = Math.hypot(h.drive, h.side) || 1;
      return L(`${Math.round((Math.max(0, h.drive) / tot) * 100)}% fwd · ${Math.round(h.side)} N side`, `${Math.round((Math.max(0, h.drive) / tot) * 100)}% avant · ${Math.round(h.side)} N latéral`);
    }
    case 'sheetLoad':
      return `${Math.round(f.jibSheetLoad)} N`;
    case 'jibDepth':
      return `${(f.shapes.jib.depth * 100).toFixed(1)}%`;
    case 'jibDraft':
      return `${Math.round(f.shapes.jib.draft * 100)}%`;
    case 'jibTwist':
      return `${f.shapes.jib.twist.toFixed(1)}°`;
    case 'jibAoA':
      return `${f.jib.sections[1].alpha.toFixed(1)}° (${FLOW_LABEL[f.jib.sections[1].flow] ?? f.jib.sections[1].flow})`;
    case 'mainDepth':
      return `${(f.shapes.main.depth * 100).toFixed(1)}%`;
    case 'mainDraft':
      return `${Math.round(f.shapes.main.draft * 100)}%`;
    case 'mainTwist':
      return `${f.shapes.main.twist.toFixed(1)}°`;
    case 'mainAoA':
      return `${f.main.sections[1].alpha.toFixed(1)}° (${FLOW_LABEL[f.main.sections[1].flow] ?? f.main.sections[1].flow})`;
    case 'forestaySag':
      return `${Math.round(f.shapes.forestaySag * 100)}%`;
    case 'slot':
      return `${f.shapes.slot.toFixed(1)}°`;
    case 'heel':
      return `${r.heel.toFixed(1)}°`;
    case 'rudder':
      return `${f.rudder.toFixed(1)}°`;
    case 'speed':
      return `${r.v.toFixed(2)} kn`;
    case 'drive':
      return `${Math.round(f.drive)} N`;
    case 'heelMoment':
      return `${(f.heelMoment / 1000).toFixed(1)} kN·m`;
  }
}

export function LessonLab({ lesson }: { lesson: Lesson }) {
  const lab = lesson.lab!;
  // unspecified controls start from a good trim for the lab conditions (jib upwind model)
  const headsail = lab.headsail ?? 'jib';
  const plan = { ...DEFAULT_PLAN, headsail };
  // jib lessons: main sheeted at 90 % (traveller compensates) so the boom is not in the trimmer's face
  const jibFocus = headsail === 'jib' && lab.controls.some((k) => k.startsWith('jib')) && !lab.controls.includes('traveller');
  const baseFor = (tws: number, twa: number) => (jibFocus ? mainOnControls(tws, twa, plan) : optimalControls(tws, twa, headsail));
  const base = baseFor(lab.tws, lab.twa);
  const initial = useMemo(() => ({ ...base, ...(lab.presets[0]?.controls ?? {}) }), [lesson.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [c, setC] = useState<Controls>(initial);
  const [tws, setTws] = useState(lab.tws);
  const [twa, setTwa] = useState(lab.twa);
  const env = { tws, twa, sea: 0 };
  const res = useMemo(() => steadyState(J80_PROFILE, c, env, plan), [c, tws, twa]); // eslint-disable-line react-hooks/exhaustive-deps
  const presetResults = useMemo(
    () =>
      lab.presets.map((p) => {
        const pc = { ...baseFor(p.tws ?? lab.tws, p.twa ?? lab.twa), ...p.controls };
        return { p, r: steadyState(J80_PROFILE, pc, { tws: p.tws ?? lab.tws, twa: p.twa ?? lab.twa, sea: 0 }, plan) };
      }),
    [lesson.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const target = targetSpeed(tws, twa, headsail);
  // ---- the lab in 3D: same sails as the simulator, driven by these sliders; the 3D handles of
  // the lab's controls drive the sliders back
  const labRef = useRef({ res, c, tws, twa });
  labRef.current = { res, c, tws, twa };
  const t0 = useRef(performance.now());
  const src3d = useMemo(
    () => ({
      sea: 0,
      snapshot: () => {
        const s = labRef.current;
        return labSnapshot(s.res, s.c, s.tws, s.twa, headsail, (performance.now() - t0.current) / 1000);
      },
      setTarget: (k: ControlKey, v: number) => {
        if (lab.controls.includes(k)) setC((prev) => ({ ...prev, [k]: Math.max(0, Math.min(1, v)) }));
      },
    }),
    [lesson.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const snap3d = labSnapshot(res, c, tws, twa, headsail, 0);
  const cam = labView(lesson);
  return (
    <Panel title={<span className="flex items-center gap-2"><FlaskConical size={13} /> {L('Interactive lab — same physics as the simulator', 'Labo interactif — même physique que le simulateur')}</span>}>
      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          {lab.controls.map((k) => (
            <div key={k}>
              <div className="flex justify-between text-xs text-slate-300">
                <span>{headsail === 'gennaker' && k === 'jibSheet' ? L('Kite sheet', 'Écoute de spi') : CONTROL_RATES[k].label}</span>
                <span className="num text-white">{Math.round(c[k] * 100)}%</span>
              </div>
              <input type="range" className="tm-range" min={0} max={1} step={0.01} value={c[k]} onChange={(e) => setC({ ...c, [k]: parseFloat(e.target.value) })} />
            </div>
          ))}
          <div className="border-t border-cyan-300/10 pt-3">
            <div className="flex justify-between text-xs text-slate-300">
              <span>{L('True wind', 'Vent réel')}</span>
              <span className="num text-white">{tws} kn</span>
            </div>
            <input type="range" className="tm-range" min={4} max={25} step={1} value={tws} onChange={(e) => setTws(parseInt(e.target.value, 10))} />
            <div className="flex justify-between text-xs text-slate-300">
              <span>{L('True wind angle', 'Angle du vent réel')}</span>
              <span className="num text-white">{twa}°</span>
            </div>
            <input type="range" className="tm-range" min={32} max={170} step={1} value={twa} onChange={(e) => setTwa(parseInt(e.target.value, 10))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {lab.focus.map((k) => (
              <div key={k} className="rounded border border-cyan-300/15 bg-navy-950/50 p-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{FOCUS_LABEL[k]}</div>
                <div className="num text-sm text-cyan-200">{focusValue(k, res)}</div>
              </div>
            ))}
            <div className="col-span-2 rounded border border-cyan-300/15 bg-navy-950/50 p-2 text-xs text-slate-300">
              {L('Speed', 'Vitesse')} <span className="num text-white">{res.v.toFixed(2)}</span> kn ({L(`${Math.round((res.v / target) * 100)}% of best trim`, `${Math.round((res.v / target) * 100)}% du meilleur réglage`)}) · {L('heel', 'gîte')} <span className="num text-white">{res.heel.toFixed(0)}°</span> · {L('rudder', 'safran')} <span className="num text-white">{res.f.rudder.toFixed(1)}°</span>
            </div>
          </div>
          <button className="btn-ghost w-full" onClick={() => (setC(initial), setTws(lab.tws), setTwa(lab.twa))}>
            <RotateCcw size={14} /> {L('Reset lab', 'Réinitialiser le labo')}
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <Suspense fallback={<div className="grid h-[380px] place-items-center text-sm text-slate-400">{L('Loading 3D…', 'Chargement 3D…')}</div>}>
              {cam.second ? (
                // the trimmer's own seat on the left, the view that shows the sail's shape on the right
                <div className="grid grid-cols-2 gap-1">
                  <Boat3DView getSim={() => src3d} snap={snap3d} height={380} initialView={cam.view} initialForces={cam.forces} keys={false} handleKeys={lab.controls} compact />
                  <Boat3DView getSim={() => src3d} snap={snap3d} height={380} initialView={cam.second} initialForces={false} keys={false} handleKeys={lab.controls} coach={false} compact />
                </div>
              ) : (
                <Boat3DView getSim={() => src3d} snap={snap3d} height={380} initialView={cam.view} initialForces={cam.forces} keys={false} handleKeys={lab.controls} />
              )}
            </Suspense>
            <p className="mt-1 text-[10px] text-slate-500">
              {L('Live: the sliders shape the 3D sails. Drag a glowing handle in 3D to move the same control; switch cameras at the top.', 'En direct : les curseurs façonnent les voiles en 3D. Glisse une poignée lumineuse en 3D pour bouger le même réglage ; change de caméra en haut.')}
            </p>
          </div>
          <LessonDiagram kind={lesson.diagram} res={res} c={c} tws={tws} twa={twa} module={lesson.module} />
          <div>
            <div className="panel-title mb-2">{L('Compare configurations', 'Comparer les configurations')}</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-xs">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-1 pr-2 font-medium">{L('Preset', 'Préréglage')}</th>
                    {lab.focus.map((k) => (
                      <th key={k} className="px-2 py-1 font-medium">
                        {FOCUS_LABEL[k]}
                      </th>
                    ))}
                    <th className="px-2 py-1 font-medium">{L('Speed', 'Vitesse')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {presetResults.map(({ p, r }) => (
                    <tr key={p.name} className="border-t border-cyan-300/10 align-top">
                      <td className="py-2 pr-2">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="max-w-[220px] text-[11px] text-slate-400">{p.description}</div>
                      </td>
                      {lab.focus.map((k) => (
                        <td key={k} className="num px-2 py-2 text-cyan-200">
                          {focusValue(k, r)}
                        </td>
                      ))}
                      <td className="num px-2 py-2 text-white">{r.v.toFixed(2)} kn</td>
                      <td className="py-2">
                        <button
                          className="btn-ghost !px-2 !py-1 text-[11px]"
                          onClick={() => {
                            setC({ ...baseFor(p.tws ?? lab.tws, p.twa ?? lab.twa), ...p.controls });
                            setTws(p.tws ?? lab.tws);
                            setTwa(p.twa ?? lab.twa);
                          }}
                        >
                          {L('Load', 'Charger')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
