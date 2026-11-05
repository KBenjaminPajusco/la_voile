// Interactive quiz (default): the question's situation is live in 3D and the player FIXES it with
// the 3D handles; each change is explained (what moved, what the boat did, why). Questions that are
// not about a trim (tactics, timing) are shown as a short multiple choice. Long texts are on demand.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Lightbulb, ListChecks, MousePointerClick, RotateCcw, Sparkles, Wind, XCircle } from 'lucide-react';
import type { QuizQuestion } from '../content/types';
import { QUIZ_SCENES } from '../content/quizScenes';
import { sceneOptimal, staticSource } from '../three/staticSnapshot';
import { advise, explainChange, merit, solve, type ChangeReport } from '../sim/advisor';
import type { ControlKey, Controls } from '../content/types';
import { ControlSlider } from '../components/ControlSlider';
import { L } from '../i18n';
import { Bar, Chip, Panel, scoreTone, toneText } from '../ui/kit';

const Boat3DView = lazy(() => import('../components/Boat3DView'));

export type QuizMode = 'interactive' | 'detailed';
const KEY = 'trimmaster.quizMode';

export function useQuizMode(): [QuizMode, (m: QuizMode) => void] {
  const [m, setM] = useState<QuizMode>(() => {
    try {
      return localStorage.getItem(KEY) === 'detailed' ? 'detailed' : 'interactive';
    } catch {
      return 'interactive';
    }
  });
  return [
    m,
    (x) => {
      setM(x);
      try {
        localStorage.setItem(KEY, x);
      } catch {
        /* ignore */
      }
    },
  ];
}

export function QuizModeSwitch({ mode, setMode }: { mode: QuizMode; setMode: (m: QuizMode) => void }) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-cyan-300/20 text-xs">
      <button onClick={() => setMode('interactive')} className={`flex items-center gap-1 px-2.5 py-1.5 ${mode === 'interactive' ? 'bg-cyan-400 text-navy-950' : 'text-slate-300 hover:text-white'}`}>
        <MousePointerClick size={13} /> {L('Interactive', 'Interactif')}
      </button>
      <button onClick={() => setMode('detailed')} className={`flex items-center gap-1 px-2.5 py-1.5 ${mode === 'detailed' ? 'bg-cyan-400 text-navy-950' : 'text-slate-300 hover:text-white'}`}>
        <ListChecks size={13} /> {L('Detailed (text)', 'Détaillé (texte)')}
      </button>
    </div>
  );
}

function Details({ q }: { q: QuizQuestion }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button className="flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-100" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {open ? L('Less', 'Moins') : L('More details: the physics, alternatives, when the answer changes', 'Plus de détails : la physique, les alternatives, quand la réponse change')}
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-xs leading-relaxed">
          <p className="text-slate-200">
            <b className="text-slate-100">{L('The physics', 'La physique')} — </b>
            {q.physics}
          </p>
          <p className="text-slate-300">
            <b className="text-slate-200">{L('Alternatives', 'Alternatives')} — </b>
            {q.alternatives}
          </p>
          <p className="text-slate-300">
            <b className="text-slate-200">{L('When the answer changes', 'Quand la réponse change')} — </b>
            {q.whenItChanges}
          </p>
        </div>
      )}
    </div>
  );
}

/** the first sentence of a text (the rest is behind "more details") */
const first = (s: string) => {
  const m = s.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : s;
};

interface Props {
  q: QuizQuestion;
  timed: boolean;
  timedOut: boolean;
  picked: string | null;
  onPick: (aid: string | null) => void;
  onScore: (score: number) => void;
  onNext: () => void;
  last: boolean;
}

