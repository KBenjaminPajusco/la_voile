import type React from 'react';
// 3D trimmer's-eye view. Owns a WebGL canvas and a TrimmerScene; reads the live simulator in
// its own animation loop and overlays a compact reading of telltales and sail forces.
import { useEffect, useRef, useState } from 'react';
import { Anchor, Bot, ChevronLeft, ChevronRight, Eye, Gamepad2, Gauge, Hand, Maximize2, Minimize2, MoveDiagonal, ScanEye, Waves } from 'lucide-react';
import type { ControlKey } from '../content/types';
import { CONTROL_RATES } from '../sim/engine';
import { bestVmgAngle, optimalControls } from '../sim/polar';
import type { Snapshot } from '../sim/engine';
import { HANDLE_DEFS, TrimmerScene, telltaleDrive, type CamView, type HandleId } from '../three/TrimmerScene';
import { L } from '../i18n';

const VIEWS: { id: CamView; label: string }[] = [
  { id: 'trimmer', label: L('Trimmer', 'Régleur') },
  { id: 'leeward', label: L('Leeward', 'Sous le vent') },
  { id: 'main', label: L('Main', 'GV') },
  { id: 'helm', label: L('Helm', 'Barreur') },
  { id: 'chase', label: L('Chase', 'Poursuite') },
  { id: 'astern', label: L('Astern', 'Arrière') },
];

function readTT(snap: Snapshot) {
  const f = snap.f;
  if (snap.plan.headsail === 'gennaker') {
    // the kite is read from its luff curl: ease until it curls, then trim back a touch
    const c = snap.kiteCurl ?? 0;
    const rows = [{ row: L('Kite', 'Spi'), lift: 0, stall: 0, flog: 0, curl: c, over: snap.kiteOver ?? 0, collapsed: snap.plan.gennakerCollapsed }];
    if ((snap.kiteLeechFlap ?? 0) > 0.2) rows.push({ row: L('Main', 'GV'), lift: 0, stall: 0, flog: 0, curl: (snap.kiteLuffFlap ?? 0) > 0.2 ? -1 : -2, over: 0, collapsed: false });
    if ((snap.kiteMainBackwind ?? 0) > 0.2) rows.push({ row: L('Main', 'GV'), lift: 0, stall: 0, flog: 0, curl: -3, over: 0, collapsed: false });
    return rows;
  }
  return [...f.jib.sections].reverse().map((s, i) => ({ row: [L('Top', 'Haut'), L('Mid', 'Milieu'), L('Low', 'Bas')][i], ...telltaleDrive(s, f.shapes.jib.groove) }));
}

function ttWord(d: { lift: number; stall: number; flog: number; curl?: number; over?: number; collapsed?: boolean }, released: boolean) {
  if (d.curl === -2) return { t: L('kite leech fluttering: trim the main a little', 'chute du spi qui faseye : bordez un peu la GV'), c: 'text-warn' };
  if (d.curl === -1) return { t: L('kite leech + luff fluttering: main well too eased, trim it', 'chute + guindant du spi qui faseyent : GV bien trop choquée, bordez-la'), c: 'text-warn' };
  if (d.curl === -3) return { t: L('main luff backwinded by the kite: ease the main', 'guindant de GV déventé par le spi : choquez la GV'), c: 'text-warn' };
  if (d.curl !== undefined) {
    if (d.collapsed) return { t: L('collapsed — trim, trim, trim', 'fermé — bordez, bordez, bordez'), c: 'text-alarm' };
    if (d.curl > 0.9) return { t: L('luff folding over — trim now', 'le guindant se replie — bordez vite'), c: 'text-alarm' };
    if (d.curl > 0.35) return { t: L('curling hard — trim a little', 'le guindant casse fort — bordez un peu'), c: 'text-warn' };
    if (d.curl > 0.02) return { t: L('small curl — perfect, hold it', 'le guindant roule un peu — parfait, tenez'), c: 'text-good' };
    if ((d.over ?? 0) > 0.3) return { t: L('over-trimmed — ease', 'trop bordé — choquez'), c: 'text-alarm' };
    return { t: L('no curl — ease until it curls', 'le guindant ne roule pas — choquez jusqu’à ce qu’il roule'), c: 'text-cyan-300' };
  }
  if (released || d.flog > 0.5) return { t: L('flogging', 'ils battent'), c: 'text-slate-400' };
  if (d.lift > 0.25) return { t: d.lift > 0.6 ? L('windward spinning — trim / bear off', 'au vent qui tournent — bordez / abattez') : L('windward lifting', 'au vent qui se lèvent'), c: 'text-warn' };
  if (d.stall > 0.25) return { t: d.stall > 0.6 ? L('leeward stalled — ease / head up', 'sous le vent décrochés — choquez / lofez') : L('leeward drooping', 'sous le vent qui retombent'), c: 'text-alarm' };
  return { t: L('both streaming', 'les deux volent bien'), c: 'text-good' };
}

function forceLine(drive: number, side: number) {
  const tot = Math.hypot(drive, side) || 1;
  return { drive, side, pctDrive: Math.round((Math.max(0, drive) / tot) * 100), angle: Math.round((Math.atan2(side, drive) * 180) / Math.PI) };
}

