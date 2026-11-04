// Easy mode: the coach's card (drawn over the 3D view so it stays visible in full screen) and the
// logic that decides when time stops, what to say and when to let it run again.
import { CheckCircle2, Lightbulb, Pause, Play, Snail } from 'lucide-react';
import type { ScenarioRunner } from '../sim/runner';
import { COACH, COACH_DONE_DEFAULT, type CoachStep } from '../content/coach';
import { advise } from '../sim/advisor';
import { L } from '../i18n';

export interface CoachActive {
  step: CoachStep;
  since: number; // sim time it started
  hint: number; // hints revealed
  hints: string[];
  done: boolean;
  doneReal?: number;
}

export interface CoachState {
  active: CoachActive | null;
  fired: Set<string>;
  seenPrompts: number;
  lastEnd: number;
  badSince: number | null;
}

export const newCoach = (): CoachState => ({ active: null, fired: new Set(), seenPrompts: 0, lastEnd: -99, badSince: null });

/** the advisor's three hints for the boat as it is now (looks ahead at a puff on the water) */
export function adviceHints(r: ScenarioRunner): string[] {
  const s = r.sim;
  const snap = s.snapshot();
  const ahead = (snap.windAhead ?? []).filter((w) => w.t - s.t <= 13);
  const peak = ahead.reduce((m, w) => (w.tws > m.tws ? w : m), { t: s.t, tws: s.tws, twd: 0 });
  const upcoming = peak.tws > s.tws + 2.5 ? { tws: peak.tws, inSec: Math.max(1, peak.t - s.t) } : undefined;
  const a = advise({ controls: s.targets, tws: s.tws, twa: s.twa, plan: s.plan, sea: s.sea, upcoming });
  return [a.look, a.act, a.detail];
}

function start(c: CoachState, r: ScenarioRunner, step: CoachStep) {
  const authored = step.hints;
  c.active = { step, since: r.sim.t, hint: 0, hints: authored.length && !step.advisor ? authored : authored.length ? [...authored, ...adviceHints(r).slice(2)] : adviceHints(r), done: false };
}

/** called every loop tick (real time) before the simulation steps; returns the time-scale factor */
export function updateCoach(c: CoachState, r: ScenarioRunner, nowReal: number): number {
  const sim = r.sim;
  const steps = COACH[r.def.id] ?? [];
  const a = c.active;
  if (a && !a.done) {
    if ((a.step.done ?? COACH_DONE_DEFAULT)(sim, a.since)) {
      a.done = true;
      a.doneReal = nowReal;
      r.marks[`coach_${a.step.id}`] = sim.t;
    }
  } else if (a && a.done && nowReal - (a.doneReal ?? 0) > 2600) {
    c.active = null;
    c.lastEnd = sim.t;
  }
  if (!c.active) {
    // authored moments
    for (const st of steps) {
      if (c.fired.has(st.id)) continue;
      if (st.at !== undefined && sim.t < st.at) continue;
      if (st.when && !st.when(sim, r.marks)) continue;
      c.fired.add(st.id);
      start(c, r, st);
      break;
    }
  }
  // scenario prompts (warnings / alarms) become moments where nothing is authored
  const ps = r.prompts;
  for (; c.seenPrompts < ps.length; c.seenPrompts++) {
    const p = ps[c.seenPrompts];
    if (!steps.length && !c.active && (p.tone === 'warn' || p.tone === 'alarm'))
      start(c, r, { id: `prompt${c.seenPrompts}`, freeze: 'pause', title: p.text, hints: [], advisor: true });
  }
  // something is going wrong and nobody said so: slow down and offer help
  if (!steps.length && !c.active && !sim.maneuver) {
    const snap = sim;
    const bad = snap.v / snap.target() < 0.8 || snap.heel > 28;
    if (!bad) c.badSince = null;
    else if (c.badSince === null) c.badSince = sim.t;
    else if (sim.t - c.badSince > 3 && sim.t - c.lastEnd > 10) {
      c.badSince = null;
      start(c, r, { id: `drift${Math.round(sim.t)}`, freeze: 'slow', title: snap.heel > 28 ? L('The boat is heeling too much.', 'Le bateau gîte trop.') : L('The boat is slow.', 'Le bateau est lent.'), hints: [], advisor: true });
    }
  }
  const act = c.active;
  if (!act) return 1;
  if (act.done) return 0.5;
  return act.step.freeze === 'pause' ? 0 : 0.25;
}

export function CoachCard({ c, onHint, onContinue }: { c: CoachActive; onHint: () => void; onContinue: () => void }) {
  const paused = !c.done && c.step.freeze === 'pause';
  return (
    <div className={`rounded-xl border p-3 shadow-2xl backdrop-blur ${c.done ? 'border-good/60 bg-navy-950/90' : 'border-warn/60 bg-navy-950/90'}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
        <span className="text-cyan-300">{L('Easy mode · coach', 'Mode facile · coach')}</span>
        {!c.done && (
          <span className={`flex items-center gap-1 ${paused ? 'text-warn' : 'text-cyan-200'}`}>
            {paused ? <Pause size={11} /> : <Snail size={11} />} {paused ? L('time stopped — act, then it runs again', 'temps arrêté — agis, il repart') : L('slow motion ×¼', 'ralenti ×¼')}
          </span>
        )}
      </div>
      {c.done ? (
        <div className="flex items-start gap-2 text-sm text-good">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          <span>{c.step.after ?? L('Well done — carry on.', 'Bien joué — on continue.')}</span>
        </div>
      ) : (
        <>
          <div className="text-[15px] font-semibold leading-snug text-white">{c.step.title}</div>
          {c.hint > 0 && (
            <ol className="mt-2 space-y-1">
              {c.hints.slice(0, c.hint).map((h, i) => (
                <li key={i} className="flex gap-2 rounded border border-warn/25 bg-warn/5 px-2 py-1 text-xs text-amber-100">
                  <Lightbulb size={12} className="mt-0.5 shrink-0 text-warn" /> {h}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={onHint} disabled={c.hint >= c.hints.length}>
              <Lightbulb size={12} /> {c.hint === 0 ? L('Hint', 'Indice') : c.hint < c.hints.length ? L(`Another hint (${c.hint}/${c.hints.length})`, `Encore un indice (${c.hint}/${c.hints.length})`) : L('No more hints', "Plus d'indice")}
            </button>
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={onContinue}>
              <Play size={12} /> {L('Carry on', 'Continuer')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
