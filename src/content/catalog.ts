// Catalog of every training activity, used for recommendations and progression.
import { LESSONS } from './lessons';
import { MANEUVERS } from './maneuvers';
import { QUIZ } from './quiz';
import { RACE_PRESETS } from './race';
import { SITUATIONS } from './situations';
import type { SkillKey } from './types';
import type { Progress } from '../store/progress';
import { L } from '../i18n';

export interface CatalogItem {
  kind: 'lesson' | 'quiz' | 'situation' | 'maneuver' | 'race';
  id: string;
  title: string;
  level: number;
  skills: SkillKey[];
  route: string;
}

export const RACE_LEVELS = [7, 8, 8];

export const CATALOG: CatalogItem[] = [
  ...LESSONS.map((l) => ({ kind: 'lesson' as const, id: l.id, title: L(`Lesson: ${l.title}`, `Leçon : ${l.title}`), level: l.level, skills: [l.skill], route: `school/${l.id}` })),
  ...SITUATIONS.map((s) => ({ kind: 'situation' as const, id: s.id, title: L(`Situation: ${s.title}`, `Situation : ${s.title}`), level: s.level, skills: s.skills, route: `situations/${s.id}` })),
  ...MANEUVERS.map((m) => ({ kind: 'maneuver' as const, id: m.id, title: L(`Maneuver: ${m.title}`, `Manœuvre : ${m.title}`), level: m.level, skills: m.skills, route: `maneuvers/${m.id}` })),
  ...RACE_PRESETS.map((r, i) => ({ kind: 'race' as const, id: `race-${r.tws}`, title: L(`Match race: ${r.label}`, `Match race : ${r.label}`), level: RACE_LEVELS[i], skills: ['tactics', 'maneuvers'] as SkillKey[], route: `simulator/race/${i}` })),
];

export function isDone(p: Progress, it: CatalogItem) {
  if (it.kind === 'lesson') return (p.lessonsDone[it.id] ?? -1) >= 60;
  return (p.best[it.id] ?? 0) >= 75;
}

export function quizStats(p: Progress, level: number) {
  const qs = QUIZ.filter((q) => q.level <= level);
  const answered = qs.filter((q) => p.quiz[q.id]);
  const correct = qs.filter((q) => (p.quiz[q.id]?.score ?? 0) >= 100);
  return { total: qs.length, answered: answered.length, correct: correct.length };
}

export function recommend(p: Progress, level: number, unlockAll: boolean): { item: CatalogItem; reason: string }[] {
  const avail = CATALOG.filter((c) => unlockAll || c.level <= level);
  const out: { item: CatalogItem; reason: string }[] = [];
  const skills = Object.keys({ headsail: 1, mainsail: 1, balance: 1, maneuvers: 1, reaction: 1, energy: 1, tactics: 1 }) as SkillKey[];
  const rated = skills.map((s) => ({ s, v: p.skills[s] ?? -1 })).sort((a, b) => a.v - b.v);
  // 1. unfinished lesson at current level
  const lesson = avail.filter((c) => c.kind === 'lesson' && !isDone(p, c)).sort((a, b) => a.level - b.level)[0];
  // 2. weakest skill practice
  for (const r of rated) {
    const it = avail.filter((c) => c.kind !== 'lesson' && c.skills.includes(r.s) && !isDone(p, c)).sort((a, b) => a.level - b.level)[0];
    if (it) {
      out.push({ item: it, reason: r.v < 0 ? L(`You have not trained ${r.s} yet.`, `Vous n'avez pas encore travaillé : ${r.s}.`) : L(`Your weakest skill: ${r.s} (${r.v}/100).`, `Votre compétence la plus faible : ${r.s} (${r.v}/100).`) });
      break;
    }
  }
  if (lesson) out.push({ item: lesson, reason: L('Next lesson in your syllabus.', 'Prochaine leçon de votre programme.') });
  const next = avail.filter((c) => c.kind !== 'lesson' && !isDone(p, c) && !out.some((o) => o.item.id === c.id)).sort((a, b) => b.level - a.level)[0];
  if (next) out.push({ item: next, reason: L('Hardest unlocked challenge you have not mastered.', 'Le défi débloqué le plus difficile que vous ne maîtrisez pas encore.') });
  return out;
}
