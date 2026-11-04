import { Activity, Flame, Lock, Play, Timer } from 'lucide-react';
import type { Nav } from '../App';
import { SITUATIONS } from '../content/situations';
import { MANEUVERS } from '../content/maneuvers';
import type { ScenarioDef } from '../sim/runner';
import { useProgress } from '../store/progress';
import { Chip, PageHeader, scoreTone, toneText } from '../ui/kit';
import { ScenarioPlayer } from '../components/ScenarioPlayer';
import { SKILL_LABELS } from '../store/progress';
import { useEffect } from 'react';
import { L } from '../i18n';

export function ScenarioList({ defs, nav, base, emptyIcon }: { defs: ScenarioDef[]; nav: Nav; base: string; emptyIcon: React.ReactNode }) {
  const { progress, isUnlocked } = useProgress();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {defs.map((d) => {
        const best = progress.best[d.id];
        const unlocked = isUnlocked(d.level);
        return (
          <div key={d.id} className={`panel flex flex-col p-4 ${unlocked ? '' : 'opacity-50'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">{emptyIcon}</div>
                <div>
                  <div className="font-display text-lg font-bold uppercase leading-tight tracking-wide text-white">{d.title}</div>
                  <div className="text-xs text-slate-400">{d.subtitle}</div>
                </div>
              </div>
              {best !== undefined && <span className={`num text-lg font-semibold ${toneText[scoreTone(best)]}`}>{best}</span>}
            </div>
            <p className="mt-3 flex-1 text-sm text-slate-300">{d.brief}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip tone="muted">{L('Level', 'Niveau')} {d.level}</Chip>
              <Chip tone={d.pressure === 3 ? 'alarm' : d.pressure === 2 ? 'warn' : 'muted'}>
                <Flame size={10} /> {L('pressure', 'pression')} {d.pressure}/3
              </Chip>
              <Chip tone="muted">{d.duration} s</Chip>
              {d.skills.slice(0, 2).map((s) => (
                <Chip key={s} tone="info">
                  {SKILL_LABELS[s]}
                </Chip>
              ))}
            </div>
            <button className="btn-primary mt-4" disabled={!unlocked} onClick={() => nav(`${base}/${d.id}`)}>
              {unlocked ? (
                <>
                  <Play size={15} /> {best !== undefined ? L('Train again', 'Recommencer') : L('Start', 'Démarrer')}
                </>
              ) : (
                <>
                  <Lock size={14} /> {L('Unlocks at level', 'Débloqué au niveau')} {d.level}
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function Situations({ nav, id }: { nav: Nav; id?: string }) {
  const def = SITUATIONS.find((s) => s.id === id);
  const { setLast } = useProgress();
  useEffect(() => {
    if (def) setLast(`situations/${def.id}`, def.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def?.id]);
  if (def) return <ScenarioPlayer def={def} kind="situation" onExit={() => nav('situations')} />;
  return (
    <div>
      <PageHeader title={L('Situation Training', 'Mises en situation')} subtitle={L('High-pressure, time-sensitive decisions in the live simulator. Timing, magnitude and combination of your adjustments decide the outcome.', 'Décisions sous pression et contre la montre dans le simulateur. Le moment, l\'amplitude et la combinaison de vos réglages font le résultat.')} icon={<Activity size={20} />} />
      <ScenarioList defs={SITUATIONS} nav={nav} base="situations" emptyIcon={<Activity size={17} />} />
    </div>
  );
}

export function ManeuverLab({ nav, id }: { nav: Nav; id?: string }) {
  const def = MANEUVERS.find((s) => s.id === id);
  const { setLast } = useProgress();
  useEffect(() => {
    if (def) setLast(`maneuvers/${def.id}`, def.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def?.id]);
  if (def) return <ScenarioPlayer def={def} kind="maneuver" onExit={() => nav('maneuvers')} />;
  return (
    <div>
      <PageHeader title={L('Maneuver Lab', 'Labo manœuvres')} subtitle={L('Timed maneuver drills. Evaluated on preparation, initial response, trim adjustments, timing, acceleration and final balance.', 'Exercices de manœuvre chronométrés. Évalués sur la préparation, la réponse initiale, les réglages, le timing, la relance et l\'équilibre final.')} icon={<Timer size={20} />} />
      <ScenarioList defs={MANEUVERS} nav={nav} base="maneuvers" emptyIcon={<Timer size={17} />} />
    </div>
  );
}
