// EASY MODE coaching: the moments where the trimmer has to act. At each one time stops (or slows
// right down), the coach says what is happening, and hints come on request (look → do → how).
// Scenarios without authored moments still get coached: every warning/alarm prompt of the script
// becomes a moment, and the physics advisor (src/sim/advisor.ts) writes the hints.
import { L } from '../i18n';
import type { Simulator } from '../sim/engine';
import { optimalControls } from '../sim/polar';

export interface CoachStep {
  id: string;
  /** sim time trigger (s) */
  at?: number;
  /** condition trigger (checked every step once `at` is reached) */
  when?: (sim: Simulator, marks: Record<string, number>) => boolean;
  /** pause = time stops until you act; slow = 1/4 speed (moves that need timing) */
  freeze: 'pause' | 'slow';
  title: string;
  /** progressive hints; when empty, the advisor's three hints are used */
  hints: string[];
  /** also offer the advisor's hint after the authored ones */
  advisor?: boolean;
  /** the moment is over (default: you did something) */
  done?: (sim: Simulator, since: number) => boolean;
  /** one line once done: what just happened */
  after?: string;
}

const acted = (sim: Simulator, since: number, pred: (a: Simulator['actions'][number]) => boolean = () => true) => sim.actions.some((a) => a.t >= since && pred(a));
const trimmed = (key: 'jibSheet' | 'mainSheet' | 'traveller', sim: Simulator, since: number, dir: 1 | -1, min = 0.04) =>
  sim.actions.some((a) => a.t >= since && a.key === key && ((a.value ?? 0) - (a.from ?? 0)) * dir >= min);
const upOpt = (sim: Simulator) => optimalControls(sim.twsSmooth, 38);

const PREP = (at: number, kind: 'tack' | 'gybe'): CoachStep => ({
  id: 'prep',
  at,
  freeze: 'pause',
  title: kind === 'tack' ? L('The helm is about to tack.', 'Le barreur va virer dans quelques secondes.') : L('The helm is about to gybe.', 'Le barreur va empanner dans quelques secondes.'),
  hints: [
    L('Through the turn, your loaded sheet becomes the windward one: the new sheet must be ready before.', "Pendant le virage, ton écoute chargée devient l'écoute au vent : la nouvelle doit être prête avant."),
    L('Load the lazy sheet on the winch: key A, or the "Prep lazy sheet" button.', "Prépare l'écoute molle sur le winch : touche A, ou le bouton « Préparer l'écoute »."),
  ],
  done: (sim) => sim.prepared,
  after: L('Sheet ready: you will tail twice as fast.', 'Écoute prête : tu embraqueras deux fois plus vite.'),
});

