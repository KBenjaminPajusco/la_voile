import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Link2, Lock, Sparkles } from 'lucide-react';
import type { Nav } from '../App';
import { LESSONS } from '../content/lessons';
import type { Lesson } from '../content/types';
import { useProgress } from '../store/progress';
import { Chip, Disclaimer, PageHeader, Panel, scoreTone, toneText } from '../ui/kit';
import { LessonLab } from '../components/LessonLab';
import { L } from '../i18n';

const MODULES: { id: Lesson['module']; label: string; blurb: string }[] = [
  { id: 'headsail', label: L('Headsail', 'Voile d\'avant'), blurb: L('Your station. Sheet, lead, halyard, shape, telltales.', 'Votre poste. Écoute, point de tire, drisse, forme, penons.') },
  { id: 'mainsail', label: L('Mainsail', 'Grand-voile'), blurb: L('The throttle: sheet, traveller, vang, outhaul, cunningham, backstay, bend.', 'L\'accélérateur : écoute, chariot, hale-bas, bordure, cunningham, pataras, cintre.') },
  { id: 'behavior', label: L('Boat behavior', 'Comportement du bateau'), blurb: L('Heel, helm, rudder, speed, apparent wind, balance, modes, crew weight.', 'Gîte, barre, safran, vitesse, vent apparent, équilibre, modes, poids de l\'équipage.') },
];

