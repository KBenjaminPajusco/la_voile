import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, GraduationCap, Lock, RotateCcw, Waves, Wind, XCircle } from 'lucide-react';
import type { Nav } from '../App';
import { QUIZ } from '../content/quiz';
import type { QuizCategory, QuizQuestion } from '../content/types';
import { useProgress } from '../store/progress';
import { QUIZ_SCENES } from '../content/quizScenes';
import { staticSource } from '../three/staticSnapshot';
import { L } from '../i18n';
import { InteractiveQuestion, QuizModeSwitch, useQuizMode } from './QuizInteractive';

const Boat3DView = lazy(() => import('../components/Boat3DView'));

/** The question's situation, rendered live in 3D from the simulator physics. */
function QuizScene3D({ qid }: { qid: string }) {
  const spec = QUIZ_SCENES[qid];
  const src = useMemo(() => (spec ? staticSource(spec) : null), [qid]); // eslint-disable-line react-hooks/exhaustive-deps
  const [snap, setSnap] = useState(() => src?.snapshot());
  useEffect(() => {
    if (!src) return;
    setSnap(src.snapshot());
    const id = window.setInterval(() => setSnap(src.snapshot()), 250);
    return () => window.clearInterval(id);
  }, [src]);
  if (!spec || !src || !snap) return null;
  return (
    <Panel title={L('The situation, in 3D', 'La situation, en 3D')}>
      <Suspense fallback={<div className="grid h-[400px] place-items-center text-sm text-slate-400">{L('Loading 3D…', 'Chargement 3D…')}</div>}>
        <Boat3DView getSim={() => src} snap={snap} height={400} initialView={spec.view ?? 'trimmer'} initialForces={!!spec.forces} keys={false} coach={false} />
      </Suspense>
      <p className="mt-2 text-xs text-cyan-100">{L('Look at', 'Regardez')}: {spec.look}</p>
      <p className="text-[10px] text-slate-500">{L('Same physics as the simulator, solved for this trim. Drag to look around; switch cameras at the top of the view.', 'Même physique que le simulateur, résolue pour ce réglage. Glissez pour regarder autour ; changez de caméra en haut de la vue.')}</p>
    </Panel>
  );
}
import { Bar, Chip, PageHeader, Panel, ScoreRing, scoreTone, toneText } from '../ui/kit';

const CATS: { id: QuizCategory | 'all'; label: string }[] = [
  { id: 'all', label: L('All topics', 'Tous les thèmes') },
  { id: 'headsail', label: L('Headsail', 'Voile d\'avant') },
  { id: 'mainsail', label: L('Mainsail', 'Grand-voile') },
  { id: 'balance', label: L('Balance', 'Équilibre') },
  { id: 'maneuvers', label: L('Maneuvers', 'Manœuvres') },
  { id: 'conditions', label: L('Conditions', 'Conditions') },
  { id: 'matchrace', label: L('Match race', 'Match race') },
  { id: 'physics', label: L('Physics', 'Physique') },
];

const catLabel = (c: string) => CATS.find((x) => x.id === c)?.label ?? c;

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

interface Session {
  qs: QuizQuestion[];
  i: number;
  answers: { qid: string; aid: string | null; score: number; time: number }[];
  timed: boolean;
}

