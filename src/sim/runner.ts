// Scenario runner: wraps a Simulator, executes a scenario script (timed or conditional
// steps), keeps marks for evaluation, and produces a scored debrief.
import type { SkillKey } from '../content/types';
import type { ControlKey } from '../content/types';
import { Simulator, type SimConfig } from './engine';
import { standardMetrics, type EvalGroup, type StandardMetrics } from './scoring';
import type { Sample, ActionLog } from './engine';

export interface RunContext {
  sim: Simulator;
  marks: Record<string, number>;
  mark: (name: string) => void;
  data: Record<string, number | string | boolean>;
  prompt: (text: string, tone?: 'info' | 'warn' | 'alarm' | 'good', ttl?: number) => void;
  end: (reason?: string) => void;
}

export interface ScriptStep {
  at?: number;
  when?: (ctx: RunContext) => boolean;
  run: (ctx: RunContext) => void;
}

export interface EvalCtx {
  sim: Simulator;
  tel: Sample[];
  actions: ActionLog[];
  marks: Record<string, number>;
  data: Record<string, number | string | boolean>;
  std: StandardMetrics;
}

export interface CriterionResult {
  score: number; // 0..100
  note: string;
}

export interface Criterion {
  id: string;
  group: EvalGroup;
  label: string;
  weight: number;
  evaluate: (ctx: EvalCtx) => CriterionResult;
}

export interface ScenarioDef {
  id: string;
  mode: 'situation' | 'maneuver' | 'race';
  title: string;
  subtitle: string;
  level: number;
  skills: SkillKey[];
  pressure: 1 | 2 | 3;
  duration: number; // s (sim time)
  brief: string;
  task: string;
  focusControls: ControlKey[];
  config: () => SimConfig;
  script: ScriptStep[];
  /** Called every simulation step (dynamic scenarios such as the match race). */
  onStep?: (ctx: RunContext, dt: number) => void;
  /** Extra head-up display items. */
  hud?: (ctx: RunContext) => { label: string; value: string; tone?: 'good' | 'warn' | 'alarm' | 'info' }[];
  criteria: Criterion[];
  expectedAdjustments: number;
  energyBudget: number;
  /** Seconds at the start excluded from standard metrics (initial settling). */
  evalFrom?: number;
  debrief: { physics: string; ideal: string[]; commonErrors: string[] };
  hints: string[];
  /** Timeline sequence of expected events shown before start. */
  sequence?: { t: string; what: string }[];
}

export interface CriterionRow extends CriterionResult {
  id: string;
  group: EvalGroup;
  label: string;
  weight: number;
}

export interface RunResult {
  scenarioId: string;
  score: number;
  rows: CriterionRow[];
  groups: { group: EvalGroup; score: number }[];
  std: StandardMetrics;
  tel: Sample[];
  actions: ActionLog[];
  marks: Record<string, number>;
  endReason?: string;
}

export interface Prompt {
  t: number;
  text: string;
  tone: 'info' | 'warn' | 'alarm' | 'good';
  ttl: number;
}

export class ScenarioRunner {
  def: ScenarioDef;
  sim: Simulator;
  marks: Record<string, number> = {};
  data: Record<string, number | string | boolean> = {};
  prompts: Prompt[] = [];
  finished = false;
  endReason?: string;
  private fired = new Set<number>();
  private ctx: RunContext;

  constructor(def: ScenarioDef) {
    this.def = def;
    this.sim = new Simulator(def.config());
    this.ctx = {
      sim: this.sim,
      marks: this.marks,
      data: this.data,
      mark: (n) => {
        if (this.marks[n] === undefined) this.marks[n] = this.sim.t;
      },
      prompt: (text, tone = 'info', ttl = 5) => this.prompts.push({ t: this.sim.t, text, tone, ttl }),
      end: (reason) => {
        this.finished = true;
        this.endReason = reason;
      },
    };
  }

  step(dt: number) {
    if (this.finished) return;
    this.sim.step(dt);
    this.def.onStep?.(this.ctx, dt);
    this.def.script.forEach((s, i) => {
      if (this.fired.has(i)) return;
      const timeOk = s.at === undefined || this.sim.t >= s.at;
      if (!timeOk) return;
      if (s.when && !s.when(this.ctx)) return;
      this.fired.add(i);
      s.run(this.ctx);
    });
    if (this.sim.t >= this.def.duration) this.finished = true;
  }

  hud() {
    return this.def.hud?.(this.ctx) ?? [];
  }

  activePrompts() {
    return this.prompts.filter((p) => this.sim.t - p.t < p.ttl);
  }

  evaluate(): RunResult {
    const std = standardMetrics(this.sim, {
      t0: this.def.evalFrom ?? 0,
      expectedAdjustments: this.def.expectedAdjustments,
      energyBudget: this.def.energyBudget,
    });
    const ctx: EvalCtx = {
      sim: this.sim,
      tel: this.sim.telemetry,
      actions: this.sim.actions,
      marks: this.marks,
      data: this.data,
      std,
    };
    const rows: CriterionRow[] = this.def.criteria.map((c) => {
      let r: CriterionResult;
      try {
        r = c.evaluate(ctx);
      } catch {
        r = { score: 0, note: 'Could not evaluate.' };
      }
      return { id: c.id, group: c.group, label: c.label, weight: c.weight, score: Math.round(Math.max(0, Math.min(100, r.score))), note: r.note };
    });
    const tw = rows.reduce((a, r) => a + r.weight, 0) || 1;
    const score = Math.round(rows.reduce((a, r) => a + r.score * r.weight, 0) / tw);
    const gm = new Map<EvalGroup, { s: number; w: number }>();
    rows.forEach((r) => {
      const g = gm.get(r.group) ?? { s: 0, w: 0 };
      g.s += r.score * r.weight;
      g.w += r.weight;
      gm.set(r.group, g);
    });
    const groups = [...gm.entries()].map(([group, g]) => ({ group, score: Math.round(g.s / g.w) }));
    return { scenarioId: this.def.id, score, rows, groups, std, tel: this.sim.telemetry, actions: this.sim.actions, marks: this.marks, endReason: this.endReason };
  }
}
