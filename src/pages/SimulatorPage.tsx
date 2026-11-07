import { useEffect, useMemo, useState } from 'react';
import { Flag, Lock, Play, Sailboat, Settings2, Trophy } from 'lucide-react';
import type { Nav } from '../App';
import { buildFree, DEFAULT_FREE, type FreeOptions } from '../content/free';
import { buildRace, RACE_PRESETS } from '../content/race';
import { RACE_LEVELS } from '../content/catalog';
import { useProgress } from '../store/progress';
import { ScenarioPlayer } from '../components/ScenarioPlayer';
import { Chip, Disclaimer, PageHeader, Panel, scoreTone, toneText } from '../ui/kit';
import { J80_PROFILE } from '../sim/boatProfile';
import { L } from '../i18n';

const FREE_KEY = 'trimmaster.free.v1';

function loadFree(): FreeOptions {
  try {
    const r = localStorage.getItem(FREE_KEY);
    return r ? { ...DEFAULT_FREE, ...JSON.parse(r) } : DEFAULT_FREE;
  } catch {
    return DEFAULT_FREE;
  }
}

export function SimulatorPage({ nav, sub }: { nav: Nav; sub?: string }) {
  const { progress, isUnlocked, setLast } = useProgress();
  const [opts, setOpts] = useState<FreeOptions>(loadFree);
  useEffect(() => {
    try {
      localStorage.setItem(FREE_KEY, JSON.stringify(opts));
    } catch {
      /* ignore */
    }
  }, [opts]);

  const raceIdx = sub?.startsWith('race/') ? parseInt(sub.split('/')[1], 10) : -1;
  const freeDef = useMemo(() => buildFree(opts), [opts]);
  const raceDef = useMemo(() => (raceIdx >= 0 && RACE_PRESETS[raceIdx] ? buildRace(RACE_PRESETS[raceIdx]) : null), [raceIdx]);

  useEffect(() => {
    if (sub === 'free') setLast('simulator/free', L('Free practice', 'Entraînement libre'));
    if (raceDef) setLast(`simulator/race/${raceIdx}`, raceDef.subtitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub]);

  if (sub === 'free') return <ScenarioPlayer def={freeDef} kind="free" onExit={() => nav('simulator')} freeMode />;
  if (raceDef) return <ScenarioPlayer def={raceDef} kind="race" onExit={() => nav('simulator')} />;

  const set = <K extends keyof FreeOptions>(k: K, v: FreeOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));
  const Seg = <K extends keyof FreeOptions>({ k, options }: { k: K; options: { v: FreeOptions[K]; l: string }[] }) => (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button key={String(o.v)} onClick={() => set(k, o.v)} className={`btn !px-2.5 !py-1.5 text-xs ${opts[k] === o.v ? 'bg-cyan-400 text-navy-950' : 'btn-ghost'}`}>
          {o.l}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader title={L('Live Simulator', 'Simulateur')} subtitle={L('Continuously evolving boat state. Every control is connected: sail shape → forces → heel, helm and speed.', 'Un bateau qui évolue en continu. Tout est lié : forme des voiles → forces → gîte, barre et vitesse.')} icon={<Sailboat size={20} />} />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel title={<span className="flex items-center gap-2"><Settings2 size={13} /> {L('Free practice', 'Entraînement libre')}</span>}>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-300">
                <span>{L('True wind speed', 'Vitesse du vent réel')}</span>
                <span className="num text-white">{opts.tws} kn</span>
              </div>
              <input type="range" className="tm-range" min={4} max={24} step={1} value={opts.tws} onChange={(e) => set('tws', parseInt(e.target.value, 10))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>{L('Gusts & lulls', 'Risées & molles')}</span>
                  <span className="num text-white">{Math.round(opts.gustiness * 100)}%</span>
                </div>
                <input type="range" className="tm-range" min={0} max={1} step={0.05} value={opts.gustiness} onChange={(e) => set('gustiness', parseFloat(e.target.value))} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>{L('Wind shifts', 'Bascules de vent')}</span>
                  <span className="num text-white">{Math.round(opts.shifts * 100)}%</span>
                </div>
                <input type="range" className="tm-range" min={0} max={1} step={0.05} value={opts.shifts} onChange={(e) => set('shifts', parseFloat(e.target.value))} />
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-300">{L('Sea state', 'État de la mer')}</div>
              <Seg k="sea" options={[{ v: 0, l: L('Flat', 'Plate') }, { v: 1, l: L('Chop', 'Clapot') }, { v: 2, l: L('Short waves', 'Vagues courtes') }, { v: 3, l: L('Rough', 'Agitée') }]} />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-300">{L('Point of sail', 'Allure')}</div>
              <Seg k="point" options={[{ v: 'upwind', l: L('Upwind', 'Au près') }, { v: 'reach', l: L('Beam reach (jib)', 'Travers (foc)') }, { v: 'downwind', l: L('Downwind (gennaker)', 'Au portant (gennaker)') }]} />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-300">{L('Downwind kite (hoisted downwind or after a bear-away)', 'Spi (au portant ou après une abattée)')}</div>
              <Seg k="kite" options={[{ v: 'asym', l: L('Asymmetric (J/80, sprit)', 'Asymétrique (J/80, bout-dehors)') }, { v: 'sym', l: L('Symmetric (pole)', 'Symétrique (tangon)') }]} />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-300">{L('Starting trim', 'Réglage de départ')}</div>
              <Seg k="start" options={[{ v: 'good', l: L('Near-optimal', 'Quasi optimal') }, { v: 'neutral', l: L('Generic', 'Générique') }, { v: 'bad', l: L('Messed up — fix it', 'Déréglé — à corriger') }]} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={opts.tactician} onChange={(e) => set('tactician', e.target.checked)} className="accent-cyan-400" />
              {L('Tactician calls tacks / gybes every ~45 s (sheet-work practice)', 'Le tacticien annonce virements / empannages toutes les ~45 s (travail d\'écoute)')}
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => nav('simulator/free')}>
                <Play size={15} /> {L('Launch free practice', 'Lancer l\'entraînement libre')}
              </button>
              <button className="btn-ghost" onClick={() => set('seed', Math.floor(Math.random() * 1e6))}>
                {L('New wind pattern', 'Nouveau régime de vent')}
              </button>
            </div>
          </div>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><Trophy size={13} /> {L('Match Racing Challenge', 'Défi match race')}</span>}>
          <p className="text-sm text-slate-300">
            {L('A full windward–leeward match: pre-start, acceleration, upwind with tacks, wind shift and puffs, windward rounding & hoist, downwind with gybes, leeward rounding & douse, upwind finish. You do not drive: you trim, work the sheets in every maneuver and talk to the helm.', 'Un match complet au vent–sous le vent : pré-départ, relance, près avec virements, bascule et risées, passage de la bouée au vent & envoi, portant avec empannages, bouée sous le vent & affalage, arrivée au près. Vous ne barrez pas : vous réglez, travaillez les écoutes à chaque manœuvre et parlez au barreur.')}
          </p>
          <div className="mt-4 space-y-2">
            {RACE_PRESETS.map((r, i) => {
              const id = `race-${r.tws}`;
              const best = progress.best[id];
              const unlocked = isUnlocked(RACE_LEVELS[i]);
              return (
                <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-cyan-300/10 bg-navy-850/60 p-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Flag size={14} className="text-cyan-300" /> {r.label}
                    </div>
                    <div className="mt-1 flex gap-1.5">
                      <Chip tone="muted">{L('Level', 'Niveau')} {RACE_LEVELS[i]}</Chip>
                      <Chip tone="muted">{L(`${r.legLength} m legs`, `bords de ${r.legLength} m`)}</Chip>
                      <Chip tone="muted">{L('opponent', 'adversaire')} {Math.round(r.opponentSkill * 100)}%</Chip>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {best !== undefined && <span className={`num text-lg ${toneText[scoreTone(best)]}`}>{best}</span>}
                    <button className="btn-primary" disabled={!unlocked} onClick={() => nav(`simulator/race/${i}`)}>
                      {unlocked ? <Play size={15} /> : <Lock size={14} />} {unlocked ? L('Race', 'Régater') : `${L('L', 'N')}${RACE_LEVELS[i]}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">{L('Tip: races take 6–8 minutes at ×1. Use ×2 time scale for the straight lines, ×1 for maneuvers.', 'Astuce : une course dure 6–8 minutes à ×1. Passez à ×2 dans les lignes droites, ×1 pour les manœuvres.')}</p>
        </Panel>
      </div>

      <Panel title={L('Reference boat profile', 'Profil du bateau de référence')} className="mt-4">
        <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            [L('Profile', 'Profil'), J80_PROFILE.name],
            [L('Displacement', 'Déplacement'), L(`${J80_PROFILE.displacement} kg + crew ${J80_PROFILE.crewMass} kg`, `${J80_PROFILE.displacement} kg + équipage ${J80_PROFILE.crewMass} kg`)],
            [L('Waterline', 'Flottaison'), `${J80_PROFILE.lwl} m`],
            [L('Sail areas', 'Surfaces de voile'), L(`Main ${J80_PROFILE.mainArea} m² · Jib ${J80_PROFILE.jibArea} m² · Gennaker ${J80_PROFILE.gennakerArea} m²`, `GV ${J80_PROFILE.mainArea} m² · Foc ${J80_PROFILE.jibArea} m² · Gennaker ${J80_PROFILE.gennakerArea} m²`)],
            [L('Mast height', 'Hauteur de mât'), `${J80_PROFILE.mastHeight} m`],
            [L('Stability', 'Stabilité'), L(`GM ${J80_PROFILE.gm} m, crew lever ${J80_PROFILE.crewArmHiked} m hiked`, `GM ${J80_PROFILE.gm} m, bras de levier équipage ${J80_PROFILE.crewArmHiked} m au rappel`)],
            [L('Rudder', 'Safran'), L(`stall ${J80_PROFILE.rudderStall}°, comfort ${J80_PROFILE.rudderComfort}°`, `décrochage ${J80_PROFILE.rudderStall}°, confort ${J80_PROFILE.rudderComfort}°`)],
            [L('Winch', 'Winch'), L(`two-speed, ${J80_PROFILE.jibSheetTravel} m sheet travel`, `deux vitesses, course d\'écoute ${J80_PROFILE.jibSheetTravel} m`)],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{k}</div>
              <div className="text-slate-200">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Disclaimer />
          <p className="mt-1 text-[11px] text-slate-500">{L('The profile lives in src/sim/boatProfile.ts; re-run', 'Le profil se trouve dans src/sim/boatProfile.ts ; relancez')} <code className="text-cyan-300">npm run polar</code> {L('after calibrating it to regenerate target speeds.', 'après calibration pour régénérer les vitesses cibles.')}</p>
        </div>
      </Panel>
    </div>
  );
}
