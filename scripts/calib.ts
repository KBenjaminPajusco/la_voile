import { J80_PROFILE as P } from '../src/sim/boatProfile';
import { optimiseTrim, steadyState, NEUTRAL_UPWIND, DEFAULT_PLAN } from '../src/sim/physics';
const t0 = Date.now();
for (const tws of [6, 10, 14, 18, 22]) {
  for (const twa of [40, 45, 60, 90]) {
    const o = optimiseTrim(P, { tws, twa, sea: 0 });
    const r = o.result;
    const c = o.controls;
    console.log(`TWS ${tws} TWA ${twa}: V ${r.v.toFixed(2)} heel ${r.heel.toFixed(1)} rud ${r.f.rudder.toFixed(1)} lee ${r.f.leeway.toFixed(1)} AWA ${r.f.awa.toFixed(1)} vmg ${r.vmg.toFixed(2)} | js ${c.jibSheet.toFixed(2)} ms ${c.mainSheet.toFixed(2)} tr ${c.traveller.toFixed(2)} ld ${c.jibLead.toFixed(2)} hy ${c.jibHalyard.toFixed(2)} bs ${c.backstay.toFixed(2)} vg ${c.vang.toFixed(2)} oh ${c.outhaul.toFixed(2)} cu ${c.cunningham.toFixed(2)} hk ${c.hike.toFixed(2)} | jEff ${r.f.jib.efficiency.toFixed(2)} mEff ${r.f.main.efficiency.toFixed(2)} slot ${r.f.shapes.slot.toFixed(1)}`);
  }
}
for (const tws of [8, 14, 20]) for (const twa of [110, 135, 150]) {
  const plan = { ...DEFAULT_PLAN, headsail: 'gennaker' as const };
  const o = optimiseTrim(P, { tws, twa, sea: 0 }, plan);
  const r = o.result; const c = o.controls;
  console.log(`GEN TWS ${tws} TWA ${twa}: V ${r.v.toFixed(2)} heel ${r.heel.toFixed(1)} rud ${r.f.rudder.toFixed(1)} AWA ${r.f.awa.toFixed(1)} vmg ${r.vmg.toFixed(2)} | js ${c.jibSheet.toFixed(2)} ms ${c.mainSheet.toFixed(2)} vg ${c.vang.toFixed(2)} hk ${c.hike.toFixed(2)}`);
}
console.log('ms', Date.now() - t0);
const s = steadyState(P, NEUTRAL_UPWIND, { tws: 12, twa: 42, sea: 0 });
console.log('neutral 12/42', s.v.toFixed(2), s.heel.toFixed(1));
