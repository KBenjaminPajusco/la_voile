import { buildRace, RACE_PRESETS } from '../src/content/race';
import { ScenarioRunner } from '../src/sim/runner';
import { optimalControls } from '../src/sim/polar';
import { CONTROL_KEYS } from '../src/sim/physics';
for (const idx of [0, 1, 2]) {
  const r = new ScenarioRunner(buildRace(RACE_PRESETS[idx]));
  let lastTrim = -10; let lastPhase = '';
  while (!r.finished) {
    const s = r.sim;
    const m = s.maneuver && !s.maneuver.done ? s.maneuver : null;
    if (m && (m.kind === 'tack' || m.kind === 'gybe')) {
      if (!s.prepared && m.releasedAt === undefined) s.prepareSheet();
      const a = Math.abs(s.twa);
      if (m.releasedAt === undefined && ((m.kind === 'tack' && a < 8) || (m.kind === 'gybe' && a > 172))) s.releaseSheet();
    }
    if (s.t > 6 && s.t - lastTrim > 1) {
      lastTrim = s.t;
      const o = optimalControls(s.twsSmooth, Math.abs(s.twa), s.plan.headsail);
      for (const k of CONTROL_KEYS) if (Math.abs(s.targets[k] - o[k]) > 0.03) s.setTarget(k, o[k]);
    }
    if (r.data.phase !== lastPhase) { lastPhase = String(r.data.phase); console.log(`  t=${s.t.toFixed(0)} phase ${lastPhase} y=${s.y.toFixed(0)} x=${s.x.toFixed(0)} me=${Number(r.data.me??0).toFixed(0)} opp=${Number(r.data.opp??0).toFixed(0)}`); }
    r.step(0.05);
  }
  const res = r.evaluate();
  console.log(RACE_PRESETS[idx].label, 'SCORE', res.score, 'end', r.endReason, 'margin', Number(r.data.margin).toFixed(1), 't', r.sim.t.toFixed(0), 'maneuvers', r.sim.maneuvers.map(m=>m.kind[0]).join(''));
  for (const row of res.rows) console.log('   ', row.score, row.label, '—', row.note);
}
