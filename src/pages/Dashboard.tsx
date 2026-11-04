import { ArrowRight, BookOpen, GraduationCap, LayoutDashboard, Play, Sailboat, Target, Timer, TrendingDown, Activity } from 'lucide-react';
import type { Nav } from '../App';
import { useProgress, SKILL_LABELS } from '../store/progress';
import { levelForXp, nextLevel, LEVELS } from '../content/levels';
import { CATALOG, recommend, quizStats } from '../content/catalog';
import { Bar, Chip, Disclaimer, PageHeader, Panel, ScoreRing, Sparkline, Stat, scoreTone, toneText } from '../ui/kit';
import type { SkillKey } from '../content/types';
import { L } from '../i18n';

const KIND_LABEL: Record<string, string> = {
  lesson: L('lesson', 'leçon'),
  quiz: L('quiz', 'quiz'),
  situation: L('situation', 'situation'),
  maneuver: L('maneuver', 'manœuvre'),
  race: L('race', 'régate'),
  free: L('free sail', 'navigation libre'),
};

export function Dashboard({ nav }: { nav: Nav }) {
  const { progress, level } = useProgress();
  const lvl = levelForXp(progress.xp);
  const nxt = nextLevel(progress.xp);
  const recs = recommend(progress, level, progress.unlockAll);
  const recent = progress.history.filter((h) => h.kind !== 'quiz').slice(0, 6);
  const quizRecent = progress.history.filter((h) => h.kind === 'quiz').slice(0, 20);
  const quizAvg = quizRecent.length ? Math.round(quizRecent.reduce((a, b) => a + b.score, 0) / quizRecent.length) : 0;
  const totalScore = Object.values(progress.best).reduce((a, b) => a + b, 0) + Object.values(progress.quiz).reduce((a, b) => a + b.score, 0) + Object.values(progress.lessonsDone).reduce((a, b) => a + b, 0);
  const skills = Object.keys(SKILL_LABELS) as SkillKey[];
  const weak = skills
    .map((s) => ({ s, v: progress.skills[s] }))
    .sort((a, b) => (a.v ?? -1) - (b.v ?? -1))
    .slice(0, 3);
  const trend = progress.history
    .filter((h) => h.kind !== 'quiz' && h.kind !== 'lesson')
    .slice(0, 20)
    .reverse()
    .map((h, i) => ({ x: i, y: h.score }));
  const qs = quizStats(progress, 8);
  const metricLabels: Record<string, string> = {
    technical: L('Technical correctness', 'Justesse technique'),
    reaction: L('Reaction time', 'Temps de réaction'),
    speed: L('Boat speed maintained', 'Vitesse maintenue'),
    heel: L('Heel management', 'Gestion de la gîte'),
    rudder: L('Rudder load', 'Charge de safran'),
    efficiency: L('Sail efficiency', 'Efficacité des voiles'),
    energy: L('Winch effort', 'Effort aux winchs'),
    adjustments: L('Economy of adjustments', 'Économie de réglages'),
  };

  return (
    <div>
      <PageHeader title={L('Dashboard', 'Tableau de bord')} subtitle={L('Your trimming instrument panel', 'Votre tableau de bord de réglage')} icon={<LayoutDashboard size={20} />} />

      {/* a personal note from the author */}
      <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm leading-relaxed text-amber-50/90">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300">{L('A word before you start', 'Un mot avant de commencer')}</div>
        {L(
          "TRIMMASTER is how I understand sailing and trimming: what I have learned on the water and what I have read, put into a physics model and an app. It is not a certified VPP and it is certainly not perfect. Real trim depends on the boat, the rig tune, the sails, the sea and the crew. Use it to think about sail trim and to train your eye, and trust the water when it disagrees.",
          "TRIMMASTER, c'est la voile et le réglage tels que je les comprends : ce que j'ai appris sur l'eau et ce que j'ai lu, mis dans un modèle physique et une appli. Ce n'est pas un VPP certifié et ce n'est sûrement pas parfait. Le vrai réglage dépend du bateau, du calage du gréement, des voiles, de la mer et de l'équipage. Sers-t'en pour réfléchir au réglage et t'entraîner l'œil, et fais confiance à l'eau quand elle n'est pas d'accord.",
        )}
        <div className="mt-1 text-xs text-amber-200/70">— Benjamin Pajusco</div>
        <div className="mt-2 text-[11px] text-slate-400">
          {L(
            'Credits: J/80 3D model "J-80 Sailboat" (Sketchfab; its file metadata names dlawlor), sky photo Poly Haven (CC0), water normal map from three.js (MIT).',
            'Crédits : modèle 3D du J/80 « J-80 Sailboat » (Sketchfab ; ses métadonnées citent dlawlor), photo du ciel Poly Haven (CC0), texture d’eau de three.js (MIT).',
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Panel title={L('Training level', "Niveau d'entraînement")} className="lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-400/10">
              <span className="num text-3xl font-bold text-cyan-200">{lvl.level}</span>
            </div>
            <div>
              <div className="font-display text-xl font-bold uppercase tracking-wider text-white">{lvl.name}</div>
              <div className="text-xs text-slate-400">{lvl.focus}</div>
            </div>
          </div>
          <Bar value={nxt ? ((progress.xp - lvl.xp) / (nxt.xp - lvl.xp)) * 100 : 100} tone="info" className="mt-4" />
          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span className="num">{progress.xp} XP</span>
            <span>{nxt ? L(`${nxt.xp - progress.xp} XP to L${nxt.level}`, `${nxt.xp - progress.xp} XP avant N${nxt.level}`) : L('Top level reached', 'Niveau max atteint')}</span>
          </div>
          <div className="mt-3 flex gap-1">
            {LEVELS.map((l) => (
              <div key={l.level} className={`h-1.5 flex-1 rounded-full ${l.level <= lvl.level ? 'bg-cyan-400' : 'bg-cyan-300/10'}`} />
            ))}
          </div>
        </Panel>

        <Panel title={L('Total score', 'Score total')}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={L('Score points', 'Points')} value={Math.round(totalScore)} tone="info" />
            <Stat label={L('Activities', 'Activités')} value={progress.history.length} />
            <Stat label={L('Quiz correct', 'Quiz réussis')} value={`${qs.correct}/${qs.total}`} />
            <Stat label={L('Lessons', 'Leçons')} value={`${Object.keys(progress.lessonsDone).length}/${CATALOG.filter((c) => c.kind === 'lesson').length}`} />
          </div>
        </Panel>

        <Panel title={L('Recent performance', 'Performances récentes')} className="lg:col-span-2">
          {trend.length > 1 ? (
            <div>
              <Sparkline data={trend} min={0} max={100} refLine={75} height={70} />
              <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>{L(`last ${trend.length} simulator runs`, `${trend.length} dernières sessions simu`)}</span>
                <span>{L('quiz avg (last 20)', 'moy. quiz (20 dern.)')}: <span className={`num ${toneText[scoreTone(quizAvg)]}`}>{quizAvg}</span></span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">{L('Complete a few simulator exercises to see your performance trend.', 'Faites quelques exercices au simulateur pour voir votre tendance.')}</div>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={<span className="flex items-center gap-2"><Target size={13} /> {L('Recommended next', 'Recommandé ensuite')}</span>} className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-3">
            {recs.map(({ item, reason }, i) => (
              <button key={item.id} onClick={() => nav(item.route)} className={`group rounded-xl border p-3 text-left transition-colors hover:border-cyan-300/50 ${i === 0 ? 'border-cyan-300/40 bg-cyan-400/10' : 'border-cyan-300/10 bg-navy-850/60'}`}>
                <div className="flex items-center justify-between">
                  <Chip tone={i === 0 ? 'info' : 'muted'}>{(KIND_LABEL[item.kind] ?? item.kind).toUpperCase()}</Chip>
                  <span className="text-[10px] text-slate-500">L{item.level}</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-xs text-slate-400">{reason}</div>
                <div className="mt-2 flex items-center gap-1 text-xs text-cyan-300 group-hover:gap-2">
                  {L('Start', 'Démarrer')} <ArrowRight size={12} />
                </div>
              </button>
            ))}
          </div>
          {progress.last && (
            <button onClick={() => nav(progress.last!.route)} className="btn-primary mt-4">
              <Play size={15} /> {L('Resume', 'Reprendre')}: {progress.last.title}
            </button>
          )}
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><TrendingDown size={13} /> {L('Skills to improve', 'Compétences à travailler')}</span>}>
          <div className="space-y-3">
            {weak.map(({ s, v }) => (
              <div key={s}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-200">{SKILL_LABELS[s]}</span>
                  <span className={`num ${v === undefined ? 'text-slate-500' : toneText[scoreTone(v)]}`}>{v === undefined ? L('not assessed', 'non évalué') : v}</span>
                </div>
                <Bar value={v ?? 0} />
              </div>
            ))}
          </div>
          <button className="btn-ghost mt-4 w-full" onClick={() => nav('progression')}>
            {L('Full skill profile', 'Profil complet')} <ArrowRight size={14} />
          </button>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={L('Quick access', 'Accès rapide')} className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-2">
            {[
              { r: 'school', l: L('Sailing School', 'École de voile'), i: BookOpen },
              { r: 'quiz', l: L('Quiz', 'Quiz'), i: GraduationCap },
              { r: 'situations', l: L('Situations', 'Situations'), i: Activity },
              { r: 'maneuvers', l: L('Maneuvers', 'Manœuvres'), i: Timer },
              { r: 'simulator/free', l: L('Free sail', 'Nav. libre'), i: Sailboat },
              { r: 'simulator', l: L('Match race', 'Match race'), i: Target },
            ].map(({ r, l, i: Icon }) => (
              <button key={r} onClick={() => nav(r)} className="btn-ghost justify-start !py-3">
                <Icon size={15} /> {l}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={L('Performance profile (simulator)', 'Profil de performance (simu)')} className="lg:col-span-1">
          {Object.keys(progress.metrics).length === 0 ? (
            <div className="text-sm text-slate-400">{L('No simulator data yet.', 'Pas encore de données simulateur.')}</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(metricLabels)
                .filter(([k]) => progress.metrics[k] !== undefined)
                .map(([k, l]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{l}</span>
                      <span className="num text-white">{progress.metrics[k]}</span>
                    </div>
                    <Bar value={progress.metrics[k]} />
                  </div>
                ))}
            </div>
          )}
        </Panel>
        <Panel title={L('Recent activity', 'Activité récente')} className="lg:col-span-1">
          {recent.length === 0 ? (
            <div className="text-sm text-slate-400">{L('Nothing yet — start with a lesson or the quiz.', "Rien pour l'instant — commencez par une leçon ou le quiz.")}</div>
          ) : (
            <div className="space-y-2">
              {recent.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <ScoreRing score={h.score} size={38} />
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">{h.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {KIND_LABEL[h.kind] ?? h.kind} · +{h.xp} XP · {new Date(h.t).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
