// Lesson illustrations. All are driven by live physics output from the lesson lab,
// so the drawings change as the learner moves the controls.
import type { Controls, DiagramKind } from '../content/types';
import type { SteadyResult } from '../sim/physics';
import { BoatTopView, SailSections, SternView, Telltales } from './visuals';
import { L } from '../i18n';

const DEG = Math.PI / 180;

export function LessonDiagram({ kind, res, c, tws, twa, module }: { kind: DiagramKind; res: SteadyResult; c: Controls; tws: number; twa: number; module: 'headsail' | 'mainsail' | 'behavior' }) {
  const f = res.f;
  switch (kind) {
    case 'twist':
    case 'draft':
    case 'aoa':
      return (
        <div className="grid grid-cols-2 gap-2">
          <SailSections shape={f.shapes.jib} sections={f.jib.sections} label={L('JIB SECTIONS', 'SECTIONS DU FOC')} height={300} />
          <SailSections shape={f.shapes.main} sections={f.main.sections} label={L('MAIN SECTIONS', 'SECTIONS DE GV')} height={300} />
          <p className="col-span-2 text-[11px] text-slate-400">
            {L("Bow to the left, leeward down. Grey arrows: apparent wind at each height (it swings aft aloft — wind gradient). Each section's colour shows its flow: cyan attached, amber luffing, red stalled.", 'Étrave à gauche, sous le vent en bas. Flèches grises : vent apparent à chaque hauteur (il adonne en altitude — gradient de vent). La couleur de chaque section montre son écoulement : cyan attaché, ambre qui fasseye, rouge décroché.')} {kind === 'twist' ? L('Twist = how much further eased the top section is than the foot.', 'Vrillage = de combien la section haute est plus choquée que le bas.') : kind === 'draft' ? L('Draft depth & position: where the deepest part of the curve sits.', 'Creux et position du creux : où se situe la partie la plus profonde du profil.') : L('Angle of attack = AWA − sheeting angle.', 'Angle d’incidence = AWA − angle de bordé.')}
          </p>
        </div>
      );
    case 'telltales':
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <SailSections shape={f.shapes.jib} sections={f.jib.sections} label={L('JIB SECTIONS', 'SECTIONS DU FOC')} height={280} />
          <div>
            <Telltales f={f} headsail="jib" />
            <p className="mt-2 text-[11px] text-slate-400">{L('Windward telltale lifts = angle of attack too low (luffing / pinching). Leeward telltale stalls = angle too high (over-trimmed / footing). Both streaming = in the groove.', 'Penon au vent qui se lève = incidence trop faible (ça fasseye / on pince). Penon sous le vent décroché = incidence trop forte (trop bordé / on abat). Les deux volent bien = dans le couloir.')}</p>
          </div>
        </div>
      );
    case 'slot':
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div className="mx-auto aspect-square w-full max-w-[320px]">
            <BoatTopView twa={twa} awa={f.awa} tws={tws} aws={f.aws} heel={res.heel} f={f} headsail="jib" compact />
          </div>
          <div className="space-y-2 text-sm">
            <Big label={L('Slot angle', 'Angle de fente')} value={`${f.shapes.slot.toFixed(1)}°`} tone={f.shapes.slot < 2.5 ? 'alarm' : 'good'} />
            <Big label={L('Main backwind', 'Contre-vent GV')} value={`${Math.round(Math.min(1, f.shapes.backwind) * 100)}%`} tone={f.shapes.backwind > 0.3 ? 'alarm' : 'good'} />
            <p className="text-[11px] text-slate-400">{L('Solid lines: lower sections. Dashed: upper sections (twisted). When the jib leech points into the main, the jib wash hits the lee of the main luff — backwind.', 'Traits pleins : sections basses. Pointillés : sections hautes (vrillées). Quand la chute du foc pointe dans la GV, le flux du foc frappe l’extrados du guindant de GV — contre-vent.')}</p>
          </div>
        </div>
      );
    case 'heel':
      return (
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <div className="h-48">
            <SternView heel={res.heel} heelMoment={f.heelMoment} rightingMoment={f.rightingMoment} hike={c.hike} rudder={f.rudder} />
          </div>
          <div className="space-y-2 text-sm">
            <Big label={L('Heeling moment', 'Moment de gîte')} value={`${(f.heelMoment / 1000).toFixed(1)} kN·m`} />
            <Big label={L('Righting moment', 'Moment de redressement')} value={`${(f.rightingMoment / 1000).toFixed(1)} kN·m`} />
            <p className="text-[11px] text-slate-400">{L('The boat settles where the two moments are equal. Hull + keel give righting moment that grows with heel; the crew adds a lever that is largest when hiked and upright.', 'Le bateau se stabilise là où les deux moments sont égaux. Coque + quille donnent un moment de redressement qui croît avec la gîte ; l’équipage ajoute un bras de levier maximal au rappel et à plat.')}</p>
          </div>
        </div>
      );
    case 'apparent':
      return <ApparentDiagram tws={tws} twa={twa} v={res.v} aws={f.aws} awa={f.awa} />;
    case 'balance':
      return <BalanceDiagram res={res} />;
    case 'mastbend':
      return <MastBendDiagram c={c} res={res} />;
    case 'lead':
      return <LeadDiagram c={c} res={res} />;
    default:
      return module === 'headsail' ? <SailSections shape={f.shapes.jib} sections={f.jib.sections} label={L('JIB', 'FOC')} /> : <SailSections shape={f.shapes.main} sections={f.main.sections} label={L('MAIN', 'GV')} />;
  }
}

