import { useCallback, useState } from 'react';
import type { RunResult, ScenarioDef } from '../sim/runner';
import { Cockpit } from './Cockpit';
import { Debrief } from './Debrief';
import { useProgress, type ActivityKind } from '../store/progress';

export function ScenarioPlayer({ def, kind, onExit, freeMode = false }: { def: ScenarioDef; kind: ActivityKind; onExit: () => void; freeMode?: boolean }) {
  const { record } = useProgress();
  const [result, setResult] = useState<{ r: RunResult; xp: number } | null>(null);
  const [runId, setRunId] = useState(0);

  const onFinish = useCallback(
    (r: RunResult) => {
      // a run ended almost immediately is not evaluated (no XP, not recorded)
      const evaluated = r.tel.filter((s) => s.t >= (def.evalFrom ?? 0)).length * 0.25;
      if (evaluated < 8) {
        setResult({ r: { ...r, score: 0, endReason: 'too-short' }, xp: 0 });
        return;
      }
      const groups: Record<string, number> = {
        speed: Math.round(r.std.speed),
        heel: Math.round(r.std.heel),
        rudder: Math.round(r.std.rudder),
        efficiency: Math.round(r.std.efficiency),
        energy: Math.round(r.std.energy),
        adjustments: Math.round(r.std.adjustments),
      };
      const reaction = r.rows.filter((x) => x.group === 'Reaction time' || x.group === 'Initial response');
      if (reaction.length) groups.reaction = Math.round(reaction.reduce((a, b) => a + b.score, 0) / reaction.length);
      const tech = r.rows.filter((x) => ['Trim adjustments', 'Decision', 'Final balance', 'Preparation', 'Timing'].includes(x.group));
      if (tech.length) groups.technical = Math.round(tech.reduce((a, b) => a + b.score, 0) / tech.length);
      const rec = record(
        { kind, refId: def.id, title: def.title, score: r.score, skills: def.skills, groups },
        { xpBase: kind === 'race' ? 3 : kind === 'free' ? 0.5 : 1.3 + def.pressure * 0.3, level: def.level },
      );
      setResult({ r, xp: rec.xp });
    },
    [def, kind, record],
  );

  if (result)
    return (
      <Debrief
        def={def}
        result={result.r}
        xp={result.xp}
        onBack={onExit}
        onRetry={() => {
          setResult(null);
          setRunId((x) => x + 1);
        }}
      />
    );
  return <Cockpit key={runId} def={def} onFinish={onFinish} onExit={onExit} freeMode={freeMode} />;
}
