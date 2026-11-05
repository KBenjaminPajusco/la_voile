// The live simulator cockpit: instruments, boat view, controls, crew comms.
// Works for every mode (free practice, situations, maneuvers, match race) through ScenarioRunner.
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  ChevronsDown,
  ChevronsUp,
  Gauge,
  Hand,
  Keyboard,
  Megaphone,
  Pause,
  Play,
  RotateCcw,
  Square,
  Wind,
  Zap,
} from 'lucide-react';
import type { ControlKey } from '../content/types';
import { ScenarioRunner, type RunResult, type ScenarioDef } from '../sim/runner';
import type { CrewCall, HelmMode } from '../sim/engine';
import { ArcGauge, BoatTopView, SailSections, SlotCoherence, SternView, Telltales } from './visuals';
import { ControlSlider } from './ControlSlider';
import { Bar, Chip, Kbd, Sparkline, toneText } from '../ui/kit';
import { useProgress } from '../store/progress';
import { L } from '../i18n';
import { CoachCard, adviceHints, newCoach, updateCoach } from './CoachCard';
import { GraduationCap, Lightbulb } from 'lucide-react';

const DT = 0.05;
// three.js lives in its own chunk, loaded only when the 3D view is opened
const Boat3DView = lazy(() => import('./Boat3DView'));

const KEYMAP: Record<string, [ControlKey, number]> = {
  w: ['jibSheet', 0.015],
  s: ['jibSheet', -0.02],
  e: ['mainSheet', 0.015],
  d: ['mainSheet', -0.02],
  t: ['traveller', 0.03],
  g: ['traveller', -0.03],
  y: ['backstay', 0.04],
  h: ['backstay', -0.04],
  u: ['vang', 0.04],
  j: ['vang', -0.04],
  i: ['outhaul', 0.04],
  k: ['outhaul', -0.04],
  o: ['cunningham', 0.04],
  l: ['cunningham', -0.04],
  '[': ['jibLead', -0.04],
  ']': ['jibLead', 0.04],
  n: ['jibHalyard', -0.04],
  m: ['jibHalyard', 0.04],
  z: ['hike', -0.15],
  x: ['hike', 0.15],
};
const CALL_KEYS: Record<string, CrewCall> = { '1': 'pressure', '2': 'lull', '3': 'foot', '4': 'point', '5': 'speed-ok' };

