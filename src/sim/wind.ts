// Wind model: base wind + scripted gusts/lulls/shifts + coloured noise (Ornstein–Uhlenbeck).
import { gaussian, mulberry32, type Rand } from './rng';

export interface WindEvent {
  kind: 'gust' | 'lull' | 'shift';
  start: number; // s
  ramp: number; // s to reach full strength
  hold: number; // s at full strength
  /** gust/lull: knots delta; shift: degrees (+ = veer / clockwise) */
  amount: number;
  /** shifts are persistent unless `revert` */
  revert?: boolean;
  label?: string;
}

export interface WindConfig {
  tws: number;
  twd: number; // deg, direction the wind comes FROM
  gustiness: number; // 0..1 noise amplitude
  shiftiness: number; // 0..1 direction noise
  seed: number;
  events: WindEvent[];
}

export interface WindSample {
  tws: number;
  twd: number;
  gustLevel: number; // scripted delta currently applied (kn)
  activeEvent?: WindEvent;
}

export class WindModel {
  cfg: WindConfig;
  private rand: Rand;
  private nSpeed = 0;
  private nDir = 0;
  constructor(cfg: WindConfig) {
    this.cfg = cfg;
    this.rand = mulberry32(cfg.seed);
  }

  /** Scripted contribution of an event at time t. */
  static envelope(e: WindEvent, t: number): number {
    const t0 = t - e.start;
    if (t0 <= 0) return 0;
    if (t0 < e.ramp) return t0 / e.ramp;
    if (e.kind === 'shift' && !e.revert) return 1;
    if (t0 < e.ramp + e.hold) return 1;
    const tail = t0 - e.ramp - e.hold;
    if (tail < e.ramp * 1.5) return 1 - tail / (e.ramp * 1.5);
    return 0;
  }

  step(t: number, dt: number): WindSample {
    // OU noise: tau 7 s for speed, 25 s for direction
    const tauS = 7;
    const tauD = 25;
    this.nSpeed += (-this.nSpeed / tauS) * dt + Math.sqrt((2 * dt) / tauS) * gaussian(this.rand);
    this.nDir += (-this.nDir / tauD) * dt + Math.sqrt((2 * dt) / tauD) * gaussian(this.rand);
    let tws = this.cfg.tws * (1 + 0.07 * this.cfg.gustiness * this.nSpeed);
    let twd = this.cfg.twd + 4 * this.cfg.shiftiness * this.nDir;
    let gustLevel = 0;
    let activeEvent: WindEvent | undefined;
    for (const e of this.cfg.events) {
      const k = WindModel.envelope(e, t);
      if (k <= 0) continue;
      if (e.kind === 'shift') twd += e.amount * k;
      else {
        const d = e.kind === 'gust' ? Math.abs(e.amount) : -Math.abs(e.amount);
        tws += d * k;
        gustLevel += d * k;
      }
      if (k > 0.05 && e.kind !== 'shift') activeEvent = e;
      else if (k > 0.05 && e.kind === 'shift' && t - e.start < e.ramp + 4) activeEvent = e;
    }
    return { tws: Math.max(0.5, tws), twd, gustLevel, activeEvent };
  }

  /**
   * The wind still to come, EXACTLY: a copy of this model (same noise state) stepped forward with
   * the same dt the simulation uses. This is what puts the puffs on the water before they arrive.
   */
  forecast(t: number, horizon: number, dt: number, every: number): { t: number; tws: number; twd: number }[] {
    const c = new WindModel(this.cfg);
    c.nSpeed = this.nSpeed;
    c.nDir = this.nDir;
    c.rand.st.a = this.rand.st.a;
    const out: { t: number; tws: number; twd: number }[] = [];
    let next = t + every;
    const n = Math.round(horizon / dt);
    let tt = t;
    for (let i = 0; i < n; i++) {
      tt += dt;
      const w = c.step(tt, dt);
      if (tt >= next - 1e-6) {
        out.push({ t: tt, tws: w.tws, twd: w.twd });
        next += every;
      }
    }
    return out;
  }

  /** Look-ahead: the next scripted event the crew could see on the water ("pressure on the water"). */
  upcoming(t: number, horizon = 8): WindEvent | undefined {
    return this.cfg.events.find((e) => e.start > t && e.start - t < horizon);
  }
}
