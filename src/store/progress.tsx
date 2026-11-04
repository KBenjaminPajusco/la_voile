// Local progression store (localStorage). XP, level, history, skills, best scores.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { levelForXp } from '../content/levels';
import type { SkillKey } from '../content/types';
import { L } from '../i18n';

export type ActivityKind = 'lesson' | 'quiz' | 'situation' | 'maneuver' | 'race' | 'free';

export interface ActivityRecord {
  kind: ActivityKind;
  refId: string;
  title: string;
  score: number;
  xp: number;
  t: number;
  skills: SkillKey[];
  groups?: Record<string, number>;
}

export interface Progress {
  version: 1;
  xp: number;
  history: ActivityRecord[];
  best: Record<string, number>;
  lessonsDone: Record<string, number>;
  quiz: Record<string, { score: number; t: number; attempts: number }>;
  skills: Partial<Record<SkillKey, number>>;
  metrics: Record<string, number>; // EMA of standard metric groups (speed, heel, ...)
  unlockAll: boolean;
  /** set once the everything-unlocked default has been applied to an older save */
  openedAll?: boolean;
  timeScale: number;
  last?: { route: string; title: string };
}

const KEY = 'trimmaster.progress.v1';

const empty = (): Progress => ({
  version: 1,
  xp: 0,
  history: [],
  best: {},
  lessonsDone: {},
  quiz: {},
  skills: {},
  metrics: {},
  // everything open by default: every lesson, quiz question, situation, drill and race is
  // available from the start. Progressive unlocking can be switched back on in Progression.
  unlockAll: true,
  openedAll: true,
  timeScale: 1,
});

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Progress;
    const merged = { ...empty(), ...p };
    // older saves: open everything once (the user can lock it again in Progression)
    if (!p.openedAll) {
      merged.unlockAll = true;
      merged.openedAll = true;
    }
    return merged;
  } catch {
    return empty();
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

export const SKILL_LABELS: Record<SkillKey, string> = {
  headsail: L('Headsail trim', 'Réglage du foc'),
  mainsail: L('Mainsail trim', 'Réglage de la grand-voile'),
  balance: L('Heel & balance', 'Gîte & équilibre'),
  maneuvers: L('Maneuvers', 'Manœuvres'),
  reaction: L('Reaction & timing', 'Réactivité & timing'),
  energy: L('Winch & energy', 'Winch & énergie'),
  tactics: L('Communication & tactics', 'Communication & tactique'),
};

interface Ctx {
  progress: Progress;
  level: number;
  record: (r: Omit<ActivityRecord, 'xp' | 't'>, opts?: { xpBase?: number; level?: number }) => ActivityRecord;
  recordQuiz: (qid: string, score: number, level: number, skill: SkillKey, title: string) => number;
  completeLesson: (id: string, score: number, skill: SkillKey, title: string, level: number) => number;
  setUnlockAll: (v: boolean) => void;
  setTimeScale: (v: number) => void;
  setLast: (route: string, title: string) => void;
  reset: () => void;
  isUnlocked: (level: number) => boolean;
}

const ProgressCtx = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(load);
  useEffect(() => save(progress), [progress]);
  const level = levelForXp(progress.xp).level;

  const update = useCallback((f: (p: Progress) => Progress) => setProgress((p) => f(p)), []);

  const record: Ctx['record'] = useCallback(
    (r, opts = {}) => {
      const prevBest = progress.best[r.refId] ?? 0;
      const base = opts.xpBase ?? 2;
      const lvl = opts.level ?? 1;
      // XP rewards improvement over your best + a small completion bonus
      const xp = Math.round(Math.max(0, r.score - prevBest) * base * (0.6 + lvl * 0.15) + (r.score >= 50 ? 10 : 3));
      const rec: ActivityRecord = { ...r, xp, t: Date.now() };
      update((p) => {
        const skills = { ...p.skills };
        for (const s of r.skills) skills[s] = skills[s] === undefined ? r.score : Math.round(skills[s]! * 0.65 + r.score * 0.35);
        const metrics = { ...p.metrics };
        if (r.groups) for (const [g, v] of Object.entries(r.groups)) metrics[g] = metrics[g] === undefined ? v : Math.round(metrics[g] * 0.7 + v * 0.3);
        return {
          ...p,
          xp: p.xp + xp,
          history: [rec, ...p.history].slice(0, 250),
          best: { ...p.best, [r.refId]: Math.max(prevBest, r.score) },
          skills,
          metrics,
        };
      });
      return rec;
    },
    [progress.best, update],
  );

  const recordQuiz: Ctx['recordQuiz'] = useCallback(
    (qid, score, lvl, skill, title) => {
      const prev = progress.quiz[qid];
      const prevScore = prev?.score ?? 0;
      const xp = Math.round(Math.max(0, score - prevScore) * (0.25 + lvl * 0.06)) + 2;
      update((p) => {
        const skills = { ...p.skills };
        skills[skill] = skills[skill] === undefined ? score : Math.round(skills[skill]! * 0.8 + score * 0.2);
        const rec: ActivityRecord = { kind: 'quiz', refId: qid, title, score, xp, t: Date.now(), skills: [skill] };
        return {
          ...p,
          xp: p.xp + xp,
          quiz: { ...p.quiz, [qid]: { score: Math.max(prevScore, score), t: Date.now(), attempts: (prev?.attempts ?? 0) + 1 } },
          skills,
          history: [rec, ...p.history].slice(0, 250),
        };
      });
      return xp;
    },
    [progress.quiz, update],
  );

  const completeLesson: Ctx['completeLesson'] = useCallback(
    (id, score, skill, title, lvl) => {
      const prev = progress.lessonsDone[id];
      const xp = prev === undefined ? Math.round(40 + score * 0.4 + lvl * 5) : Math.round(Math.max(0, score - prev) * 0.3);
      update((p) => {
        const skills = { ...p.skills };
        if (skills[skill] === undefined) skills[skill] = Math.round(score * 0.6);
        const rec: ActivityRecord = { kind: 'lesson', refId: id, title, score, xp, t: Date.now(), skills: [skill] };
        return { ...p, xp: p.xp + xp, lessonsDone: { ...p.lessonsDone, [id]: Math.max(prev ?? 0, score) }, skills, history: [rec, ...p.history].slice(0, 250) };
      });
      return xp;
    },
    [progress.lessonsDone, update],
  );

  const value = useMemo<Ctx>(
    () => ({
      progress,
      level,
      record,
      recordQuiz,
      completeLesson,
      setUnlockAll: (v) => update((p) => ({ ...p, unlockAll: v })),
      setTimeScale: (v) => update((p) => ({ ...p, timeScale: v })),
      setLast: (route, title) => update((p) => ({ ...p, last: { route, title } })),
      reset: () => setProgress(empty()),
      isUnlocked: (l) => progress.unlockAll || l <= level,
    }),
    [progress, level, record, recordQuiz, completeLesson, update],
  );
  return <ProgressCtx.Provider value={value}>{children}</ProgressCtx.Provider>;
}

export function useProgress() {
  const c = useContext(ProgressCtx);
  if (!c) throw new Error('ProgressProvider missing');
  return c;
}
