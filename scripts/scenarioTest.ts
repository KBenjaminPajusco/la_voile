import { SITUATIONS } from '../src/content/situations';
import { MANEUVERS } from '../src/content/maneuvers';
import { buildRace, RACE_PRESETS } from '../src/content/race';
import { ScenarioRunner } from '../src/sim/runner';
for (const def of [...SITUATIONS, ...MANEUVERS, buildRace(RACE_PRESETS[1])]) {
  const r = new ScenarioRunner(def);
  const t0 = Date.now();
  while (!r.finished) r.step(0.05);
  const res = r.evaluate();
  console.log(def.id.padEnd(18), 'score', String(res.score).padStart(3), 'perf', res.std.avgPerf.toFixed(2), 'maxHeel', res.std.maxHeel.toFixed(0), 'end', r.endReason ?? '', `${r.sim.t.toFixed(0)}s`, `${Date.now()-t0}ms`, def.mode === 'race' ? JSON.stringify({ me: r.data.me, opp: r.data.opp, phase: r.data.phase, margin: r.data.margin }) : '');
}