export interface SnapSource {
  sea: number;
  snapshot(): Snapshot;
  /** present on the live simulator: lets the 3D handles move the controls */
  setTarget?: (key: ControlKey, value: number, label?: string) => void;
  /** auto crew (sails trimmed for you) + you steer */
  setAuto?: (on: boolean) => void;
  setHelmCmd?: (x: number) => void;
  /** game mode: catch a control from the auto crew / give it back */
  setAutoKey?: (key: ControlKey, auto: boolean) => void;
}

const HUD_CONTROLS: ControlKey[] = ['jibSheet', 'jibLead', 'jibHalyard', 'mainSheet', 'traveller', 'vang', 'outhaul', 'cunningham', 'backstay', 'hike'];

export default function Boat3DView({
  getSim,
  snap,
  height = 520,
  initialView = 'trimmer',
  initialForces = false,
  keys = true,
  coach = true,
  readout = true,
  assist = false,
  handleKeys,
  overlay,
  compact = false,
}: {
  getSim: () => SnapSource;
  snap: Snapshot;
  height?: number;
  initialView?: CamView;
  initialForces?: boolean;
  /** V/F/B keyboard shortcuts */
  keys?: boolean;
  /** coaching overlays (telltale reading, kite advice, roll warning). Off in the quiz: they give the answer away. */
  coach?: boolean;
  /** the telltale / heel reading box in the corner (off when the 2D telltales are shown beside the view) */
  readout?: boolean;
  /** free practice: offer the Stabilise assist (all controls to the polar's optimum) */
  assist?: boolean;
  /** only these controls get a 3D handle */
  handleKeys?: ControlKey[];
  /** extra UI drawn over the view (easy-mode coach card) - stays visible in full screen */
  overlay?: React.ReactNode;
  /** half-width view (two side by side): icon-only toggles */
  compact?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<TrimmerScene | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CamView>(initialView);
  const [forces, setForces] = useState(initialForces);
  // a new situation (quiz question) brings its own camera and overlay
  useEffect(() => setView(initialView), [initialView]);
  useEffect(() => setForces(initialForces), [initialForces]);
  const [xray, setXray] = useState(false);
  const [inertia, setInertia] = useState(true);
  const [full, setFull] = useState(false);
  const [handles, setHandles] = useState(true);
  const [hudOn, setHudOn] = useState(false);
  /** GAME mode: auto crew on every control, helm on the mouse's X, click a handle to catch it */
  const [game, setGame] = useState(false);
  /** game mode: the control selected for click-anywhere trim (left) / ease (right) */
  const [selected, setSelected] = useState<HandleId | null>(null);
  const selectedRef = useRef<HandleId | null>(null);
  selectedRef.current = selected;
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.hoverHandle = selected;
  }, [selected]);
  useEffect(() => {
    if (!game) setSelected(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [game]);
  const gameRef = useRef(false);
  gameRef.current = game;
  const [hover, setHover] = useState<{ id: HandleId; x: number; y: number } | null>(null);
  const grab = useRef<{ id: HandleId; key: ControlKey; value: number; sent: number; dir: number } | null>(null);
  const getSimRef = useRef(getSim);
  getSimRef.current = getSim;

  // ---- scene lifecycle + render loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    let scene: TrimmerScene;
    try {
      scene = new TrimmerScene(canvas);
    } catch (e) {
      setError(L('WebGL is not available in this browser — the 2D views still work.', 'WebGL n’est pas disponible dans ce navigateur — les vues 2D fonctionnent toujours.'));
      return;
    }
    sceneRef.current = scene;
    if ((import.meta as any).env?.DEV) Object.assign(window as any, { __tmScene: scene, __tmSim: () => getSimRef.current() });
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      scene.resize(Math.max(1, r.width), Math.max(1, r.height));
    });
    ro.observe(canvas);
    let raf = 0;
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      try {
        const sim = getSimRef.current();
        scene.setSeaLevel(sim.sea);
        scene.render(sim.snapshot(), dt);
      } catch (e) {
        console.error(e);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) Object.assign(sceneRef.current.opts, { view, forces, xray, inertia, handles: handles && !!getSim().setTarget, handleKeys });
  }, [view, forces, xray, inertia, handles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Stabilise assist: every control to the optimum for the present wind and angle. The
  // winches and the crew still take their time, so you watch the boat settle.
  const stabilise = () => {
    const sim = getSimRef.current();
    if (!sim.setTarget) return;
    const sn = sim.snapshot();
    const o = optimalControls(sn.tws, Math.abs(sn.twa), sn.plan.headsail);
    for (const k of HUD_CONTROLS) sim.setTarget(k, o[k], L('Stabilise (assist)', 'Stabiliser (assistance)'));
  };
  const stabiliseRef = useRef(stabilise);
  stabiliseRef.current = stabilise;

  // ---- auto crew + steering: arrows turn the bow (Shift = harder); on-screen buttons too
  const auto = !!snap.autoTrim;
  useEffect(() => {
    if (!auto && game) setGame(false);
  }, [auto]); // eslint-disable-line react-hooks/exhaustive-deps
  const steer = useRef({ left: false, right: false, hard: false });
  const pushHelm = () => {
    const st = steer.current;
    const x = (st.right ? 1 : 0) - (st.left ? 1 : 0);
    getSimRef.current().setHelmCmd?.(x * (st.hard ? 1 : 0.45));
  };
  useEffect(() => {
    if (!auto) return;
    const down = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') steer.current.left = true;
      else steer.current.right = true;
      steer.current.hard = e.shiftKey;
      pushHelm();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') steer.current.left = false;
      else if (e.key === 'ArrowRight') steer.current.right = false;
      else if (e.key === 'Shift') steer.current.hard = false;
      else return;
      pushHelm();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      steer.current = { left: false, right: false, hard: false };
      getSimRef.current().setHelmCmd?.(0);
    };
  }, [auto]); // eslint-disable-line react-hooks/exhaustive-deps
  const holdSteer = (side: 'left' | 'right', on: boolean) => {
    steer.current[side] = on;
    steer.current.hard = false;
    pushHelm();
  };

  // ---- keyboard: V view, F forces, B x-ray, P stabilise
  useEffect(() => {
    if (!keys) return;
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') return;
      const k = e.key.toLowerCase();
      if (k === 'v') setView((v) => VIEWS[(VIEWS.findIndex((x) => x.id === v) + 1) % VIEWS.length].id);
      else if (k === 'f') setForces((x) => !x);
      else if (k === 'b') setXray((x) => !x);
      else if (k === 'p' && assist) stabiliseRef.current();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [keys, assist]);

  // ---- fullscreen
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else wrapRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  // ---- pointer: grab a 3D handle if there is one under the pointer, otherwise look around
  const drag = useRef<{ x: number; y: number } | null>(null);
  const ndc = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1, w: r.width, h: r.height, px: e.clientX - r.left, py: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent) => {
    const sc = sceneRef.current;
    const sim = getSimRef.current();
    // GAME: click a handle to SELECT that control (it is yours from then on). Then click and hold
    // ANYWHERE: left = trim, right = ease, while the mouse X keeps steering. Clicking the selected
    // handle again (or Esc) deselects; double-click a handle (or its chip) gives it back to the crew.
    if (gameRef.current && sc) {
      const n = ndc(e);
      const id = sc.pickHandle(n.x, n.y);
      if (id && e.button === 0) {
        if (selectedRef.current === id) setSelected(null);
        else {
          sim.setAutoKey?.(HANDLE_DEFS[id].key, false);
          setSelected(id);
        }
        return;
      }
      const sel = selectedRef.current;
      if (sel) {
        const key = HANDLE_DEFS[sel].key;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const sn = sim.snapshot();
        holdRef.current = { id: sel, key, dir: e.button === 2 ? -1 : 1, value: sn.targets[key] };
        sc.gauge = { id: sel, target: holdRef.current.value, opt: optimalControls(sn.tws, Math.abs(sn.twa), sn.plan.headsail)[key] };
      }
      return; // no look-around drag in game mode: the mouse is the tiller
    }
    if (e.button === 2) return;
    drag.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (sc && sim.setTarget) {
      const n = ndc(e);
      const id = sc.pickHandle(n.x, n.y);
      if (id) {
        const key = HANDLE_DEFS[id].key;
        const v = sim.snapshot().targets[key];
        grab.current = { id, key, value: v, sent: v, dir: 0 };
        sc.hoverHandle = id;
        const sn = sim.snapshot();
        sc.gauge = { id, target: v, opt: optimalControls(sn.tws, Math.abs(sn.twa), sn.plan.headsail)[key] };
        setHover({ id, x: n.px, y: n.py });
      }
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const sc = sceneRef.current;
    if (!sc) return;
    const n = ndc(e);
    if (!drag.current) {
      // hover highlight
      const id = getSimRef.current().setTarget ? sc.pickHandle(n.x, n.y) : null;
      sc.hoverHandle = id ?? selectedRef.current;
      setHover((h) => (id ? { id, x: n.px, y: n.py } : h && !grab.current ? null : h));
      // game mode: the mouse's X is the tiller (centre = straight); over a handle the helm holds
      if (gameRef.current) {
        const off = n.x; // -1 .. 1 across the view
        const dz = 0.08;
        const cmd = id ? 0 : Math.sign(off) * Math.min(1, Math.max(0, (Math.abs(off) - dz) / 0.6));
        getSimRef.current().setHelmCmd?.(cmd);
      }
      return;
    }
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    const g = grab.current;
    if (g) {
      g.value = Math.max(0, Math.min(1, g.value + sc.handleDelta(g.id, dx, dy, n.w, n.h)));
      if (sc.gauge) sc.gauge.target = g.value;
      // send in 1 % steps, with a little hysteresis on direction changes so a wobbly hand
      // does not log trim/ease reversals
      const d = g.value - g.sent;
      const dir = Math.sign(d);
      if (Math.abs(d) >= (g.dir !== 0 && dir !== g.dir ? 0.025 : 0.01)) {
        getSimRef.current().setTarget?.(g.key, g.value, `${HANDLE_DEFS[g.id].label} (3D)`);
        g.sent = g.value;
        g.dir = dir;
      }
      setHover({ id: g.id, x: n.px, y: n.py });
      return;
    }
    sc.look.yaw -= dx * 0.004;
    sc.look.pitch = Math.max(-1.2, Math.min(1.2, sc.look.pitch - dy * 0.004));
  };
  // game: the held handle keeps moving its control while the button is down
  const holdRef = useRef<{ id: HandleId; key: ControlKey; dir: number; value: number } | null>(null);
  useEffect(() => {
    if (!game) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const h = holdRef.current;
      if (!h) return;
      h.value = Math.max(0, Math.min(1, h.value + h.dir * 0.33 * dt));
      getSimRef.current().setTarget?.(h.key, h.value, `${HANDLE_DEFS[h.id].label} (${h.dir > 0 ? L('trim', 'border') : L('ease', 'choquer')})`);
      if (sceneRef.current?.gauge) sceneRef.current.gauge.target = h.value;
    }, 50);
    return () => window.clearInterval(id);
  }, [game]);
  const onUp = () => {
    if (holdRef.current) {
      holdRef.current = null;
      if (sceneRef.current) sceneRef.current.gauge = null;
    }
    drag.current = null;
    const g = grab.current;
    if (g && Math.abs(g.value - g.sent) > 1e-3) getSimRef.current().setTarget?.(g.key, g.value, `${HANDLE_DEFS[g.id].label} (3D)`);
    grab.current = null;
    if (sceneRef.current) sceneRef.current.gauge = null;
  };
  const resetLook = () => {
    const sc = sceneRef.current;
    if (sc) Object.assign(sc.look, { yaw: 0, pitch: 0, fov: 72, dolly: 0 });
  };
  const onWheel = (e: React.WheelEvent) => {
    const sc = sceneRef.current;
    if (!sc) return;
    // wheel: zoom in with the lens, zoom out by stepping back (up to ~16 m) to see every handle;
    // ctrl + wheel always changes the lens
    if (e.ctrlKey) sc.look.fov = Math.max(28, Math.min(95, sc.look.fov + e.deltaY * 0.03));
    else if (e.deltaY > 0) {
      if (sc.look.fov < 72) sc.look.fov = Math.min(72, sc.look.fov + e.deltaY * 0.03);
      else sc.look.dolly = Math.min(16, sc.look.dolly + e.deltaY * 0.01);
    } else {
      if (sc.look.dolly > 0) sc.look.dolly = Math.max(0, sc.look.dolly + e.deltaY * 0.01);
      else sc.look.fov = Math.max(28, sc.look.fov + e.deltaY * 0.03);
    }
  };

  const f = snap.f;
  const kite = snap.plan.headsail === 'gennaker';
  const tts = readTT(snap);
  const head = kite ? forceLine(f.gennaker?.drive ?? 0, f.gennaker?.side ?? 0) : forceLine(f.jib.drive, f.jib.side);
  const main = forceLine(f.main.drive, f.main.side);
  const heelRatio = f.rightingMoment > 0 ? f.heelMoment / f.rightingMoment : 0;
  let kiteNote = '';
  if (kite && f.gennaker) {
    if (snap.plan.gennakerCollapsed) kiteNote = L('Kite collapsed: trim hard and call for a bear-away until it fills.', 'Spi fermé : bordez fort et demandez d’abattre jusqu’à ce qu’il se regonfle.');
    else if (head.pctDrive < 62 && Math.abs(snap.heel) > 8) kiteNote = L('The kite pulls mostly SIDEWAYS here, so pressure turns into heel. In a puff, bear away: as the angle opens the same pull swings forward. Go deep as long as the heel holds, and come back up when it fades.', 'Le spi tire surtout LATÉRALEMENT ici : la pression devient de la gîte. Dans une risée, abattez : en ouvrant l’angle, la même traction bascule vers l’avant. Descendez tant que la gîte tient, et remontez quand elle retombe.');
    else if (head.pctDrive >= 75 && f.jibSheetLoad > 450) kiteNote = L('The kite pulls mostly FORWARD. The sheet is heavy but it drives speed, not heel, so the boat stays flat. Do not over-sheet to "feel" it: ease until the luff curls.', 'Le spi tire surtout VERS L’AVANT. L’écoute est chargée mais cela donne de la vitesse, pas de la gîte : le bateau reste à plat. Ne surbordez pas pour « sentir » : choquez jusqu’à ce que le guindant roule.');
    else kiteNote = L('Balanced reach: keep a small curl on the luff. Heel and helm tell you when to ask the helm to go deeper.', 'Largue équilibré : gardez le guindant qui roule un peu. La gîte et la barre vous disent quand demander au barreur de descendre.');
  }
  const rollWarn = snap.rollDamping < 0.45;

  return (
    <div ref={wrapRef} className={`relative w-full overflow-hidden rounded-lg border border-cyan-300/15 bg-navy-950 ${full ? '!rounded-none' : ''}`} style={{ height: full ? '100vh' : height }}>
      {overlay && <div className="absolute left-1/2 top-12 z-20 w-[min(560px,92%)] -translate-x-1/2">{overlay}</div>}
      <canvas
        ref={canvasRef}
        className={`block h-full w-full touch-none ${hover ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => gameRef.current && getSimRef.current().setHelmCmd?.(0)}
        onContextMenu={(e) => game && e.preventDefault()}
        onDoubleClick={(e) => {
          // game: double-click a handle to hand its control back to the auto crew
          const sc = sceneRef.current;
          if (gameRef.current && sc) {
            const r = canvasRef.current!.getBoundingClientRect();
            const id = sc.pickHandle(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
            if (id) {
              if (selectedRef.current === id) setSelected(null);
              return getSimRef.current().setAutoKey?.(HANDLE_DEFS[id].key, true);
            }
          }
          resetLook();
        }}
        onWheel={onWheel}
      />
      {error && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-300">{error}</div>}

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto flex flex-wrap gap-1 rounded-md bg-navy-950/70 p-1 backdrop-blur">
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} className={`rounded ${compact ? 'px-1.5 text-[11px]' : 'px-2 text-xs'} py-1 ${view === v.id ? 'bg-cyan-400/25 text-cyan-100' : 'text-slate-300 hover:text-white'}`}>
              {v.label}
            </button>
          ))}
          <span className="mx-1 w-px bg-cyan-300/20" />
          <button onClick={() => setForces((x) => !x)} title={L('Force arrows (F)', 'Flèches de forces (F)')} className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${forces ? 'bg-amber-400/25 text-amber-100' : 'text-slate-300 hover:text-white'}`}>
            <MoveDiagonal size={12} /> {!compact && L('Forces', 'Forces')}
          </button>
          <button onClick={() => setXray((x) => !x)} title={L('See-through jib (B)', 'Foc transparent (B)')} className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${xray ? 'bg-cyan-400/25 text-cyan-100' : 'text-slate-300 hover:text-white'}`}>
            <ScanEye size={12} /> {!compact && L('X-ray jib', 'Foc transparent')}
          </button>
          <button onClick={() => setInertia((x) => !x)} title={L('Head inertia: the eye lags the boat so you feel acceleration and heel', 'Inertie de la tête : le regard suit le bateau avec retard pour ressentir accélération et gîte')} className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${inertia ? 'bg-cyan-400/25 text-cyan-100' : 'text-slate-300 hover:text-white'}`}>
            <Waves size={12} /> {!compact && L('Inertia', 'Inertie')}
          </button>
          {getSim().setTarget && (
            <button onClick={() => setHandles((x) => !x)} title={L('Grab the trim controls in 3D: jib car, clew, winch, halyard, forestay, mainsheet, traveller, vang, outhaul, cunningham, kite sheet', 'Saisissez les réglages en 3D : chariot de foc, point d’écoute, winch, drisse, étai, écoute de GV, chariot de GV, hale-bas, bordure, cunningham, écoute de spi')} className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${handles ? 'bg-cyan-400/25 text-cyan-100' : 'text-slate-300 hover:text-white'}`}>
              <Hand size={12} /> {!compact && L('Handles', 'Poignées')}
            </button>
          )}
          {assist && getSim().setAutoKey && (
            <button
              onClick={() => {
                const on = !game;
                setGame(on);
                getSim().setAuto?.(on);
                if (on) {
                  setHandles(true);
                  if (!document.fullscreenElement) wrapRef.current?.requestFullscreen?.().catch(() => undefined);
                }
              }}
              title={L('Game mode (full screen): every control on auto, the mouse X steers (centre = straight). Hold LEFT click on a handle to trim it, RIGHT click to ease it - that control is then yours. Double-click the handle (or its chip) to give it back to the crew.', 'Mode jeu (plein écran) : tous les réglages en auto, le X de la souris barre (centre = tout droit). Maintenez le clic GAUCHE sur une poignée pour border, clic DROIT pour choquer - ce réglage est alors à vous. Double-cliquez la poignée (ou sa pastille) pour le rendre à l’équipage.')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${game ? 'bg-orange-500/30 text-orange-100' : 'text-slate-300 hover:text-white'}`}
            >
              <Gamepad2 size={12} /> {L('Game', 'Jeu')}
            </button>
          )}
          {assist && getSim().setAuto && !game && (
            <button onClick={() => getSim().setAuto?.(!auto)} title={L('Auto crew: the sails are trimmed to the optimum for you (and the sheets handled in tacks, gybes, hoists and drops). You steer with the arrow keys.', 'Équipage auto : les voiles sont réglées à l’optimum pour vous (et les écoutes gérées aux virements, empannages, envois et affalages). Vous barrez avec les flèches.')} className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${auto ? 'bg-good/25 text-good' : 'text-slate-300 hover:text-white'}`}>
              <Bot size={12} /> {L('Auto crew', 'Équipage auto')}{auto ? L(' · you steer', ' · vous barrez') : ''}
            </button>
          )}
          {assist && getSim().setTarget && (
            <button onClick={stabilise} title={L('Stabilise (P): every control to the optimum trim for this wind and angle. An assist: watch how the boat settles, then find it yourself.', 'Stabiliser (P) : chaque réglage à l’optimum pour ce vent et cet angle. Une aide : regardez le bateau se poser, puis retrouvez-le vous-même.')} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-good hover:bg-good/15">
              <Anchor size={12} /> {L('Stabilise', 'Stabiliser')}
            </button>
          )}
          <button onClick={() => setHudOn((x) => !x)} title={L('Instrument HUD (always on in full screen)', 'HUD instruments (toujours affiché en plein écran)')} className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${hudOn || full ? 'bg-cyan-400/25 text-cyan-100' : 'text-slate-300 hover:text-white'}`}>
            <Gauge size={12} /> {!compact && 'HUD'}
          </button>
        </div>
        <div className="pointer-events-auto flex gap-1 rounded-md bg-navy-950/70 p-1 backdrop-blur">
          <button onClick={resetLook} title={L('Reset look (double-click)', 'Recadrer (double-clic)')} className="rounded px-2 py-1 text-xs text-slate-300 hover:text-white">
            <Eye size={13} />
          </button>
          <button onClick={toggleFull} title={L('Full screen', 'Plein écran')} className="rounded px-2 py-1 text-xs text-slate-300 hover:text-white">
            {full ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* grabbed / hovered handle */}
      {hover && (() => {
        const d = HANDLE_DEFS[hover.id];
        const cur = snap.controls[d.key];
        const tgt = grab.current?.id === hover.id ? grab.current.value : snap.targets[d.key];
        const holding = grab.current?.id === hover.id;
        return (
          <div className="pointer-events-none absolute z-10 -translate-x-1/2 translate-y-4 whitespace-nowrap rounded bg-navy-950/75 px-1.5 py-0.5 text-[10px] text-slate-200" style={{ left: hover.x, top: hover.y }}>
            <span className="text-cyan-100">{d.label}</span>{' '}
            <span className="num">
              {Math.round(cur * 100)}%{Math.abs(tgt - cur) > 0.005 && <span className="text-cyan-300">→{Math.round(tgt * 100)}%</span>}
            </span>
            {holding && d.key === 'jibSheet' && <span className="num text-slate-400"> · {Math.round(snap.f.jibSheetLoad)} N</span>}
            {!holding && <span className="text-slate-500"> · {L('drag', 'glisser')}</span>}
          </div>
        );
      })()}

      {/* game mode: who has each control */}
      {game && (
        <div className="absolute right-2 top-12 flex max-w-[260px] flex-wrap justify-end gap-1 text-[10px]">
          {HUD_CONTROLS.map((k) => {
            const mine = (snap.manualKeys ?? []).includes(k);
            return (
              <button key={k} onClick={() => mine && getSim().setAutoKey?.(k, true)} title={mine ? L('Give it back to the crew', 'Rendre à l’équipage') : L('On auto - hold left/right click on its handle to take it', 'En auto - maintenez clic gauche/droit sur sa poignée pour le prendre')} className={`rounded px-1.5 py-0.5 ${mine ? 'bg-orange-500/80 text-white hover:bg-orange-400' : 'bg-navy-950/70 text-slate-300'}`}>
                {kite && k === 'jibSheet' ? L('Kite sheet', 'Écoute de spi') : CONTROL_RATES[k].label} · {mine ? L('YOU', 'VOUS') : 'auto'}
              </button>
            );
          })}
          {selected && (
            <span className="w-full rounded bg-orange-500/25 px-2 py-1 text-right text-orange-100">
              <b>{kite && HANDLE_DEFS[selected].key === 'jibSheet' ? L('Kite sheet', 'Écoute de spi') : HANDLE_DEFS[selected].label}</b>{' '}
              <span className="num">{Math.round(snap.controls[HANDLE_DEFS[selected].key] * 100)}%</span> · {L('hold LEFT anywhere = trim · RIGHT = ease', 'GAUCHE n’importe où = border · DROIT = choquer')}
            </span>
          )}
          <span className="w-full text-right text-slate-400">{L('mouse X steers · click a handle to select it · Esc deselects · double-click a handle = back to auto', 'X souris = barre · cliquez une poignée pour la choisir · Échap désélectionne · double-clic sur une poignée = retour en auto')}</span>
        </div>
      )}

      {/* the helm: TWA against the best-VMG angle, and press-and-hold steering buttons */}
      {snap.manualHelm && (() => {
        const twa = Math.abs(snap.twa);
        const upw = twa < 95;
        const best = bestVmgAngle(snap.tws, upw).twa;
        const lo = upw ? 25 : 90;
        const hi = upw ? 70 : 180;
        const pos = (x: number) => `${Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100))}%`;
        return (
          <div className="absolute bottom-2 left-1/2 w-[240px] -translate-x-1/2 rounded-md bg-navy-950/80 px-2 py-1.5 text-[11px] backdrop-blur">
            <div className="flex items-center justify-between text-slate-300">
              <span>
                TWA <span className="num text-white">{Math.round(twa)}°</span> {snap.twa > 0 ? L('stbd', 'tribord') : L('port', 'bâbord')}
              </span>
              <span>
                {L('best VMG', 'meilleure VMG')} <span className="num text-good">{Math.round(best)}°</span>
              </span>
              <span>
                <span className={`num ${snap.perf < 0.92 ? 'text-warn' : 'text-white'}`}>{Math.round(snap.perf * 100)}%</span> {L('target', 'cible')}
              </span>
            </div>
            <div className="relative mt-1 h-2 rounded bg-navy-800">
              <div className="absolute -inset-y-1 w-1 -translate-x-1/2 rounded bg-good" style={{ left: pos(best) }} />
              <div className="absolute -inset-y-1.5 w-1.5 -translate-x-1/2 rounded bg-white" style={{ left: pos(twa) }} />
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <button className="btn-ghost flex-1 !py-1 text-xs" onPointerDown={() => holdSteer('left', true)} onPointerUp={() => holdSteer('left', false)} onPointerLeave={() => holdSteer('left', false)}>
                <ChevronLeft size={14} /> {L('port', 'bâbord')}
              </button>
              <span className="whitespace-nowrap text-[10px] text-slate-500">← → · ⇧ {L('harder', 'plus fort')}</span>
              <button className="btn-ghost flex-1 !py-1 text-xs" onPointerDown={() => holdSteer('right', true)} onPointerUp={() => holdSteer('right', false)} onPointerLeave={() => holdSteer('right', false)}>
                {L('stbd', 'tribord')} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* instrument HUD (full screen, or on request) */}
      {(full || hudOn) && (
        <div className="pointer-events-none absolute right-2 top-12 w-[230px] space-y-2 rounded-md bg-navy-950/80 p-2 text-[11px] backdrop-blur">
          <div className="grid grid-cols-3 gap-1 text-center">
            {[
              ['BSP', snap.v.toFixed(2), `${Math.round(snap.perf * 100)}%`],
              ['HEEL', `${snap.heel.toFixed(0)}°`, L(`pitch ${(snap.pitch ?? 0).toFixed(1)}°`, `tangage ${(snap.pitch ?? 0).toFixed(1)}°`)],
              ['VMG', snap.vmg.toFixed(2), L(`tgt ${snap.target.toFixed(2)}`, `cible ${snap.target.toFixed(2)}`)],
              ['TWS', snap.tws.toFixed(1), `TWA ${Math.round(Math.abs(snap.twa))}°`],
              ['AWS', snap.aws.toFixed(1), `AWA ${Math.round(snap.awa)}°`],
              ['RUDDER', `${snap.rudder.toFixed(1)}°`, L(`leeway ${snap.f.leeway.toFixed(1)}°`, `dérive ${snap.f.leeway.toFixed(1)}°`)],
            ].map(([l, v, sub]) => (
              <div key={l} className="rounded bg-navy-900/70 px-1 py-1">
                <div className="text-[9px] uppercase tracking-wider text-slate-400">{l === 'HEEL' ? L('HEEL', 'GÎTE') : l === 'RUDDER' ? L('RUDDER', 'SAFRAN') : l === 'BSP' ? L('BSP', 'VIT') : l}</div>
                <div className={`num text-sm ${l === 'BSP' && snap.perf < 0.9 ? 'text-warn' : l === 'HEEL' && Math.abs(snap.heel) > 26 ? 'text-alarm' : 'text-white'}`}>{v}</div>
                <div className="num text-[9px] text-slate-400">{sub}</div>
              </div>
            ))}
          </div>
          <div className="space-y-0.5">
            {HUD_CONTROLS.map((k) => (
              <div key={k} className="grid grid-cols-[78px_1fr_30px] items-center gap-1">
                <span className="truncate text-slate-400">{kite && k === 'jibSheet' ? L('Kite sheet', 'Écoute de spi') : CONTROL_RATES[k].label}</span>
                <span className="relative h-1.5 rounded bg-navy-900">
                  <span className="absolute inset-y-0 left-0 rounded bg-cyan-400/70" style={{ width: `${snap.controls[k] * 100}%` }} />
                  <span className="absolute -top-0.5 h-2.5 w-0.5 bg-white" style={{ left: `${snap.targets[k] * 100}%` }} />
                </span>
                <span className="num text-right text-white">{Math.round(snap.controls[k] * 100)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-slate-400">
            <span>
              {L('sheet', 'écoute')} <span className="num text-white">{Math.round(snap.f.jibSheetLoad)} N</span>
            </span>
            <span>
              {L('energy', 'énergie')} <span className={`num ${snap.energy < 30 ? 'text-alarm' : 'text-white'}`}>{Math.round(snap.energy)}%</span>
            </span>
            <span className="uppercase">{snap.gear}</span>
          </div>
          {snap.messages.slice(0, 2).map((m, i) => (
            <div key={`${m.t}-${i}`} className={`truncate border-l-2 pl-1 ${m.tone === 'alarm' ? 'border-alarm' : m.tone === 'warn' ? 'border-warn' : 'border-cyan-400/50'}`}>
              <span className="mr-1 uppercase text-slate-400">{m.from}</span>
              <span className="text-slate-100">{m.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* telltale reading */}
      {coach && readout && <div className="pointer-events-none absolute bottom-2 left-2 max-w-[300px] rounded-md bg-navy-950/75 p-2 text-[11px] backdrop-blur">
        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
          {kite ? L('Kite luff', 'Guindant du spi') : L('Jib telltales', 'Penons du foc')}
          <span className="flex items-center gap-1 normal-case tracking-normal">
            <span className="inline-block h-1.5 w-3 rounded bg-red-500" /> {L('port face', 'face bâbord')}
            <span className="ml-1 inline-block h-1.5 w-3 rounded bg-green-500" /> {L('stbd face', 'face tribord')}
          </span>
        </div>
        {tts.map((r) => {
          const w = ttWord(r, snap.plan.jibReleased && !kite);
          return (
            <div key={r.row} className="flex gap-2">
              <span className="w-8 text-slate-400">{r.row}</span>
              <span className={w.c}>{w.t}</span>
            </div>
          );
        })}
        <div className="mt-1 flex gap-3 text-slate-400">
          <span>
            {L('heel', 'gîte')} <span className="num text-white">{snap.heel.toFixed(0)}°</span>
          </span>
          <span>
            {L('pitch', 'tangage')} <span className="num text-white">{(snap.pitch ?? 0).toFixed(1)}°</span>
          </span>
          <span className={rollWarn ? 'text-alarm' : ''}>{L('roll damping', 'amortissement du roulis')} {Math.round((snap.rollDamping ?? 0.9) * 100)}%</span>
        </div>
        {!kite && f.shapes.jibLuffFold > 0.3 && (
          <div className={snap.tws < 8 ? 'text-slate-300' : 'text-warn'}>{snap.tws < 8 ? L('Jib luff: small folds — fine in light air', 'Guindant du foc : petits plis — normal dans le petit temps') : L('Jib luff folds: more halyard (and backstay for the forestay)', 'Plis au guindant du foc : plus de drisse (et de pataras pour l’étai)')}</div>
        )}
        {f.shapes.mainLuffFold > 0.3 && (
          <div className={snap.tws < 8 ? 'text-slate-300' : 'text-warn'}>{snap.tws < 8 ? L('Main luff: small folds — fine in light air', 'Guindant de GV : petits plis — normal dans le petit temps') : L('Main luff folds: cunningham on', 'Plis au guindant de GV : cunningham')}</div>
        )}
        {snap.tws < 7 && Math.abs(snap.heel) < 4 && <div className="text-warn">{L('Light air and upright: crew to leeward, a few degrees of heel lets the sails fall into shape', 'Petit temps et bateau à plat : équipage sous le vent, quelques degrés de gîte laissent les voiles prendre leur forme')}</div>}
        {rollWarn && <div className="mt-1 text-alarm">{Math.abs(snap.twa) > 110 ? L('Rolling: sheet the main in a little, vang on, and keep the kite sheeted (no over-ease).', 'Roulis : bordez un peu la GV, hale-bas, et gardez le spi bordé (pas trop choqué).') : L('Rolling: the sails are stalled or flogging, so they no longer damp the roll.', 'Roulis : les voiles sont décrochées ou battent, elles n’amortissent plus le roulis.')}</div>}
      </div>}

      {/* readout off (2D telltales beside the view): only the warnings, when there is one */}
      {coach && !readout && ((!kite && f.shapes.jibLuffFold > 0.3) || f.shapes.mainLuffFold > 0.3 || (snap.tws < 7 && Math.abs(snap.heel) < 4) || rollWarn) && (
        <div className="pointer-events-none absolute bottom-2 left-2 max-w-[320px] rounded-md bg-navy-950/75 p-2 text-[11px] backdrop-blur">
        {!kite && f.shapes.jibLuffFold > 0.3 && (
          <div className={snap.tws < 8 ? 'text-slate-300' : 'text-warn'}>{snap.tws < 8 ? L('Jib luff: small folds — fine in light air', 'Guindant du foc : petits plis — normal dans le petit temps') : L('Jib luff folds: more halyard (and backstay for the forestay)', 'Plis au guindant du foc : plus de drisse (et de pataras pour l’étai)')}</div>
        )}
        {f.shapes.mainLuffFold > 0.3 && (
          <div className={snap.tws < 8 ? 'text-slate-300' : 'text-warn'}>{snap.tws < 8 ? L('Main luff: small folds — fine in light air', 'Guindant de GV : petits plis — normal dans le petit temps') : L('Main luff folds: cunningham on', 'Plis au guindant de GV : cunningham')}</div>
        )}
        {snap.tws < 7 && Math.abs(snap.heel) < 4 && <div className="text-warn">{L('Light air and upright: crew to leeward, a few degrees of heel lets the sails fall into shape', 'Petit temps et bateau à plat : équipage sous le vent, quelques degrés de gîte laissent les voiles prendre leur forme')}</div>}
        {rollWarn && <div className="mt-1 text-alarm">{Math.abs(snap.twa) > 110 ? L('Rolling: sheet the main in a little, vang on, and keep the kite sheeted (no over-ease).', 'Roulis : bordez un peu la GV, hale-bas, et gardez le spi bordé (pas trop choqué).') : L('Rolling: the sails are stalled or flogging, so they no longer damp the roll.', 'Roulis : les voiles sont décrochées ou battent, elles n’amortissent plus le roulis.')}</div>}
        </div>
      )}

      {/* force readout */}
      {forces && (
        <div className="pointer-events-none absolute bottom-2 right-2 w-[290px] rounded-md bg-navy-950/80 p-2 text-[11px] backdrop-blur">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
            <span>{L('Sail forces', 'Forces véliques')}</span>
            <span className="normal-case tracking-normal">
              <span className="text-good">■ {L('drive', 'propulsion')}</span> <span className="text-warn">■ {L('heel', 'gîte')}</span> <span className="text-cyan-300">■ {L('total', 'totale')}</span>
            </span>
          </div>
          {[
            { n: kite ? L('Kite', 'Spi') : L('Jib', 'Foc'), l: head },
            { n: L('Main', 'GV'), l: main },
          ].map(({ n, l }) => (
            <div key={n} className="grid grid-cols-[38px_1fr_1fr_44px] gap-1">
              <span className="text-slate-300">{n}</span>
              <span className="num text-good">{Math.round(l.drive)} N</span>
              <span className="num text-warn">{Math.round(l.side)} N</span>
              <span className="num text-cyan-200">{l.pctDrive}%</span>
            </div>
          ))}
          <div className="mt-1 text-slate-400">
            AWA <span className="num text-white">{Math.round(snap.awa)}°</span> · {L('sheet load', 'charge d’écoute')} <span className="num text-white">{Math.round(f.jibSheetLoad)} N</span> · {L('heel moment', 'moment de gîte')} <span className="num text-white">{Math.round(heelRatio * 100)}%</span> {L('of righting', 'du redressement')}
          </div>
          {coach && kiteNote && <div className="mt-1 leading-snug text-cyan-100">{kiteNote}</div>}
        </div>
      )}
    </div>
  );
}
