import { Simulator } from '../src/sim/engine';
import { optimalControls } from '../src/sim/polar';
const tws = 12;
const sim = new Simulator({ wind: { tws, twd: 0, gustiness: 0.3, shiftiness: 0.2, seed: 1, events: [{ kind: 'gust', start: 40, ramp: 2, hold: 8, amount: 7 }] }, sea: 1, twa: 40, v: 5, controls: optimalControls(tws, 40) });
const log = (l: string) => { const s = sim.snapshot(); console.log(l, 't', s.t.toFixed(1), 'V', s.v.toFixed(2), 'tgt', s.target.toFixed(2), 'heel', s.heel.toFixed(1), 'rud', s.rudder.toFixed(1), 'twa', s.twa.toFixed(1), 'awa', s.awa.toFixed(1), 'js', s.controls.jibSheet.toFixed(2), 'E', s.energy.toFixed(0), s.winchState, 'backed', s.plan.jibBacked, 'rel', s.plan.jibReleased, s.maneuver?.kind ?? '', s.maneuver?.done ?? ''); };
const dt = 0.05;
for (let i = 0; i < 600; i++) { sim.step(dt); if (i % 100 === 0) log('steady'); }
sim.commandTack();
let released = false;
for (let i = 0; i < 400; i++) {
  sim.step(dt);
  if (!released && Math.abs(sim.twa) < 6) { sim.releaseSheet(); released = true; log('RELEASE'); }
  if (i % 10 === 0) log('tack');
}
for (let i = 0; i < 600; i++) { sim.step(dt); if (i % 40 === 0) log('gust'); }
console.log(sim.messages.map(m => `${m.t.toFixed(1)} ${m.from}: ${m.text}`).join('\n'));