export function Quiz({ nav }: { nav: Nav; mode?: string }) {
  const { progress, isUnlocked, recordQuiz, setLast } = useProgress();
  const [cat, setCat] = useState<QuizCategory | 'all'>('all');
  const [session, setSession] = useState<Session | null>(null);
  const [qmode, setQmode] = useQuizMode();
  const available = QUIZ.filter((q) => isUnlocked(q.level));
  const pool = available.filter((q) => cat === 'all' || q.category === cat);
  const locked = QUIZ.length - available.length;

  const start = (qs: QuizQuestion[], timed: boolean) => {
    setSession({ qs, i: 0, answers: [], timed });
    setLast('quiz', L('Knowledge Quiz', 'Quiz'));
  };

  if (session) return <QuizRun session={session} setSession={setSession} onRecord={(q, s) => recordQuiz(q.id, s, q.level, q.skill, q.title)} onExit={() => setSession(null)} />;

  const unanswered = pool.filter((q) => !progress.quiz[q.id]);
  const wrong = pool.filter((q) => progress.quiz[q.id] && progress.quiz[q.id].score < 100);
  return (
    <div>
      <PageHeader title={L('Knowledge Quiz', 'Quiz')} subtitle={L('Driving-school style situations: read the symptoms, make the call, understand the physics.', 'Des situations façon code de la route : lisez les symptômes, décidez, comprenez la physique.')} icon={<GraduationCap size={20} />} />
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-cyan-300/15 bg-navy-900/50 px-3 py-2 text-sm text-slate-300">
        <QuizModeSwitch mode={qmode} setMode={setQmode} />
        <span className="text-xs text-slate-400">
          {qmode === 'interactive'
            ? L('Interactive: fix the trim yourself in 3D, then see what happened. Short texts, details on demand.', 'Interactif : corrige toi-même le réglage en 3D, puis vois ce qui s’est passé. Textes courts, détails à la demande.')
            : L('Detailed: the full multiple-choice questions with every explanation.', 'Détaillé : le QCM complet avec toutes les explications.')}
        </span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`btn !py-1.5 text-xs ${cat === c.id ? 'bg-cyan-400 text-navy-950' : 'btn-ghost'}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title={L('Practice set', 'Série d\'entraînement')}>
          <p className="text-sm text-slate-300">{L(`10 random questions from your unlocked pool (${pool.length} questions). Take your time and read every explanation.`, `10 questions au hasard parmi celles débloquées (${pool.length} questions). Prenez le temps de lire chaque explication.`)}</p>
          <button className="btn-primary mt-4 w-full" disabled={!pool.length} onClick={() => start(shuffle(pool).slice(0, 10), false)}>
            {L('Start practice', 'Démarrer l\'entraînement')} <ArrowRight size={15} />
          </button>
        </Panel>
        <Panel title={<span className="flex items-center gap-1"><Clock size={12} /> {L('Pressure exam', 'Examen sous pression')}</span>}>
          <p className="text-sm text-slate-300">{L('10 questions, 25 seconds each. In a race you do not get to think for a minute — train fast decisions.', '10 questions, 25 secondes chacune. En course on n\'a pas une minute pour réfléchir — entraînez des décisions rapides.')}</p>
          <button className="btn-warn mt-4 w-full" disabled={pool.length < 3} onClick={() => start(shuffle(pool).slice(0, 10), true)}>
            {L('Start exam', 'Démarrer l\'examen')} <ArrowRight size={15} />
          </button>
        </Panel>
        <Panel title={L('Focus review', 'Révision ciblée')}>
          <p className="text-sm text-slate-300">
            {L(`${unanswered.length} unanswered · ${wrong.length} not yet perfect.`, `${unanswered.length} sans réponse · ${wrong.length} pas encore parfaites.`)}
          </p>
          <div className="mt-4 grid gap-2">
            <button className="btn-ghost" disabled={!unanswered.length} onClick={() => start(unanswered.slice(0, 10), false)}>
              {L('New questions', 'Nouvelles questions')}
            </button>
            <button className="btn-ghost" disabled={!wrong.length} onClick={() => start(wrong.slice(0, 10), false)}>
              {L('Retry my mistakes', 'Réessayer mes erreurs')}
            </button>
          </div>
        </Panel>
      </div>
      <Panel title={L(`Question bank (${QUIZ.length})`, `Banque de questions (${QUIZ.length})`)} className="mt-4" right={locked > 0 ? <Chip tone="muted"><Lock size={10} /> {L(`${locked} locked by level`, `${locked} bloquées par niveau`)}</Chip> : undefined}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUIZ.filter((q) => cat === 'all' || q.category === cat).map((q) => {
            const r = progress.quiz[q.id];
            const unlocked = isUnlocked(q.level);
            return (
              <button key={q.id} disabled={!unlocked} onClick={() => start([q], false)} className="flex items-center justify-between gap-2 rounded-lg border border-cyan-300/10 bg-navy-850/50 px-3 py-2 text-left hover:border-cyan-300/40 disabled:opacity-40">
                <div className="min-w-0">
                  <div className="truncate text-sm text-white">{q.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {L('L', 'N')}{q.level} · {catLabel(q.category)} · {q.conditions.tws} kn
                  </div>
                </div>
                {!unlocked ? <Lock size={14} className="text-slate-500" /> : r ? <span className={`num text-sm ${toneText[scoreTone(r.score)]}`}>{r.score}</span> : <span className="text-[10px] text-slate-500">{L('new', 'nouveau')}</span>}
              </button>
            );
          })}
        </div>
      </Panel>
      <div className="mt-3 text-xs text-slate-500">
        {L('Questions unlock with your level.', 'Les questions se débloquent avec votre niveau.')} <button className="text-cyan-300 underline" onClick={() => nav('progression')}>{L('Progression settings', 'Réglages de progression')}</button>
      </div>
    </div>
  );
}

function QuizRun({ session, setSession, onRecord, onExit }: { session: Session; setSession: (s: Session | null) => void; onRecord: (q: QuizQuestion, score: number) => number; onExit: () => void }) {
  const q = session.qs[session.i];
  const [picked, setPicked] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [xp, setXp] = useState(0);
  const LIMIT = 25;
  const done = session.i >= session.qs.length;
  const [mode, setMode] = useQuizMode();

  useEffect(() => {
    setPicked(null);
    setTimedOut(false);
  }, [session.i]);
  const [qStart, setQStart] = useState(Date.now());
  useEffect(() => setQStart(Date.now()), [session.i]);
  useEffect(() => {
    if (!session.timed || picked || done) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [session.timed, picked, done]);
  const left = session.timed ? Math.max(0, LIMIT - (now - qStart) / 1000) : LIMIT;
  useEffect(() => {
    if (session.timed && !picked && !done && left <= 0) {
      setTimedOut(true);
      answer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  function answer(aid: string | null) {
    if (picked || !q) return;
    const a = q.answers.find((x) => x.id === aid);
    let score = a ? a.score : 0;
    const time = (Date.now() - qStart) / 1000;
    if (session.timed && a && time > LIMIT * 0.6) score = Math.round(score * 0.9);
    setPicked(aid ?? '__none');
    setXp((x) => x + onRecord(q, score));
    session.answers.push({ qid: q.id, aid, score, time });
  }

  const summary = useMemo(() => {
    if (!done) return null;
    const avg = session.answers.reduce((a, b) => a + b.score, 0) / Math.max(1, session.answers.length);
    return { avg, perfect: session.answers.filter((a) => a.score === 100).length };
  }, [done, session.answers]);

  if (done && summary)
    return (
      <div className="mx-auto max-w-3xl">
        <Panel title={L('Quiz complete', 'Quiz terminé')}>
          <div className="flex flex-wrap items-center gap-6">
            <ScoreRing score={summary.avg} size={110} label={L('decision quality', 'qualité de décision')} />
            <div className="space-y-1 text-sm">
              <div>
                <b className="text-white">{summary.perfect}</b> {L(`best decisions out of ${session.answers.length}`, `meilleures décisions sur ${session.answers.length}`)}
              </div>
              <div className="text-cyan-200">+{xp} XP</div>
              <div className="text-slate-400">{L('Time spent', 'Temps passé')} {Math.round((Date.now() - t0) / 1000)} s</div>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {session.answers.map((a, i) => {
              const qq = session.qs.find((x) => x.id === a.qid)!;
              return (
                <div key={i} className="flex items-center justify-between rounded border border-cyan-300/10 px-3 py-1.5 text-sm">
                  <span className="text-slate-200">{qq.title}</span>
                  <span className={`num ${toneText[scoreTone(a.score)]}`}>{a.score}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-ghost" onClick={onExit}>
              {L('Back to quiz menu', 'Retour au menu quiz')}
            </button>
            <button className="btn-primary" onClick={() => setSession({ ...session, i: 0, answers: [] })}>
              <RotateCcw size={15} /> {L('Same set again', 'Refaire la même série')}
            </button>
          </div>
        </Panel>
      </div>
    );

  const chosen = q.answers.find((a) => a.id === picked);
  const best = q.answers.find((a) => a.score === 100)!;
  const next = () => setSession({ ...session, i: session.i + 1 });
  const header = (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button className="btn-ghost" onClick={onExit}>
        {L('Quit', 'Quitter')}
      </button>
      <div className="flex flex-1 items-center gap-3 px-4">
        <Bar value={session.i} max={session.qs.length} tone="info" />
        <span className="num text-xs text-slate-400">
          {session.i + 1}/{session.qs.length}
        </span>
      </div>
      <QuizModeSwitch mode={mode} setMode={setMode} />
      {session.timed && !picked && (
        <span className={`num flex items-center gap-1 text-sm ${left < 8 ? 'text-alarm' : 'text-warn'}`}>
          <Clock size={14} /> {left.toFixed(0)} s
        </span>
      )}
    </div>
  );
  if (mode === 'interactive')
    return (
      <div className="mx-auto max-w-6xl">
        {header}
        <InteractiveQuestion
          key={q.id}
          q={q}
          timed={session.timed}
          timedOut={timedOut}
          picked={picked}
          onPick={answer}
          onScore={(score) => {
            if (picked) return;
            setPicked('__fix');
            setXp((x) => x + onRecord(q, score));
            session.answers.push({ qid: q.id, aid: null, score, time: (Date.now() - qStart) / 1000 });
          }}
          onNext={next}
          last={session.i + 1 >= session.qs.length}
        />
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl">
      {header}
      <QuizScene3D qid={q.id} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <Panel title={`${L('L', 'N')}${q.level} · ${catLabel(q.category)}`}>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">{q.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="info">
              <Wind size={11} /> {q.conditions.tws} kn
            </Chip>
            <Chip tone="muted">
              <Waves size={11} /> {q.conditions.sea}
            </Chip>
            <Chip tone="muted">{q.conditions.leg}</Chip>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="panel-title">{L('Boat state', 'État du bateau')}</dt>
              <dd className="mt-0.5 text-slate-200">{q.boatState}</dd>
            </div>
            <div>
              <dt className="panel-title">{L('Sail configuration', 'Configuration des voiles')}</dt>
              <dd className="mt-0.5 text-slate-200">{q.sailConfig}</dd>
            </div>
            <div>
              <dt className="panel-title">{L('Symptoms', 'Symptômes')}</dt>
              <dd>
                <ul className="mt-1 space-y-1">
                  {q.symptoms.map((s) => (
                    <li key={s} className="flex gap-2 text-slate-200">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
                      {s}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </Panel>
        <div className="space-y-3">
          <Panel title={L('Your decision', 'Votre décision')}>
            <p className="mb-3 text-base font-semibold text-white">{q.question}</p>
            <div className="space-y-2">
              {q.answers.map((a) => {
                const isPicked = picked === a.id;
                const reveal = picked !== null;
                const tone = a.score === 100 ? 'border-good/60 bg-good/10' : a.score >= 40 ? 'border-warn/50 bg-warn/5' : 'border-alarm/50 bg-alarm/5';
                return (
                  <button
                    key={a.id}
                    disabled={reveal}
                    onClick={() => answer(a.id)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${reveal ? tone : 'border-cyan-300/15 bg-navy-850 hover:border-cyan-300/50'} ${isPicked ? 'ring-2 ring-cyan-300' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="num mt-0.5 text-xs uppercase text-cyan-300">{a.id}</span>
                      <span className="flex-1 text-slate-100">{a.text}</span>
                      {reveal && <span className={`num text-xs ${toneText[scoreTone(a.score)]}`}>{a.score}</span>}
                    </div>
                    {reveal && (
                      <div className="mt-2 space-y-1 pl-5 text-xs">
                        <p className="text-slate-200">{a.verdict}</p>
                        <p className="text-slate-400">
                          <b className="text-slate-300">{L('Consequence', 'Conséquence')}:</b> {a.consequence}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Panel>
          {picked && (
            <Panel title={L('Debrief', 'Débrief')}>
              <div className="flex items-center gap-3">
                {chosen?.score === 100 ? <CheckCircle2 className="text-good" /> : <XCircle className={chosen && chosen.score >= 40 ? 'text-warn' : 'text-alarm'} />}
                <div className="text-sm">
                  {timedOut ? (
                    <span className="text-alarm">{L('Time out — no decision is a decision (score 0).', 'Temps écoulé — ne pas décider, c\'est décider (score 0).')}</span>
                  ) : chosen?.score === 100 ? (
                    <span className="text-good">{L('Best decision.', 'Meilleure décision.')}</span>
                  ) : (
                    <span className="text-slate-200">
                      {L('Decision quality', 'Qualité de décision')} <b className={toneText[scoreTone(chosen?.score ?? 0)]}>{chosen?.score ?? 0}</b>. {L('Best answer', 'Meilleure réponse')}: <b className="text-white">{best.id.toUpperCase()}</b>.
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div className="panel-title">{L('The physics', 'La physique')}</div>
                  <p className="mt-1 text-slate-200">{q.physics}</p>
                </div>
                <div>
                  <div className="panel-title">{L('Alternatives', 'Alternatives')}</div>
                  <p className="mt-1 text-slate-300">{q.alternatives}</p>
                </div>
                <div>
                  <div className="panel-title">{L('When the answer changes', 'Quand la réponse change')}</div>
                  <p className="mt-1 text-slate-300">{q.whenItChanges}</p>
                </div>
              </div>
              <button className="btn-primary mt-4" onClick={next}>
                {session.i + 1 < session.qs.length ? L('Next question', 'Question suivante') : L('See results', 'Voir les résultats')} <ArrowRight size={15} />
              </button>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