function Big({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'alarm' }) {
  return (
    <div className="rounded-lg border border-cyan-300/10 bg-navy-950/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`num text-xl ${tone === 'alarm' ? 'text-alarm' : tone === 'good' ? 'text-good' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function ApparentDiagram({ tws, twa, v, aws, awa }: { tws: number; twa: number; v: number; aws: number; awa: number }) {
  // boat heading up the screen; vectors drawn from the point where they meet the sail
  const k = 7;
  const O = { x: 160, y: 190 };
  const tw = { x: -Math.sin(twa * DEG) * tws * k, y: Math.cos(twa * DEG) * tws * k }; // true wind blowing toward
  const bw = { x: 0, y: v * k }; // headwind from boat speed (blowing aft)
  const end = { x: O.x + tw.x + bw.x, y: O.y + tw.y + bw.y };
  void end;
  // draw arrows ending at O: start = O - vector
  const tStart = { x: O.x - tw.x, y: O.y - tw.y };
  const bStart = { x: tStart.x - bw.x, y: tStart.y - bw.y };
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
      <svg viewBox="0 0 320 230" className="w-full max-h-[280px]">
        <defs>
          {['t', 'b', 'a'].map((id, i) => (
            <marker key={id} id={`ap${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={['#94a3b8', '#f59e0b', '#22d3ee'][i]} />
            </marker>
          ))}
        </defs>
        <path d={`M${O.x},${O.y - 40} l10,30 l-4,28 h-12 l-4,-28 z`} fill="#dbe7f5" opacity={0.85} />
        <line x1={bStart.x} y1={bStart.y} x2={tStart.x} y2={tStart.y} stroke="#f59e0b" strokeWidth={2.5} markerEnd="url(#apb)" />
        <line x1={tStart.x} y1={tStart.y} x2={O.x} y2={O.y} stroke="#94a3b8" strokeWidth={2.5} markerEnd="url(#apt)" />
        <line x1={bStart.x} y1={bStart.y} x2={O.x} y2={O.y} stroke="#22d3ee" strokeWidth={3} markerEnd="url(#apa)" />
        <text x={(bStart.x + tStart.x) / 2 + 6} y={(bStart.y + tStart.y) / 2} fontSize={10} fill="#f59e0b">
          {L('boat-speed wind', 'vent vitesse')} {v.toFixed(1)} kn
        </text>
        <text x={(tStart.x + O.x) / 2 + 6} y={(tStart.y + O.y) / 2 + 12} fontSize={10} fill="#94a3b8">
          {L('true', 'réel')} {tws.toFixed(0)} kn
        </text>
        <text x={(bStart.x + O.x) / 2 - 10} y={(bStart.y + O.y) / 2 - 8} fontSize={10} fill="#22d3ee" textAnchor="end">
          {L('apparent', 'apparent')} {aws.toFixed(1)} kn
        </text>
      </svg>
      <div className="space-y-2">
        <Big label={L('True wind angle', 'Angle du vent réel')} value={`${twa.toFixed(0)}°`} />
        <Big label={L('Apparent wind angle', 'Angle du vent apparent')} value={`${awa.toFixed(0)}°`} />
        <p className="text-[11px] text-slate-400">{L('Apparent wind = true wind + the headwind created by boat speed. More speed → apparent wind moves forward and gets stronger: that is why you trim as the boat accelerates.', 'Vent apparent = vent réel + vent de face créé par la vitesse du bateau. Plus de vitesse → le vent apparent refuse et forcit : c’est pourquoi on borde quand le bateau accélère.')}</p>
      </div>
    </div>
  );
}

function BalanceDiagram({ res }: { res: SteadyResult }) {
  const f = res.f;
  const total = Math.abs(f.main.side) + Math.abs(f.jib.side) || 1;
  // CE x (m, + aft of CLR) weighted by side forces; scale 18 px per metre
  const ceX = (f.main.side * 0.78 + f.jib.side * -1.55) / total;
  const px = (m: number) => 160 + m * 34;
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
      <svg viewBox="0 0 320 200" className="w-full max-h-[280px]">
        <path d="M30,150 Q160,170 290,140 L285,128 L35,128 Z" fill="#dbe7f5" opacity={0.85} />
        <path d="M150,150 L146,190 L176,190 L172,150 Z" fill="#94a3b8" />
        <path d="M262,145 L258,185 L270,185 L272,145 Z" fill="#94a3b8" />
        <line x1={150} y1={128} x2={150} y2={10} stroke="#e2e8f0" strokeWidth={2} />
        <path d="M152,14 L152,124 L250,124 Z" fill="rgba(34,211,238,0.12)" stroke="#22d3ee" />
        <path d="M148,30 L148,124 L60,126 Z" fill="rgba(255,255,255,0.08)" stroke="#e2e8f0" />
        <circle cx={px(0)} cy={172} r={5} fill="#f59e0b" />
        <text x={px(0)} y={198} fontSize={9} fill="#f59e0b" textAnchor="middle">
          {L('CLR', 'CRL')}
        </text>
        <circle cx={px(ceX)} cy={80} r={6} fill="#22d3ee" />
        <text x={px(ceX)} y={70} fontSize={9} fill="#22d3ee" textAnchor="middle">
          {L('CE', 'CV')}
        </text>
        <line x1={px(ceX)} y1={86} x2={px(ceX)} y2={166} stroke="#22d3ee" strokeDasharray="3 3" />
      </svg>
      <div className="space-y-2">
        <Big label={L('CE offset (aft of CLR)', 'Décalage CV (arrière du CRL)')} value={`${ceX.toFixed(2)} m`} />
        <Big label={L('Rudder to balance', 'Safran pour équilibrer')} value={`${f.rudder.toFixed(1)}°`} tone={f.rudder > 7 ? 'alarm' : undefined} />
        <p className="text-[11px] text-slate-400">{L("Side force acting aft of the keel's centre of lateral resistance turns the bow to windward (weather helm). Heel adds more: the drive force moves to leeward of the hull. Easing the main moves CE forward.", 'Une force latérale appliquée en arrière du centre de résistance latérale de la quille fait lofer le bateau (barre ardente). La gîte en rajoute : la force propulsive passe sous le vent de la coque. Choquer la GV avance le CV.')}</p>
      </div>
    </div>
  );
}

function MastBendDiagram({ c, res }: { c: Controls; res: SteadyResult }) {
  const bend = 0.85 * c.backstay + 0.15 * c.vang * c.mainSheet;
  const sag = res.f.shapes.forestaySag;
  const H = 180;
  const mx = 140;
  const bendPx = bend * 18;
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
      <svg viewBox="0 0 320 210" className="w-full max-h-[280px]">
        <path d="M30,190 L290,190" stroke="#1e3d63" />
        {/* forestay with sag */}
        <path d={`M60,188 Q${95 + sag * 22},${100 + sag * 10} ${mx - 2},${190 - H * 0.82}`} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
        {/* backstay */}
        <line x1={mx} y1={190 - H} x2={292} y2={188} stroke="#94a3b8" strokeWidth={1.2 + c.backstay * 2} />
        {/* mast bent forward in the middle */}
        <path d={`M${mx},188 Q${mx - bendPx * 2},${190 - H / 2} ${mx},${190 - H}`} fill="none" stroke="#e2e8f0" strokeWidth={3} />
        {/* main luff follows the mast; leech */}
        <path d={`M${mx},${190 - H} Q${mx - bendPx * 2 + 4},${190 - H / 2} ${mx + 2},178 L250,176 Q${235 + c.mainSheet * 12},${110} ${mx},${190 - H}`} fill="rgba(34,211,238,0.10)" stroke="#22d3ee" />
        <text x={mx - bendPx * 2 - 6} y={190 - H / 2} fontSize={9} fill="#e2e8f0" textAnchor="end">
          {L('bend', 'cintre')} {Math.round(bend * 100)}%
        </text>
        <text x={80} y={110} fontSize={9} fill="#f59e0b">
          {L('sag', 'mou')} {Math.round(sag * 100)}%
        </text>
      </svg>
      <div className="space-y-2">
        <Big label={L('Main depth', 'Creux GV')} value={`${(res.f.shapes.main.depth * 100).toFixed(1)}%`} />
        <Big label={L('Main twist', 'Vrillage GV')} value={`${res.f.shapes.main.twist.toFixed(0)}°`} />
        <p className="text-[11px] text-slate-400">{L('Bending the mast forward pulls luff cloth forward: the main flattens and the upper leech opens. The backstay also tensions the forestay, reducing sag — flatter jib entry.', 'Cintrer le mât vers l’avant tire le tissu du guindant vers l’avant : la GV s’aplatit et le haut de la chute s’ouvre. Le pataras tend aussi l’étai, réduisant son mou — entrée du foc plus plate.')}</p>
      </div>
    </div>
  );
}

function LeadDiagram({ c, res }: { c: Controls; res: SteadyResult }) {
  // bow on the left. The car is always AFT of the clew: the sheet runs down and aft from the
  // clew to the car, and the car's fore/aft position sets how much of that pull is down (leech)
  // versus aft (foot).
  const leadX = 222 + (c.jibLead - 0.5) * 64;
  const clew = { x: 182, y: 160 };
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
      <svg viewBox="0 0 320 210" className="w-full max-h-[280px]">
        <path d="M20,190 L300,190" stroke="#1e3d63" />
        <rect x={186} y={186} width={72} height={6} fill="#334155" />
        <text x={190} y={182} fontSize={8} fill="#64748b">{L('fwd', 'av')}</text>
        <text x={256} y={182} fontSize={8} fill="#64748b" textAnchor="end">{L('aft', 'ar')}</text>
        <rect x={leadX - 6} y={183} width={12} height={8} rx={2} fill="#22d3ee" />
        <path d={`M40,186 L150,20 Q${168 + res.f.shapes.jib.twist * 1.2},${96} ${clew.x},${clew.y} Q${110 - (1 - c.jibLead) * 20},${176} 40,186 Z`} fill="rgba(255,255,255,0.08)" stroke="#e2e8f0" />
        <line x1={clew.x} y1={clew.y} x2={leadX} y2={186} stroke="#f59e0b" strokeWidth={2} />
        <text x={leadX} y={204} fontSize={9} fill="#22d3ee" textAnchor="middle">
          {L('lead car', 'chariot')}
        </text>
        {/* sheet vector components */}
        <text x={clew.x + 8} y={clew.y - 6} fontSize={9} fill="#f59e0b">
          {c.jibLead < 0.45 ? L('pull mostly DOWN → leech', 'traction surtout vers le BAS → chute') : c.jibLead > 0.55 ? L('pull mostly AFT → foot', 'traction surtout vers l’ARRIÈRE → bordure') : L('balanced pull', 'traction équilibrée')}
        </text>
      </svg>
      <div className="space-y-2">
        <Big label={L('Jib twist', 'Vrillage foc')} value={`${res.f.shapes.jib.twist.toFixed(0)}°`} />
        <Big label={L('Lower depth', 'Creux bas')} value={`${(res.f.shapes.jib.depthBottom * 100).toFixed(1)}%`} />
        <p className="text-[11px] text-slate-400">{L('The sheet pulls the clew along the line to the car. Car forward: more downward pull → tighter leech, less twist, deeper foot. Car aft: more aft pull → flatter foot, open leech.', 'L’écoute tire le point d’écoute vers le chariot. Chariot avancé : plus de traction vers le bas → chute plus tendue, moins de vrillage, bas plus creux. Chariot reculé : plus de traction vers l’arrière → bas plus plat, chute ouverte.')}</p>
      </div>
    </div>
  );
}
