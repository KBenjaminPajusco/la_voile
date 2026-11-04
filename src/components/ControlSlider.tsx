import { Minus, Plus } from 'lucide-react';
import { Kbd } from '../ui/kit';
import { L } from '../i18n';

export function ControlSlider({
  label,
  actual,
  target,
  onChange,
  keys,
  leftLabel,
  rightLabel,
  highlight,
  disabled,
  note,
  step = 0.04,
}: {
  label: string;
  actual: number;
  target: number;
  onChange: (v: number) => void;
  keys?: [string, string];
  leftLabel?: string;
  rightLabel?: string;
  highlight?: boolean;
  disabled?: boolean;
  note?: string;
  step?: number;
}) {
  const moving = Math.abs(actual - target) > 0.005;
  return (
    <div className={`rounded-lg border px-3 py-2 ${highlight ? 'border-cyan-300/40 bg-cyan-400/5' : 'border-cyan-300/10 bg-navy-850/60'} ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">{label}</span>
        <span className="num text-xs text-white">
          {Math.round(actual * 100)}
          <span className="text-slate-500">%</span>
          {moving && <span className="ml-1 text-cyan-300">→{Math.round(target * 100)}</span>}
        </span>
      </div>
      <div className="relative mt-1 flex items-center gap-1.5">
        <button className="grid h-6 w-6 shrink-0 place-items-center rounded border border-cyan-300/15 text-slate-300 hover:bg-navy-700" onClick={() => onChange(Math.max(0, target - step))} disabled={disabled} aria-label={L(`${label} decrease`, `${label} diminuer`)}>
          <Minus size={12} />
        </button>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-cyan-400/70" style={{ width: `${actual * 100}%` }} />
          <input type="range" min={0} max={1} step={0.005} value={target} onChange={(e) => onChange(parseFloat(e.target.value))} className="tm-range relative" disabled={disabled} aria-label={label} />
        </div>
        <button className="grid h-6 w-6 shrink-0 place-items-center rounded border border-cyan-300/15 text-slate-300 hover:bg-navy-700" onClick={() => onChange(Math.min(1, target + step))} disabled={disabled} aria-label={L(`${label} increase`, `${label} augmenter`)}>
          <Plus size={12} />
        </button>
      </div>
      <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
        <span>{leftLabel}</span>
        {keys && (
          <span className="flex gap-1">
            <Kbd>{keys[0]}</Kbd>
            <Kbd>{keys[1]}</Kbd>
          </span>
        )}
        <span>{rightLabel}</span>
      </div>
      {note && <div className="mt-1 text-[10px] text-warn">{note}</div>}
    </div>
  );
}