export const COACH: Record<string, CoachStep[]> = {
  'man-tack': [
    PREP(3.5, 'tack'),
    {
      id: 'release',
      when: (s) => s.maneuver?.kind === 'tack' && s.maneuver.releasedAt === undefined && Math.abs(s.twa) < 13,
      freeze: 'slow',
      title: L('The bow is reaching head to wind: the jib is about to back.', "L'étrave arrive dans le lit du vent : le foc va prendre à contre."),
      hints: [
        L('Watch the jib: as soon as it fills from the wrong side it brakes and pushes the bow back.', "Regarde le foc : dès qu'il se gonfle à l'envers, il freine et repousse l'étrave."),
        L('Release the old sheet now: key R.', "Largue l'ancienne écoute maintenant : touche R."),
      ],
      done: (s) => !!s.maneuver?.releasedAt || s.plan.jibReleased,
      after: L('Released: the jib crosses freely to the new side.', 'Largué : le foc passe librement sur le nouveau bord.'),
    },
    {
      id: 'tail',
      when: (s) => s.maneuvers[0]?.crossedAt !== undefined,
      freeze: 'slow',
      title: L('New tack: the jib is not loaded yet.', 'Nouveau bord : le foc ne porte pas encore.'),
      hints: [
        L('Tail fast NOW, while the sail is light — once it fills you are grinding against the load.', "Embraque vite MAINTENANT, tant que la voile est légère — une fois gonflée, tu moulines contre la charge."),
        L('Trim the jib sheet (W, or drag the winch handle down) to a few % under full trim: the boat is slow, it needs a softer jib to accelerate.', "Borde l'écoute de foc (W, ou la poignée du winch vers le bas) à quelques % sous le bordé à fond : le bateau est lent, il lui faut un foc plus doux pour relancer."),
      ],
      done: (s) => s.targets.jibSheet >= upOpt(s).jibSheet - 0.12,
      after: L('Sheet in before the load came on.', 'Écoute rentrée avant que la charge arrive.'),
    },
    {
      id: 'accel',
      when: (s) => !!s.maneuvers[0]?.done && s.v / s.target() < 0.85,
      freeze: 'pause',
      title: L('The boat is slow after the tack.', 'Le bateau est lent après le virement.'),
      hints: [
        L('At low speed a fully trimmed jib stalls and the keel slides: you need a softer trim and a lower bow.', 'À basse vitesse, un foc bordé à fond décroche et la quille dérape : il faut un réglage plus doux et l’étrave un peu plus basse.'),
        L('Tell the helm: "Accel" mode button, or key 3 "Need speed".', 'Préviens le barreur : bouton mode « Relance », ou touche 3 « Besoin de vitesse ».'),
      ],
      done: (s) => s.helmMode === 'accel' || s.helmMode === 'foot',
      after: L('The helm bears away a touch and the boat builds speed.', "Le barreur abat un peu et le bateau prend de la vitesse."),
    },
    {
      id: 'full',
      when: (s, m) => m.coach_accel !== undefined && s.v / s.target() > 0.9,
      freeze: 'slow',
      title: L('Speed is back.', 'La vitesse est revenue.'),
      hints: [L('Now you can finish the trim and go back to normal mode.', 'Tu peux maintenant finir de border et revenir en mode normal.'), L('Jib to full upwind trim (W), then key 5 "Speed OK".', 'Foc au réglage de près (W), puis touche 5 « Vitesse OK ».')],
      done: (s) => s.helmMode === 'normal',
      after: L('Back on target: full trim, normal mode.', 'Sur la cible : bordé à fond, mode normal.'),
    },
  ],
  'man-gybe': [
    PREP(4, 'gybe'),
    {
      id: 'release',
      when: (s) => s.maneuver?.kind === 'gybe' && s.maneuver.releasedAt === undefined && Math.abs(s.twa) > 163,
      freeze: 'slow',
      title: L('The stern is going through the wind.', "L'arrière passe dans le lit du vent."),
      hints: [L('The kite must fly across the bow onto the new side — the old sheet holds it back.', "Le spi doit passer devant l'étrave sur le nouveau bord — l'ancienne écoute le retient."), L('Blow the old sheet: key R.', "Largue l'ancienne écoute : touche R.")],
      done: (s) => !!s.maneuver?.releasedAt,
      after: L('Old sheet gone: the kite swings round.', "Ancienne écoute larguée : le spi passe de l'autre côté."),
    },
    {
      id: 'fill',
      when: (s) => s.maneuvers[0]?.crossedAt !== undefined,
      freeze: 'slow',
      title: L('New gybe: fill the kite.', 'Nouveau bord : remplis le spi.'),
      hints: [L('Tail the new sheet hard while it is unloaded, until the kite fills.', "Embraque fort la nouvelle écoute tant qu'elle est déchargée, jusqu'à ce que le spi se remplisse."), L('Kite sheet in (W), then ease until the luff just curls.', "Écoute de spi (W), puis choque jusqu'à ce que le guindant frise.")],
      advisor: true,
      done: (s, since) => trimmed('jibSheet', s, since, 1, 0.15),
    },
  ],
  'man-bearaway': [
    {
      id: 'turn',
      when: (_s, m) => m.turn !== undefined,
      freeze: 'slow',
      title: L('Mark: the helm bears away. Ease with the turn!', 'Bouée : le barreur abat. Choque avec le virage !'),
      hints: [
        L('Main first: still trimmed, it pushes the bow up and fights the turn.', "La GV d'abord : restée bordée, elle fait lofer et empêche le bateau de tourner."),
        L('Ease the mainsheet a lot (D), then the jib (S), backstay off (H).', "Choque franchement l'écoute de GV (D), puis le foc (S), pataras relâché (H)."),
      ],
      done: (s, since) => trimmed('mainSheet', s, since, -1, 0.25),
      after: L('Main out: the bow falls away easily.', "GV choquée : l'étrave abat facilement."),
    },
    {
      id: 'kite',
      when: (_s, m) => m.kite !== undefined,
      freeze: 'slow',
      title: L('Kite up: fill it, then find the curl.', 'Spi envoyé : remplis-le, puis cherche la frisure.'),
      hints: [L('Trim the kite sheet until it fills.', "Borde l'écoute de spi jusqu'à ce qu'il se remplisse."), L('Then ease until the luff just curls, and trim back a touch.', "Puis choque jusqu'à ce que le guindant frise, et reborde un peu.")],
      advisor: true,
      done: (s, since) => acted(s, since, (a) => a.key === 'jibSheet'),
    },
  ],
  'man-harden': [
    {
      id: 'turn',
      when: (_s, m) => m.turn !== undefined,
      freeze: 'slow',
      title: L('Douse and harden up: trim with the turn.', 'Affalage et lofée : borde avec le virage.'),
      hints: [
        L('The higher the bow goes, the further forward the apparent wind: trim at the same pace or the sails luff.', "Plus l'étrave remonte, plus le vent apparent avance : borde au même rythme ou les voiles faseyent."),
        L('Jib (W) and main (E) in progressively; backstay (Y) and outhaul (I) on as you reach close-hauled.', 'Foc (W) et GV (E) progressivement ; pataras (Y) et bordure (I) en arrivant au près.'),
      ],
      done: (s) => s.targets.mainSheet > 0.7 && s.targets.jibSheet > 0.7,
      after: L('Trimmed to the turn: the boat comes out of the mark at speed.', 'Bordé avec le virage : le bateau sort de la bouée avec de la vitesse.'),
    },
  ],
  'man-accel': [
    {
      id: 'go',
      at: 0.3,
      freeze: 'pause',
      title: L('Almost stopped, sails luffing: get the boat going.', 'Presque arrêté, voiles qui faseyent : il faut relancer.'),
      hints: [
        L('Jib first: it sets up the flow the main works in, and a main trimmed first only makes weather helm.', "Le foc d'abord : il installe l'écoulement dans lequel travaille la GV, et une GV bordée en premier ne fait que de l'ardent."),
        L('Jib to ~85 % of upwind (W), then the main with twist (E), and call accel (Accel button).', "Foc à ~85 % du réglage de près (W), puis la GV avec du vrillage (E), et annonce la relance (bouton Relance)."),
      ],
      done: (s, since) => trimmed('jibSheet', s, since, 1) && trimmed('mainSheet', s, since, 1),
      after: L('Both sails drawing: now let the speed come before full trim.', 'Les deux voiles portent : laisse venir la vitesse avant de border à fond.'),
    },
  ],
  'man-prestart': [
    {
      id: 'go',
      at: 4.05,
      freeze: 'pause',
      title: L('GO — 8 seconds to the gun!', 'GO — 8 secondes avant le canon !'),
      hints: [
        L('From a standstill: jib first, then main, and tell the helm you are accelerating.', "À l'arrêt : le foc d'abord, puis la GV, et dis au barreur qu'on relance."),
        L('Jib to ~85 % (W), main in with twist (E), Accel mode.', 'Foc à ~85 % (W), GV bordée avec du vrillage (E), mode Relance.'),
      ],
      done: (s, since) => trimmed('jibSheet', s, since, 1) && trimmed('mainSheet', s, since, 1),
    },
  ],
  'man-modes': [
    {
      id: 'foot',
      at: 6.05,
      freeze: 'pause',
      title: L('The tactician wants FOOT mode.', 'Le tacticien veut le mode VITESSE.'),
      hints: [L('Foot: a little more twist and angle, the helm bears away slightly for speed.', "Vitesse : un peu plus de vrillage et d'angle, le barreur abat légèrement."), L('Ease the jib 3–6 % (S) and call foot (key 3).', 'Choque le foc de 3–6 % (S) et annonce « vitesse » (touche 3).')],
      done: (s) => s.helmMode === 'foot',
    },
    {
      id: 'point',
      at: 22.05,
      freeze: 'pause',
      title: L('Now HOLD HIGH: point mode.', 'Maintenant ON TIENT HAUT : mode cap.'),
      hints: [L('Point: the sails closed and powered for height, the boat already at speed.', 'Cap : voiles fermées et puissantes pour la hauteur, le bateau déjà à vitesse.'), L('Jib to full trim (W), traveller up a touch (T), call point (key 4).', 'Foc bordé à fond (W), chariot de GV un peu monté (T), annonce « cap » (touche 4).')],
      done: (s) => s.helmMode === 'point',
    },
  ],
  'man-gust': [
    {
      id: 'call',
      at: 5.05,
      freeze: 'pause',
      title: L('Pressure on the water upwind.', "De la pression sur l'eau au vent."),
      hints: [L('The helm needs to know it is coming to luff up at the right moment.', "Le barreur doit savoir qu'elle arrive pour lofer au bon moment."), L('Call it: key 1 (Pressure).', 'Annonce-la : touche 1 (Risée).')],
      done: (s, since) => acted(s, since, (a) => a.kind === 'call'),
    },
    {
      id: 'impact',
      at: 12.05,
      freeze: 'pause',
      title: L('Impact!', 'Impact !'),
      hints: [L('The main carries the heeling moment: depower it without changing its shape.', 'La GV porte le moment de gîte : dépuissante-la sans changer sa forme.'), L('Traveller down (G), crew hiking (X).', 'Chariot de GV descendu (G), équipage au rappel (X).')],
      done: (s, since) => trimmed('traveller', s, since, -1),
      after: L('Traveller down: the main lets go of the heel, the jib keeps driving.', 'Chariot descendu : la GV lâche la gîte, le foc continue de propulser.'),
    },
    {
      id: 'fade',
      at: 20.55,
      freeze: 'pause',
      title: L('The puff is passing.', 'La risée passe.'),
      hints: [L('Without the pressure a low traveller is just lost power.', "Sans la pression, un chariot bas, c'est juste de la puissance perdue."), L('Traveller back up (T).', 'Remonte le chariot de GV (T).')],
      done: (s, since) => trimmed('traveller', s, since, 1),
    },
  ],
  'man-lull': [
    {
      id: 'call',
      at: 6.05,
      freeze: 'pause',
      title: L('Soft patch ahead.', 'Zone molle devant.'),
      hints: [L('In the lull the helm keeps the bow down to hold speed — tell them.', "Dans la molle, le barreur garde l'étrave basse pour tenir la vitesse — préviens-le."), L('Key 2 (Lull).', 'Touche 2 (Molle).')],
      done: (s, since) => acted(s, since, (a) => a.kind === 'call'),
    },
    {
      id: 'in',
      at: 12.05,
      freeze: 'pause',
      title: L('In the lull: the boat stands up and slows.', 'Dans la molle : le bateau se redresse et ralentit.'),
      hints: [L('Less wind = less heel: hiking now only makes the boat flat and slow, and the sails want power.', "Moins de vent = moins de gîte : le rappel ne fait plus qu'aplatir le bateau, et les voiles veulent de la puissance."), L('Crew in (Z), traveller up (T), backstay off (H), jib a touch eased (S).', 'Équipage rentré (Z), chariot de GV monté (T), pataras relâché (H), foc un peu choqué (S).')],
      done: (s, since) => acted(s, since, (a) => a.key === 'hike' && (a.value ?? 1) < (a.from ?? 0)),
    },
    {
      id: 'back',
      at: 21.05,
      freeze: 'pause',
      title: L('The breeze is back.', 'Le vent revient.'),
      hints: [L('Reverse what you did for the lull.', 'Fais l’inverse de ce que tu as fait pour la molle.')],
      advisor: true,
    },
  ],
};

export const COACH_DONE_DEFAULT = (sim: Simulator, since: number) => acted(sim, since, (a) => a.kind !== 'gear' && a.kind !== 'sprint');
