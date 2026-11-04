// Small reusable UI primitives with the instrument-panel look.
import type { ReactNode } from 'react';
import { L } from '../i18n';

export function Panel({ title, right, children, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-2 border-b border-cyan-300/10 px-4 py-2.5">
          <h3 className="panel-title">{title}</h3>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export type Tone = 'good' | 'warn' | 'alarm' | 'info' | 'muted';
export const toneText: Record<Tone, string> = {
  good: 'text-good',
  warn: 'text-warn',
  alarm: 'text-alarm',
  info: 'text-cyan-300',
  muted: 'text-slate-400',
};
export const toneBg: Record<Tone, string> = {
  good: 'bg-good/15 border-good/40 text-good',
  warn: 'bg-warn/15 border-warn/40 text-warn',
  alarm: 'bg-alarm/15 border-alarm/40 text-alarm',
  info: 'bg-cyan-400/10 border-cyan-300/30 text-cyan-300',
  muted: 'bg-slate-500/10 border-slate-400/20 text-slate-300',
};

export function Chip({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`chip ${toneBg[tone]}`}>{children}</span>;
}

export function scoreTone(s: number): Tone {
  return s >= 80 ? 'good' : s >= 55 ? 'warn' : 'alarm';
}

export function ScoreRing({ score, size = 84, label }: { score: number; size?: number; label?: string }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  const color = tone === 'good' ? '#34d399' : tone === 'warn' ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(103,232,249,0.12)" strokeWidth={6} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${(c * Math.max(0, Math.min(100, score))) / 100} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="num" fill="#fff" fontSize={size * 0.28} fontWeight={600}>
          {Math.round(score)}
        </text>
      </svg>
      {label && <span className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">{label}</span>}
    </div>
  );
}

export function Bar({ value, max = 100, tone, className = '' }: { value: number; max?: number; tone?: Tone; className?: string }) {
  const p = Math.max(0, Math.min(1, value / max));
  const t = tone ?? scoreTone((value / max) * 100);
  const bg = t === 'good' ? 'bg-good' : t === 'warn' ? 'bg-warn' : t === 'alarm' ? 'bg-alarm' : 'bg-cyan-400';
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-cyan-300/10 ${className}`}>
      <div className={`h-full rounded-full ${bg} transition-[width] duration-300`} style={{ width: `${p * 100}%` }} />
    </div>
  );
}

export function Stat({ label, value, unit, tone = 'muted', sub }: { label: string; value: ReactNode; unit?: string; tone?: Tone; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className={`num text-xl font-semibold ${tone === 'muted' ? 'text-white' : toneText[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-xs text-slate-400">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="num rounded border border-cyan-300/25 bg-navy-800 px-1.5 py-0.5 text-[10px] text-cyan-200">{children}</kbd>;
}

export function Sparkline({
  data,
  width = 300,
  height = 70,
  color = '#22d3ee',
  min,
  max,
  refLine,
  marks = [],
}: {
  data: { x: number; y: number }[];
  width?: number;
  height?: number;
  color?: string;
  min?: number;
  max?: number;
  refLine?: number;
  marks?: { x: number; label: string }[];
}) {
  if (data.length < 2) return <svg width="100%" height={height} />;
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = min ?? Math.min(...ys);
  const y1 = max ?? Math.max(...ys);
  const sx = (x: number) => ((x - x0) / Math.max(1e-6, x1 - x0)) * width;
  const sy = (y: number) => height - 4 - ((y - y0) / Math.max(1e-6, y1 - y0)) * (height - 8);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${sx(d.x).toFixed(1)},${sy(d.y).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      {refLine !== undefined && <line x1={0} x2={width} y1={sy(refLine)} y2={sy(refLine)} stroke="rgba(245,158,11,0.5)" strokeDasharray="4 4" />}
      {marks.map((m, i) => (
        <g key={i}>
          <line x1={sx(m.x)} x2={sx(m.x)} y1={0} y2={height} stroke="rgba(255,255,255,0.18)" />
          <text x={sx(m.x) + 3} y={10} fontSize={9} fill="rgba(255,255,255,0.55)">
            {m.label}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function PageHeader({ title, subtitle, icon, right }: { title: string; subtitle?: string; icon?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && <div className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">{icon}</div>}
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="text-[11px] leading-relaxed text-slate-500">
      {L('TRIMMASTER uses a simplified, physically-informed model for training consistency — not a certified VPP. Real trim depends on your boat, rig tune, sails, sea state and crew weight.', 'TRIMMASTER utilise un modèle simplifié, fondé sur la physique, pour un entraînement cohérent — pas un VPP certifié. Le vrai réglage dépend de votre bateau, du réglage du gréement, des voiles, de l\'état de la mer et du poids de l\'équipage.')}
    </p>
  );
}
