import { useState } from 'react';
import { CheckCircle2, Lock, RotateCcw, Trophy, Unlock } from 'lucide-react';
import type { Nav } from '../App';
import { LEVELS, levelForXp } from '../content/levels';
import { CATALOG, isDone, quizStats } from '../content/catalog';
import { useProgress, SKILL_LABELS } from '../store/progress';
import type { SkillKey } from '../content/types';
import { Bar, Chip, PageHeader, Panel, scoreTone, toneText } from '../ui/kit';
import { L } from '../i18n';

const KIND_LABEL: Record<string, string> = {
  lesson: L('lesson', 'leçon'),
  quiz: L('quiz', 'quiz'),
  situation: L('situation', 'situation'),
  maneuver: L('maneuver', 'manœuvre'),
  race: L('race', 'régate'),
  free: L('free sail', 'navigation libre'),
};

export function Progression({ nav }: { nav: Nav }) {
  const { progress, setUnlockAll, reset } = useProgress();
  const [confirm, setConfirm] = useState(false);
  const cur = levelForXp(progress.xp);
  const skills = Object.keys(SKILL_LABELS) as SkillKey[];

  // radar chart
  const R = 90;
  const pts = skills.map((s, i) => {
    const a = (i / skills.length) * Math.PI * 2 - Math.PI / 2;
    const v = (progress.skills[s] ?? 0) / 100;
    return { s, a, x: Math.cos(a) * R * v, y: Math.sin(a) * R * v, lx: Math.cos(a) * (R + 22), ly: Math.sin(a) * (R + 22) };
  });

  return (
    <div>
      <PageHeader title={L('Progression', 'Progression')} subtitle={L('Eight levels from basic sail controls to expert match racing. Saved locally in this browser.', 'Huit niveaux, des réglages de base au match race expert. Sauvegardé localement dans ce navigateur.')} icon={<Trophy size={20} />} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title={L('Skill profile', 'Profil de compétences')}>
          <div className="grid items-center gap-4 sm:grid-cols-[260px_1fr]">
            <svg viewBox="-130 -130 260 260" className="w-full max-w-[260px]">
              {[0.25, 0.5, 0.75, 1].map((k) => (
                <polygon key={k} points={skills.map((_, i) => { const a = (i / skills.length) * Math.PI * 2 - Math.PI / 2; return `${Math.cos(a) * R * k},${Math.sin(a) * R * k}`; }).join(' ')} fill="none" stroke="rgba(103,232,249,0.12)" />
              ))}
              <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(34,211,238,0.25)" stroke="#22d3ee" strokeWidth={2} />
              {pts.map((p) => (
                <text key={p.s} x={p.lx} y={p.ly} fontSize={9} fill="#94a3b8" textAnchor="middle" dominantBaseline="middle">
                  {SKILL_LABELS[p.s].split(' ')[0]}
                </text>
              ))}
            </svg>
            <div className="space-y-2">
              {skills.map((s) => {
                const v = progress.skills[s];
                return (
                  <div key={s}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-200">{SKILL_LABELS[s]}</span>
                      <span className={`num ${v === undefined ? 'text-slate-500' : toneText[scoreTone(v)]}`}>{v ?? '—'}</span>
                    </div>
                    <Bar value={v ?? 0} />
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
        <Panel title={L('Levels', 'Niveaux')}>
          <div className="space-y-2">
            {LEVELS.map((l) => {
              const reached = progress.xp >= l.xp;
              const items = CATALOG.filter((c) => c.level === l.level);
              const doneN = items.filter((c) => isDone(progress, c)).length;
              const q = quizStats(progress, l.level);
              return (
                <div key={l.level} className={`rounded-lg border p-3 ${l.level === cur.level ? 'border-cyan-300/50 bg-cyan-400/5' : 'border-cyan-300/10'} ${reached ? '' : 'opacity-60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {reached ? <CheckCircle2 size={16} className="text-good" /> : <Lock size={14} className="text-slate-500" />}
                      <span className="font-display font-bold uppercase tracking-wider text-white">
                        {L('L', 'N')}{l.level} · {l.name}
                      </span>
                    </div>
                    <span className="num text-xs text-slate-400">{l.xp} XP</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{l.focus}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {l.goals.map((g) => (
                      <Chip key={g} tone="muted">
                        {g}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {L(`${items.length} activities introduced, ${doneN} mastered · quiz correct up to this level ${q.correct}/${q.total}`, `${items.length} activités introduites, ${doneN} maîtrisées · quiz réussis jusqu'à ce niveau ${q.correct}/${q.total}`)}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={L('Best scores', 'Meilleurs scores')}>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {CATALOG.filter((c) => c.kind !== 'lesson').map((c) => {
              const b = progress.best[c.id];
              return (
                <button key={c.id} onClick={() => nav(c.route)} className="flex items-center justify-between rounded border border-cyan-300/10 px-2.5 py-1.5 text-left text-sm hover:border-cyan-300/40">
                  <span className="truncate text-slate-200">{c.title}</span>
                  <span className={`num ${b === undefined ? 'text-slate-600' : toneText[scoreTone(b)]}`}>{b ?? '—'}</span>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel title={L('Settings', 'Réglages')}>
          <div className="space-y-4 text-sm">
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 accent-cyan-400" checked={progress.unlockAll} onChange={(e) => setUnlockAll(e.target.checked)} />
              <span>
                <span className="flex items-center gap-1 font-semibold text-white">
                  <Unlock size={14} /> {L('Instructor mode — unlock all content', 'Mode instructeur — tout débloquer')}
                </span>
                <span className="text-slate-400">{L('Access every lesson, question, scenario and race regardless of level. XP still accumulates normally.', 'Accès à toutes les leçons, questions, scénarios et régates quel que soit le niveau. Les XP s\'accumulent normalement.')}</span>
              </span>
            </label>
            <div className="rounded-lg border border-cyan-300/10 p-3 text-xs text-slate-400">
              <div className="mb-1 font-semibold uppercase tracking-wider text-slate-300">{L('How XP works', 'Comment gagner des XP')}</div>
              {L('Simulator runs give XP for improving your best score (scaled by level and pressure) plus a completion bonus. Quiz questions give XP the first time you improve your answer. Lessons give XP on completion. Repeating an exercise without improving gives only the small bonus — progress means better decisions, not more clicks.', 'Les sessions au simulateur rapportent des XP quand vous battez votre meilleur score (selon le niveau et la pression), plus un bonus de fin. Les questions du quiz rapportent des XP la première fois que vous améliorez votre réponse. Les leçons rapportent des XP une fois terminées. Refaire un exercice sans progresser ne donne que le petit bonus — progresser, c\'est mieux décider, pas cliquer plus.')}
            </div>
            <div>
              {!confirm ? (
                <button className="btn-ghost" onClick={() => setConfirm(true)}>
                  <RotateCcw size={14} /> {L('Reset all progress', 'Réinitialiser la progression')}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-alarm">{L('Erase everything?', 'Tout effacer ?')}</span>
                  <button
                    className="btn !bg-alarm !text-white"
                    onClick={() => {
                      reset();
                      setConfirm(false);
                    }}
                  >
                    {L('Yes, reset', 'Oui, réinitialiser')}
                  </button>
                  <button className="btn-ghost" onClick={() => setConfirm(false)}>
                    {L('Cancel', 'Annuler')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title={L('History', 'Historique')} className="mt-4">
        {progress.history.length === 0 ? (
          <div className="text-sm text-slate-400">{L('No activity yet.', 'Aucune activité pour l\'instant.')}</div>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-1">{L('When', 'Date')}</th>
                  <th>{L('Activity', 'Activité')}</th>
                  <th>{L('Kind', 'Type')}</th>
                  <th className="text-right">{L('Score', 'Score')}</th>
                  <th className="text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                {progress.history.slice(0, 80).map((h, i) => (
                  <tr key={i} className="border-t border-cyan-300/5">
                    <td className="py-1 text-xs text-slate-500">{new Date(h.t).toLocaleString()}</td>
                    <td className="text-slate-200">{h.title}</td>
                    <td className="text-xs text-slate-400">{KIND_LABEL[h.kind] ?? h.kind}</td>
                    <td className={`num text-right ${toneText[scoreTone(h.score)]}`}>{h.score}</td>
                    <td className="num text-right text-cyan-200">+{h.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