export function School({ nav, lessonId }: { nav: Nav; lessonId?: string }) {
  const { progress, isUnlocked } = useProgress();
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (lesson) return <LessonView lesson={lesson} nav={nav} />;
  return (
    <div>
      <PageHeader title={L('Sailing School', 'École de voile')} subtitle={L('Structured lessons — every control explained through the physics, its effect on the sail, and its interaction with the other controls.', 'Leçons structurées — chaque réglage expliqué par la physique, son effet sur la voile et ses interactions avec les autres réglages.')} icon={<BookOpen size={20} />} />
      <div className="space-y-6">
        {MODULES.map((m) => {
          const ls = LESSONS.filter((l) => l.module === m.id);
          const done = ls.filter((l) => progress.lessonsDone[l.id] !== undefined).length;
          return (
            <div key={m.id}>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">{m.label}</h2>
                  <p className="text-sm text-slate-400">{m.blurb}</p>
                </div>
                <span className="num text-sm text-slate-400">
                  {done}/{ls.length}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ls.map((l) => {
                  const unlocked = isUnlocked(l.level);
                  const sc = progress.lessonsDone[l.id];
                  return (
                    <button key={l.id} disabled={!unlocked} onClick={() => nav(`school/${l.id}`)} className="panel flex flex-col p-3 text-left transition-colors hover:border-cyan-300/40 disabled:opacity-40">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-white">{l.title}</div>
                          {l.altName && <div className="text-[11px] italic text-cyan-300/70">{l.altName}</div>}
                        </div>
                        {!unlocked ? <Lock size={14} className="text-slate-500" /> : sc !== undefined ? <CheckCircle2 size={16} className={toneText[scoreTone(sc)]} /> : null}
                      </div>
                      <p className="mt-1 flex-1 text-xs text-slate-400">{l.summary}</p>
                      <div className="mt-2 flex gap-1">
                        <Chip tone="muted">L{l.level}</Chip>
                        {l.lab && <Chip tone="info">{L('lab', 'labo')}</Chip>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}

function LessonView({ lesson, nav }: { lesson: Lesson; nav: Nav }) {
  const { completeLesson, progress, setLast } = useProgress();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [xp, setXp] = useState<number | null>(null);
  useEffect(() => {
    setAnswers({});
    setXp(null);
    setLast(`school/${lesson.id}`, lesson.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);
  const idx = LESSONS.findIndex((l) => l.id === lesson.id);
  const next = LESSONS[idx + 1];
  const prev = LESSONS[idx - 1];
  const allAnswered = lesson.check.every((_, i) => answers[i] !== undefined);
  const score = Math.round((lesson.check.filter((c, i) => answers[i] === c.correct).length / lesson.check.length) * 100);
  const done = progress.lessonsDone[lesson.id];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button className="btn-ghost" onClick={() => nav('school')}>
          <ArrowLeft size={15} /> {L('All lessons', 'Toutes les leçons')}
        </button>
        <div className="flex gap-2">
          {prev && (
            <button className="btn-ghost" onClick={() => nav(`school/${prev.id}`)}>
              <ArrowLeft size={14} /> {prev.title}
            </button>
          )}
          {next && (
            <button className="btn-ghost" onClick={() => nav(`school/${next.id}`)}>
              {next.title} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
      <PageHeader
        title={lesson.title}
        subtitle={`${lesson.altName ? lesson.altName + ' · ' : ''}${lesson.summary}`}
        icon={<BookOpen size={20} />}
        right={done !== undefined ? <Chip tone={scoreTone(done)}>{L('Completed', 'Terminée')} · {done}</Chip> : <Chip tone="muted">{L('Level', 'Niveau')} {lesson.level}</Chip>}
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          {lesson.sections.map((s) => (
            <Panel key={s.heading} title={s.heading}>
              {s.body.split('\n\n').map((p, i) => (
                <p key={i} className="mb-3 text-[15px] leading-relaxed text-slate-200 last:mb-0">
                  {p}
                </p>
              ))}
            </Panel>
          ))}
          <Panel title={<span className="flex items-center gap-2"><Sparkles size={13} /> {L('The physics underneath', 'La physique derrière')}</span>}>
            <p className="text-[15px] leading-relaxed text-slate-200">{lesson.physics}</p>
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title={L('What it does to the sail', 'Effet sur la voile')}>
            <div className="space-y-2">
              {lesson.effects.map((e) => (
                <div key={e.target} className="rounded-lg border border-cyan-300/10 bg-navy-950/40 p-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{e.target}</div>
                  <div className="text-sm text-slate-200">{e.effect}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title={<span className="flex items-center gap-2"><Link2 size={13} /> {L('Interactions with other controls', 'Interactions avec les autres réglages')}</span>}>
            <div className="space-y-2">
              {lesson.interactions.map((e) => (
                <div key={e.control} className="flex gap-3 text-sm">
                  <span className="w-28 shrink-0 font-semibold text-white">{e.control}</span>
                  <span className="text-slate-300">{e.relation}</span>
                </div>
              ))}
            </div>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Panel title={L('Key points', 'Points clés')}>
              <ul className="space-y-1.5 text-sm text-slate-200">
                {lesson.keyPoints.map((k) => (
                  <li key={k} className="flex gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-good" />
                    {k}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title={L('Common mistakes', 'Erreurs fréquentes')}>
              <ul className="space-y-1.5 text-sm text-slate-200">
                {lesson.mistakes.map((k) => (
                  <li key={k} className="flex gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
                    {k}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>

      {lesson.lab && (
        <div className="mt-4">
          <LessonLab key={lesson.id} lesson={lesson} />
        </div>
      )}

      <Panel title={L('Check your understanding', 'Vérifiez vos acquis')} className="mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          {lesson.check.map((c, i) => {
            const a = answers[i];
            return (
              <div key={i} className="rounded-lg border border-cyan-300/10 bg-navy-950/40 p-3">
                <div className="mb-2 text-sm font-semibold text-white">{c.question}</div>
                <div className="space-y-1.5">
                  {c.options.map((o, j) => {
                    const reveal = a !== undefined;
                    const cls = !reveal ? 'border-cyan-300/15 hover:border-cyan-300/50' : j === c.correct ? 'border-good/60 bg-good/10' : j === a ? 'border-alarm/60 bg-alarm/10' : 'border-cyan-300/10 opacity-60';
                    return (
                      <button key={j} disabled={reveal} onClick={() => setAnswers({ ...answers, [i]: j })} className={`w-full rounded border px-2.5 py-1.5 text-left text-sm text-slate-200 ${cls}`}>
                        {o}
                      </button>
                    );
                  })}
                </div>
                {a !== undefined && <p className="mt-2 text-xs text-slate-300">{c.explanation}</p>}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="btn-primary"
            disabled={!allAnswered || xp !== null}
            onClick={() => setXp(completeLesson(lesson.id, score, lesson.skill, lesson.title, lesson.level))}
          >
            <CheckCircle2 size={15} /> {L('Complete lesson', 'Terminer la leçon')}
          </button>
          {allAnswered && <span className={`num text-sm ${toneText[scoreTone(score)]}`}>{L('Check score', 'Score du test')} {score}%</span>}
          {xp !== null && <Chip tone="info">+{xp} XP</Chip>}
          {xp !== null && next && (
            <button className="btn-ghost" onClick={() => nav(`school/${next.id}`)}>
              {L('Next lesson', 'Leçon suivante')} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </Panel>
      <div className="mt-4">
        <Disclaimer />
      </div>
    </div>
  );
}
