import { useMemo } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import type { RunResult, ScenarioDef } from '../sim/runner';
import { Bar, Chip, Panel, ScoreRing, Sparkline, scoreTone, toneText } from '../ui/kit';
import { grade } from '../sim/scoring';
import { L } from '../i18n';

// display names for the evaluation groups (the English group names stay the keys)
const GROUP_LABEL: Record<string, string> = {
  Acceleration: L('Acceleration', 'Relance'),
  'Boat speed': L('Boat speed', 'Vitesse du bateau'),
  Communication: L('Communication', 'Communication'),
  Decision: L('Decision', 'Décision'),
  'Final balance': L('Final balance', 'Équilibre final'),
  'Heel management': L('Heel management', 'Gestion de la gîte'),
  'Initial response': L('Initial response', 'Réponse initiale'),
  Preparation: L('Preparation', 'Préparation'),
  'Reaction time': L('Reaction time', 'Temps de réaction'),
  'Rudder load': L('Rudder load', 'Charge de safran'),
  'Sail efficiency': L('Sail efficiency', 'Efficacité des voiles'),
  Timing: L('Timing', 'Timing'),
  'Trim adjustments': L('Trim adjustments', 'Réglages'),
  'Unnecessary adjustments': L('Unnecessary adjustments', 'Réglages inutiles'),
  'Winch effort': L('Winch effort', 'Effort aux winchs'),
};
const groupLabel = (g: string) => GROUP_LABEL[g] ?? g;

export function Debrief({ def, result, xp, onRetry, onBack }: { def: ScenarioDef; result: RunResult; xp?: number; onRetry: () => void; onBack: () => void }) {
  const g = grade(result.score);
  const tel = result.tel;
  const markList = useMemo(
    () =>
      Object.entries(result.marks)
        .filter(([k]) => k !== 'start')
        .map(([k, x]) => ({ x, label: k })),
    [result.marks],
  );
  const actions = result.actions.filter((a) => a.kind !== 'command' || /tack|gybe|bear|harden/.test(a.tag ?? a.label));
  const sorted = [...result.rows].sort((a, b) => a.score - b.score);
  const worst = sorted.filter((r) => r.score < 60).slice(0, 3);
  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={result.score} size={96} />
          <div>
            <div className="panel-title">{L('Debrief', 'Débrief')}</div>
            <div className="font-display text-2xl font-bold uppercase tracking-wider text-white">{def.title}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={toneText[g.tone]}>{g.label}</span>
              {result.endReason === 'too-short' && <Chip tone="warn">{L('Too short to evaluate — not recorded', 'Trop court pour être évalué — non enregistré')}</Chip>}
              {result.endReason === 'win' &&<Chip tone="good">{L('RACE WON', 'COURSE GAGNÉE')}</Chip>}
              {result.endReason === 'loss' && <Chip tone="alarm">{L('RACE LOST', 'COURSE PERDUE')}</Chip>}
              {xp !== undefined && <Chip tone="info">+{xp} XP</Chip>}
              <span className="text-slate-400">· {L(`${result.std.duration.toFixed(0)} s evaluated`, `${result.std.duration.toFixed(0)} s évaluées`)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onBack}>
            <ArrowLeft size={16} /> {L('Back', 'Retour')}
          </button>
          <button className="btn-primary" onClick={onRetry}>
            <RotateCcw size={16} /> {L('Try again', 'Réessayer')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel title={L('What happened — criterion by criterion', 'Ce qui s\'est passé — critère par critère')}>
          <div className="space-y-2.5">
            {result.rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-cyan-300/10 bg-navy-950/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {r.score >= 70 ? <CheckCircle2 size={15} className="text-good" /> : <XCircle size={15} className={r.score >= 45 ? 'text-warn' : 'text-alarm'} />}
                    <span className="text-sm font-medium text-white">{r.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">{groupLabel(r.group)}</span>
                  </div>
                  <span className={`num text-sm ${toneText[scoreTone(r.score)]}`}>{r.score}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{r.note}</p>
              </div>
            ))}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title={L('Score by evaluation area', 'Score par domaine')}>
            <div className="space-y-2">
              {result.groups.map((gr) => (
                <div key={gr.group}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{groupLabel(gr.group)}</span>
                    <span className="num text-white">{gr.score}</span>
                  </div>
                  <Bar value={gr.score} />
                </div>
              ))}
            </div>
          </Panel>
          {worst.length > 0 && (
            <Panel title={L('Fix these first', 'À corriger en priorité')}>
              <ul className="space-y-1.5 text-sm text-slate-200">
                {worst.map((w) => (
                  <li key={w.id} className="flex gap-2">
                    <span className="text-alarm">▸</span>
                    <span>
                      <b>{w.label}:</b> {w.note}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title={L('Telemetry', 'Télémétrie')}>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{L('Speed (% target)', 'Vitesse (% cible)')}</div>
                <Sparkline data={tel.map((s) => ({ x: s.t, y: Math.min(1.1, s.perf) }))} min={0.3} max={1.1} refLine={1} height={70} marks={markList} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{L('Heel (°)', 'Gîte (°)')}</div>
                <Sparkline data={tel.map((s) => ({ x: s.t, y: s.heel }))} min={-5} max={45} refLine={25} height={60} color="#f59e0b" marks={markList} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{L('Rudder (°)', 'Safran (°)')}</div>
                <Sparkline data={tel.map((s) => ({ x: s.t, y: s.rudder }))} min={-5} max={18} refLine={7} height={50} color="#ef4444" marks={markList} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{L('Jib/kite sheet & crew energy', 'Écoute foc/spi & énergie équipage')}</div>
                <Sparkline data={tel.map((s) => ({ x: s.t, y: s.jibSheet }))} min={0} max={1} height={44} color="#a78bfa" />
                <Sparkline data={tel.map((s) => ({ x: s.t, y: s.energy }))} min={0} max={100} height={34} color="#34d399" />
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={<span className="flex items-center gap-2"><BookOpen size={13} /> {L('The physics', 'La physique')}</span>} className="lg:col-span-2">
          <p className="text-sm leading-relaxed text-slate-200">{def.debrief.physics}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="panel-title mb-2">{L('Ideal sequence', 'Séquence idéale')}</div>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
                {def.debrief.ideal.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
            <div>
              <div className="panel-title mb-2">{L('Common errors', 'Erreurs fréquentes')}</div>
              <ul className="space-y-1 text-sm text-slate-300">
                {def.debrief.commonErrors.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span className="text-warn">!</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
        <Panel title={L(`Your actions (${actions.length})`, `Vos actions (${actions.length})`)}>
          <div className="max-h-80 space-y-1 overflow-auto pr-1">
            {actions.length === 0 && <div className="text-sm text-slate-500">{L('No actions recorded.', 'Aucune action enregistrée.')}</div>}
            {actions.map((a, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="num w-12 shrink-0 text-cyan-300">{a.t.toFixed(1)}s</span>
                <span className={a.reversal ? 'text-warn' : 'text-slate-200'}>
                  {a.label}
                  {a.value !== undefined && a.from !== undefined && (
                    <span className="num text-slate-500">
                      {' '}
                      {Math.round(a.from * 100)}→{Math.round(a.value * 100)}%
                    </span>
                  )}
                  {a.reversal && L(' (reversal)', ' (retour arrière)')}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