export function Cockpit({
  def,
  onFinish,
  onExit,
  freeMode = false,
}: {
  def: ScenarioDef;
  onFinish: (r: RunResult, runner: ScenarioRunner, easy: boolean) => void;
  onExit: () => void;
  freeMode?: boolean;
}) {
  const { progress, setTimeScale } = useProgress();
  const runnerRef = useRef<ScenarioRunner>(new ScenarioRunner(def));
  const [, setTick] = useState(0);
  const [paused, setPaused] = useState(true);
  const [started, setStarted] = useState(false);
  const [view, setView] = useState<'top' | 'shape' | '3d'>('3d');
  const [showKeys, setShowKeys] = useState(false);
  const finishedRef = useRef(false);
  const timeScale = progress.timeScale;
  // EASY MODE: time stops / slows at the moments to act, hints on request
  const canEasy = !freeMode && def.mode !== 'race';
  const [easy, setEasyS] = useState(() => {
    try {
      return localStorage.getItem('trimmaster.easy') === '1';
    } catch {
      return false;
    }
  });
  const setEasy = (v: boolean) => {
    setEasyS(v);
    try {
      localStorage.setItem('trimmaster.easy', v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };
  const easyOn = canEasy && easy;
  const easyRef = useRef(easyOn);
  easyRef.current = easyOn;
  const usedEasyRef = useRef(false);
  const coachRef = useRef(newCoach());

  const restart = useCallback(() => {
    runnerRef.current = new ScenarioRunner(def);
    coachRef.current = newCoach();
    usedEasyRef.current = false;
    finishedRef.current = false;
    setPaused(true);
    setStarted(false);
    setTick((t) => t + 1);
  }, [def]);

  useEffect(() => {
    restart();
  }, [def, restart]);

  // ---- main loop
  useEffect(() => {
    // setInterval (not rAF) so the simulation keeps real time even when the window is occluded
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    const loop = () => {
      const now = performance.now();
      const dtReal = Math.min(0.1, (now - last) / 1000);
      last = now;
      const r = runnerRef.current;
      if (!paused && !r.finished) {
        let k = 1;
        if (easyRef.current) {
          usedEasyRef.current = true;
          k = updateCoach(coachRef.current, r, now);
        }
        acc += dtReal * timeScale * k;
        while (acc >= DT) {
          r.step(DT);
          acc -= DT;
          if (r.finished) break;
        }
      }
      if (r.finished && !finishedRef.current) {
        finishedRef.current = true;
        onFinish(r.evaluate(), r, usedEasyRef.current);
      }
      if (++frame % 3 === 0) setTick((t) => (t + 1) % 1e9);
    };
    const id = window.setInterval(loop, 16);
    return () => window.clearInterval(id);
  }, [paused, timeScale, onFinish]);

  const sim = runnerRef.current.sim;

  // the 3D view grows with the window: it is what you trim from
  const [view3dH, setView3dH] = useState(() => (typeof window === 'undefined' ? 520 : Math.round(Math.min(900, Math.max(520, window.innerHeight * 0.68)))));
  useEffect(() => {
    const on = () => setView3dH(Math.round(Math.min(900, Math.max(520, window.innerHeight * 0.68))));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  // 3D on a wide screen: the cockpit fits the window (no scrolling between the view and the sliders)
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);
  const fitRef = useRef<HTMLDivElement>(null);
  const [fitH, setFitH] = useState(720);
  const fit = view === '3d' && wide;
  const measureFit = useCallback(() => {
    setWide(window.innerWidth >= 1280);
    const el = fitRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    setFitH(Math.max(520, Math.round(window.innerHeight - top - 14)));
  }, []);
  useEffect(() => {
    window.addEventListener('resize', measureFit);
    return () => window.removeEventListener('resize', measureFit);
  }, [measureFit]);
  useEffect(() => {
    measureFit();
  }, [fit, started, showKeys, measureFit]);
  // ---- keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') return;
      const k = e.key.toLowerCase();
      const s = runnerRef.current.sim;
      if (k === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
        setStarted(true);
        return;
      }
      if (e.key === 'Shift') s.setSprint(true);
      if (KEYMAP[k]) {
        e.preventDefault();
        const [key, d] = KEYMAP[k];
        s.nudge(key, d);
      } else if (CALL_KEYS[k]) s.call(CALL_KEYS[k]);
      else if (k === 'a') s.prepareSheet();
      else if (k === 'r') s.releaseSheet();
      else if (k === 'q') s.setGear(s.gear === 'high' ? 'low' : 'high');
      else if (k === '6') s.setGrinder(!s.grinder);
      else if (k === 'c') s.setCrewFore(s.plan.crewFore === 0 ? 1 : s.plan.crewFore === 1 ? -1 : 0);
      else if (k === 'enter' && freeMode) {
        if (Math.abs(s.twa) < 95) s.commandTack();
        else s.commandGybe();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') runnerRef.current.sim.setSprint(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [freeMode]);

  const snap = sim.snapshot();
  const f = snap.f;
  const tel = sim.telemetry.slice(-160);
  const prompts = runnerRef.current.activePrompts();
  const hud = runnerRef.current.hud();
  const msgs = snap.messages.slice(-7).reverse();
  const isKite = snap.plan.headsail === 'gennaker';
  const focus = new Set(def.focusControls);
  const perfTone = snap.perf > 0.95 ? 'good' : snap.perf > 0.85 ? 'warn' : 'alarm';
  const set = (k: ControlKey) => (v: number) => sim.setTarget(k, v);
  const remaining = Math.max(0, def.duration - snap.t);
  const upwind = Math.abs(snap.twa) < 95;

  const modeBtn = (m: HelmMode, label: string) => (
    <button key={m} onClick={() => sim.setMode(m)} className={`btn !px-2 !py-1.5 text-xs ${snap.helmMode === m ? 'bg-cyan-400 text-navy-950' : 'btn-ghost'}`}>
      {label}
    </button>
  );
  const callBtn = (c: CrewCall, label: string, key: string) => (
    <button key={c} onClick={() => sim.call(c)} className="btn-ghost !px-2 !py-1.5 text-xs">
      <Megaphone size={12} /> {label} <Kbd>{key}</Kbd>
    </button>
  );

  const chartMarks = useMemo(() => [], []);
  const coach = coachRef.current.active;
  const coachCard =
    easyOn && coach ? (
      <CoachCard
        c={coach}
        onHint={() => {
          coach.hint = Math.min(coach.hints.length, coach.hint + 1);
          setTick((t) => t + 1);
        }}
        onContinue={() => {
          coach.done = true;
          coach.doneReal = performance.now() - 2400;
          setTick((t) => t + 1);
        }}
      />
    ) : null;
  const sessionCtl = (compact: boolean) => (
        <div className={`flex flex-wrap items-center ${compact ? 'gap-2' : 'gap-4'}`}>
          {hud.map((h) => (
            <div key={h.label} className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{h.label}</div>
              <div className={`num text-sm font-semibold ${h.tone ? toneText[h.tone] : 'text-white'}`}>{h.value}</div>
            </div>
          ))}
          {!hud.length && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{freeMode ? L('Session', 'Session') : L('Time left', 'Temps restant')}</div>
              <div className="num text-sm font-semibold text-white">{freeMode ? `${Math.floor(snap.t / 60)}:${String(Math.floor(snap.t % 60)).padStart(2, '0')}` : `${remaining.toFixed(0)} s`}</div>
            </div>
          )}
          {canEasy && (
            <div className="flex items-center gap-1">
              <button onClick={() => setEasy(!easy)} title={L('Easy mode: time stops when you need to act, hints on request', 'Mode facile : le temps s’arrête quand il faut agir, indices à la demande')} className={`btn !px-2 !py-1 text-xs ${easy ? 'bg-good/25 text-good border border-good/40' : 'btn-ghost'}`}>
                <GraduationCap size={13} /> {L('Easy', 'Facile')}
              </button>
              {easy && started && (
                <button onClick={askHint} className="btn-ghost !px-2 !py-1 text-xs">
                  <Lightbulb size={13} /> {L('Hint', 'Indice')}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-1">
            {[0.5, 1, 2].map((s) => (
              <button key={s} onClick={() => setTimeScale(s)} className={`num rounded px-1.5 py-0.5 text-[11px] ${timeScale === s ? 'bg-cyan-400 text-navy-950' : 'text-slate-400 hover:text-white'}`}>
                ×{s}
              </button>
            ))}
          </div>
          <button className={`${paused ? 'btn-primary' : 'btn-ghost'} ${compact ? '!px-2 !py-1 text-xs' : ''}`} onClick={() => (setPaused((p) => !p), setStarted(true))}>
            {paused ? <Play size={compact ? 13 : 16} /> : <Pause size={compact ? 13 : 16} />} {paused ? (started ? L('Resume', 'Reprendre') : L('Start', 'Démarrer')) : L('Pause', 'Pause')}
          </button>
          <button className={`btn-ghost ${compact ? '!px-2 !py-1' : ''}`} onClick={restart} title={L('Restart', 'Recommencer')}>
            <RotateCcw size={16} />
          </button>
          <button
            className={`btn-ghost ${compact ? '!px-2 !py-1 text-xs' : ''}`}
            onClick={() => {
              const r = runnerRef.current;
              r.finished = true;
              r.endReason = 'stopped';
            }}
            title={L('End & debrief', 'Terminer et débriefer')}
          >
            <Square size={16} /> {L('End', 'Fin')}
          </button>
          <button className={`btn-ghost ${compact ? '!px-2 !py-1' : ''}`} onClick={() => setShowKeys((v) => !v)} title={L('Keyboard', 'Clavier')}>
            <Keyboard size={16} />
          </button>
          <button className={`btn-ghost ${compact ? '!px-2 !py-1 text-xs' : ''}`} onClick={onExit}>
            {L('Exit', 'Quitter')}
          </button>
        </div>
  );
  const overlay3d = fit ? (
    <div className="space-y-1">
      {prompts.slice(-2).map((p, i) => (
        <div key={i} className={`rounded-lg border bg-navy-950/85 px-3 py-1.5 text-sm font-semibold shadow-xl backdrop-blur ${p.tone === 'alarm' ? 'border-alarm/60 text-alarm' : p.tone === 'warn' ? 'border-warn/60 text-warn' : p.tone === 'good' ? 'border-good/60 text-good' : 'border-cyan-300/30 text-cyan-200'}`}>
          {p.text}
        </div>
      ))}
      {coachCard}
    </div>
  ) : (
    coachCard
  );
  const askHint = () => {
    const r = runnerRef.current;
    coachRef.current.active = { step: { id: `ask${Math.round(r.sim.t)}`, freeze: 'pause', title: L('What should I do now?', 'Que faire maintenant ?'), hints: [], done: (_s, _t) => false }, since: r.sim.t, hint: 1, hints: adviceHints(r), done: false };
    setTick((t) => t + 1);
  };

  const speedCard = (
    <>
            <div className="col-span-2 rounded-lg border border-cyan-300/10 bg-navy-950/60 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{L('Boat speed', 'Vitesse bateau')}</span>
                <span className={`num text-xs ${toneText[perfTone]}`}>{Math.round(snap.perf * 100)}% {L('target', 'cible')}</span>
              </div>
              <div className={`num font-semibold text-white ${fit ? 'text-3xl leading-tight' : 'text-4xl'}`}>
                {snap.v.toFixed(2)}
                <span className="ml-1 text-sm text-slate-400">kn</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>
                  {L('Target', 'Cible')} <span className="num text-slate-200">{snap.target.toFixed(2)}</span>
                </span>
                <span className={snap.accel > 0.05 ? 'text-good' : snap.accel < -0.05 ? 'text-alarm' : ''}>
                  {snap.accel >= 0 ? <ChevronsUp size={12} className="inline" /> : <ChevronsDown size={12} className="inline" />} <span className="num">{snap.accel.toFixed(2)}</span> kn/s
                </span>
              </div>
              <Bar value={Math.min(1.05, snap.perf) * 100} max={105} tone={perfTone} className="mt-2" />
            </div>
    </>
  );
  const gauges = (
    <>
            <div className="flex justify-center">
              <ArcGauge value={snap.heel} min={-10} max={40} label={L('Heel', 'Gîte')} unit="°" decimals={0} size={fit ? 92 : 110} zones={[{ from: 14, to: 24, color: '#34d399' }, { from: 24, to: 28, color: '#f59e0b' }, { from: 28, to: 40, color: '#ef4444' }]} />
            </div>
            <div className="flex justify-center">
              <ArcGauge value={snap.rudder} min={-6} max={18} label={L('Rudder', 'Safran')} unit="°" decimals={1} size={fit ? 92 : 110} zones={[{ from: 1, to: 5, color: '#34d399' }, { from: 5, to: 9, color: '#f59e0b' }, { from: 9, to: 18, color: '#ef4444' }]} />
            </div>
    </>
  );
  const windGrid = (
    <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['TWS', snap.tws.toFixed(1), 'kn'],
              ['TWA', Math.abs(snap.twa).toFixed(0), '°'],
              ['AWS', snap.aws.toFixed(1), 'kn'],
              ['AWA', snap.awa.toFixed(0), '°'],
              ['VMG', snap.vmg.toFixed(2), 'kn'],
              [L('Leeway', 'Dérive'), f.leeway.toFixed(1), '°'],
            ].map(([l, v, u]) => (
              <div key={l} className="rounded border border-cyan-300/10 bg-navy-950/40 px-1 py-1.5">
                <div className="text-[9px] uppercase tracking-wider text-slate-400">{l}</div>
                <div className="num text-sm text-white">
                  {v}
                  <span className="text-[9px] text-slate-500">{u}</span>
                </div>
              </div>
            ))}
          </div>
    </>
  );
  const chips = (
    <>
          <div className="flex flex-wrap gap-1">
            <Chip tone={upwind ? 'info' : 'muted'}>{upwind ? L('UPWIND', 'PRÈS') : L('DOWNWIND', 'PORTANT')}</Chip>
            <Chip tone="muted">{snap.twa > 0 ? L('STBD TACK', 'TRIBORD AMURES') : L('PORT TACK', 'BÂBORD AMURES')}</Chip>
            <Chip tone="info">MODE {({ point: L('POINT', 'CAP'), normal: L('NORMAL', 'NORMAL'), foot: L('FOOT', 'VITESSE'), accel: L('ACCEL', 'RELANCE') } as Record<string, string>)[snap.helmMode] ?? snap.helmMode.toUpperCase()}</Chip>
            {snap.gust > 0.8 && <Chip tone="alarm">{L('GUST', 'RISÉE')} +{snap.gust.toFixed(0)}</Chip>}
            {snap.gust < -0.8 && <Chip tone="muted">{L('LULL', 'MOLLE')} {snap.gust.toFixed(0)}</Chip>}
            {f.keelStalled && <Chip tone="warn">{L('KEEL STALL', 'QUILLE DÉCROCHÉE')}</Chip>}
            {snap.roundUp && <Chip tone="alarm">{L('ROUND-UP', 'AULOFÉE')}</Chip>}
            {snap.plan.jibBacked && <Chip tone="alarm">{L('SAIL BACKED', 'VOILE À CONTRE')}</Chip>}
            {snap.plan.jibReleased && <Chip tone="warn">{L('SHEET RELEASED', 'ÉCOUTE LARGUÉE')}</Chip>}
            {snap.plan.gennakerCollapsed && <Chip tone="alarm">{L('KITE COLLAPSED', 'SPI FERMÉ')}</Chip>}
            {snap.maneuver && !snap.maneuver.done && <Chip tone="warn">{({ tack: L('TACK', 'VIREMENT'), gybe: L('GYBE', 'EMPANNAGE'), 'bear-away': L('BEAR-AWAY', 'ABATTÉE'), 'harden-up': L('HARDEN-UP', 'LOFÉE') } as Record<string, string>)[snap.maneuver.kind] ?? snap.maneuver.kind.toUpperCase()}</Chip>}
          </div>
    </>
  );
  const energyBlock = (
    <>
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <Zap size={11} /> {L('Crew energy', 'Énergie équipage')}
              </span>
              <span className="num text-white">{Math.round(snap.energy)}%</span>
            </div>
            <Bar value={snap.energy} tone={snap.energy > 50 ? 'good' : snap.energy > 20 ? 'warn' : 'alarm'} />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>
                {L('Winch:', 'Winch :')} <span className={snap.winchState === 'stalled' ? 'text-alarm' : snap.winchState === 'grinding' ? 'text-cyan-300' : 'text-slate-200'}>{({ idle: L('idle', 'au repos'), tailing: L('tailing', 'avale'), grinding: L('grinding', 'mouline'), stalled: L('stalled', 'bloqué'), easing: L('easing', 'choque') } as Record<string, string>)[snap.winchState] ?? snap.winchState}</span>
              </span>
              <span>
                {L('Jib load', 'Charge foc')} <span className="num text-slate-200">{Math.round(f.jibSheetLoad)}</span> N
              </span>
            </div>
          </div>
    </>
  );
  const flowBlock = (
    <>
          <div className={`grid gap-2 text-[11px] ${fit ? 'grid-cols-4 gap-1 text-[10px]' : 'grid-cols-2'}`}>
            <div className="rounded border border-cyan-300/10 p-2">
              <div className="text-slate-400">{isKite ? L('Kite flow', 'Écoulement spi') : L('Jib flow', 'Écoulement foc')}</div>
              <div className="num text-white">{Math.round((isKite ? (f.gennaker?.efficiency ?? 0) : f.jib.efficiency) * 100)}%</div>
            </div>
            <div className="rounded border border-cyan-300/10 p-2">
              <div className="text-slate-400">{L('Main flow', 'Écoulement GV')}</div>
              <div className="num text-white">{Math.round(f.main.efficiency * 100)}%</div>
            </div>
            <div className="rounded border border-cyan-300/10 p-2">
              <div className="text-slate-400">{L('Slot', 'Fente')}</div>
              <div className={`num ${f.shapes.slot < 2.5 && !isKite ? 'text-alarm' : 'text-white'}`}>{isKite ? '—' : `${f.shapes.slot.toFixed(1)}°`}</div>
            </div>
            <div className="rounded border border-cyan-300/10 p-2">
              <div className="text-slate-400">{L('Forestay sag', "Creux d'étai")}</div>
              <div className="num text-white">{Math.round(f.shapes.forestaySag * 100)}%</div>
            </div>
          </div>
    </>
  );
  const viewToggles = (
            <div className="flex gap-1">
              <button onClick={() => setView('top')} className={`rounded px-2 py-1 text-xs ${view === 'top' ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400'}`}>
                {L('Top view', 'Vue de dessus')}
              </button>
              <button onClick={() => setView('shape')} className={`rounded px-2 py-1 text-xs ${view === 'shape' ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400'}`}>
                {L('Sail shape', 'Forme des voiles')}
              </button>
              <button onClick={() => setView('3d')} className={`rounded px-2 py-1 text-xs ${view === '3d' ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400'}`}>
                {L('3D trimmer POV', 'Vue 3D régleur')}
              </button>
            </div>
  );
  const viewTabs = (
    <>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex gap-1">
              <button onClick={() => setView('top')} className={`rounded px-2 py-1 text-xs ${view === 'top' ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400'}`}>
                {L('Top view', 'Vue de dessus')}
              </button>
              <button onClick={() => setView('shape')} className={`rounded px-2 py-1 text-xs ${view === 'shape' ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400'}`}>
                {L('Sail shape', 'Forme des voiles')}
              </button>
              <button onClick={() => setView('3d')} className={`rounded px-2 py-1 text-xs ${view === '3d' ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400'}`}>
                {L('3D trimmer POV', 'Vue 3D régleur')}
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-cyan-400" /> {L('attached', 'attaché')}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warn" /> {L('luffing', 'faseye')}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-alarm" /> {L('stalled', 'décroché')}
              </span>
              <span className="flex items-center gap-1">
                <Wind size={11} /> {L('grey TW / cyan AW', 'gris VR / cyan VA')}
              </span>
            </div>
          </div>
    </>
  );
  const view3dEl = (
    <>
              <Suspense fallback={<div className="grid h-[520px] place-items-center text-sm text-slate-400">{L('Loading 3D…', 'Chargement 3D…')}</div>}>
                <Boat3DView getSim={() => runnerRef.current.sim} snap={snap} assist={freeMode} overlay={overlay3d} readout={!fit} height={fit ? fitH - (started ? 46 : 54) : view3dH} />
              </Suspense>
    </>
  );
  const otherViews = (
    <>
          <div className={`grid flex-1 gap-2 ${view === '3d' ? 'sm:grid-cols-2' : 'md:grid-cols-[1fr_160px]'}`}>
            {view !== '3d' && <div className={view === 'top' ? 'mx-auto aspect-square w-full max-w-[440px]' : 'w-full'}>
              {view === 'top' ? (
                <BoatTopView twa={snap.twa} awa={snap.awa} tws={snap.tws} aws={snap.aws} heel={snap.heel} f={f} headsail={snap.plan.headsail} backed={snap.plan.jibBacked} released={snap.plan.jibReleased} collapsed={snap.plan.gennakerCollapsed} gust={snap.gust} />
              ) : (
                <div className={`grid h-full gap-2 ${isKite ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {isKite && f.gennaker ? (
                    <SailSections shape={f.shapes.gennaker} sections={f.gennaker.sections} label={L('GENNAKER', 'SPI')} height={380} />
                  ) : (
                    <SailSections shape={f.shapes.jib} sections={f.jib.sections} label={L('JIB', 'FOC')} height={380} />
                  )}
                  <SailSections shape={f.shapes.main} sections={f.main.sections} label={L('MAIN', 'GV')} height={380} />
                  {!isKite && <SlotCoherence f={f} height={380} />}
                </div>
              )}
            </div>}
            <div className={view === '3d' ? 'col-span-full grid gap-2 sm:grid-cols-2' : 'flex flex-col gap-2'}>
              <div className="h-36">
                <SternView heel={snap.heel} heelMoment={f.heelMoment} rightingMoment={f.rightingMoment} hike={snap.controls.hike} rudder={snap.rudder} />
              </div>
              <div className="rounded border border-cyan-300/10 p-2">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">{L('Telltales', 'Penons')}</div>
                <Telltales f={f} headsail={snap.plan.headsail} collapsed={snap.plan.gennakerCollapsed} curl={snap.kiteCurl} over={snap.kiteOver} luffFlap={snap.kiteLuffFlap} leechFlap={snap.kiteLeechFlap} mainBackwind={snap.kiteMainBackwind} />
              </div>
            </div>
          </div>
    </>
  );
  const sparks = (
    <>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400">
                <span>{L('Speed % target (40 s)', 'Vitesse % cible (40 s)')}</span>
                <span className="num">{Math.round(snap.perf * 100)}%</span>
              </div>
              <Sparkline data={tel.map((s) => ({ x: s.t, y: Math.min(1.1, s.perf) }))} min={0.5} max={1.1} refLine={1} height={54} marks={chartMarks} />
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400">
                <span>{L('Heel (40 s)', 'Gîte (40 s)')}</span>
                <span className="num">{snap.heel.toFixed(0)}°</span>
              </div>
              <Sparkline data={tel.map((s) => ({ x: s.t, y: s.heel }))} min={-5} max={40} refLine={25} height={54} color="#f59e0b" />
            </div>
          </div>
    </>
  );
  const commsList = (
    <>
          <div className="min-h-[120px] flex-1 space-y-1.5 overflow-hidden">
            {msgs.length === 0 && <div className="text-xs text-slate-500">{L('Quiet on board…', 'Calme à bord…')}</div>}
            {msgs.map((m, i) => (
              <div key={`${m.t}-${i}`} className={`rounded border-l-2 bg-navy-950/40 px-2 py-1 text-xs ${m.tone === 'alarm' ? 'border-alarm' : m.tone === 'warn' ? 'border-warn' : m.tone === 'good' ? 'border-good' : 'border-cyan-400/50'}`} style={{ opacity: 1 - i * 0.1 }}>
                <span className="mr-1 font-semibold uppercase text-slate-400">{m.from}</span>
                <span className="text-slate-100">{m.text}</span>
              </div>
            ))}
          </div>
    </>
  );
  const talkBlock = (
    <>
          <div className="mt-3 space-y-2">
            <div className="panel-title">{L('Talk to the helm', 'Parler au barreur')}</div>
            <div className="flex flex-wrap gap-1">
              {callBtn('pressure', L('Pressure', 'Risée'), '1')}
              {callBtn('lull', L('Lull', 'Molle'), '2')}
            </div>
            <div className="panel-title pt-1">{L('Trim / helm mode', 'Mode réglage / barre')}</div>
            <div className="flex flex-wrap gap-1">
              {modeBtn('point', upwind ? L('Point', 'Cap') : L('Deep', 'Profond'))}
              {modeBtn('normal', L('Normal', 'Normal'))}
              {modeBtn('foot', upwind ? L('Foot', 'Vitesse') : L('Hot', 'Haut'))}
              {modeBtn('accel', L('Accel', 'Relance'))}
            </div>
            {freeMode && (
              <>
                <div className="panel-title pt-1">{L('Request maneuver', 'Demander une manœuvre')}</div>
                <div className="flex flex-wrap gap-1">
                  {upwind ? (
                    <>
                      <button className="btn-ghost !px-2 !py-1.5 text-xs" onClick={() => sim.commandTack()}>
                        {L('Tack', 'Virer')} <Kbd>{L('Enter', 'Entrée')}</Kbd>
                      </button>
                      <button className="btn-ghost !px-2 !py-1.5 text-xs" onClick={() => sim.commandBearAway(140, true)}>
                        {L('Bear away + hoist', 'Abattre + envoyer')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-ghost !px-2 !py-1.5 text-xs" onClick={() => sim.commandGybe()}>
                        {L('Gybe', 'Empanner')} <Kbd>{L('Enter', 'Entrée')}</Kbd>
                      </button>
                      <button className="btn-ghost !px-2 !py-1.5 text-xs" onClick={() => sim.commandHardenUp(true)}>
                        {L('Douse + harden up', 'Affaler + lofer')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
    </>
  );
  const jibStation = (
    <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
            <div className="panel-title">{isKite ? L('Gennaker — your station', 'Spi — votre poste') : L('Jib — your station', 'Foc — votre poste')}</div>
            {isKite ? (
              <span className="text-[10px] text-slate-400">{L('Sheet in hand — no winch', 'Écoute à la main — pas de winch')}</span>
            ) : (
            <div className="flex flex-wrap items-center gap-1">
              <button onClick={() => sim.setGear(snap.gear === 'high' ? 'low' : 'high')} title={L('Winch gear (Q)', 'Vitesse du winch (Q)')} className="btn-ghost !px-2 !py-1 text-[11px]">
                <Gauge size={12} /> {fit ? (snap.gear === 'high' ? L('High', 'Grande') : L('Low', 'Petite')) : snap.gear === 'high' ? L('High gear', 'Grande vitesse') : L('Low gear', 'Petite vitesse')} {!fit && <Kbd>Q</Kbd>}
              </button>
              <button
                onClick={() => sim.setGrinder(!snap.grinder)}
                title={L('A crew member grinds the jib winch while you tail: twice the power, little effort for you, but one less on the rail. They go back out once the sheet is home. From 12–14 kn, have one ready for every tack.', "Un équipier mouline le winch de foc pendant que tu embraques : deux fois plus de puissance, peu d'effort pour toi, mais un de moins au rappel. Il retourne au rappel une fois l'écoute à poste. Dès 12–14 nœuds, prévois-en un à chaque virement.")}
                className={`btn !px-2 !py-1 text-[11px] ${snap.grinder ? 'bg-cyan-400/30 text-cyan-50' : 'btn-ghost'}`}
              >
                <Hand size={12} /> {fit ? L('Grinder', 'Équipier') : L('Grinder', 'Équipier au winch')} {!fit && <Kbd>6</Kbd>}
              </button>
              <button
                onPointerDown={() => sim.setSprint(true)}
                onPointerUp={() => sim.setSprint(false)}
                onPointerLeave={() => sim.setSprint(false)}
                title={L('Sprint grind (hold Shift)', 'Moulinage sprint (maintenir Maj)')}
                className={`btn !px-2 !py-1 text-[11px] ${snap.sprint ? 'bg-warn text-navy-950' : 'btn-ghost'}`}
              >
                <Zap size={12} /> {L('Sprint', 'Sprint')} {!fit && <Kbd>{L('Shift', 'Maj')}</Kbd>}
              </button>
            </div>
            )}
          </div>
          <div className="space-y-2">
            <ControlSlider compact={fit} label={isKite ? L('Kite sheet', 'Écoute de spi') : L('Jib sheet', 'Écoute de foc')} actual={snap.controls.jibSheet} target={snap.targets.jibSheet} onChange={set('jibSheet')} keys={['W', 'S']} leftLabel={L('ease', 'choquer')} rightLabel={isKite ? L('trim (by hand)', 'border (à la main)') : L('trim (grind)', 'border (mouliner)')} highlight={focus.has('jibSheet')} step={0.02} note={snap.winchState === 'stalled' ? L('Winch stalled — get a grinder on it (6), low gear, or unload the sheet.', "Winch bloqué — un équipier au winch (6), petite vitesse, ou soulager l'écoute.") : undefined} />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => sim.prepareSheet()} className={`btn !py-1.5 text-xs ${sim.prepared ? 'bg-good/20 text-good border border-good/40' : 'btn-ghost'}`}>
                <Anchor size={12} /> {sim.prepared ? L('Sheet ready', 'Écoute prête') : L('Prep lazy sheet', "Préparer l'écoute")} <Kbd>A</Kbd>
              </button>
              <button onClick={() => sim.releaseSheet()} className="btn-warn !py-1.5 text-xs">
                {L('Release sheet', "Larguer l'écoute")} <Kbd>R</Kbd>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ControlSlider compact={fit} label={L('Jib lead', 'Chariot de foc')} actual={snap.controls.jibLead} target={snap.targets.jibLead} onChange={set('jibLead')} keys={['[', ']']} leftLabel={L('fwd', 'avant')} rightLabel={L('aft', 'arrière')} highlight={focus.has('jibLead')} disabled={isKite} />
              <ControlSlider compact={fit} label={L('Jib halyard', 'Drisse de foc')} actual={snap.controls.jibHalyard} target={snap.targets.jibHalyard} onChange={set('jibHalyard')} keys={['N', 'M']} leftLabel={L('soft', 'mou')} rightLabel={L('tight', 'tendu')} highlight={focus.has('jibHalyard')} disabled={isKite} />
            </div>
          </div>
    </>
  );
  const mainStation = (
    <>
          <div className="panel-title mb-2">{L('Mainsail', 'Grand-voile')}</div>
          <div className="grid grid-cols-2 gap-2">
            <ControlSlider compact={fit} label={L('Mainsheet', 'Écoute de GV')} actual={snap.controls.mainSheet} target={snap.targets.mainSheet} onChange={set('mainSheet')} keys={['E', 'D']} leftLabel={L('ease', 'choquer')} rightLabel={L('trim', 'border')} highlight={focus.has('mainSheet')} step={0.02} />
            <ControlSlider compact={fit} label={L('Traveller', 'Chariot de GV')} actual={snap.controls.traveller} target={snap.targets.traveller} onChange={set('traveller')} keys={['T', 'G']} leftLabel={L('leeward', 'sous le vent')} rightLabel={L('windward', 'au vent')} highlight={focus.has('traveller')} />
            <ControlSlider compact={fit} label={L('Backstay', 'Pataras')} actual={snap.controls.backstay} target={snap.targets.backstay} onChange={set('backstay')} keys={['Y', 'H']} leftLabel="off" rightLabel="max" highlight={focus.has('backstay')} />
            <ControlSlider compact={fit} label={L('Vang', 'Hale-bas')} actual={snap.controls.vang} target={snap.targets.vang} onChange={set('vang')} keys={['U', 'J']} leftLabel="off" rightLabel="max" highlight={focus.has('vang')} />
            <ControlSlider compact={fit} label={L('Outhaul', 'Bordure')} actual={snap.controls.outhaul} target={snap.targets.outhaul} onChange={set('outhaul')} keys={['I', 'K']} leftLabel={L('deep', 'creux')} rightLabel={L('flat', 'plat')} highlight={focus.has('outhaul')} />
            <ControlSlider compact={fit} label={L('Cunningham', 'Cunningham')} actual={snap.controls.cunningham} target={snap.targets.cunningham} onChange={set('cunningham')} keys={['O', 'L']} leftLabel="off" rightLabel="max" highlight={focus.has('cunningham')} />
          </div>
    </>
  );
  const crewStation = (
    <>
          <div className="panel-title mb-2">{L('Crew', 'Équipage')}</div>
          <ControlSlider compact={fit} label={L('Crew weight', 'Poids équipage')} actual={snap.controls.hike} target={snap.targets.hike} onChange={set('hike')} keys={['Z', 'X']} leftLabel={L('leeward', 'sous le vent')} rightLabel={L('full hike', 'plein rappel')} highlight={focus.has('hike')} />
          <div className="mt-2">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">
              {L('Crew weight fore/aft', 'Poids équipage av/ar')} <Kbd>C</Kbd>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {([1, 0, -1] as const).map((c) => (
                <button key={c} onClick={() => sim.setCrewFore(c)} className={`btn !py-1.5 text-xs ${snap.crewFore === c ? 'bg-cyan-400 text-navy-950' : 'btn-ghost'}`}>
                  {c === 1 ? L('Forward', 'Avant') : c === 0 ? L('Normal', 'Normal') : L('Aft', 'Arrière')}
                </button>
              ))}
            </div>
            {!fit && <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{L('Forward in light air (lifts the transom, less wetted area). Aft when fast downwind (lifts the bow, helps planing). Hike for righting moment; come in when the heel drops below ~10°.', "Avant dans le petit temps (soulage le tableau, moins de surface mouillée). Arrière au portant rapide (soulage l'étrave, aide au planing). Rappel pour le couple de redressement ; rentrer quand la gîte passe sous ~10°.")}</p>}
          </div>
          <div className="mt-3 rounded-lg border border-cyan-300/10 p-2 text-[11px] text-slate-400">
            <div className="mb-1 font-semibold uppercase tracking-wider text-slate-300">{L('Speed calls', 'Annonces vitesse')}</div>
            <div className="flex flex-wrap gap-1">
              {callBtn('foot', L('Need speed', 'Besoin de vitesse'), '3')}
              {callBtn('point', L('Can point', 'On peut serrer'), '4')}
              {callBtn('speed-ok', L('Speed OK', 'Vitesse OK'), '5')}
            </div>
          </div>
    </>
  );
  return (
    <div className={fit ? 'space-y-2' : 'space-y-3'}>
      {/* ---------- top bar (in the 3D cockpit, once started, it moves into the strip above the view) */}
      {!(fit && started) && (
      <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <div className="font-display text-lg font-bold uppercase tracking-wider text-white">{def.title}</div>
          <div className="truncate text-xs text-slate-400">{def.subtitle}</div>
        </div>
        {sessionCtl(false)}
      </div>
      )}

      {showKeys && <KeyHelp freeMode={freeMode} />}

      {!started && (
        <div className="panel border-cyan-300/30 p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="panel-title mb-1">{L('Briefing', 'Briefing')}</div>
              <p className="text-sm text-slate-200">{def.brief}</p>
              <p className="mt-2 text-sm text-cyan-200">
                <b>{L('Your task:', 'Votre mission :')}</b> {def.task}
              </p>
              {def.sequence && (
                <ol className="mt-3 grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
                  {def.sequence.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="num w-20 shrink-0 text-cyan-300">{s.t}</span>
                      <span>{s.what}</span>
                    </li>
                  ))}
                </ol>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {def.hints.map((h) => (
                  <Chip key={h} tone="muted">
                    {h}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-stretch justify-end gap-2">
              {canEasy && (
                <button onClick={() => setEasy(!easy)} className={`rounded-lg border px-3 py-2 text-left text-xs ${easy ? 'border-good/50 bg-good/10 text-good' : 'border-cyan-300/20 text-slate-300 hover:border-cyan-300/50'}`}>
                  <div className="flex items-center gap-1 font-semibold">
                    <GraduationCap size={14} /> {L('Easy mode', 'Mode facile')} {easy ? L('ON', 'ACTIVÉ') : L('off', 'désactivé')}
                  </div>
                  <div className="mt-0.5 max-w-[240px] text-[11px] opacity-80">{L('Time stops (or slows) when you need to act; the coach says what is happening, hints on request. Half XP.', "Le temps s'arrête (ou ralentit) quand il faut agir ; le coach explique ce qui se passe, indices à la demande. XP divisée par deux.")}</div>
                </button>
              )}
              <button className="btn-primary px-6 py-3 text-base" onClick={() => (setPaused(false), setStarted(true))}>
                <Play size={18} /> {L('Start', 'Démarrer')} <Kbd>{L('Space', 'Espace')}</Kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {view !== '3d' && coachCard}
      {!fit && (
        <>
      {/* ---------- prompts */}
      {prompts.length > 0 && (
        <div className="space-y-1">
          {prompts.slice(-2).map((p, i) => (
            <div key={i} className={`panel px-4 py-2 text-sm font-semibold ${p.tone === 'alarm' ? 'border-alarm/50 text-alarm' : p.tone === 'warn' ? 'border-warn/50 text-warn' : p.tone === 'good' ? 'border-good/50 text-good' : 'text-cyan-200'}`}>
              {p.text}
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-3 xl:grid-cols-[260px_1fr_300px] lg:grid-cols-[240px_1fr]">
        {/* ---------- instruments */}
        <div className="panel space-y-3 p-3">
          <div className="grid grid-cols-2 gap-2">
            {speedCard}
            {gauges}
          </div>
          {windGrid}
          {chips}
          {energyBlock}
          {flowBlock}
        </div>

        {/* ---------- boat view */}
        <div className="panel flex flex-col p-3">
          {viewTabs}
          {view === '3d' && (
            <div className="mb-2">
              {view3dEl}
              <div className="mt-1 text-[10px] text-slate-500">{L('Drag to look around · drag a glowing handle to trim (car, clew, winch, halyard, forestay foot, mainsheet, traveller, vang, outhaul, cunningham, kite clew) · wheel to zoom in/out · double-click to reset · V view · F forces · B see-through jib', "Glisser pour regarder · glisser une poignée lumineuse pour régler (chariot, point d'écoute, winch, drisse, pied d'étai, écoute de GV, chariot de GV, hale-bas, bordure, cunningham, point d'écoute de spi) · molette pour zoomer · double-clic pour recadrer · V vue · F forces · B foc transparent")}</div>
            </div>
          )}
          {otherViews}
          {sparks}
        </div>

        {/* ---------- crew comms */}
        <div className="panel flex flex-col p-3 lg:col-span-2 xl:col-span-1">
          <div className="panel-title mb-2">{L('Crew comms', 'Communication équipage')}</div>
          {commsList}
          {talkBlock}
        </div>
      </div>

      {/* ---------- controls */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="panel p-3">{jibStation}</div>
        <div className="panel p-3">{mainStation}</div>
        <div className="panel p-3">{crewStation}</div>
      </div>
        </>
      )}

      {/* ---------- 3D cockpit that fits the screen: telemetry, comms and sliders split on both sides of the view */}
      {fit && (
        <div ref={fitRef} className="fitc grid grid-cols-[280px_minmax(0,1fr)_330px] gap-1.5" style={{ height: fitH }}>
          <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-0.5">
            <div className="panel space-y-1.5 p-2">
              <div className="grid grid-cols-2 gap-1">
                {speedCard}
                {gauges}
              </div>
              {windGrid}
              {chips}
            </div>
            <div className="panel p-2">{jibStation}</div>
            <div className="panel p-2">
              <div className="panel-title">{isKite ? L('Kite luff', 'Guindant du spi') : L('Telltales', 'Penons')}</div>
              <Telltales f={f} headsail={snap.plan.headsail} collapsed={snap.plan.gennakerCollapsed} curl={snap.kiteCurl} over={snap.kiteOver} luffFlap={snap.kiteLuffFlap} leechFlap={snap.kiteLeechFlap} mainBackwind={snap.kiteMainBackwind} />
            </div>
            <div className="panel flex min-h-[90px] flex-1 flex-col p-2">
              <div className="panel-title mb-1.5">{L('Crew comms', 'Communication équipage')}</div>
              {commsList}
            </div>
          </div>
          <div className="panel flex min-h-0 flex-col p-1.5">
            {started ? (
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="truncate font-display text-sm font-bold uppercase tracking-wider text-white" title={def.subtitle}>
                    {def.title}
                  </span>
                  {viewToggles}
                </div>
                {sessionCtl(true)}
              </div>
            ) : (
              viewTabs
            )}
            {view3dEl}
          </div>
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
            <div className="panel space-y-2 p-2.5">
              {energyBlock}
              {flowBlock}
            </div>
            <div className="panel p-2.5">{talkBlock}</div>
            <div className="panel p-2.5">{mainStation}</div>
            <div className="panel p-2.5">{crewStation}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function KeyHelp({ freeMode }: { freeMode: boolean }) {
  const rows: [string, string][] = [
    ['W / S', L('Jib (kite) sheet trim / ease', 'Écoute de foc (spi) border / choquer')],
    ['E / D', L('Mainsheet trim / ease', 'Écoute de GV border / choquer')],
    ['T / G', L('Traveller up / down', 'Chariot de GV monter / descendre')],
    ['Y / H', L('Backstay on / off', 'Pataras reprendre / choquer')],
    ['U / J', L('Vang on / off', 'Hale-bas reprendre / choquer')],
    ['I / K', L('Outhaul on / off', 'Bordure reprendre / choquer')],
    ['O / L', L('Cunningham on / off', 'Cunningham reprendre / choquer')],
    ['[ / ]', L('Jib lead forward / aft', 'Chariot de foc avant / arrière')],
    ['N / M', L('Jib halyard ease / tension', 'Drisse de foc choquer / tendre')],
    ['Z / X', L('Crew in / hike out', 'Équipage dedans / au rappel')],
    ['C', L('Crew weight fwd / normal / aft', 'Poids équipage av / normal / ar')],
    ['A', L('Prepare lazy sheet', "Préparer l'écoute libre")],
    ['R', L('Release old sheet', "Larguer l'ancienne écoute")],
    ['Q', L('Winch gear high / low', 'Vitesse winch grande / petite')],
    [L('Shift (hold)', 'Maj (maintenir)'), L('Sprint grind', 'Moulinage sprint')],
    ['6', L('Grinder on the jib winch (you tail)', 'Équipier au winch de foc (tu embraques)')],
    ['1 – 5', L('Calls: pressure, lull, need speed, can point, speed OK', 'Annonces : risée, molle, besoin de vitesse, on peut serrer, vitesse OK')],
    [L('Space', 'Espace'), L('Pause / resume', 'Pause / reprendre')],
  ];
  if (freeMode) rows.push([L('Enter', 'Entrée'), L('Ask helm to tack / gybe', 'Demander au barreur de virer / empanner')]);
  return (
    <div className="panel grid gap-x-6 gap-y-1 p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-24 shrink-0">
            <Kbd>{k}</Kbd>
          </span>
          <span className="text-slate-300">{v}</span>
        </div>
      ))}
    </div>
  );
}
