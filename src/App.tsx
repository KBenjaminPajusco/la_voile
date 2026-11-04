import { useEffect, useState } from 'react';
import { Activity, BookOpen, Compass, GraduationCap, LayoutDashboard, Menu, Sailboat, Timer, Trophy, X } from 'lucide-react';
import { useProgress } from './store/progress';
import { levelForXp, nextLevel } from './content/levels';
import { Dashboard } from './pages/Dashboard';
import { School } from './pages/School';
import { Quiz } from './pages/Quiz';
import { Situations } from './pages/Situations';
import { ManeuverLab } from './pages/ManeuverLab';
import { SimulatorPage } from './pages/SimulatorPage';
import { Progression } from './pages/Progression';
import { Bar } from './ui/kit';
import { L, LANG, setLang } from './i18n';

export type Nav = (route: string) => void;

const NAV = [
  { id: 'dashboard', label: L('Dashboard', 'Tableau de bord'), icon: LayoutDashboard },
  { id: 'school', label: L('Sailing School', 'École de voile'), icon: BookOpen },
  { id: 'quiz', label: L('Knowledge Quiz', 'Quiz'), icon: GraduationCap },
  { id: 'situations', label: L('Situation Training', 'Mises en situation'), icon: Activity },
  { id: 'maneuvers', label: L('Maneuver Lab', 'Labo manœuvres'), icon: Timer },
  { id: 'simulator', label: L('Live Simulator', 'Simulateur'), icon: Sailboat },
  { id: 'progression', label: L('Progression', 'Progression'), icon: Trophy },
];

function useHashRoute(): [string, Nav] {
  const get = () => (window.location.hash.replace(/^#\/?/, '') || 'dashboard');
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => setRoute(get());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const nav: Nav = (r) => {
    window.location.hash = `/${r}`;
    window.scrollTo({ top: 0 });
  };
  return [route, nav];
}

export default function App() {
  const [route, nav] = useHashRoute();
  const { progress } = useProgress();
  const [open, setOpen] = useState(false);
  const [section, ...rest] = route.split('/');
  const param = rest.join('/');
  const lvl = levelForXp(progress.xp);
  const nxt = nextLevel(progress.xp);
  const pctToNext = nxt ? ((progress.xp - lvl.xp) / (nxt.xp - lvl.xp)) * 100 : 100;

  let page;
  switch (section) {
    case 'school':
      page = <School nav={nav} lessonId={param || undefined} />;
      break;
    case 'quiz':
      page = <Quiz nav={nav} mode={param || undefined} />;
      break;
    case 'situations':
      page = <Situations nav={nav} id={param || undefined} />;
      break;
    case 'maneuvers':
      page = <ManeuverLab nav={nav} id={param || undefined} />;
      break;
    case 'simulator':
      page = <SimulatorPage nav={nav} sub={param || undefined} />;
      break;
    case 'progression':
      page = <Progression nav={nav} />;
      break;
    default:
      page = <Dashboard nav={nav} />;
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      {/* sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-[232px] border-r border-cyan-300/10 bg-navy-950/95 backdrop-blur transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 pb-4 pt-5">
            <button onClick={() => nav('dashboard')} className="flex items-center gap-2 text-left">
              <svg viewBox="0 0 32 32" className="h-8 w-8">
                <circle cx="16" cy="16" r="15" fill="none" stroke="#22d3ee" strokeOpacity="0.4" />
                <path d="M16 5 L16 24 L8 24 Z" fill="#22d3ee" />
                <path d="M17 8 L17 24 L24 24 Z" fill="#fff" />
                <path d="M7 26 Q16 29 25 26" stroke="#22d3ee" fill="none" />
              </svg>
              <div>
                <div className="font-display text-lg font-bold leading-none tracking-[0.18em] text-white">TRIMMASTER</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/60">{L('Match race trimmer', 'Régleur match race')}</div>
              </div>
            </button>
            <button className="lg:hidden" onClick={() => setOpen(false)} aria-label={L('Close menu', 'Fermer le menu')}>
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 px-3">
            {NAV.map((n) => {
              const active = section === n.id || (n.id === 'dashboard' && !NAV.some((x) => x.id === section));
              const Icon = n.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    nav(n.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-cyan-400/10 text-cyan-200 shadow-[inset_2px_0_0_#22d3ee]' : 'text-slate-300 hover:bg-navy-800 hover:text-white'}`}
                >
                  <Icon size={17} />
                  {n.label}
                </button>
              );
            })}
          </nav>
          <div className="m-3 rounded-lg border border-cyan-300/10 bg-navy-900 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-slate-400">
                <Compass size={12} /> {L('Level', 'Niveau')} {lvl.level}
              </span>
              <span className="num text-cyan-200">{progress.xp} XP</span>
            </div>
            <div className="mt-0.5 font-display text-sm font-semibold uppercase tracking-wider text-white">{lvl.name}</div>
            <Bar value={pctToNext} tone="info" className="mt-2" />
            <div className="mt-1 text-[10px] text-slate-500">{nxt ? L(`${nxt.xp - progress.xp} XP to ${nxt.name}`, `${nxt.xp - progress.xp} XP avant ${nxt.name}`) : L('Max level', 'Niveau max')}</div>
          </div>
          <div className="mx-3 mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>{L('Language', 'Langue')}</span>
            <div className="flex gap-1">
              {(['en', 'fr'] as const).map((lg) => (
                <button
                  key={lg}
                  onClick={() => lg !== LANG && setLang(lg)}
                  aria-pressed={LANG === lg}
                  className={`rounded px-2 py-0.5 font-semibold tracking-wider transition-colors ${LANG === lg ? 'bg-cyan-400/15 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.4)]' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
                >
                  {lg.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <main className="min-w-0">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-cyan-300/10 bg-navy-950/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label={L('Open menu', 'Ouvrir le menu')}>
            <Menu size={20} />
          </button>
          <span className="font-display font-bold tracking-[0.18em]">TRIMMASTER</span>
          <span className="num text-xs text-cyan-200">L{lvl.level}</span>
        </div>
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:py-7">{page}</div>
      </main>
    </div>
  );
}