export function InteractiveQuestion(p: Props) {
  const spec = QUIZ_SCENES[p.q.id];
  const lab = useMemo(() => (spec ? staticSource(spec) : null), [p.q.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // can this question be answered by fixing the trim? (the scene shows a real trim error)
  const info = useMemo(() => {
    if (!spec || !lab || spec.jibReleased || spec.gennakerCollapsed || spec.interactive === false) return null;
    const opt = sceneOptimal(spec);
    const best = solve(opt, spec.tws, spec.twa, lab.plan, lab.sea);
    const r0 = solve(lab.c0, spec.tws, spec.twa, lab.plan, lab.sea);
    const gap = merit(best) - merit(r0);
    return gap > 0.02 ? { opt, best, r0 } : null;
  }, [lab]); // eslint-disable-line react-hooks/exhaustive-deps
  const fixable = !!info && !p.timed;

  // live 3D snapshot + change tracking
  const [snap, setSnap] = useState(() => lab?.snapshot());
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!lab) return;
    const id = window.setInterval(() => {
      setSnap(lab.snapshot());
      setVersion(lab.version);
    }, 200);
    return () => window.clearInterval(id);
  }, [lab]);

  // explain each change once the player lets go (~0.9 s without movement)
  const ref = useRef<{ c: Controls } | null>(null);
  if (lab && !ref.current) ref.current = { c: { ...lab.c0 } };
  const [reports, setReports] = useState<ChangeReport[]>([]);
  const [recovered, setRecovered] = useState(0);
  useEffect(() => {
    if (!lab || !info || version === 0) return;
    const id = window.setTimeout(() => {
      const before = ref.current!.c;
      const after = { ...lab.controls };
      const kite = lab.headsail === 'gennaker';
      const rb = solve(before, lab.tws, lab.twa, lab.plan, lab.sea);
      const ra = solve(after, lab.tws, lab.twa, lab.plan, lab.sea);
      const rep = explainChange(before, after, rb, ra, info.best, kite);
      if (rep.moves.length) {
        setReports((r) => [rep, ...r].slice(0, 4));
        ref.current = { c: after };
      }
      setRecovered(explainChange(lab.c0, after, info.r0, ra, info.best, kite).recovered);
    }, 900);
    return () => window.clearTimeout(id);
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const [hint, setHint] = useState(0);
  const [hintText, setHintText] = useState<string[]>([]);
  const askHint = () => {
    if (!lab) return;
    const a = advise({ controls: lab.controls, tws: lab.tws, twa: lab.twa, plan: lab.plan, sea: lab.sea, opt: info?.opt });
    setHintText([a.look, a.act, a.detail]);
    setHint((h) => Math.min(3, h + 1));
  };
  const [validated, setValidated] = useState<number | null>(null);
  const best = p.q.answers.find((a) => a.score === 100)!;
  const chosen = p.q.answers.find((a) => a.id === p.picked);
  const [asMcq, setAsMcq] = useState(false);
  const showFix = fixable && !asMcq && !(p.picked && p.picked !== '__fix');

  const reset = () => {
    lab?.setAll(lab.c0);
    ref.current = { c: { ...lab!.c0 } };
    setReports([]);
    setRecovered(0);
  };
  const validate = () => {
    // most of the gap back = full marks; a worse boat = 0
    const score = Math.round(Math.max(0, Math.min(1, recovered / 0.85)) * 100) - hint * 8;
    const s = Math.max(0, Math.min(100, score));
    setValidated(s);
    p.onScore(s);
  };

  // the same controls as the 3D handles, as sliders (the handles are not obvious to everyone yet)
  const [, setTick] = useState(0);
  const kiteUp = lab?.headsail === 'gennaker';
  const SLIDERS: { k: ControlKey; label: string; l: string; r: string; off?: boolean }[] = [
    { k: 'jibSheet', label: kiteUp ? L('Kite sheet', 'Écoute de spi') : L('Jib sheet', 'Écoute de foc'), l: L('ease', 'choquer'), r: L('trim', 'border') },
    { k: 'jibLead', label: L('Jib lead', 'Chariot de foc'), l: L('fwd', 'avant'), r: L('aft', 'arrière'), off: kiteUp },
    { k: 'jibHalyard', label: L('Jib halyard', 'Drisse de foc'), l: L('soft', 'mou'), r: L('tight', 'tendu'), off: kiteUp },
    { k: 'mainSheet', label: L('Mainsheet', 'Écoute de GV'), l: L('ease', 'choquer'), r: L('trim', 'border') },
    { k: 'traveller', label: L('Traveller', 'Chariot de GV'), l: L('leeward', 'sous le vent'), r: L('windward', 'au vent') },
    { k: 'backstay', label: L('Backstay', 'Pataras'), l: 'off', r: 'max' },
    { k: 'vang', label: L('Vang', 'Hale-bas'), l: 'off', r: 'max' },
    { k: 'outhaul', label: L('Outhaul', 'Bordure'), l: L('deep', 'creux'), r: L('flat', 'plat') },
    { k: 'cunningham', label: 'Cunningham', l: 'off', r: 'max' },
    { k: 'hike', label: L('Crew weight', 'Poids équipage'), l: L('leeward', 'sous le vent'), r: L('full hike', 'plein rappel') },
  ];
  const sliders =
    lab && validated === null ? (
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
        {SLIDERS.filter((x) => !x.off).map((x) => (
          <ControlSlider
            key={x.k}
            compact
            label={x.label}
            leftLabel={x.l}
            rightLabel={x.r}
            actual={lab.controls[x.k]}
            target={lab.controls[x.k]}
            step={0.02}
            onChange={(v) => {
              lab.setTarget(x.k, v);
              setSnap(lab.snapshot());
              setVersion(lab.version);
              setTick((t) => t + 1);
            }}
          />
        ))}
      </div>
    ) : null;

  const view3d =
    lab && snap ? (
      <Suspense fallback={<div className="grid h-[460px] place-items-center text-sm text-slate-400">{L('Loading 3D…', 'Chargement 3D…')}</div>}>
        <Boat3DView getSim={() => lab} snap={snap} height={460} initialView={spec!.view ?? 'trimmer'} initialForces={!!spec!.forces} keys={false} coach={false} />
      </Suspense>
    ) : null;

  const situation = (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">{p.q.title}</h2>
        <Chip tone="info">
          <Wind size={11} /> {p.q.conditions.tws} kn
        </Chip>
        <Chip tone="muted">{p.q.conditions.leg}</Chip>
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {p.q.symptoms.slice(0, 3).map((s) => (
          <li key={s} className="flex gap-2 text-slate-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
            {s}
          </li>
        ))}
      </ul>
      {spec && <p className="mt-2 text-xs text-cyan-100">👁 {spec.look}</p>}
    </div>
  );

  // ------------------------------------------------------------ fix-it-yourself
  if (showFix && info) {
    const rec = Math.max(-1, Math.min(1, recovered));
    return (
      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <div className="space-y-2">
          {view3d}
          {sliders}
          <p className="text-[11px] text-slate-500">{L('Use the sliders, or grab a glowing handle in 3D and drag it (car, winch, mainsheet, traveller, backstay…). Wheel to zoom out, top bar to change camera.', 'Utilise les curseurs, ou attrape une poignée lumineuse en 3D et glisse-la (chariot, winch, écoute de GV, chariot de GV, pataras…). Molette pour dézoomer, barre du haut pour changer de caméra.')}</p>
        </div>
        <div className="space-y-3">
          <Panel title={L('The situation', 'La situation')}>{situation}</Panel>
          <Panel title={L('Your move', 'À toi')}>
            {validated === null ? (
              <>
                <p className="text-sm text-white">{L('Fix it with the sliders or the 3D handles. Change what you would change on the water — each move is explained.', 'Corrige-le avec les curseurs ou les poignées 3D. Change ce que tu changerais sur l\'eau — chaque réglage est expliqué.')}</p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                    <span>{L('Gap to the best trim recovered', 'Écart au meilleur réglage rattrapé')}</span>
                    <span className={`num ${rec > 0.8 ? 'text-good' : rec < 0 ? 'text-alarm' : 'text-white'}`}>{Math.round(rec * 100)}%</span>
                  </div>
                  <Bar value={Math.max(0, rec) * 100} tone={rec > 0.8 ? 'good' : rec > 0.3 ? 'warn' : 'alarm'} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-primary" onClick={validate} disabled={!reports.length}>
                    <CheckCircle2 size={15} /> {L('Done', "C'est bon")}
                  </button>
                  <button className="btn-ghost" onClick={askHint} disabled={hint >= 3}>
                    <Lightbulb size={14} /> {hint === 0 ? L('Hint', 'Indice') : L('Another hint', 'Encore un indice')}
                  </button>
                  <button className="btn-ghost" onClick={reset} title={L('Back to the start', 'Revenir au départ')}>
                    <RotateCcw size={14} />
                  </button>
                </div>
                {hint > 0 && (
                  <ol className="mt-3 space-y-1.5 text-xs">
                    {hintText.slice(0, hint).map((h, i) => (
                      <li key={i} className="flex gap-2 rounded border border-warn/30 bg-warn/5 px-2 py-1.5 text-amber-100">
                        <Lightbulb size={12} className="mt-0.5 shrink-0 text-warn" /> {h}
                      </li>
                    ))}
                  </ol>
                )}
                <button className="mt-3 text-[11px] text-slate-400 underline hover:text-white" onClick={() => setAsMcq(true)}>
                  {L('Rather answer the multiple choice', 'Plutôt répondre au QCM')}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {validated >= 80 ? <CheckCircle2 className="text-good" /> : <XCircle className={validated >= 40 ? 'text-warn' : 'text-alarm'} />}
                  <span className="text-sm text-slate-200">
                    {L('Score', 'Score')} <b className={`num ${toneText[scoreTone(validated)]}`}>{validated}</b>
                    {hint > 0 && <span className="text-xs text-slate-400"> ({L(`${hint} hint${hint > 1 ? 's' : ''}`, `${hint} indice${hint > 1 ? 's' : ''}`)})</span>}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white">
                  <Sparkles size={13} className="mr-1 inline text-cyan-300" />
                  {best.text}
                </p>
                <p className="mt-1 text-xs text-slate-300">{first(best.verdict)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-ghost text-xs" onClick={() => lab!.setAll(info.opt)}>
                    {L('Show the best trim in 3D', 'Montrer le meilleur réglage en 3D')}
                  </button>
                  <button className="btn-primary" onClick={p.onNext}>
                    {p.last ? L('See results', 'Voir les résultats') : L('Next', 'Suivante')} <ArrowRight size={15} />
                  </button>
                </div>
                <Details q={p.q} />
              </>
            )}
          </Panel>
          {reports.length > 0 && (
            <Panel title={L('What just happened', "Ce qui vient de se passer")}>
              <div className="space-y-3">
                {reports.map((r, i) => (
                  <div key={i} className={`space-y-1 text-xs ${i ? 'opacity-50' : ''}`}>
                    {r.moves.map((m) => (
                      <p key={m} className="text-cyan-100">
                        ↳ {m}
                      </p>
                    ))}
                    {r.effects.map((e) => (
                      <p key={e} className="pl-3 text-slate-200">
                        {e}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ short multiple choice
  const reveal = p.picked !== null;
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
      <div>{view3d ?? <Panel title={L('The situation', 'La situation')}>{situation}</Panel>}</div>
      <div className="space-y-3">
        {view3d && <Panel title={L('The situation', 'La situation')}>{situation}</Panel>}
        <Panel title={L('Your decision', 'Ta décision')}>
          <p className="mb-2 text-sm font-semibold text-white">{p.q.question}</p>
          <div className="space-y-1.5">
            {p.q.answers.map((a) => {
              const tone = a.score === 100 ? 'border-good/60 bg-good/10' : a.score >= 40 ? 'border-warn/50 bg-warn/5' : 'border-alarm/50 bg-alarm/5';
              return (
                <button key={`${p.q.id}-${a.id}`} disabled={reveal} onClick={() => p.onPick(a.id)} className={`w-full rounded-lg border p-2 text-left text-[13px] transition-colors ${reveal ? tone : 'border-cyan-300/15 bg-navy-850 hover:border-cyan-300/50'} ${p.picked === a.id ? 'ring-2 ring-cyan-300' : ''}`}>
                  <div className="flex items-start gap-2">
                    <span className="num mt-0.5 text-xs uppercase text-cyan-300">{a.id}</span>
                    <span className="flex-1 text-slate-100">{a.text}</span>
                    {reveal && <span className={`num text-xs ${toneText[scoreTone(a.score)]}`}>{a.score}</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {reveal && (
            <div className="mt-3 border-t border-cyan-300/10 pt-3">
              <div className="flex items-start gap-2 text-sm">
                {chosen?.score === 100 ? <CheckCircle2 className="shrink-0 text-good" size={18} /> : <XCircle className={`shrink-0 ${chosen && chosen.score >= 40 ? 'text-warn' : 'text-alarm'}`} size={18} />}
                <span className="text-slate-200">{p.timedOut ? L('Time out — no decision is a decision.', "Temps écoulé — ne pas décider, c'est décider.") : chosen ? first(chosen.verdict) : ''}</span>
              </div>
              {chosen?.score !== 100 && (
                <p className="mt-1 text-xs text-slate-300">
                  {L('Best', 'Meilleure')} : <b className="text-white">{best.id.toUpperCase()}</b> — {first(best.verdict)}
                </p>
              )}
              <Details q={p.q} />
              <button className="btn-primary mt-3" onClick={p.onNext}>
                {p.last ? L('See results', 'Voir les résultats') : L('Next', 'Suivante')} <ArrowRight size={15} />
              </button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
