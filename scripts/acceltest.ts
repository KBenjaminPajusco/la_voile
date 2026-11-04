import { Simulator } from '../src/sim/engine';
import { optimalControls } from '../src/sim/polar';
for (const tws of [8, 12, 16]) for (const strat of ['full', 'eased', 'late']) {
  const c = optimalControls(tws, 38);
  const sim = new Simulator({ wind: { tws, twd: 0, gustiness: 0, shiftiness: 0, seed: 1, events: [] }, sea: 0, twa: 38, v: 5, controls: c });
  for (let i = 0; i < 600; i++) sim.step(0.05);
  const v0 = sim.v; sim.commandTack(); let rel = false; let x0 = sim.y; let tReach = -1; let minV = 99;
  let trimmed = false;
  for (let i = 0; i < 500; i++) {
    sim.step(0.05);
    const tw = Math.abs(sim.twa);
    if (!rel && ((strat !== 'late' && tw < 6) || (strat === 'late' && sim.plan.jibBacked && i > 0 && sim.twa * 1 < -8))) { sim.releaseSheet(); rel = true; if (strat === 'eased') { sim.setTarget('jibSheet', c.jibSheet - 0.1); sim.setMode('accel'); } }
    if (strat === 'eased' && !trimmed && sim.maneuver?.done && sim.v > 0.85 * sim.target()) { sim.setTarget('jibSheet', c.jibSheet); sim.setMode('normal'); trimmed = true; }
    minV = Math.min(minV, sim.v);
    if (tReach < 0 && sim.maneuver?.done && sim.v > 0.95 * v0) tReach = sim.t;
  }
  console.log(tws, strat, 'v0', v0.toFixed(2), 'min', minV.toFixed(2), 'reach95', tReach.toFixed(1), 'upwind gain', (sim.y - x0).toFixed(1), 'E', sim.energy.toFixed(0));
}
