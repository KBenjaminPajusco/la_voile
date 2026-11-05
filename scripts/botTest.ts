import { SITUATIONS } from '../src/content/situations';
import { MANEUVERS } from '../src/content/maneuvers';
import { ScenarioRunner } from '../src/sim/runner';
import { optimalControls } from '../src/sim/polar';
type Bot = (r: ScenarioRunner, t: number, once: (k: string, f: () => void) => void) => void;
const bots: Record<string, Bot> = {
  'sit-overpowered': (r, t, once) => { const s = r.sim; if (t > 9) once('a', () => { s.setTarget('hike', 1); s.setTarget('traveller', 0.25); s.setTarget('backstay', 0.7); s.setTarget('outhaul', 0.9); s.setTarget('cunningham', 0.4); s.setTarget('mainSheet', 0.85); }); },
  'sit-gust': (r, t, once) => { const s = r.sim; const g = r.marks.gust; if (s.windT > 8) once('c', () => s.call('pressure')); if (g !== undefined && t > g + 0.3) once('a', () => { s.setTarget('traveller', 0.2); s.setTarget('hike', 1); s.setTarget('backstay', 0.6); }); if (s.windT > 26.5) once('b', () => { s.setTarget('traveller', 0.5); s.setTarget('backstay', 0.3); }); },
  'man-tack': (r, t, once) => { const s = r.sim; const o = optimalControls(12, 38).jibSheet; if (t > 3) once('p', () => s.prepareSheet()); if (s.maneuver && !s.maneuver.done && Math.abs(s.twa) < 7) once('r', () => { s.releaseSheet(); s.setTarget('jibSheet', o - 0.07); s.setMode('accel'); }); if (s.maneuver?.done && s.v > 0.88 * s.target()) once('f', () => { s.setTarget('jibSheet', o); s.setMode('normal'); }); },
  'man-bearaway': (r, t, once) => { const s = r.sim; if (t > 8.2) once('a', () => { s.setTarget('mainSheet', 0.2); s.setTarget('jibSheet', 0.4); s.setTarget('backstay', 0.05); s.setTarget('vang', 0.55); }); if (s.plan.headsail === 'gennaker') once('k', () => s.setTarget('jibSheet', optimalControls(14, 140, 'gennaker').jibSheet + 0.15)); if (t > 22) once('k2', () => s.setTarget('jibSheet', optimalControls(14, 140, 'gennaker').jibSheet)); },
  'man-prestart': (r, t, once) => { const s = r.sim; if (t > 4.3) once('a', () => s.setTarget('jibSheet', 0.7)); if (t > 5) once('b', () => s.setTarget('mainSheet', 0.7)); if (t > 10) once('c', () => { const o = optimalControls(11, 38); s.setTarget('jibSheet', o.jibSheet); s.setTarget('mainSheet', o.mainSheet); s.setMode('normal'); }); },
};
for (const def of [...SITUATIONS, ...MANEUVERS]) {
  const bot = bots[def.id]; if (!bot) continue;
  const r = new ScenarioRunner(def); const done = new Set<string>();
  while (!r.finished) { bot(r, r.sim.t, (k, f) => { if (!done.has(k)) { done.add(k); f(); } }); r.step(0.05); }
  const res = r.evaluate();
  console.log(def.id, 'SCORE', res.score, 'perf', res.std.avgPerf.toFixed(2), 'maxHeel', res.std.maxHeel.toFixed(0));
  for (const row of res.rows) console.log('   ', row.score.toString().padStart(3), row.label, '—', row.note);
}
