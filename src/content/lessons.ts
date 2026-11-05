// TRIMMASTER lesson library.
// Target boat: heavy-displacement ~20-30 ft keelboat, J/80 type (about 1.3 t, 8 m,
// fractional rig, main ~25 m2, non-overlapping jib ~14 m2, asymmetric ~64 m2).
// Every number given here is a starting point: real settings depend on the boat,
// the rig tune, the sails, the sea state and the crew weight.
import type { Lesson } from './types';
import { LANG } from '../i18n';
import { LESSONS_FR_HEADSAIL } from './lessons.fr.headsail';
import { LESSONS_FR_MAINSAIL } from './lessons.fr.mainsail';
import { LESSONS_FR_BEHAVIOR } from './lessons.fr.behavior';

// ---------------------------------------------------------------------------
// MODULE: HEADSAIL
// ---------------------------------------------------------------------------

const HEADSAIL: Lesson[] = [
  {
    id: 'jib-sheet',
    module: 'headsail',
    title: 'Jib sheet tension',
    altName: 'Écoute de foc',
    level: 1,
    skill: 'headsail',
    summary: `The jib sheet sets the jib's angle of attack, its leech tension and the width of the slot all at once, so every centimetre you trim or ease changes power, pointing and the main's airflow.`,
    sections: [
      {
        heading: 'What the sheet really controls',
        body: `On a non-overlapping jib the sheet pulls the clew both aft and down. Pulling aft brings the whole sail closer to the centreline, which reduces its angle of attack to the apparent wind and narrows the slot with the main. Pulling down tensions the leech, which closes the top of the sail (less twist) and flattens the foot slightly. That is why the sheet is not just an "in / out" control: it changes angle, twist and depth together.\n\nThe practical consequence for you as trimmer is that the same sheet position does not give the same sail in 6 kn and 16 kn. In light air the cloth and the forestay sag less, so a few centimetres of trim has a big effect on the leech. In a breeze the forestay sags more, the sail gets deeper, and you need more sheet just to hold the same shape.`,
      },
      {
        heading: 'Reference marks and the "last 5 cm"',
        body: `On a J/80-type boat the useful upwind range of the jib sheet is very small: from "fully trimmed for pointing" to "eased for acceleration" is often only 5-10 cm of sheet at the clew. Put marks on the sheet (or use the numbers on the deck/tracks) and learn the distance between the jib leech and the spreader tip at full trim, typically a few centimetres off the spreader in medium breeze, a bit more in light air and in chop.\n\nUse the two-speed winch accordingly: the high gear gets the sheet nearly home after a tack, the low gear does the final 5 cm. Those last centimetres are where the speed is, and they should be trimmed with the helm, not against it.`,
      },
      {
        heading: 'Sheet work in a match',
        body: `After a tack or a mark rounding, do not trim to the pointing mark immediately. The boat has lost speed, the keel produces little lift at low speed, and leeway is high. Trim to roughly 2-5 cm short of the pointing mark, call "building" to the helm, and bring the last few centimetres in as the speed comes back (often 5-10 seconds on a J/80). Trimming hard too early stalls the jib and drags the bow up into the wind.\n\nIn the pre-start, the sheet is your accelerator: luffing the jib kills drive, trimming it in creates drive instantly. Practise "half-trim" positions for controlled approaches, and communicate: "Jib on in 3, 2, 1" so the helm can bear away and the main can trim in step. In gusts, a small ease (1-3 cm) while the main dumps keeps the boat on its feet without losing the jib's pointing ability.`,
      },
    ],
    physics: `A sail is a cambered foil that creates lift by turning the airflow: the flow speeds up on the leeward side and slows on the windward side, the pressure difference giving a force roughly perpendicular to the apparent wind. Lift grows with angle of attack until the flow can no longer follow the leeward surface and separates (stall), at which point lift drops and drag rises sharply. The sheet sets the angle of attack along the whole luff. Because the sheet also controls leech tension, it changes twist: the apparent wind angle is wider aloft (wind gradient), so a correctly twisted sail keeps a similar angle of attack from foot to head. Over-trimming closes the leech, raises the effective angle of attack at the top and pushes the upper sections into stall first.`,
    effects: [
      { target: 'Angle of attack', effect: `Trimming reduces the angle between chord and centreline and raises the angle of attack for a given heading; easing lowers it until the luff lifts.` },
      { target: 'Twist / leech', effect: `Trimming pulls the clew down and closes the upper leech; easing lets the head twist off and depowers the top.` },
      { target: 'Depth', effect: `Easing lets the foot and lower sections round up (more power, more drag); trimming flattens them.` },
      { target: 'Slot', effect: `Trimming narrows the gap between jib leech and main luff; too narrow and the jib backwinds the main.` },
    ],
    interactions: [
      { control: 'Jib lead', relation: `The lead decides how the sheet's pull splits between leech and foot. With the car forward, the same sheet tension closes the leech more; with the car aft, it flattens the foot and opens the top. Move the lead before you over-trim to fix a leech problem.` },
      { control: 'Backstay', relation: `More backstay reduces forestay sag and flattens the jib, so you usually need a touch more sheet (or a lead move) to keep the same leech-to-spreader distance.` },
      { control: 'Mainsheet / traveller', relation: `The jib leech should run roughly parallel to the main's leeward surface. If you trim the jib harder, the main must come in too or it will be backwinded; if you ease to accelerate, the main should also twist off.` },
      { control: 'Jib halyard', relation: `A tighter halyard moves draft forward and rounds the entry, giving a wider steering groove; with more halyard you can often carry slightly more sheet without stalling.` },
    ],
    mistakes: [
      `Trimming to the pointing mark straight out of a tack, before the boat has speed, which stalls the jib and increases leeway.`,
      `Using the sheet alone to fix twist problems that belong to the lead position.`,
      `Leaving the sheet cleated in gusts and lulls instead of playing the last few centimetres with the helm.`,
      `Over-trimming in chop: the sail becomes too flat and closed to drive through waves.`,
    ],
    keyPoints: [
      `The sheet controls angle of attack, twist and slot simultaneously.`,
      `The useful upwind range is only a few centimetres: mark the sheet and know the leech-to-spreader distance.`,
      `Ease 2-5 cm to accelerate, trim to the mark only once the boat is at target speed.`,
      `Keep the jib leech roughly parallel to the main so the slot stays open.`,
    ],
    diagram: 'aoa',
    lab: {
      controls: ['jibSheet', 'jibLead', 'mainSheet'],
      focus: ['jibAoA', 'jibTwist', 'slot', 'speed', 'drive'],
      tws: 10,
      twa: 42,
      presets: [
        { name: 'Accelerating', description: `Jib eased a few centimetres off the mark: wider slot, more twist, more drive at low speed.`, controls: { jibSheet: 0.7 } },
        { name: 'Pointing trim', description: `Jib on the mark for full speed upwind: leech near the spreader, slot parallel.`, controls: { jibSheet: 0.85 } },
        { name: 'Over-trimmed', description: `Block-to-block in 10 kn: top closed, slot choked, leeward telltales stalling.`, controls: { jibSheet: 1 } },
      ],
    },
    check: [
      {
        question: `You have just tacked in 10 kn and the boat is 1 kn below target speed. What do you do with the jib sheet?`,
        options: [`Trim straight to the pointing mark`, `Trim to 2-5 cm short of the mark, then finish as speed builds`, `Leave it 30 cm eased until the next gust`],
        correct: 1,
        explanation: `At low speed the keel produces little lift and the jib stalls easily. A slightly eased jib produces more drive; you bring the last centimetres in as the boat reaches target speed.`,
      },
      {
        question: `Trimming the jib sheet harder mainly...`,
        options: [`Opens the upper leech`, `Closes the leech and narrows the slot`, `Moves the draft forward`],
        correct: 1,
        explanation: `The sheet pulls the clew aft and down: the leech tensions, the top twists less, and the gap to the main narrows.`,
      },
    ],
  },
  {
    id: 'jib-lead',
    module: 'headsail',
    title: 'Jib lead position (barber / car)',
    altName: 'Barber / point de tire',
    level: 2,
    skill: 'headsail',
    summary: `The lead car sets the direction of the sheet's pull, and therefore the balance between foot tension and leech tension: it is the main twist control of a non-overlapping jib.`,
    sections: [
      {
        heading: 'The sheeting vector',
        body: `Imagine a line from the clew through the lead block. Its direction determines how the sheet tension splits between the foot (pull aft) and the leech (pull down). Moving the car forward makes the pull more vertical: leech tighter, top less twisted, foot deeper. Moving the car aft makes the pull more horizontal: foot flatter, leech freer, top more twisted. A common starting point is a lead whose line roughly bisects the clew angle, then fine-tune from the telltales.\n\nAn inboard/outboard adjustment (barber hauler or a track angle) changes the sheeting angle: inboard narrows the sheeting angle for pointing in flat water, outboard widens it for power and for reaching. On J/80-type boats the tracks are fixed, so the fore/aft car and, if fitted, an inhauler or barber are your tools.`,
      },
      {
        heading: 'Finding the neutral position',
        body: `With the jib trimmed to normal upwind position, ask the helm to luff up slowly. If the top windward telltales lift first, the top has a lower angle of attack than the bottom: it is too twisted, so move the lead forward. If the bottom telltales lift first, the foot is too deep / the top too closed: move the lead aft. Neutral is when all heights break together, or with the top just a touch earlier, which is often desirable in a breeze.\n\nMark the track for light, medium and heavy settings. A typical pattern on this class: lead slightly forward in chop for a fuller, more powerful foot (with the sheet eased a touch so the leech does not close), neutral or close to it in light and medium air, and one or two holes aft in heavy air to open the top and flatten the foot. Each sail and each rig tune will differ.`,
      },
      {
        heading: 'Lead moves in match racing',
        body: `You rarely move the car under load upwind on a J/80, so set it before the start and on the downwind leg for the next beat. Watch the conditions in the last minutes of the pre-start: if the breeze is building, go aft one hole before the gun rather than fighting an overpowered jib for the whole first beat.\n\nTell the helm what you set: "Lead one aft, top will be a bit open". It explains why the upper telltales will break earlier and stops the helm from asking you to over-trim. For reaching legs, move the car forward and outboard if possible so the top does not twist away when you ease the sheet.`,
      },
    ],
    physics: `The apparent wind is not uniform with height: because the true wind increases with height (wind gradient) while boat speed is the same everywhere, the apparent wind is both stronger and wider in angle aloft. A jib therefore needs twist so each section keeps a similar angle of attack. The lead position is the geometric tool that sets this twist for a given sheet load. Too far forward, the head is closed relative to the local apparent wind and the upper sections stall while the foot is deep and draggy. Too far aft, the head is open, luffs first and produces little lift while the foot is flattened. Correct lead position spreads loading evenly, which also minimises induced drag by approximating an efficient spanwise loading.`,
    effects: [
      { target: 'Twist', effect: `Lead forward = less twist, closed head; lead aft = more twist, open head.` },
      { target: 'Foot depth', effect: `Lead forward = deeper, more powerful foot; lead aft = flatter foot, less drag.` },
      { target: 'Sheeting angle', effect: `Inboard = higher pointing, narrower groove; outboard = more power, easier steering, used in chop and on reaches.` },
    ],
    interactions: [
      { control: 'Jib sheet', relation: `The lead decides what the sheet does. After moving the lead, re-check the sheet mark: moving aft usually needs a touch more sheet to keep the same leech-to-spreader distance.` },
      { control: 'Jib halyard', relation: `More halyard pulls the clew up slightly and changes the sheeting angle at the clew, so a big halyard change may need the lead nudged forward to compensate.` },
      { control: 'Backstay', relation: `As backstay straightens the forestay the jib flattens and its leech tightens; in breeze combine backstay on with lead aft to keep the top open.` },
      { control: 'Mainsail twist', relation: `The jib and main tops should twist by similar amounts. If the main is twisted off in a breeze and the jib top is closed, the slot chokes high up: move the jib lead aft.` },
    ],
    mistakes: [
      `Never moving the car: a single "class setting" cannot be right from 5 to 20 kn.`,
      `Reading the top telltales without luffing slowly and evenly, then moving the lead in the wrong direction.`,
      `Moving the lead forward in a breeze to "point higher", which closes the head, increases heel and chokes the slot.`,
      `Forgetting to re-check the sheet mark after a lead change.`,
    ],
    keyPoints: [
      `Lead forward: tight leech, deep foot. Lead aft: open top, flat foot.`,
      `Neutral = telltales at all heights break together as the helm luffs.`,
      `Set the lead before the start and adjust between beats, not under load.`,
      `More wind usually means lead aft; chop and light air usually mean a slightly fuller, more powerful setting.`,
    ],
    diagram: 'lead',
    lab: {
      controls: ['jibLead', 'jibSheet'],
      focus: ['jibTwist', 'jibDepth', 'jibAoA', 'drive'],
      tws: 12,
      twa: 42,
      presets: [
        { name: 'Lead forward', description: `Car well forward: closed top, deep foot. Top stalls early.`, controls: { jibLead: 0.2, jibSheet: 0.85 } },
        { name: 'Neutral', description: `Telltales break evenly up the luff.`, controls: { jibLead: 0.5, jibSheet: 0.85 } },
        { name: 'Lead aft (breeze)', description: `Car aft in 18 kn: open top, flat foot, less heel.`, controls: { jibLead: 0.8, jibSheet: 0.9 }, tws: 18 },
      ],
    },
    check: [
      {
        question: `As the helm luffs slowly, the top windward telltales lift well before the bottom ones. Where do you move the lead?`,
        options: [`Forward`, `Aft`, `Nowhere, ease the sheet`],
        correct: 0,
        explanation: `The top has the lowest angle of attack, so it is too twisted. Moving the lead forward tightens the leech and closes the top.`,
      },
      {
        question: `The breeze builds from 10 to 18 kn. What is the typical lead change?`,
        options: [`Forward to tighten the leech`, `Aft to open the top and flatten the foot`, `Inboard to point higher`],
        correct: 1,
        explanation: `In a breeze you want less power aloft and a flatter foot: lead aft increases twist and reduces heeling moment.`,
      },
    ],
  },
  {
    id: 'jib-halyard',
    module: 'headsail',
    title: 'Jib halyard tension',
    altName: 'Drisse de foc',
    level: 2,
    skill: 'headsail',
    summary: `Halyard tension positions the jib's draft fore and aft and shapes its entry, which decides how wide the steering groove is.`,
    sections: [
      {
        heading: 'Draft position and entry',
        body: `Tensioning the halyard pulls cloth towards the luff: the draft moves forward and the entry becomes rounder. Easing it lets the draft slide aft and makes the entry finer (flatter at the front). A round entry tolerates changes in angle of attack, so the helm has a wider "groove" before telltales break; a fine entry points higher but needs precise steering and flat water.\n\nA jib with its draft at around 35-40% of the chord is a reasonable target for upwind on this type of boat. When the wind builds, the cloth stretches and the forestay sags, which both move the draft aft. You add halyard to bring it back.`,
      },
      {
        heading: 'Reading the luff',
        body: `Horizontal wrinkles (scallops) running from the luff mean the halyard is too soft for the conditions. In very light, flat water a few small scallops can be fast, because a soft luff gives a finer entry and more pointing. A vertical crease along the luff means too much halyard: the draft is too far forward and the sail is blunt and "baggy" at the front, with a flat, ineffective back half.\n\nUse marks on the halyard or on the mast so you can reproduce settings. On J/80-type boats many teams adjust halyard only between races or downwind, but if it is led to the cockpit, adjust it in the pre-start when you see the breeze for the first beat.`,
      },
      {
        heading: 'Matching to sea state and match racing needs',
        body: `In chop, the boat keeps changing speed and the apparent wind angle oscillates. A tighter halyard with a rounder entry keeps the jib working through these oscillations. In flat water with a steady breeze, slightly less halyard and a finer entry helps you point, which matters when you need to hold a lane or pinch off an opponent.\n\nCommunicate the trade-off: "Halyard up, groove is wider" tells the helm they can steer more freely; "halyard soft, need to be precise" warns them that pointing will cost speed if the steering is loose. Real settings depend on the sail cut, the luff tape, the forestay tension and the crew weight on the rail.`,
      },
    ],
    physics: `The leading edge of a foil decides where the flow stagnates and how sharply it must turn around the luff. A rounder entry with forward draft accepts a range of angles of attack without the flow separating on either side, so the sail is forgiving. A finer entry with draft further aft has a lower drag polar at its design angle and allows a smaller angle to the apparent wind, but separates quickly outside it. Halyard tension moves cloth along the luff and thus shifts the camber distribution. Because wind load and forestay sag increase camber and drive the draft aft, halyard tension must rise with wind speed to keep the draft near its design position.`,
    effects: [
      { target: 'Draft position', effect: `More halyard moves the draft forward; less lets it slide aft.` },
      { target: 'Entry', effect: `More halyard = rounder, more forgiving entry; less = finer entry, higher pointing, narrow groove.` },
      { target: 'Leech', effect: `Moving draft forward slightly frees the leech; too little halyard can make the leech feel hooked.` },
    ],
    interactions: [
      { control: 'Backstay', relation: `Backstay tension reduces forestay sag; a straighter forestay flattens the jib and moves the draft forward, so you may need less halyard when the backstay is on hard. Sag the forestay and you need more.` },
      { control: 'Jib sheet', relation: `With a round entry (more halyard) you can carry slightly more sheet before stalling. With a soft halyard, over-trimming quickly stalls the sail.` },
      { control: 'Jib lead', relation: `Large halyard changes move the clew height and the sheeting angle; re-check the lead after a big change.` },
      { control: 'Helm', relation: `The halyard sets the groove width: a wide groove in chop lets the helm steer for waves without losing the jib.` },
    ],
    mistakes: [
      `Leaving the halyard at the light-air setting as the wind builds, letting the draft slide aft.`,
      `Over-tensioning in light air, producing a vertical crease and a blunt, draggy front.`,
      `Ignoring sea state: a fine entry in chop makes the boat slow and hard to steer.`,
    ],
    keyPoints: [
      `Halyard = draft position and entry shape.`,
      `Target draft around 35-40% of chord on the jib.`,
      `Scallops = too soft (sometimes OK in drifter conditions); vertical crease = too tight.`,
      `More wind or more chop = more halyard.`,
    ],
    diagram: 'draft',
    lab: {
      controls: ['jibHalyard', 'jibSheet', 'backstay'],
      focus: ['jibDraft', 'jibDepth', 'forestaySag', 'jibAoA'],
      tws: 12,
      twa: 42,
      presets: [
        { name: 'Soft halyard', description: `Draft drifts aft, entry fine, narrow groove.`, controls: { jibHalyard: 0.2 } },
        { name: 'Medium', description: `Draft near 38%, balanced entry.`, controls: { jibHalyard: 0.55 } },
        { name: 'Hard halyard in breeze', description: `Draft held forward in 18 kn with forestay sag.`, controls: { jibHalyard: 0.85, backstay: 0.6 }, tws: 18 },
      ],
    },
    check: [
      {
        question: `In 16 kn with a short chop, the jib shows its draft well aft and the helm struggles to stay in the groove. What do you change?`,
        options: [`Ease the halyard`, `Tension the halyard`, `Move the lead forward`],
        correct: 1,
        explanation: `Wind and forestay sag drove the draft aft. More halyard brings it forward and rounds the entry, widening the groove for chop.`,
      },
      {
        question: `A vertical crease along the luff indicates...`,
        options: [`Too much halyard tension`, `Too little halyard tension`, `Lead too far aft`],
        correct: 0,
        explanation: `Excess halyard pulls too much cloth to the luff, creating a vertical fold and an over-round entry.`,
      },
    ],
  },
  {
    id: 'jib-foot',
    module: 'headsail',
    title: 'Foot tension',
    altName: 'Bordure de foc',
    level: 2,
    skill: 'headsail',
    summary: `The depth of the lower third of the jib controls low-down power and drag; on a non-overlapping jib it is set by the lead position and sheet tension rather than a separate outhaul.`,
    sections: [
      {
        heading: 'The lower third is your power gear',
        body: `The foot of the jib is the lowest part of the sail, close to the deck. It works in the slowest, most disturbed air (wind gradient), but it also has a short heeling arm, so its power is "cheap" in terms of heel. A rounder foot gives power for acceleration and for punching through chop; a flatter foot reduces drag and allows higher pointing in flat water and in breeze.\n\nThere is no outhaul on a typical J/80 jib. You control foot depth by the car position (forward = rounder foot) and by sheet tension (more sheet = flatter foot, but also tighter leech). Watch the "shelf" or the foot's distance from the deck/shroud base as a reference.`,
      },
      {
        heading: 'Setting it for the conditions',
        body: `Light air (5-8 kn), flat water: moderate foot depth; too round and the flow cannot stay attached at low speed. Light air with leftover chop: rounder foot for power. Medium (8-14 kn): foot moderately flat, close to the deck sweeper position if the sail has one. Heavy air (15+ kn): flat foot, lead aft, to keep power high-up low and reduce drag and heel.\n\nCheck from the foot telltales and the lower batten/leech: the foot should not be a straight flat line pinned to the deck in chop, and should not balloon with a big curve in a breeze.`,
      },
      {
        heading: 'In the race',
        body: `After a tack, a slightly rounder foot from an eased sheet gives extra drive while the boat accelerates. Once at speed, the final trim flattens it. In the pre-start, when you are slowly reaching on a timed run, keep the foot a bit fuller so the boat responds when you power up.\n\nIf the helm reports the boat "feels sticky" in waves, look at the foot first: a flat foot with the lead aft can starve the boat of low-down drive. Tell them "giving you more foot" when you ease a centimetre or go a hole forward on the next downwind.`,
      },
    ],
    physics: `Camber (depth) increases the lift a section can produce at a given angle of attack, but also its profile drag and its sensitivity to separation. In slow, turbulent air near the deck the flow has less energy, so deep sections stall easily at low speed; in waves the boat needs extra drive to recover speed after each pitching cycle. The foot also sits close to the deck, which acts as an end plate and reduces induced drag if the gap is small. A foot that seals to the deck makes the jib aerodynamically "taller", improving lift-to-drag ratio.`,
    effects: [
      { target: 'Lower-section depth', effect: `Lead forward / sheet eased = deeper foot and more power; lead aft / sheet on = flatter foot and less drag.` },
      { target: 'Pointing', effect: `A flatter foot lets you point higher in flat water.` },
      { target: 'Deck seal', effect: `A foot close to the deck reduces induced drag (end-plate effect).` },
    ],
    interactions: [
      { control: 'Jib lead', relation: `The lead is the primary foot control: forward for depth, aft for flatness. It also changes twist at the same time.` },
      { control: 'Jib sheet', relation: `More sheet flattens the foot but also closes the leech; you cannot change one without the other unless you move the lead.` },
      { control: 'Main outhaul', relation: `The main's foot and the jib's foot share the slot near the boom. A deep main foot with a deep jib foot chokes the lower slot.` },
      { control: 'Heel', relation: `Heel lifts the leeward deck away from the foot and breaks the end-plate effect; keeping the boat flatter keeps the foot efficient.` },
    ],
    mistakes: [
      `Flattening the foot in chop and losing the drive needed to climb waves.`,
      `Using a very deep foot in a breeze, adding heel and drag.`,
      `Forgetting that every foot change via the lead also changes twist.`,
    ],
    keyPoints: [
      `Foot depth = low-down power with a small heeling arm.`,
      `Controlled by lead position and sheet tension on this class.`,
      `Fuller for chop and acceleration, flatter for flat water and breeze.`,
      `Keep the foot close to the deck for the end-plate effect.`,
    ],
    diagram: 'draft',
    lab: {
      controls: ['jibLead', 'jibSheet'],
      focus: ['jibDepth', 'drive', 'heel', 'speed'],
      tws: 9,
      twa: 42,
      presets: [
        { name: 'Full foot (chop)', description: `Lead forward, sheet slightly eased: power to drive through waves.`, controls: { jibLead: 0.35, jibSheet: 0.75 } },
        { name: 'Flat foot (flat water)', description: `Lead aft, sheet on: low drag, higher pointing.`, controls: { jibLead: 0.65, jibSheet: 0.9 } },
        { name: 'Breeze', description: `Flat foot and lead aft in 18 kn.`, controls: { jibLead: 0.8, jibSheet: 0.9 }, tws: 18 },
      ],
    },
    check: [
      {
        question: `On a J/80-type jib with no outhaul, how do you make the foot fuller?`,
        options: [`Move the lead forward or ease the sheet slightly`, `Tension the halyard`, `Tension the backstay`],
        correct: 0,
        explanation: `Moving the car forward makes the sheeting vector more vertical so less load goes into the foot; easing the sheet also lets the foot round up.`,
      },
      {
        question: `Why is power from the foot considered "cheap"?`,
        options: [`The air is faster near the deck`, `It has a short heeling arm, so it creates little heeling moment`, `It reduces weather helm to zero`],
        correct: 1,
        explanation: `Force near the deck acts low above the centre of lateral resistance, so it heels the boat less than the same force high up.`,
      },
    ],
  },
  {
    id: 'jib-leech',
    module: 'headsail',
    title: 'Jib leech tension',
    altName: 'Chute de foc',
    level: 2,
    skill: 'headsail',
    summary: `The jib leech sets the exit angle of the flow and the shape of the slot; it must be tight enough to point but open enough to let the main breathe.`,
    sections: [
      {
        heading: 'The exit of the jib is the entry of the main',
        body: `The airflow leaving the jib's leech flows straight into the slot along the leeward side of the main. If the leech is hooked (curving to windward at the back), the air is thrown onto the main's lee side, the main's luff backwinds, and the whole rig loses lift. If the leech is too open, the jib produces less lift and the boat cannot point.\n\nThe classic reference: the jib leech should be roughly parallel to the main's leeward surface, with the upper leech a few centimetres from the spreader tip in medium wind. Leech telltales (on the sail's trailing edge) should stream aft most of the time.`,
      },
      {
        heading: 'Controlling leech tension',
        body: `Leech tension comes from the sheet (pulling down) and the lead position (vertical component of the pull). More sheet or car forward = tighter leech. Halyard and backstay act indirectly: a tighter forestay flattens the sail and loads the leech differently, and a softer halyard can make the leech feel hooked.\n\nIn light air, avoid a tight leech: the flow has little energy and separates at the trailing edge, so ease slightly to let it exit cleanly. In medium wind, hold it firm for pointing. In heavy air, let the top open so the boat stays on its feet.`,
      },
      {
        heading: 'Match situations',
        body: `When you need height to hold a lane off the opponent's lee bow, you can tighten the leech a touch, but only once the boat is at full speed and only for as long as speed holds. Call it: "Leech on, pointing mode." When you need to foot to break through to leeward, ease 1-3 cm so the leech opens and the jib produces more drive and less side force.\n\nIn gusts, the main trimmer dumps first; you hold the jib leech steady so the bow does not fall off. Watch the spreader-tip distance as your shared language with the helm.`,
      },
    ],
    physics: `The Kutta condition states that flow must leave a sharp trailing edge smoothly. The leech angle therefore sets the exit direction of the flow and, through circulation, the lift of the whole section. A tighter leech increases effective camber and circulation (more lift, more pointing) but also the adverse pressure gradient near the trailing edge, which promotes separation when the flow is slow. Because the jib's circulation induces an upwash ahead of the main and changes the local flow speed in the slot, the jib leech angle directly controls whether the main's lee-side flow is accelerated (good slot) or blocked and reversed (backwind).`,
    effects: [
      { target: 'Pointing', effect: `A firmer leech increases circulation and lets the boat sail closer to the wind.` },
      { target: 'Slot', effect: `A hooked leech narrows the slot and backwinds the main.` },
      { target: 'Twist aloft', effect: `Leech tension controls how much the head opens.` },
    ],
    interactions: [
      { control: 'Jib sheet', relation: `Sheet tension is the main leech control: 1 cm of sheet changes the spreader-tip distance noticeably.` },
      { control: 'Jib lead', relation: `Car forward tightens the leech for the same sheet load; car aft opens it.` },
      { control: 'Mainsheet', relation: `Main leech and jib leech should twist together. If the main leech is opened in a gust, open the jib top too or the slot closes aloft.` },
      { control: 'Backstay', relation: `Backstay flattens the jib and slightly changes leech tension; re-check the spreader gap after big backstay changes.` },
    ],
    mistakes: [
      `Hooking the leech in light air in an attempt to point.`,
      `Ignoring backwind in the main luff caused by an over-tight jib leech.`,
      `Holding the leech hard in waves when speed is dropping.`,
    ],
    keyPoints: [
      `Jib leech roughly parallel to the main's leeward surface.`,
      `Use spreader-tip distance and leech telltales as references.`,
      `Firm leech = pointing; open leech = acceleration and depower.`,
      `The jib exit is the main's entry: leech errors hurt both sails.`,
    ],
    diagram: 'slot',
    lab: {
      controls: ['jibSheet', 'jibLead', 'mainSheet'],
      focus: ['jibTwist', 'slot', 'mainAoA', 'drive'],
      tws: 11,
      twa: 42,
      presets: [
        { name: 'Open leech', description: `Leech eased: wide slot, more drive, less pointing.`, controls: { jibSheet: 0.72, jibLead: 0.6 } },
        { name: 'Parallel', description: `Jib leech parallel to the main.`, controls: { jibSheet: 0.85, jibLead: 0.5 } },
        { name: 'Hooked', description: `Car forward and sheet hard: slot choked, main backwinded.`, controls: { jibSheet: 0.98, jibLead: 0.25 } },
      ],
    },
    check: [
      {
        question: `The main shows a persistent bubble just behind the mast while the jib is trimmed hard with the car forward. Likely cause?`,
        options: [`Main traveller too low`, `Jib leech hooked, choking the slot`, `Outhaul too tight`],
        correct: 1,
        explanation: `A hooked jib leech throws air onto the main's lee side and backwinds the luff. Open the jib leech (ease or move lead aft).`,
      },
      {
        question: `In 6 kn, the jib leech telltales keep stalling behind the sail. What do you do?`,
        options: [`Trim harder`, `Ease slightly to let the leech open`, `Add halyard`],
        correct: 1,
        explanation: `In light air the flow cannot handle a tight leech; easing opens it so the flow exits cleanly.`,
      },
    ],
  },
  {
    id: 'jib-draft-twist',
    module: 'headsail',
    title: 'Draft and twist',
    altName: 'Creux et vrillage',
    level: 3,
    skill: 'headsail',
    summary: `Depth, draft position and twist are the three shape variables of the jib; together they decide power, pointing and how forgiving the sail is.`,
    sections: [
      {
        heading: 'Three variables, many controls',
        body: `Depth (camber) is how deep the sail is relative to its chord, typically around 10-14% for a jib upwind. Draft position is where the maximum depth sits, around 35-40% of the chord. Twist is the change in chord angle from foot to head. Each control changes more than one variable: the sheet changes depth and twist, the lead changes twist and foot depth, the halyard changes draft position, the backstay changes depth through forestay sag.\n\nThink in terms of what you want: more power (more depth, less twist), more pointing (flatter entry, firmer leech), less heel (more twist, flatter sail).`,
      },
      {
        heading: 'Why we need twist',
        body: `The true wind is slower near the water because of friction (wind gradient). The boat moves at one speed for the whole rig, so the apparent wind aloft is stronger and wider in angle than at deck level. If the sail had no twist, the top would be at a higher angle of attack than the bottom and would stall first. Twist lets every height work at a similar angle of attack.\n\nTwist is also a depower tool: opening the top reduces the force high up, where it has the largest heeling arm. In gusty match-race conditions, more twist gives a more forgiving sail that does not need constant adjustment.`,
      },
      {
        heading: 'Gear changes on a J/80',
        body: `Light air (under 7 kn): moderate depth, generous twist, soft-ish halyard, eased sheet. Too much depth in a drifter is slow, because the slow flow cannot follow a strongly curved surface. Medium (8-14 kn): the maximum depth the boat can carry while staying near target heel, twist reduced for pointing. This is the "full power" gear where crew weight on the rail pays most. Heavy air (15+ kn): flatter (backstay on, halyard up), more twist (lead aft), sheet firm so the leech does not flog. Chop at any wind strength: a bit more depth and twist than in flat water for drive and a wider groove.\n\nThese are starting points: your sails, mast tune, crew weight and the sea state will move them. Log what worked in each race, with wind speed and wave notes, and share it with the helm so you both recognise the gears.`,
      },
      {
        heading: 'Reading the shape on the water',
        body: `Look up the sail from the clew or from the windward rail through the window: the draft stripes show depth and draft position, and the angle of each stripe relative to the centreline shows twist. Compare with the main: the jib's leech profile should follow the curve of the main's lee side. A jib that looks "flat and pretty" at the dock is not necessarily fast; judge it from speed and heel on the water.\n\nIn a match, gear changes are a team call: "we're overpowered, going flatter" warns the helm that pointing changes, and the main trimmer can adjust twist and backstay in step. Changing the jib's depth or twist always changes what the main needs.`,
      },
    ],
    physics: `Lift of a cambered section depends on angle of attack and camber; deeper sections give more lift (and more drag) and stall at lower angles. Draft position controls where the pressure peak is and how the flow handles the trailing edge: forward draft gives a forgiving entry and a flat exit, aft draft gives a fine entry and a more loaded leech. Twist matches the sail to the twisted apparent wind created by the wind gradient. A suitable twist distribution also lowers induced drag by approaching an elliptical spanwise load and lowers the centre of effort, which reduces heeling moment.`,
    effects: [
      { target: 'Depth', effect: `More depth = more lift and drag, narrower range before stall.` },
      { target: 'Draft position', effect: `Forward = forgiving; aft = pointing but tricky.` },
      { target: 'Twist', effect: `More twist = lower centre of effort, less heel, less pointing.` },
    ],
    interactions: [
      { control: 'Jib sheet', relation: `Trimming reduces both depth and twist; easing increases both.` },
      { control: 'Jib lead', relation: `Fore/aft car sets twist versus foot depth for a given sheet load.` },
      { control: 'Jib halyard', relation: `Halyard moves draft position without changing twist much.` },
      { control: 'Backstay', relation: `Backstay reduces forestay sag and therefore jib depth; a sagging forestay makes the jib deeper with a finer entry.` },
    ],
    mistakes: [
      `Using one setting for all conditions.`,
      `Confusing twist and depth: easing the sheet in a breeze adds depth low down as well as twist.`,
      `Removing all twist in light air, making the top stall.`,
    ],
    keyPoints: [
      `Depth, draft position and twist are linked but distinct.`,
      `Twist exists because the apparent wind changes with height.`,
      `More wind: flatter, more twist. Chop: a bit fuller and more twist.`,
      `Draft around 35-40% on the jib.`,
    ],
    diagram: 'twist',
    lab: {
      controls: ['jibSheet', 'jibLead', 'jibHalyard', 'backstay'],
      focus: ['jibDepth', 'jibDraft', 'jibTwist', 'heelMoment'],
      tws: 12,
      twa: 42,
      presets: [
        { name: 'Light air', description: `Moderate depth, more twist, soft halyard in 6 kn.`, controls: { jibSheet: 0.75, jibLead: 0.45, jibHalyard: 0.35, backstay: 0.1 }, tws: 6 },
        { name: 'Medium power', description: `Full depth, little twist in 12 kn.`, controls: { jibSheet: 0.88, jibLead: 0.45, jibHalyard: 0.55, backstay: 0.3 } },
        { name: 'Heavy air', description: `Flat, twisted, firm halyard in 20 kn.`, controls: { jibSheet: 0.9, jibLead: 0.8, jibHalyard: 0.85, backstay: 0.85 }, tws: 20 },
      ],
    },
    check: [
      {
        question: `Why does a jib need twist?`,
        options: [`To reduce the sail area`, `Because the apparent wind is wider and stronger aloft`, `To keep the leech telltales stalled`],
        correct: 1,
        explanation: `The wind gradient makes the apparent wind angle wider aloft. Twist keeps the angle of attack similar at all heights.`,
      },
      {
        question: `Which control moves the draft position with the least effect on twist?`,
        options: [`Jib sheet`, `Jib halyard`, `Jib lead`],
        correct: 1,
        explanation: `Halyard tension shifts cloth to or from the luff; sheet and lead act strongly on twist.`,
      },
    ],
  },
  {
    id: 'jib-telltales',
    module: 'headsail',
    title: 'Telltales',
    altName: 'Penons',
    level: 1,
    skill: 'headsail',
    summary: `Telltales show whether the airflow is attached on both sides of the luff and at the leech; reading them correctly is the base of every jib decision.`,
    sections: [
      {
        heading: 'What each telltale tells you',
        body: `Luff telltales are near the leading edge, on both sides, usually at three heights. When both stream aft, the flow is attached and the angle of attack is in the correct range. If the windward telltale lifts or spins, the angle of attack is too small: the sail is about to luff (either the helm is pinching or the sail is under-trimmed). If the leeward telltale stalls (droops, spins or curls forward), the angle of attack is too large: the flow has separated on the lee side (helm sailing too low or sail over-trimmed).\n\nLeech telltales, on the trailing edge, show whether the flow leaves the sail cleanly. If they fold behind the sail, the leech is too tight for the flow speed.`,
      },
      {
        heading: 'Steering versus trimming',
        body: `Upwind on this class, the helm steers to the jib telltales and you trim so that they work in the chosen mode. A telltale that breaks while the boat is on a steady course is a trim signal; a telltale that breaks because the boat changed heading is a steering signal. In pointing mode, the windward telltale lifts occasionally (it should "dance"); in speed / footing mode, both stream with the leeward one occasionally twitching. In waves, accept more movement: the boat's heading and the apparent wind oscillate, and chasing every flicker with the sheet costs more than it gains.\n\nThe three heights tell you about twist: if all heights break together when the helm luffs slowly, the lead is neutral. If the top breaks first, the top is twisted open (lead forward); if the bottom breaks first, the top is closed relative to the foot (lead aft). In a breeze, a top that breaks slightly first is often desirable because it means the head is depowered.`,
      },
      {
        heading: 'Communicating and pitfalls',
        body: `As jib trimmer you often see the leeward telltales better than the helm. Give short, consistent calls: "lee stalling", "windward dancing", "top lifting", "all flowing". In a match, the helm is often looking at the opponent or the line; your telltale calls become the helm's eyes on the jib, and they are most valuable in the pre-start and in the first seconds after a tack.\n\nIn very light air telltales can droop for lack of wind and mislead you: distinguish drooping (no flow energy, telltale hanging) from spinning or curling forward (separated flow). Keep them clean and made of light wool or ripstop; wet telltales stick to the sail and lie. Also remember the main has its own: the top-batten leech telltale is the main trimmer's equivalent of your luff telltales, and both sails should be read together.`,
      },
    ],
    physics: `A telltale is a flow indicator: when the boundary layer is attached it is pulled aft along the surface. On the windward side near the luff, a small angle of attack moves the stagnation point to leeward of the leading edge, so flow on the windward side reverses and the windward telltale lifts. On the leeward side, a large angle of attack creates an adverse pressure gradient that the boundary layer cannot overcome; the flow separates and the leeward telltale stalls. Leech telltales indicate whether the trailing-edge flow leaves cleanly (Kutta condition) or separates early.`,
    effects: [
      { target: 'Windward luff telltale lifting', effect: `Angle of attack too low: bear away or trim in.` },
      { target: 'Leeward luff telltale stalling', effect: `Angle of attack too high: head up or ease.` },
      { target: 'Leech telltale folding', effect: `Leech too tight for the flow: ease the sheet or move the lead aft.` },
    ],
    interactions: [
      { control: 'Jib sheet', relation: `Sheet sets the angle of attack the telltales report; trim in when windward lifts while on course, ease when leeward stalls.` },
      { control: 'Jib lead', relation: `The order in which heights break tells you if the lead is right.` },
      { control: 'Helm', relation: `The helm can respond to telltales faster than the trimmer; agree who reacts to what.` },
      { control: 'Mainsail', relation: `Main leech telltales (top batten) are the main equivalent; watch both sails together for slot balance.` },
    ],
    mistakes: [
      `Mixing up windward and leeward signals.`,
      `Over-reacting to every flicker in waves.`,
      `Reading drooping telltales in light air as stall.`,
    ],
    keyPoints: [
      `Windward lifting = too low an angle of attack; leeward stalling = too high.`,
      `Three heights reveal twist and lead position.`,
      `Leech telltales show if the leech is too tight.`,
      `Short telltale calls help the helm in a match.`,
    ],
    diagram: 'telltales',
    lab: {
      controls: ['jibSheet', 'jibLead'],
      focus: ['jibAoA', 'jibTwist', 'speed'],
      tws: 10,
      twa: 40,
      presets: [
        { name: 'Under-trimmed', description: `Windward telltales lifting.`, controls: { jibSheet: 0.6 } },
        { name: 'Correct', description: `Both sides streaming.`, controls: { jibSheet: 0.85 } },
        { name: 'Over-trimmed', description: `Leeward telltales stalling.`, controls: { jibSheet: 1 } },
      ],
    },
    check: [
      {
        question: `The leeward luff telltale is spinning. What is the angle of attack?`,
        options: [`Too small`, `Too large`, `Correct`],
        correct: 1,
        explanation: `Leeward stall means separated flow on the lee side, caused by too large an angle of attack.`,
      },
      {
        question: `The windward telltale lifts while on course. Trimmer's response?`,
        options: [`Ease`, `Trim in`, `Move lead aft`],
        correct: 1,
        explanation: `Windward lifting means too small an angle of attack; trimming in increases it.`,
      },
    ],
  },
  {
    id: 'jib-over-under-trim',
    module: 'headsail',
    title: 'Over-trimming and under-trimming',
    altName: 'Sur-bordé / sous-bordé',
    level: 1,
    skill: 'headsail',
    summary: `Most lost speed comes from small trim errors: over-trimming stalls the sail and makes heel without speed, under-trimming luffs it and wastes area.`,
    sections: [
      {
        heading: 'Over-trimming',
        body: `Over-trimming increases the angle of attack beyond the point where the flow can stay attached to the leeward side. The leeward telltales stall, the upper leech closes, drag rises sharply and the total force rotates sideways: you get heel and leeway instead of drive. The boat feels "loaded" and powerful, the helm gets heavier, and the speed drops gradually, which is why it is so easy not to notice.\n\nIt is the most common trimmer error because trimming harder feels like doing more. It is especially costly in light air (the flow has little energy and separates early), in waves (the boat keeps slowing and the apparent wind keeps moving aft) and right after a tack, when the boat is below target speed and the apparent wind is wider than at full speed.`,
      },
      {
        heading: 'Under-trimming',
        body: `Under-trimming lowers the angle of attack until the luff lifts and the windward telltales break. The front of the sail stops producing lift, a luff bubble appears, the jib loses power and the boat cannot point; the slot also opens too wide, so the main loses some of the jib's help. In a breeze a jib eased a couple of centimetres for a few seconds is a legitimate depower, but sustained under-trimming simply wastes sail area.\n\nIt typically happens when a gust ease is not trimmed back in, or when the trimmer is looking at the opponent instead of the sail. A J/80 jib only has a few centimetres between "fast" and "luffing", so a sheet that creeps on the winch drum is enough.`,
      },
      {
        heading: 'Finding the edge',
        body: `The fast trim is close to the stall edge, but on the attached side. Technique: ease slowly until the luff just starts to lift, then trim back until it stops, plus a centimetre. Repeat regularly, and every time the wind, the sea state or the boat speed changes. Use speed as the referee, not feel: "speed down 0.2, easing 2 cm".\n\nIn a match, over-trimming at the start or out of tacks costs boat-lengths that are very hard to recover. Before the gun, agree on the "go" trim with the helm and do not trim harder than the mark until the boat is at full speed. Exact marks depend on the boat, sails, rig tune and sea state.`,
      },
    ],
    physics: `Lift rises nearly linearly with angle of attack until the flow begins to separate from the leeward side; beyond that, lift stops increasing and then falls, while drag rises steeply. The total aerodynamic force can be resolved into drive (along the course) and side force (across it). Past the stall, the force vector rotates away from the course: less drive, similar or more side force, more heel and leeway. Under-trimming moves the stagnation point to the leeward side of the luff, so the flow on the windward side separates around the leading edge and the front of the sail produces little lift. The best drive for a given heel is found just before stall onset.`,
    effects: [
      { target: 'Over-trim', effect: `Leeward stall, closed leech, more heel and leeway, more drag, gradual loss of speed.` },
      { target: 'Under-trim', effect: `Luff bubble, lost lift, poor pointing, slot too wide.` },
      { target: 'Edge trim', effect: `Maximum drive for the heel, both luff telltales streaming.` },
    ],
    interactions: [
      { control: 'Mainsheet', relation: `The main can be over-trimmed in exactly the same way (top leech telltale hidden). The two sails are often over-trimmed together when the crew "presses" for height.` },
      { control: 'Jib lead', relation: `A lead too far forward makes the top over-trimmed even with a correct sheet; a lead too far aft makes the top under-trimmed. Fix the lead before blaming the sheet.` },
      { control: 'Helm', relation: `Over-trim, especially of the main, increases weather helm, so the helm fights with the rudder and adds drag.` },
      { control: 'Backstay', relation: `With the backstay on, the jib is flatter and stalls at a lower angle of attack, so the stall edge is closer: trim with more care.` },
    ],
    mistakes: [
      `Trimming harder whenever speed drops.`,
      `Never easing to check where the edge is.`,
      `Leaving the sail eased after a gust has passed.`,
      `Trimming to the full-speed mark while the boat is still slow.`,
    ],
    keyPoints: [
      `Fast trim is just on the attached side of the stall edge.`,
      `Over-trim = heel without speed.`,
      `Test the edge regularly: ease until the luff lifts, then trim back a little.`,
      `At low speed (out of tacks, after waves) the apparent wind is wider: the right trim is more eased.`,
    ],
    diagram: 'aoa',
    lab: {
      controls: ['jibSheet', 'mainSheet'],
      focus: ['jibAoA', 'drive', 'heel', 'speed'],
      tws: 10,
      twa: 42,
      presets: [
        { name: 'Under-trim', description: `Jib luffing.`, controls: { jibSheet: 0.55 } },
        { name: 'Edge', description: `Optimal.`, controls: { jibSheet: 0.85 } },
        { name: 'Over-trim', description: `Stalled.`, controls: { jibSheet: 1, mainSheet: 1 } },
      ],
    },
    check: [
      {
        question: `Boat heels more but speed drops after you trim harder. What happened?`,
        options: [`You found more power`, `You stalled the sail`, `The wind increased`],
        correct: 1,
        explanation: `Past stall, the force rotates sideways: more heel, less drive.`,
      },
      {
        question: `Best way to find the correct trim?`,
        options: [`Trim to block`, `Ease until the luff lifts, then trim back slightly`, `Follow the opponent's trim`],
        correct: 1,
        explanation: `This locates the edge of attached flow and sets the trim just inside it.`,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// MODULE: MAINSAIL
// ---------------------------------------------------------------------------

const MAINSAIL: Lesson[] = [
  {
    id: 'mainsheet',
    module: 'mainsail',
    title: 'Mainsheet',
    altName: 'Écoute de GV',
    level: 2,
    skill: 'mainsail',
    summary: `Upwind, the mainsheet is mostly a leech-tension and twist control; the traveller handles the boom angle, and together they set the main's power and the boat's helm.`,
    sections: [
      {
        heading: 'Sheet = leech, traveller = angle',
        body: `When the boom is close to the centreline, the mainsheet pulls mostly downwards. Its main effect is therefore on leech tension: more sheet closes the leech, reduces twist and makes the sail point; less sheet lets the upper leech fall off, which twists the top and depowers. The boom angle itself is set mainly with the traveller. Separating these two jobs is the key to good main trim on a J/80-type boat.\n\nThe classic upwind reference is the top batten: roughly parallel to the boom when viewed from under the boom, with the top leech telltale streaming about half the time. In light air the top batten should point slightly to leeward (more twist); in medium air parallel; in breeze, let the top open off as needed to keep the boat on its feet.`,
      },
      {
        heading: 'Fine-tune and gust response',
        body: `The mainsheet on this class usually has a coarse and a fine tune. Use the fine tune for small leech changes upwind and the coarse purchase for big changes (bear-aways, gusts). In a gust, the first move is often to ease the sheet 5-15 cm to open the leech and reduce heeling moment at the top of the rig, then trim back as the boat accelerates and the gust stabilises. Easing too much makes the boom rise and the sail deepen, which is why vang becomes important in a breeze.\n\nIn match racing the main trimmer is also the boat's "accelerator and brake" in the pre-start: trim in to accelerate, ease to slow down. Coordinate with the jib: if the main is trimmed hard while the jib is still eased, the boat will round up.`,
      },
      {
        heading: 'Communication with helm and jib',
        body: `The mainsheet strongly affects helm balance: a tight leech moves the centre of effort aft and increases weather helm. The helm will feel it immediately and should give short feedback: "heavy", "light", "good". In return, the main trimmer calls changes: "easing", "on".\n\nThe jib trimmer watches the slot: if the main is over-trimmed relative to the jib, the main's leech stalls and the jib's exit is fine but the main produces extra heel. Keep both leeches twisting similarly.`,
      },
    ],
    physics: `A sail's leech shape sets the exit angle of the flow and hence the circulation of each section. More leech tension increases circulation (more lift, more pointing) but loads the upper sections, which have the largest heeling arm. Because the wind gradient makes the apparent wind wider aloft, a main without twist is at an excessive angle of attack near the head and stalls there first. Easing the sheet lets the head twist off, reducing upper loading, induced drag and heeling moment at the cost of some pointing. The aft-loaded main also moves the centre of effort aft, which changes the yawing moment and therefore the helm.`,
    effects: [
      { target: 'Leech / twist', effect: `More sheet = tighter leech, less twist; less sheet = open top.` },
      { target: 'Depth', effect: `Easing the sheet lets the boom rise and the sail deepen unless vang holds it down.` },
      { target: 'Helm', effect: `A tight main leech increases weather helm; easing reduces it.` },
    ],
    interactions: [
      { control: 'Traveller', relation: `Traveller sets the boom angle; sheet sets leech tension. Drop the traveller to depower without opening the leech, ease the sheet to open the leech without changing the boom angle much.` },
      { control: 'Vang', relation: `With vang on, easing the sheet moves the boom out rather than up, keeping leech tension; without vang, easing opens the leech strongly.` },
      { control: 'Backstay', relation: `Backstay bends the mast and opens the leech, so you need more mainsheet to hold the same leech tension.` },
      { control: 'Jib sheet', relation: `Main and jib leeches should twist together; trimming the main harder than the jib chokes the slot from behind.` },
    ],
    mistakes: [
      `Using the mainsheet for boom angle and leaving the traveller fixed.`,
      `Over-trimming in light air, stalling the top.`,
      `Not easing in gusts and letting the boat heel past 25°.`,
      `Easing the sheet in breeze with no vang, so the top twists away and the sail gets deep.`,
    ],
    keyPoints: [
      `Mainsheet upwind = leech tension and twist.`,
      `Top batten roughly parallel to the boom, top telltale streaming about half the time.`,
      `Ease in gusts, trim back as speed builds.`,
      `Main leech tension strongly affects weather helm.`,
    ],
    diagram: 'twist',
    lab: {
      controls: ['mainSheet', 'traveller', 'vang'],
      focus: ['mainTwist', 'mainAoA', 'heel', 'rudder', 'speed'],
      tws: 12,
      twa: 42,
      presets: [
        { name: 'Eased sheet', description: `Open leech, more twist, less heel and helm.`, controls: { mainSheet: 0.6 } },
        { name: 'Pointing', description: `Top batten parallel, firm leech.`, controls: { mainSheet: 0.85 } },
        { name: 'Over-trim', description: `Leech closed, high heel and weather helm.`, controls: { mainSheet: 1 } },
      ],
    },
    check: [
      {
        question: `Upwind with the boom near centreline, what does the mainsheet mainly control?`,
        options: [`Boom angle`, `Leech tension and twist`, `Draft position`],
        correct: 1,
        explanation: `With the boom near the centreline the sheet pulls mostly down, so it controls the leech; traveller controls the angle.`,
      },
      {
        question: `A gust hits, heel rises to 28°. First mainsheet action?`,
        options: [`Trim harder`, `Ease to open the leech, trim back as speed builds`, `Nothing`],
        correct: 1,
        explanation: `Easing reduces the top's loading and heeling moment; trim back once the boat accelerates.`,
      },
    ],
  },
  {
    id: 'traveller',
    module: 'mainsail',
    title: 'Traveller',
    altName: 'Chariot de GV',
    level: 2,
    skill: 'mainsail',
    summary: `The traveller changes the main's angle of attack without changing twist, making it the cleanest power control for the main upwind.`,
    sections: [
      {
        heading: 'What it does',
        body: `Moving the traveller car to windward raises the boom towards the centreline while the sheet keeps leech tension constant; moving it to leeward drops the boom and reduces the angle of attack of the whole main without opening the leech. That is why the traveller is the preferred tool to depower in moderate gusts: it reduces heel while keeping the sail's shape intact.\n\nIn light air, pull the car to windward so the boom is near the centreline while the sheet is eased to keep twist. In medium wind, centre or slightly to windward. In heavy wind, drop it to leeward and hold the sheet firm.`,
      },
      {
        heading: 'Playing it in gusts',
        body: `In a gust, drop the traveller 5-15 cm as the pressure arrives; when the gust settles and the boat has accelerated, bring it back up. Done well, the helm hardly needs to change course, the heel stays close to target and the rudder stays light. In stronger gusts, combine traveller and mainsheet (or vang sheeting in a breeze), and in sustained wind add backstay so the traveller can come back up.\n\nOn a J/80-type boat the traveller is usually played by the main trimmer while the jib trimmer keeps the jib steady, because the jib is the reference the helm steers to. If the main trimmer is overloaded or looking at the opponent, the jib trimmer can call the gusts and the heel: "pressure in 3 ... on you ... back up".`,
      },
      {
        heading: 'Match racing use',
        body: `In the pre-start, the traveller decides how the main responds when you power up. A centred car with an eased sheet gives a twisted main that powers up smoothly without a big helm spike when you trim for the line. When you need height to protect a lane or hold the opponent on your hip, carry the car a little higher with a slightly eased sheet: the boom comes towards the centreline for pointing while the leech stays open enough to keep speed.\n\nCall "car down" or "car up" to the helm: they feel the change in helm load immediately and should expect it. Like every number in this app, the ranges depend on your traveller system, mainsail cut, rig tune and crew weight.`,
      },
    ],
    physics: `Angle of attack sets the lift coefficient of each section. The traveller rotates the boom, and therefore every chord line of the main, without changing leech tension, so the angle of attack changes by the same amount at all heights while the twist stays the same. Dropping the car reduces lift and side force while keeping the flow attached and the sail shape intact, so drag stays low; easing the sheet instead would add twist and depth at the same time. Lowering the main's force also reduces its contribution to the aft part of the rig's centre of effort and reduces heel, both of which lighten weather helm.`,
    effects: [
      { target: 'Angle of attack', effect: `Car to windward = higher angle of attack; car to leeward = lower angle, uniformly up the sail.` },
      { target: 'Heel', effect: `Dropping the car reduces heel with little change of shape or twist.` },
      { target: 'Helm', effect: `Dropping the car reduces weather helm; raising it adds helm and pointing.` },
    ],
    interactions: [
      { control: 'Mainsheet', relation: `Sheet tension holds the leech while the traveller moves the boom. In light air, car up and sheet eased; in breeze, car down and sheet firm.` },
      { control: 'Vang', relation: `With vang on, the leech stays controlled when the boom goes out; without vang, a big traveller drop combined with an eased sheet lets the boom rise and the top twist away.` },
      { control: 'Backstay', relation: `Backstay flattens and twists the main; with backstay on you need less traveller drop for the same heel, so the car can stay higher for pointing.` },
      { control: 'Jib sheet', relation: `Dropping the main traveller widens the slot behind the jib; the jib can stay trimmed, but check the main's luff is not backwinded excessively.` },
    ],
    mistakes: [
      `Leaving the traveller cleated and using only the sheet, which adds twist and depth every time you depower.`,
      `Pulling the car to windward in a breeze, adding heel and weather helm.`,
      `Dropping the car in a gust and forgetting to bring it back once the boat has accelerated.`,
    ],
    keyPoints: [
      `Traveller = angle of attack; sheet = leech tension.`,
      `Light air: car to windward, sheet eased. Breeze: car down, sheet firm.`,
      `Play the car in gusts to keep heel and helm constant.`,
      `Bring it back up as soon as the boat has accelerated.`,
    ],
    diagram: 'aoa',
    lab: {
      controls: ['traveller', 'mainSheet'],
      focus: ['mainAoA', 'heel', 'rudder', 'drive'],
      tws: 14,
      twa: 42,
      presets: [
        { name: 'Car up', description: `Boom near centreline.`, controls: { traveller: 0.75 } },
        { name: 'Centred', description: `Balanced.`, controls: { traveller: 0.5 } },
        { name: 'Car down (gust)', description: `Depower in 20 kn.`, controls: { traveller: 0.2 }, tws: 20 },
      ],
    },
    check: [
      {
        question: `Best main control for depowering in a moderate gust without changing shape?`,
        options: [`Outhaul`, `Traveller`, `Cunningham`],
        correct: 1,
        explanation: `The traveller changes angle of attack without changing twist.`,
      },
      {
        question: `In light air, the traveller is typically...`,
        options: [`To windward`, `Full leeward`, `Centred with sheet max`],
        correct: 0,
        explanation: `The car to windward lets the boom sit near centreline while the sheet stays eased for twist.`,
      },
    ],
  },
  {
    id: 'vang',
    module: 'mainsail',
    title: 'Vang / kicker',
    altName: 'Hale-bas',
    level: 3,
    skill: 'mainsail',
    summary: `The vang holds the boom down so leech tension no longer depends on the mainsheet; it is a breeze-upwind and downwind control, and it also bends the lower mast.`,
    sections: [
      {
        heading: 'Why the vang exists',
        body: `Upwind with the traveller in its working range, the mainsheet pulls the boom down and holds the leech. As soon as you ease the sheet a long way (a big gust, a bear-away, a reach or a run), the sheet pulls more outwards than downwards and the boom lifts. A lifting boom means a falling-off upper leech, a lot of twist and a deeper lower main. The vang is the strut between the boom and the mast foot that stops this: with vang on, easing the sheet swings the boom out at a roughly constant leech tension.\n\nIn light and medium air upwind, the vang is usually just slack-free (no real load), because the sheet does the job and extra vang would over-bend the lower mast and flatten the main when you need power. From roughly 14-16 kn on a J/80-type boat, teams start "vang sheeting": vang tensioned so the main trimmer can ease large amounts of sheet in gusts while the leech stays controlled.`,
      },
      {
        heading: 'Vang effect on the mast and the sail',
        body: `The vang pulls the boom down and pushes the gooseneck forward into the mast. That compressive load bends the lower part of the mast forward, which flattens the lower main and frees the lower leech slightly. So vang is both a leech control and a lower-mast bend control. Combined with backstay (which bends the upper mast), you can flatten the whole main in a breeze.\n\nDownwind, the vang is the main twist control. Too little vang and the top twists off past the apparent wind, producing little drive and pushing the boat to roll to windward; too much vang and the leech hooks and stalls the top. A good reference downwind is the top batten roughly parallel to the boom, with the top leech telltale streaming.`,
      },
      {
        heading: 'Match racing timing',
        body: `Ease the vang before bearing away at the windward mark: with vang hard on, the leech is locked and the boat resists bearing away (the closed main keeps pushing the stern to leeward and creates weather helm while the boom is still in). Then set the downwind vang once the gennaker is drawing. Before the leeward mark, put upwind vang tension back on before the boat heads up, otherwise the boom lifts as the sheet comes in and the leech will be wrong for the first metres of the beat.\n\nCall the vang changes as part of the rounding plan: "vang off for bear-away", "vang on for rounding". It is a small control but it decides whether the boat turns where the helm wants, and in a match a sloppy rounding hands the opponent an overlap or a luffing opportunity.`,
      },
    ],
    physics: `Leech tension is the downward pull at the clew/boom end. With the boom near the centreline the sheet supplies it; as the sheet is eased its vertical component shrinks, and only the vang can maintain it. Leech tension sets the twist and circulation of the upper sections. The vang force also creates a horizontal compression at the gooseneck that bends the lower mast forward; a bent mast takes up the luff curve cut into the sail and flattens the lower sections. Downwind, the main's flow is often partly separated; correct twist via the vang keeps the upper sections at a useful angle to the (twisted) apparent wind and limits the rolling moment produced by a head that has twisted to windward of the wind.`,
    effects: [
      { target: 'Leech tension when eased', effect: `Vang keeps the leech closed when the sheet is eased; without vang the top twists off.` },
      { target: 'Lower mast bend', effect: `Vang pushes the gooseneck forward and flattens the lower main.` },
      { target: 'Downwind twist', effect: `Vang is the primary main twist control downwind.` },
    ],
    interactions: [
      { control: 'Mainsheet', relation: `With vang on, the sheet becomes a boom-angle control (vang sheeting); with vang off, the sheet is the leech control.` },
      { control: 'Traveller', relation: `In breeze, vang sheeting can partly replace traveller play: ease sheet and the boom goes out without opening the leech much.` },
      { control: 'Backstay', relation: `Backstay bends the upper mast and vang bends the lower; together they flatten the whole main. Too much of both can over-bend the mast and produce wrinkles from the clew towards the mast.` },
      { control: 'Outhaul', relation: `Vang and outhaul both flatten the lower main; with heavy vang you may need slightly less outhaul.` },
    ],
    mistakes: [
      `Leaving vang on hard for the bear-away, making the boat refuse to turn.`,
      `Too much vang in light air, killing lower-main power.`,
      `Forgetting vang before the leeward mark, so the leech is open on the first metres of the beat.`,
      `No vang downwind, letting the top twist off and the boat roll.`,
    ],
    keyPoints: [
      `Vang holds leech tension when the sheet is eased.`,
      `Upwind in breeze: vang sheeting. Light air: just remove the slack.`,
      `Vang also bends the lower mast and flattens the lower main.`,
      `Ease for the bear-away, re-tension before the leeward mark.`,
    ],
    diagram: 'twist',
    lab: {
      controls: ['vang', 'mainSheet', 'traveller'],
      focus: ['mainTwist', 'mainDepth', 'heel', 'rudder'],
      tws: 18,
      twa: 42,
      presets: [
        { name: 'Vang off, sheet eased', description: `Boom rises, top twists away, lower main gets deeper.`, controls: { vang: 0, mainSheet: 0.55 } },
        { name: 'Vang sheeting', description: `Vang on, sheet eased: boom out, leech held, heel controlled.`, controls: { vang: 0.7, mainSheet: 0.55 } },
        { name: 'Vang max, sheet on', description: `Leech locked and lower mast bent: flat but heavy on the helm.`, controls: { vang: 1, mainSheet: 0.85 } },
      ],
    },
    check: [
      {
        question: `Why ease the vang before bearing away at the windward mark?`,
        options: [`To raise the boom for crew clearance`, `A locked leech keeps the main loaded and the boat resists bearing away`, `To flatten the main`],
        correct: 1,
        explanation: `With the vang on, the leech stays closed as the sheet is eased; the main keeps generating a strong luffing moment and the helm has to fight to bear away.`,
      },
      {
        question: `In 18 kn upwind with vang on, easing the mainsheet...`,
        options: [`Lifts the boom and opens the leech a lot`, `Moves the boom out while keeping most of the leech tension`, `Moves the draft forward`],
        correct: 1,
        explanation: `The vang supplies the downward force, so the sheet mainly changes the boom angle.`,
      },
    ],
  },
  {
    id: 'outhaul',
    module: 'mainsail',
    title: 'Outhaul',
    altName: 'Bordure',
    level: 2,
    skill: 'mainsail',
    summary: `The outhaul sets the depth of the lower third of the main: eased for power in light air and chop, tight for flat water, breeze and pointing.`,
    sections: [
      {
        heading: 'The lower main',
        body: `The outhaul tensions the foot of the main along the boom. Easing it lets the lower sections become deeper (more camber, more power); tightening it flattens them. The effect is strongest near the boom and fades by about a third of the way up the sail. A practical reference is the foot shelf: the distance between the boom and the deepest point of the foot, often roughly a hand-width in medium air, less in a breeze.\n\nThe lower main sits behind the jib's leech, so its depth also changes how the slot works. A deep main foot behind a hard-trimmed jib is the first part of the main to show backwind; a flatter main foot keeps the lower slot open.`,
      },
      {
        heading: 'Settings through the range',
        body: `Very light air (under 5-6 kn), flat water: moderately eased but not fully, because a very deep section needs flow energy the air does not have and separates. Light air with leftover chop: eased for power. Medium (8-14 kn): moderately tight to cut drag while keeping drive. Heavy air (15+ kn): at or near max to flatten the lower main and reduce heel. Downwind: ease to the light-air mark or further for depth, except in very strong winds where a flatter main is easier to control.\n\nAs always, the right numbers depend on the main's cut, boom stiffness, mast tune, sea state and how much crew weight you have on the rail. Put marks on the boom and log what was fast.`,
      },
      {
        heading: 'In a match',
        body: `Outhaul is a "gear" control: set it at the start of each leg and change it when the conditions change, not tack by tack. In the pre-start, set it for the wind you expect at the gun rather than for the light patch you are sitting in. At the leeward mark put on the upwind setting as you round; at the windward mark ease it for the run as part of the bear-away routine.\n\nThe main trimmer usually handles it, but the jib trimmer should know the setting and call it if the jib foot and main foot look mismatched ("main foot is backwinding").`,
      },
    ],
    physics: `Camber of the lower sections sets their lift and drag. Because the lower part of the main has a short heeling arm, power there produces less heeling moment than the same power aloft, so in light-medium air the outhaul is a heel-cheap power control. Once the boat is limited by righting moment, extra lift mostly turns into heel and induced drag; flattening the lower main reduces profile drag and lets the boat stand up. In chop, extra camber produces more lift at a given angle of attack, helping the boat recover speed after each wave.`,
    effects: [
      { target: 'Lower-main depth', effect: `Eased = deeper, more power; tight = flatter, less drag.` },
      { target: 'Slot', effect: `A flatter main foot opens the lower slot behind the jib.` },
      { target: 'Pointing', effect: `A flatter foot helps pointing in flat water and breeze.` },
    ],
    interactions: [
      { control: 'Vang', relation: `Vang bends the lower mast and also flattens the lower main; with vang on hard, less outhaul may be needed for the same depth.` },
      { control: 'Backstay', relation: `Backstay flattens mainly the upper and middle main; outhaul handles the lower main. Use both to flatten the whole sail in a breeze.` },
      { control: 'Jib lead / jib foot', relation: `Main foot and jib foot share the lower slot; match their depths to avoid backwind.` },
      { control: 'Cunningham', relation: `Flattening the foot tends to move the lower draft aft; cunningham brings it back forward.` },
    ],
    mistakes: [
      `Leaving the outhaul at the downwind setting for the beat.`,
      `Max outhaul in light air and chop, starving the boat of power.`,
      `Changing it every tack instead of per gear.`,
    ],
    keyPoints: [
      `Outhaul = lower-third depth of the main.`,
      `Ease for power in light air and chop; tight for breeze and flat water.`,
      `Ease for downwind, re-set at the leeward mark.`,
      `Coordinate main foot depth with the jib foot.`,
    ],
    diagram: 'draft',
    lab: {
      controls: ['outhaul', 'mainSheet', 'vang'],
      focus: ['mainDepth', 'drive', 'heel', 'speed'],
      tws: 10,
      twa: 42,
      presets: [
        { name: 'Eased (light / chop)', description: `Deep lower main for power in 7 kn.`, controls: { outhaul: 0.25 }, tws: 7 },
        { name: 'Medium', description: `Moderate foot depth in 11 kn.`, controls: { outhaul: 0.6 }, tws: 11 },
        { name: 'Max (breeze)', description: `Flat foot in 18 kn: less heel, less drag.`, controls: { outhaul: 1, vang: 0.5 }, tws: 18 },
      ],
    },
    check: [
      {
        question: `7 kn with leftover chop from a dropped breeze. Outhaul?`,
        options: [`Max`, `Eased for power`, `It does not matter`],
        correct: 1,
        explanation: `The boat needs extra low-down power to recover speed in waves; an eased outhaul gives a deeper lower main.`,
      },
      {
        question: `The outhaul mainly affects...`,
        options: [`The upper leech`, `The depth of the lower third`, `Upper mast bend`],
        correct: 1,
        explanation: `Foot tension changes depth mostly in the lower third of the sail.`,
      },
    ],
  },
  {
    id: 'cunningham',
    module: 'mainsail',
    title: 'Cunningham',
    altName: 'Cunningham',
    level: 3,
    skill: 'mainsail',
    summary: `The cunningham tensions the main's luff to pull the draft forward and slightly free the upper leech, compensating for wind and mast bend pushing the draft aft.`,
    sections: [
      {
        heading: 'Moving the draft forward',
        body: `As the wind builds, the cloth stretches and the draft moves aft. Mast bend from backstay and vang flattens the front of the sail, which also pushes the draft aft. A main with its draft too far aft has a rounder, more closed leech: it points but is slow, heels and creates weather helm. The cunningham pulls the luff down, which draws cloth (and the draft) forward and frees the leech slightly.\n\nOn a J/80-type main, a useful target is the draft around 45-50% of the chord. Light air: cunningham off, small horizontal wrinkles at the luff are acceptable and even fast. Medium: just enough to remove the wrinkles. Heavy: firm, often hard, together with backstay.`,
      },
      {
        heading: 'Depower effect',
        body: `Tensioning the cunningham also frees the upper leech a little, because pulling the luff down lets the head fall off. That is a useful depower in a breeze: draft forward, flatter exit, leech freer, less weather helm, without touching sheet or traveller.\n\nToo much cunningham creates a vertical fold behind the mast and a too-round entry with a very flat back: the main loses pointing and drive. Watch the draft stripes from under the boom; on a boat with a heavy crew you can carry less cunningham for the same heel than on a light one.`,
      },
      {
        heading: 'Race use',
        body: `Set the cunningham before the start and adjust on long legs when the breeze changes. Ease it fully for the downwind leg (more depth, and the draft can move aft). Put it back before the leeward mark, not after: on the first metres of the beat, the main trimmer is busy with sheet and traveller.\n\nTell the helm: "cunningham on, helm should lighten." It is an easy way to reduce weather helm in a building breeze without giving away height with the traveller.`,
      },
    ],
    physics: `Luff tension changes the distribution of camber along the chord. Tensioning the luff draws the point of maximum camber forward and rounds the entry, while the after part of the section flattens and the trailing edge opens. A forward draft has a more gradual pressure recovery towards the leech, so the flow stays attached over a wider range of angles of attack and the leech contributes less to the aft-centred pressure. The centre of effort moves forward slightly and weather helm decreases. A draft too far forward, however, gives a blunt entry with high leading-edge suction peaks and a flat back that produces little lift.`,
    effects: [
      { target: 'Draft position', effect: `More cunningham = draft forward.` },
      { target: 'Leech', effect: `Frees the upper leech slightly.` },
      { target: 'Helm', effect: `Reduces weather helm by unloading the leech.` },
    ],
    interactions: [
      { control: 'Backstay', relation: `Backstay bends the mast and pushes the draft aft; cunningham brings it back forward. In a breeze they are usually tensioned together.` },
      { control: 'Mainsheet', relation: `Cunningham frees the leech; you may need slightly more sheet to keep the top batten parallel to the boom.` },
      { control: 'Outhaul', relation: `Outhaul flattens the foot and moves the lower draft aft; cunningham compensates along the luff.` },
      { control: 'Vang', relation: `Vang bends the lower mast; with heavy vang, extra cunningham keeps the lower draft from drifting aft.` },
    ],
    mistakes: [
      `Using cunningham in light air, flattening the entry and killing power.`,
      `Forgetting to ease it downwind.`,
      `Over-tensioning, creating a vertical fold behind the mast.`,
    ],
    keyPoints: [
      `Cunningham = draft forward, leech slightly freer.`,
      `Target main draft roughly 45-50%.`,
      `Combine with backstay as the breeze builds.`,
      `Off downwind, back on before the leeward mark.`,
    ],
    diagram: 'draft',
    lab: {
      controls: ['cunningham', 'backstay', 'mainSheet'],
      focus: ['mainDraft', 'mainTwist', 'rudder'],
      tws: 16,
      twa: 42,
      presets: [
        { name: 'Cunningham off', description: `Draft drifts aft in 16 kn, leech closed, heavy helm.`, controls: { cunningham: 0, backstay: 0.5 } },
        { name: 'Medium', description: `Draft near 47%, luff wrinkles removed.`, controls: { cunningham: 0.5, backstay: 0.5 } },
        { name: 'Hard + backstay', description: `Heavy-air depower in 20 kn: flat, forward draft, open leech.`, controls: { cunningham: 0.9, backstay: 0.85 }, tws: 20 },
      ],
    },
    check: [
      {
        question: `The breeze has built and the main's draft has moved aft. Which control helps most?`,
        options: [`Cunningham`, `Easing the outhaul`, `Traveller up`],
        correct: 0,
        explanation: `Cunningham tensions the luff and pulls the draft forward.`,
      },
      {
        question: `What does cunningham tension do to the upper leech?`,
        options: [`Closes it`, `Frees it slightly`, `Nothing`],
        correct: 1,
        explanation: `Pulling the luff down frees the upper leech slightly, which also reduces weather helm.`,
      },
    ],
  },
  {
    id: 'backstay',
    module: 'mainsail',
    title: 'Backstay',
    altName: 'Pataras',
    level: 3,
    skill: 'mainsail',
    summary: `On a fractional rig the backstay bends the mast, flattening the main and opening its leech, while also tightening the forestay to flatten the jib: it is the master depower control.`,
    sections: [
      {
        heading: 'One control, two sails',
        body: `On a fractional rig like the J/80, the forestay attaches below the masthead and the backstay pulls the masthead aft. Tensioning the backstay does two things. First, it bends the top of the mast aft and the middle forward; that bend pulls the luff of the main forward in the middle, which flattens the main, moves its draft slightly aft and opens the upper leech. Second, by pulling the mast aft it increases forestay tension, reducing sag, which flattens the jib and gives it a finer entry.\n\nSo the backstay is a whole-rig depower: less depth in both sails, more twist in the main, lower centre of effort. It is the control you reach for when heel goes past target and you have already used traveller and twist.`,
      },
      {
        heading: 'Settings through the range',
        body: `Light air (under 8 kn): backstay off or just removing slack, to keep depth and a forgiving jib. Medium (8-14 kn): progressive, enough to keep the jib from getting too deep as the forestay loads up. Heavy (15+ kn): firm to max, with cunningham to bring the main draft forward again. In waves, a bit less backstay than in flat water for the same wind, because you need the depth and the rounder jib entry.\n\nOn many J/80-type boats the backstay is the trimmer's or the helm's call in gusts. Agree who plays it. Real ranges depend on mast section, spreader sweep and rig tension: some tunes leave little forestay control to the backstay, so check what your boat actually does.`,
      },
      {
        heading: 'Gust management and communication',
        body: `In a gusty match, a typical sequence is: main eases or traveller drops first (instant), backstay comes on if the gust is sustained (a few seconds), and comes off as the gust passes. Changing the backstay changes the jib: the jib flattens and its leech tension changes, so the jib trimmer should re-check the leech-to-spreader distance after a big backstay move.\n\nCall it: "backstay on, jib will flatten". The helm feels the lighter helm and the boat standing up, and can point again.`,
      },
    ],
    physics: `Mast bend increases the distance between the mast's mid-section and the line from head to tack, taking up the luff curve cut into the main. Removing that curve reduces camber in the upper and middle sections. The mast also moves aft at the hounds, loosening the upper leech, which increases twist. Increased forestay tension reduces forestay sag: a sagging forestay makes the jib deeper with draft further aft and a finer entry; a straight forestay flattens it. Lowering the depth of both sails reduces lift at a given angle of attack and lowers the centre of effort, cutting heeling moment roughly in proportion to the force times its height.`,
    effects: [
      { target: 'Main depth', effect: `More backstay = flatter main.` },
      { target: 'Main leech', effect: `More backstay opens the upper leech.` },
      { target: 'Jib (forestay sag)', effect: `More backstay = less sag, flatter jib.` },
      { target: 'Heel', effect: `Reduces heeling moment.` },
    ],
    interactions: [
      { control: 'Mainsheet', relation: `Backstay opens the leech; you need more mainsheet to hold the same leech tension.` },
      { control: 'Cunningham', relation: `Backstay moves draft aft; cunningham brings it forward.` },
      { control: 'Jib sheet / lead', relation: `A straighter forestay flattens the jib; re-check sheet and lead.` },
      { control: 'Jib halyard', relation: `Less sag moves jib draft forward; you may need less halyard.` },
      { control: 'Vang', relation: `Vang bends the lower mast; with backstay, the whole mast bends. Too much of both over-bends the mast and shows as diagonal wrinkles from the clew towards the mast.` },
    ],
    mistakes: [
      `Pulling backstay on in light air and flattening the power out of both sails.`,
      `Not re-trimming the jib after a big backstay change.`,
      `Over-bending the mast, visible as diagonal over-bend wrinkles running from the clew towards the mast.`,
      `Forgetting to ease the backstay for the downwind leg.`,
    ],
    keyPoints: [
      `Backstay = whole-rig depower.`,
      `Bends the mast, opens the main leech, flattens the jib.`,
      `Use with cunningham in breeze.`,
      `Off for light air and downwind.`,
    ],
    diagram: 'mastbend',
    lab: {
      controls: ['backstay', 'mainSheet', 'cunningham'],
      focus: ['mainDepth', 'mainTwist', 'forestaySag', 'heel', 'jibDepth'],
      tws: 16,
      twa: 42,
      presets: [
        { name: 'Backstay off', description: `Deep main, forestay sag, more heel.`, controls: { backstay: 0 } },
        { name: 'Medium', description: `Progressive.`, controls: { backstay: 0.5 } },
        { name: 'Backstay max', description: `Flat rig in 20 kn.`, controls: { backstay: 1, cunningham: 0.8 }, tws: 20 },
      ],
    },
    check: [
      {
        question: `What does backstay tension do to the jib on a fractional rig?`,
        options: [`Makes it deeper`, `Flattens it by reducing forestay sag`, `No effect`],
        correct: 1,
        explanation: `Tensioning the backstay pulls the mast aft and tensions the forestay, reducing sag.`,
      },
      {
        question: `After pulling on backstay you should usually...`,
        options: [`Ease the mainsheet`, `Add mainsheet to hold leech tension`, `Ease the cunningham`],
        correct: 1,
        explanation: `Backstay opens the leech, so more sheet holds it.`,
      },
    ],
  },
  {
    id: 'mast-bend',
    module: 'mainsail',
    title: 'Mast bend',
    altName: 'Cintrage du mât',
    level: 4,
    skill: 'mainsail',
    summary: `Mast bend matches the mast's shape to the luff curve cut into the main: more bend means a flatter main with a more open leech, and it is driven by backstay, vang, rig tune and sheet load.`,
    sections: [
      {
        heading: 'Luff curve and why bend flattens the main',
        body: `A mainsail is cut with a convex luff curve: the luff is not straight but bulges forward in the middle. When the mast is straight, that extra cloth has nowhere to go but into the body of the sail, creating depth near the front. When the mast bends forward in the middle, it "absorbs" the luff curve: the cloth is pulled forward along the mast and the sail flattens, mostly in the front and middle sections.\n\nAs the mast tip moves aft with bend, the distance from head to clew shortens slightly, which frees the upper leech and adds twist. So bend is both a depth control and a twist control, which is why it is such an effective depower.`,
      },
      {
        heading: 'Sources of bend on a J/80-type rig',
        body: `Prebend set at the dock (spreader sweep and rake, shroud tension, mast-step and partner position) gives the baseline. Backstay is the main dynamic control: it bends the upper and middle mast. Vang pushes the gooseneck forward and bends the lower mast. The mainsheet load itself, through the leech, pulls the masthead aft and adds bend in a breeze. The class rules and your rig tune guide decide how much prebend and range you have.\n\nReading bend: sight up the mast's aft face from the gooseneck. In light air you want little bend (deep, powerful main); in breeze, enough bend to flatten without over-bend wrinkles, which run diagonally from the clew towards the mid-mast and mean the mast has more bend than the luff curve.`,
      },
      {
        heading: 'Using it on the race course',
        body: `Mast bend is controlled indirectly, so think in combinations. Building breeze: more backstay (upper bend) plus cunningham (draft forward); in very strong wind, vang on too (lower bend). Light air or big waves: less bend, deeper main. If you see over-bend wrinkles, ease backstay or vang a little; you are flattening past the luff curve and losing drive.\n\nThe jib trimmer should be aware: bending the mast via backstay tightens the forestay and flattens the jib at the same time. Your sail plan changes as a whole, so rebalance the jib after a big change.`,
      },
    ],
    physics: `The luff curve is extra sail cloth beyond a straight line from tack to head. A straight mast forces that cloth into camber near the front of the sail; bending the mast takes up the curve and reduces camber, mainly in the forward sections, which makes the draft appear to move aft. Bend also moves the masthead aft and down relative to the clew, shortening the leech and reducing leech tension, hence more twist. Since depth and twist both reduce lift (and the upper sail's lift has the longest arm), bend lowers heeling moment and moves the centre of effort lower and slightly forward.`,
    effects: [
      { target: 'Main depth', effect: `More bend = flatter main, especially in the front.` },
      { target: 'Twist', effect: `More bend = more open upper leech.` },
      { target: 'Draft position', effect: `Flattening the front moves draft relatively aft.` },
    ],
    interactions: [
      { control: 'Backstay', relation: `Main dynamic source of upper/mid-mast bend.` },
      { control: 'Vang', relation: `Bends the lower mast forward at the gooseneck.` },
      { control: 'Cunningham', relation: `As bend moves draft aft, cunningham brings it back.` },
      { control: 'Mainsheet', relation: `Sheet load adds bend; more bend opens the leech, so more sheet is needed for the same leech.` },
      { control: 'Jib', relation: `Bending via backstay tightens the forestay and flattens the jib.` },
    ],
    mistakes: [
      `Bending the mast in light air or waves and losing power.`,
      `Ignoring over-bend wrinkles.`,
      `Forgetting that bend also affects the jib via forestay tension.`,
    ],
    keyPoints: [
      `Bend absorbs the luff curve and flattens the main.`,
      `Bend also opens the leech.`,
      `Sources: prebend, backstay, vang, sheet load.`,
      `Over-bend wrinkles = too much bend.`,
    ],
    diagram: 'mastbend',
    lab: {
      controls: ['backstay', 'vang', 'cunningham'],
      focus: ['mainDepth', 'mainDraft', 'mainTwist', 'heelMoment'],
      tws: 16,
      twa: 42,
      presets: [
        { name: 'Straight mast', description: `Deep main, closed leech.`, controls: { backstay: 0, vang: 0.1 } },
        { name: 'Moderate bend', description: `Balanced.`, controls: { backstay: 0.5, vang: 0.3, cunningham: 0.4 } },
        { name: 'Max bend', description: `Flat, twisted main in 22 kn.`, controls: { backstay: 1, vang: 0.8, cunningham: 0.8 }, tws: 22 },
      ],
    },
    check: [
      {
        question: `Diagonal wrinkles from clew towards the mid-mast indicate...`,
        options: [`Too little bend`, `Over-bend`, `Outhaul too tight`],
        correct: 1,
        explanation: `The mast is bent more than the luff curve allows.`,
      },
      {
        question: `Why does bend flatten the main?`,
        options: [`It shortens the boom`, `It takes up the luff curve`, `It moves the clew aft`],
        correct: 1,
        explanation: `The luff curve is extra cloth; bending the mast absorbs it.`,
      },
    ],
  },
  {
    id: 'main-leech',
    module: 'mainsail',
    title: 'Main leech tension',
    altName: 'Chute de GV',
    level: 3,
    skill: 'mainsail',
    summary: `Main leech tension sets pointing, power and helm balance; it is controlled mainly by sheet (upwind) and vang (eased / downwind), and read from the top batten and leech telltales.`,
    sections: [
      {
        heading: 'Pointing engine and helm generator',
        body: `A firm main leech increases the circulation of the whole rig and lets the boat point. It does this by turning the flow more at the trailing edge, and because the main sits behind the jib, it also increases the upwash in front of the jib, helping the jib work at a closer angle. That is why a tight leech gives "height". The cost: more drag, more heel, and a centre of effort that moves aft, which increases weather helm.\n\nToo tight, and the leech stalls: the top leech telltale disappears behind the sail and the boat slows while feeling powerful. Too loose, and the boat is fast but low and the main cannot hold the boat up to the wind.`,
      },
      {
        heading: 'References',
        body: `Top batten: viewed from under the boom, roughly parallel to the boom in medium air. Slightly open (pointing to leeward) in light air and in waves. Opening progressively in breeze as you depower. Top leech telltale: streaming about 50% of the time is a good medium-air target; always streaming means you could tighten; hidden behind the sail most of the time means it is stalled.\n\nFeel: the helm reports weather helm. More than a few degrees of rudder angle usually means the leech is too tight for the conditions.`,
      },
      {
        heading: 'Match racing',
        body: `After a tack, start with a slightly open leech (sheet eased a few centimetres) while the boat accelerates, then progressively close it as speed builds, in sync with the jib. In a "hold the lane" situation where you need height, tighten slightly and hike harder; if speed drops more than 0.2 kn, give it back.\n\nIn lulls, do not trim harder by reflex: the apparent wind has dropped and moved forward, the flow is slower, and a tight leech stalls. Ease a touch, let the boat speed up, then trim back.`,
      },
    ],
    physics: `The leech sets the trailing-edge exit angle (Kutta condition), which fixes the circulation of each section and hence lift. A tighter leech increases circulation and pointing, and through upwash ahead of the main improves the jib's local wind angle. Excess leech angle, especially at low flow speeds, produces an adverse pressure gradient near the trailing edge that the boundary layer cannot overcome, leading to trailing-edge separation (leech stall). Lift distribution moved aft also moves the centre of effort aft, increasing the yaw moment towards the wind (weather helm).`,
    effects: [
      { target: 'Pointing', effect: `Tighter leech = more circulation and higher pointing, as long as the flow stays attached.` },
      { target: 'Helm', effect: `Tighter leech = centre of effort further aft and more weather helm.` },
      { target: 'Stall', effect: `Too tight = trailing-edge separation, more drag, loss of speed.` },
    ],
    interactions: [
      { control: 'Mainsheet', relation: `The primary leech control upwind: centimetres of sheet change the top batten angle visibly.` },
      { control: 'Vang', relation: `Holds the leech when the sheet is eased in breeze, on reaches and downwind.` },
      { control: 'Backstay', relation: `Bends the mast and frees the leech, so you need more mainsheet to hold the same leech tension.` },
      { control: 'Cunningham', relation: `Pulling the luff down moves the draft forward and frees the upper leech slightly, lightening the helm.` },
      { control: 'Jib sheet', relation: `Main leech tension increases the upwash on the jib; jib and main leeches should twist together so the slot stays parallel.` },
    ],
    mistakes: [
      `Over-tightening in light air or in lulls, stalling the leech.`,
      `Ignoring the helm's weather-helm feedback.`,
      `Coming out of a tack with the leech already at full pointing tension.`,
    ],
    keyPoints: [
      `Main leech tension = pointing, power and helm.`,
      `Top batten roughly parallel to the boom and top telltale streaming ~50% of the time in medium air.`,
      `Ease to accelerate, close the leech as speed builds.`,
      `A heavy helm with a hidden top telltale = leech too tight.`,
    ],
    diagram: 'twist',
    lab: {
      controls: ['mainSheet', 'vang', 'backstay'],
      focus: ['mainTwist', 'rudder', 'speed', 'heel'],
      tws: 11,
      twa: 42,
      presets: [
        { name: 'Open leech', description: `Top batten well open: fast and light on the helm but low.`, controls: { mainSheet: 0.65 } },
        { name: 'Top batten parallel', description: `Balanced pointing and speed.`, controls: { mainSheet: 0.82 } },
        { name: 'Stalled leech', description: `Sheet block-to-block with vang: hooked leech, heavy helm, slow.`, controls: { mainSheet: 1, vang: 0.6 } },
      ],
    },
    check: [
      {
        question: `In 11 kn the top leech telltale is hidden behind the sail most of the time and the helm is heavy. What do you do?`,
        options: [`Ease the mainsheet slightly: the leech is stalled`, `Nothing, it is the pointing setting`, `Trim harder`],
        correct: 0,
        explanation: `A hidden leech telltale means flow is separating at the leech; easing frees it, reduces drag and lightens the helm.`,
      },
      {
        question: `A tight main leech...`,
        options: [`Reduces weather helm`, `Increases weather helm`, `Has no effect on the helm`],
        correct: 1,
        explanation: `It loads the after part of the sail and moves the centre of effort aft.`,
      },
    ],
  },
  {
    id: 'main-twist',
    module: 'mainsail',
    title: 'Main twist',
    altName: 'Vrillage de GV',
    level: 3,
    skill: 'mainsail',
    summary: `Twist adapts the main to the stronger, wider apparent wind aloft and is the most powerful way to control heel without losing shape.`,
    sections: [
      {
        heading: 'Wind gradient and twisted apparent wind',
        body: `Because of friction with the water, the true wind is slower near the surface than at the masthead: on a typical day it can be 10-20% stronger at 10 m than at 2 m. Boat speed is the same at all heights, so the apparent wind aloft is stronger and comes from a wider angle (more "free"). A sail with no twist would have its top sections at a higher angle of attack than the bottom: the top would stall while the bottom luffs. Twist rotates the upper chords to leeward so each section meets the local apparent wind at the correct angle.\n\nWind gradient is greatest in light, stable air (e.g. cold water, warm air), and smaller in strong, unstable wind. So light air needs more twist than you might think.`,
      },
      {
        heading: 'Twist as a depower',
        body: `In breeze, extra twist beyond the gradient's need deliberately unloads the top of the sail. The top has the longest lever arm above the centre of lateral resistance, so reducing force there reduces heeling moment very efficiently, while the bottom of the sail keeps driving. This also reduces induced drag in many cases because the loading becomes more elliptical.\n\nControls: mainsheet (upwind), vang (eased/downwind), backstay (via mast bend), cunningham (frees the upper leech slightly).`,
      },
      {
        heading: 'In the race',
        body: `Pre-start and out of tacks: more twist for acceleration (mainsheet eased roughly 5-10 cm, top batten pointing a little to leeward), then close the leech progressively as speed builds. Gusts: open the top quickly with the sheet, then trim back as the boat accelerates and the apparent wind moves forward again. Lulls: the flow slows and the top stalls easily, so give a touch of twist rather than trimming harder. Chop: more twist, because the masthead swings through a large arc as the boat pitches and a closed top is constantly stalling and unstalling.\n\nJib and main should twist together. If the main opens in a gust while the jib's top stays closed, the upper slot chokes and the main backwinds aloft; if the jib is twisted and the main is closed, the main's top stalls and the helm loads up. Tell each other: "main twisting" / "jib top open".`,
      },
    ],
    physics: `The apparent wind is the vector sum of the true wind and the wind from boat motion. Because true wind speed increases with height (atmospheric boundary layer) while the boat-speed component is the same at every height, the apparent wind angle increases aloft. A twisted sail keeps the local angle of attack approximately constant along the span. Additional twist reduces lift near the head, which reduces the heeling moment (force times height) disproportionately. A suitable twist distribution also brings the spanwise load closer to elliptical, which minimises induced drag for the lift produced; too little twist overloads the tip and produces a strong tip vortex.`,
    effects: [
      { target: 'Upper angle of attack', effect: `More twist = lower angle of attack aloft; less twist = upper sections closer to stall.` },
      { target: 'Heel', effect: `More twist = lower centre of effort and less heeling moment.` },
      { target: 'Pointing', effect: `Less twist = firmer leech and higher pointing, if the boat has speed.` },
    ],
    interactions: [
      { control: 'Mainsheet', relation: `The primary twist control upwind: easing lets the boom rise slightly and the head fall off.` },
      { control: 'Vang', relation: `Takes over the twist control when the sheet is eased (breeze, reaching, downwind).` },
      { control: 'Backstay', relation: `Mast bend frees the upper leech and adds twist; you need more mainsheet to hold the same twist with backstay on.` },
      { control: 'Traveller', relation: `Changes the angle of attack without changing twist, so use it when you want to depower but keep the leech shape.` },
      { control: 'Jib lead', relation: `Jib twist should match main twist to keep the slot open; moving the jib lead aft opens the jib top.` },
    ],
    mistakes: [
      `Too little twist in light air, stalling the top in the wind gradient.`,
      `Not opening the top in gusts and letting heel climb.`,
      `Mismatched jib and main twist, choking the upper slot.`,
    ],
    keyPoints: [
      `Twist exists because the apparent wind is stronger and wider aloft.`,
      `Twist is the most efficient depower: it unloads the part of the sail with the longest heeling arm.`,
      `More twist for acceleration, lulls and chop.`,
      `Match jib and main twist.`,
    ],
    diagram: 'twist',
    lab: {
      controls: ['mainSheet', 'vang', 'backstay'],
      focus: ['mainTwist', 'heelMoment', 'speed', 'slot'],
      tws: 14,
      twa: 42,
      presets: [
        { name: 'Little twist', description: `Closed top.`, controls: { mainSheet: 0.95 } },
        { name: 'Medium twist', description: `Parallel top batten.`, controls: { mainSheet: 0.8 } },
        { name: 'Lots of twist (gust)', description: `Depower in 20 kn.`, controls: { mainSheet: 0.6, backstay: 0.7 }, tws: 20 },
      ],
    },
    check: [
      {
        question: `Why does a main need twist?`,
        options: [`Wind is stronger and wider aloft`, `To reduce sail area`, `Class rule`],
        correct: 0,
        explanation: `Wind gradient twists the apparent wind.`,
      },
      {
        question: `Most efficient way to reduce heel without losing lower power?`,
        options: [`Twist the top`, `Ease outhaul`, `Raise traveller`],
        correct: 0,
        explanation: `The top has the longest heeling arm.`,
      },
    ],
  },
  {
    id: 'main-draft-position',
    module: 'mainsail',
    title: 'Main draft position',
    altName: 'Position du creux de GV',
    level: 4,
    skill: 'mainsail',
    summary: `Where the main's maximum depth sits (around 45-50% of chord) decides its entry, its leech and its effect on helm; wind, bend and luff tension all move it.`,
    sections: [
      {
        heading: 'Forward versus aft draft',
        body: `Draft position is where the maximum depth of a section sits, measured as a percentage of the chord from the luff. With the draft forward (say 40-45%), the main has a rounder entry and a flatter, straighter exit: it tolerates changes in angle of attack, accelerates well, copes with chop and produces less weather helm. With the draft aft (50% and beyond), the entry is finer and the leech more curved and loaded: the sail points, but the groove is narrow, drag is higher and the helm gets heavy.\n\nThe main works in the upwash and the slot flow of the jib, so its entry is less critical than the jib's, but its leech matters more because it shapes the flow for both sails. A target of roughly 45-50% for the main (versus 35-40% for the jib) is a sensible starting point on a J/80-type rig; sailmakers' numbers for your sails take priority.`,
      },
      {
        heading: 'What moves it',
        body: `Several things push the draft aft without you asking. Wind strength: the cloth stretches under load and the depth migrates towards the leech. Mast bend from backstay and vang flattens the front of the sail, so the remaining depth sits further aft. Mainsheet load: pulling the leech down curves the after part of the sail. Outhaul: tightening the foot flattens the lower sections, and what depth remains tends to sit slightly further aft.\n\nThe main tool to bring it forward is luff tension: cunningham (or the main halyard on boats that use it as a control). Easing the backstay also lets the front of the sail fill again, which moves the draft forward, but at the cost of depth and heel in a breeze.`,
      },
      {
        heading: 'Practical routine in a match',
        body: `Look at the draft stripes from under the boom at the start of each leg and after each significant change in wind strength. If the draft has slid aft as the breeze built (leech looks round, helm heavy, top telltale hiding), add cunningham before reaching for the traveller. In the pre-start, set the draft for the breeze you expect on the first beat, not for the lull you are sitting in.\n\nTell the helm what to expect: "cunningham on, draft forward, groove should be wider". When pointing matters (holding a lane, pinning an opponent), you can accept the draft a touch further aft for a few minutes in flat water, but give it back as soon as speed suffers. Real settings depend on sail cut, mast stiffness, sea state and crew weight.`,
      },
    ],
    physics: `Draft position sets the chordwise pressure distribution. A forward draft produces its suction peak near the luff followed by a long, gentle pressure recovery towards the leech, so the boundary layer stays attached over a wide range of angles of attack. An aft draft produces a flatter front (fine entry, higher pointing) but a steep pressure recovery near the trailing edge, so the leech is loaded and prone to separation when the flow slows. Because the centre of pressure moves with the draft, aft draft moves the centre of effort aft and increases weather helm; forward draft reduces it.`,
    effects: [
      { target: 'Entry', effect: `Draft forward = rounder, more forgiving entry; draft aft = finer entry and narrower groove.` },
      { target: 'Leech', effect: `Draft aft = more curved, loaded leech that can stall in lulls.` },
      { target: 'Helm', effect: `Draft aft moves the centre of effort aft and increases weather helm.` },
    ],
    interactions: [
      { control: 'Cunningham', relation: `The primary tool to move the draft forward; it also frees the upper leech slightly.` },
      { control: 'Backstay', relation: `Backstay bends the mast, flattens the front of the main and moves the draft aft, so it usually needs cunningham alongside it.` },
      { control: 'Outhaul', relation: `Tightening the outhaul flattens the lower main and lets the lower draft slip slightly aft.` },
      { control: 'Mainsheet', relation: `More sheet loads the leech and pulls the effective draft aft; easing does the reverse.` },
      { control: 'Jib halyard', relation: `The jib's draft should sit further forward (35-40%) than the main's; if both have drifted aft in a breeze, tension both luffs.` },
    ],
    mistakes: [
      `Ignoring the draft sliding aft as the breeze builds, then fighting the resulting weather helm with the traveller only.`,
      `Pulling the draft too far forward in flat water, losing pointing with a blunt entry and flat back.`,
      `Never checking the draft stripes, so changes go unnoticed.`,
    ],
    keyPoints: [
      `Target main draft roughly 45-50% of chord; jib roughly 35-40%.`,
      `Wind, mast bend and sheet load move the draft aft.`,
      `Cunningham brings it forward and lightens the helm.`,
      `Forward draft = forgiving and fast to accelerate; aft draft = pointing but narrow groove.`,
    ],
    diagram: 'draft',
    lab: {
      controls: ['cunningham', 'backstay', 'outhaul'],
      focus: ['mainDraft', 'mainDepth', 'rudder'],
      tws: 15,
      twa: 42,
      presets: [
        { name: 'Draft aft', description: `No cunningham, backstay on.`, controls: { cunningham: 0, backstay: 0.7 } },
        { name: 'Draft centred', description: `Balanced.`, controls: { cunningham: 0.5, backstay: 0.5 } },
        { name: 'Draft forward', description: `Max cunningham.`, controls: { cunningham: 1, backstay: 0.3 } },
      ],
    },
    check: [
      {
        question: `The breeze builds from 10 to 16 kn and the main's draft stripes show the draft at about 55%. What is the first fix?`,
        options: [`Add cunningham`, `Ease the outhaul`, `Pull the traveller to windward`],
        correct: 0,
        explanation: `Luff tension pulls the draft back forward and frees the leech. Easing the outhaul adds depth (wrong in a breeze) and traveller up adds heel and helm.`,
      },
      {
        question: `A main with its draft too far aft tends to...`,
        options: [`Increase weather helm`, `Reduce weather helm`, `Have no effect on the helm`],
        correct: 0,
        explanation: `The centre of pressure moves aft with the draft, so the centre of effort moves aft and the boat wants to luff.`,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// MODULE: BEHAVIOR
// ---------------------------------------------------------------------------

const BEHAVIOR: Lesson[] = [
  {
    id: 'heel-angle',
    module: 'behavior',
    title: 'Heel angle',
    altName: 'Gîte',
    level: 2,
    skill: 'balance',
    summary: `Heel is the visible result of the balance between the sails' heeling moment and the boat's righting moment; past a target angle it costs speed, pointing and rudder.`,
    sections: [
      {
        heading: 'Heeling moment versus righting moment',
        body: `The sails produce a total aerodynamic force. Its sideways component (side force), acting at the centre of effort high up in the rig, and the opposing lateral force from the keel and rudder, acting low down, form a couple: the heeling moment. The boat resists it with its righting moment: the boat's weight acting through the centre of gravity and the buoyancy acting through the centre of buoyancy, which moves to leeward as the hull heels. The horizontal distance between them (the righting arm, GZ) times the displacement is the righting moment. Crew hiking on the rail moves the centre of gravity to windward and adds a lot of righting moment on a 1.3 t boat.\n\nThe boat settles at the heel where both moments are equal. More wind means more heeling moment and more heel unless you depower or add righting moment.`,
      },
      {
        heading: 'Why too much heel is slow',
        body: `As heel increases: the keel's effective span and vertical area shrink, so it produces less lift and the boat makes more leeway; the sail plan's projected area into the wind drops and the force tilts upwards; the hull's immersed shape becomes asymmetric, which creates a turning moment towards the wind; the aerodynamic drive force moves to leeward of the hull and also turns the boat into the wind. The helm has to fight with more rudder angle, which adds drag.\n\nOn a J/80-type boat, a reasonable upwind heel target is around 15-20°, with roughly 20-25° as a practical maximum before the boat starts to slow and load the helm. In light air, a few degrees of induced leeward heel (5-10°) helps: gravity gives the sails shape and reduces wetted area.`,
      },
      {
        heading: 'Managing heel in a match',
        body: `The order of responses to a gust: hike harder (righting moment) first if not already maxed, then main trim (ease sheet or drop traveller), then twist (jib ease 1-3 cm), then backstay if sustained. Do not let the boat heel past target before reacting: a few degrees of extra heel in a gust can produce a broach-like luff, and the opponent can gain metres.\n\nThe jib trimmer often sits to leeward or in the middle and can see the heel and the water: call gusts early ("puff in 5") so main and crew are ready. Exact numbers depend on boat, sails, rig tune, sea state and crew weight.`,
      },
    ],
    physics: `Heeling moment = side force × vertical distance between centre of effort and centre of lateral resistance. Righting moment = displacement × righting arm (GZ), increased by crew weight moved to windward. Equilibrium heel occurs where they balance. Heel reduces the keel's projected span and lift slope, increasing leeway and induced drag; it moves the drive force's line of action to leeward, creating a yaw moment towards the wind (weather helm); and it reduces the projected sail area normal to the wind. Beyond an optimum angle the loss in lateral resistance and the added rudder drag outweigh the gain from carrying more sail force.`,
    effects: [
      { target: 'Keel efficiency', effect: `More heel = less effective keel span, more leeway.` },
      { target: 'Helm', effect: `More heel = more weather helm and rudder drag.` },
      { target: 'Sail force', effect: `More heel = less projected area, force tilts upwards.` },
    ],
    interactions: [
      { control: 'Hiking / crew weight', relation: `Crew on the rail adds righting moment; the first defence against heel.` },
      { control: 'Mainsheet / traveller', relation: `Easing the main or dropping the traveller reduces heeling moment quickly.` },
      { control: 'Backstay', relation: `Flattens the rig and reduces heeling moment in sustained wind.` },
      { control: 'Jib sheet / lead', relation: `Easing slightly or moving the lead aft opens the top and reduces heeling moment.` },
    ],
    mistakes: [
      `Letting heel go beyond 25° and losing pointing and rudder control.`,
      `Sailing too flat in light air, losing sail shape.`,
      `Reacting late to gusts.`,
      `Depowering the sails before maxing out hiking.`,
    ],
    keyPoints: [
      `Heel = heeling moment versus righting moment.`,
      `Target ~15-20° upwind, ~20-25° practical maximum on a J/80-type boat.`,
      `Hike first, then main, then twist, then backstay.`,
      `Some leeward heel in light air helps.`,
    ],
    diagram: 'heel',
    lab: {
      controls: ['hike', 'mainSheet', 'traveller', 'backstay'],
      focus: ['heel', 'heelMoment', 'rudder', 'speed'],
      tws: 16,
      twa: 42,
      presets: [
        { name: 'No hiking, full power', description: `Heel over target, heavy helm.`, controls: { hike: 0.1, mainSheet: 0.9, traveller: 0.6, backstay: 0.2 } },
        { name: 'Full hike', description: `Same trim, crew maxed out.`, controls: { hike: 1, mainSheet: 0.9, traveller: 0.6, backstay: 0.2 } },
        { name: 'Full hike + depower', description: `Gust at 20 kn, traveller down and backstay on.`, controls: { hike: 1, mainSheet: 0.85, traveller: 0.35, backstay: 0.75 }, tws: 20 },
      ],
    },
    check: [
      {
        question: `Why does excessive heel increase leeway?`,
        options: [`The sails produce more side force`, `The keel's effective span and lift decrease`, `The rudder grips better`],
        correct: 1,
        explanation: `A heeled keel has less effective vertical span, producing less lift for the same speed.`,
      },
      {
        question: `In a gust, what is usually the first response if the crew is not yet fully hiked?`,
        options: [`Ease the jib 20 cm`, `Hike harder`, `Pull the backstay max`],
        correct: 1,
        explanation: `Righting moment from crew weight keeps the power in the sails; depower only after hiking is maxed.`,
      },
    ],
  },
  {
    id: 'weather-helm',
    module: 'behavior',
    title: 'Weather helm',
    altName: 'Barre ardente',
    level: 3,
    skill: 'balance',
    summary: `Weather helm is the boat's tendency to turn into the wind; a little of it is fast because the rudder then lifts to windward, too much is drag and a sign that the rig and trim are unbalanced.`,
    sections: [
      {
        heading: 'Centre of effort versus centre of lateral resistance',
        body: `The sails' total force acts at the centre of effort (CE). The hull, keel and rudder resist sideways at the centre of lateral resistance (CLR). If the CE is aft of the CLR, the sail force rotates the boat into the wind: weather helm. If it is forward, the boat bears away: lee helm. Designers place the CE slightly ahead of the geometric CLR ("lead") because, in practice, heel and the hydrodynamic centre shift give the boat weather helm when sailing.\n\nHeel adds a second effect: when heeled, the drive force (acting in the rig, out to leeward) and the hull's drag (acting at the hull centreline) are offset sideways. That couple turns the bow to windward. The more the boat heels, the stronger the weather helm.`,
      },
      {
        heading: 'Why a little helm is good',
        body: `With 2-4° of weather helm, the rudder sits at a small angle of attack and produces lift to windward. It then works as a second foil alongside the keel, helping to resist leeway with a good lift-to-drag ratio. The helm also gets "feel": the boat tells the helmsman when it wants to go higher. With zero or lee helm, the rudder may actually push to leeward, the keel has to do all the work, and the boat makes more leeway and feels dead.\n\nBeyond roughly 5-6° of rudder angle, the rudder's induced drag and profile drag increase quickly, and in gusts it may stall, causing a sudden round-up.`,
      },
      {
        heading: 'Controlling helm as trimmer',
        body: `Most helm adjustments come from the main: easing the sheet or dropping the traveller moves the CE forward and reduces heel; cunningham moves the main draft forward and frees the leech; backstay flattens and twists. The jib also affects helm: trimming the jib harder moves the CE forward slightly and lightens the helm, easing it does the reverse. Crew weight that keeps the boat flatter reduces heel-induced helm.\n\nAgree on helm vocabulary with your helmsman: "heavy" = more than desired, "light" = less, "good". In a match, the helm is focused on the opponent; your job is to keep the boat balanced so they can steer with fingers, not arms. Mast rake, rig tune and sail cut also matter; ask the helm for consistent feedback across days.`,
      },
    ],
    physics: `Yaw balance is the sum of moments about the vertical axis. The sail force at the CE and the hydrodynamic force at the CLR produce a yaw moment depending on their fore-aft separation. Heel adds a moment from the lateral offset between drive force and hull resistance. A rudder at a small angle of attack produces lift that contributes to lateral resistance with low drag; at larger angles, induced drag grows with the square of lift and eventually the rudder stalls, losing grip suddenly.`,
    effects: [
      { target: 'Rudder angle', effect: `More weather helm = more rudder angle needed to sail straight.` },
      { target: 'Drag', effect: `Beyond a few degrees, rudder drag rises steeply.` },
      { target: 'Leeway', effect: `A little helm lets the rudder help resist leeway.` },
    ],
    interactions: [
      { control: 'Mainsheet / traveller', relation: `Easing the main or dropping the traveller moves CE forward and reduces heel, both lightening the helm.` },
      { control: 'Cunningham', relation: `Moves main draft forward and frees the leech, reducing helm.` },
      { control: 'Backstay', relation: `Flattens and twists the rig, reduces heel and helm.` },
      { control: 'Jib sheet', relation: `A firmly trimmed jib moves the CE forward slightly; easing the jib increases weather helm.` },
      { control: 'Hiking', relation: `Less heel means less heel-induced helm.` },
    ],
    mistakes: [
      `Trying to remove all helm, losing rudder lift and feel.`,
      `Accepting a lot of helm in a gust instead of depowering.`,
      `Over-trimming the main and expecting the helm to compensate.`,
      `Easing the jib alone in a gust, which increases weather helm.`,
    ],
    keyPoints: [
      `CE aft of CLR = weather helm; heel increases it.`,
      `2-4° of rudder angle is fast; more is drag.`,
      `Main is the main helm control; jib affects it too.`,
      `Keep the boat flat enough to keep the helm light.`,
    ],
    diagram: 'balance',
    lab: {
      controls: ['mainSheet', 'traveller', 'jibSheet', 'hike'],
      focus: ['rudder', 'heel', 'speed'],
      tws: 15,
      twa: 42,
      presets: [
        { name: 'Main over-trimmed', description: `Main hard and car up, jib eased: lots of helm.`, controls: { mainSheet: 1, traveller: 0.75, jibSheet: 0.7, hike: 0.6 } },
        { name: 'Balanced', description: `Main and jib matched, crew hiking.`, controls: { mainSheet: 0.82, traveller: 0.5, jibSheet: 0.85, hike: 0.9 } },
        { name: 'Under-powered main', description: `Main eased a lot: light helm, low pointing.`, controls: { mainSheet: 0.55, traveller: 0.3, jibSheet: 0.88, hike: 0.9 } },
      ],
    },
    check: [
      {
        question: `Why is a little weather helm desirable upwind?`,
        options: [`It slows the boat in gusts`, `The rudder produces lift to windward, helping the keel`, `It reduces heel`],
        correct: 1,
        explanation: `At a small angle the rudder is an efficient foil that adds lateral resistance.`,
      },
      {
        question: `In a gust, the jib trimmer eases 10 cm while the main stays trimmed. Helm result?`,
        options: [`Less helm`, `More weather helm`, `No change`],
        correct: 1,
        explanation: `Removing force from the forward sail moves the CE aft.`,
      },
    ],
  },
  {
    id: 'rudder-load',
    module: 'behavior',
    title: 'Rudder load',
    altName: 'Charge de safran',
    level: 3,
    skill: 'balance',
    summary: `Rudder load shows how hard the rudder works to keep the boat on course; it is drag, a speed brake and the first warning of imbalance.`,
    sections: [
      {
        heading: 'The rudder is a foil, and every degree has a price',
        body: `The rudder generates lift just like the keel. At small angles (2-4°) it produces useful side force with little drag. As the angle increases, its induced drag increases roughly with the square of lift, and beyond about 10-15° of angle of attack it can stall, especially if heel has reduced its immersion or ventilation draws air down from the surface.\n\nEvery degree of rudder angle used to keep the boat straight is drag. Using the rudder to steer actively in waves is also drag. That is why balancing the boat with trim is faster than steering against the rig.`,
      },
      {
        heading: 'What increases rudder load',
        body: `Rudder load rises with anything that moves the centre of effort aft or increases the yaw moment: an over-trimmed main or a main leech that is too closed, a jib eased while the main stays on, heel beyond target, crew weight too far aft (the immersed transom changes the hull's yaw balance and adds drag), and large steering corrections in waves. In gusts, the load spikes in the first second, before the main trimmer reacts: that is the moment the boat can round up if the blade stalls.\n\nOn a J/80-type boat the load is felt directly through the tiller, and the helm is the best sensor on board. A tiller that has to be pulled hard to windward (the helm "fighting" the boat), with the blade at more than about 5-6° of angle for long periods, means the rig is unbalanced and the boat is slower than it could be.`,
      },
      {
        heading: 'Reducing load in a match',
        body: `Pre-start: at low speed the rudder has little authority, because side force grows with the square of speed. Big rudder angles at 2-3 kn mostly brake the boat and can stall the blade. Steer with the sails too: trimming the main and easing the jib helps the bow come up; easing the main and trimming the jib helps it bear away. Coordinate this with the helm: "main off, jib on" for a bear-away when hunting the opponent's stern, "main on" to luff.\n\nUpwind in breeze, keep heel at target with main trim and hiking so the helm can steer with small angles. Ask the helm for one word when load changes ("loading", "light"). Downwind in waves, keep enough weight aft to keep the rudder immersed when surfing, and use gennaker and main trim to help the turns rather than big rudder inputs. Exact behaviour depends on the rudder shape, rig tune, sails and crew weight.`,
      },
    ],
    physics: `Rudder side force L ≈ ½ ρ V² A CL(α), with CL growing roughly linearly with angle of attack α up to stall. At low speed (pre-start, out of a tack), the same side force needs a much larger α, bringing the blade closer to stall. Induced drag scales with L² / (q × span²), so a short, heavily loaded blade is expensive; profile drag also rises with α. Heel reduces the blade's effective span and brings its tip closer to the surface, which promotes ventilation (air drawn down the low-pressure side) and sudden loss of grip. A balanced rig keeps L small, so the rudder works in its efficient low-α range.`,
    effects: [
      { target: 'Drag', effect: `More rudder angle = more induced and profile drag, directly reducing boat speed.` },
      { target: 'Control', effect: `Large angles at low speed or high heel can stall or ventilate the rudder, causing a round-up.` },
      { target: 'Feel', effect: `Moderate load (2-4°) gives the helm feedback and some useful lift to windward.` },
    ],
    interactions: [
      { control: 'Mainsheet / traveller', relation: `Main trim is the strongest lever on rudder load: ease or drop the car and the CE moves forward and the boat flattens.` },
      { control: 'Jib sheet', relation: `A trimmed jib moves the CE forward and lightens the helm; easing the jib alone in a gust loads the rudder.` },
      { control: 'Hiking / crew weight', relation: `A flatter boat has less heel-induced yaw moment and a better-immersed rudder.` },
      { control: 'Backstay / cunningham', relation: `Flattening the main and moving its draft forward lowers the CE and unloads the leech, reducing helm in sustained breeze.` },
    ],
    mistakes: [
      `Steering against an unbalanced rig instead of re-trimming.`,
      `Using big rudder angles at low speed in the pre-start, braking and stalling the blade.`,
      `Ignoring the helm's feedback on load.`,
      `Easing the jib alone in a gust and loading the rudder.`,
    ],
    keyPoints: [
      `Every degree of rudder angle is drag.`,
      `Balance the boat with trim and crew weight, not with the tiller.`,
      `Low speed = low rudder authority: steer with the sails as well.`,
      `Gust onset is when rudder load spikes: depower early.`,
    ],
    diagram: 'balance',
    lab: {
      controls: ['mainSheet', 'traveller', 'jibSheet', 'hike'],
      focus: ['rudder', 'heel', 'speed', 'heelMoment'],
      tws: 16,
      twa: 42,
      presets: [
        { name: 'High load', description: `Main over-trimmed, car up, crew inboard: heavy helm, slow.`, controls: { mainSheet: 1, traveller: 0.7, jibSheet: 0.8, hike: 0.3 } },
        { name: 'Balanced', description: `Main matched to jib, crew hiking: light helm.`, controls: { mainSheet: 0.82, traveller: 0.5, jibSheet: 0.85, hike: 1 } },
        { name: 'Gust, no reaction', description: `Same balanced trim hit by a 21 kn gust before anyone moves.`, controls: { mainSheet: 0.82, traveller: 0.5, jibSheet: 0.85, hike: 1 }, tws: 21 },
      ],
    },
    check: [
      {
        question: `Why does the risk of rudder stall increase at low speed?`,
        options: [`The water is denser`, `A larger angle of attack is needed for the same side force`, `The rudder is effectively smaller`],
        correct: 1,
        explanation: `Side force scales with speed squared; at low speed the rudder must work at a much larger angle, closer to stall.`,
      },
      {
        question: `The helm reports a heavy tiller upwind in 16 kn. Best response?`,
        options: [`Ask the helm to steer harder`, `Rebalance: ease main / drop the car, hike harder`, `Ease the jib`],
        correct: 1,
        explanation: `Reduce the yaw moment at its source; easing the jib alone would move the CE aft and make it worse.`,
      },
    ],
  },
  {
    id: 'speed-acceleration',
    module: 'behavior',
    title: 'Speed and acceleration',
    altName: 'Vitesse et relance',
    level: 3,
    skill: 'maneuvers',
    summary: `A 1.3 t keelboat takes time to accelerate, and at low speed its keel cannot resist leeway: acceleration trim (eased, twisted, slightly lower course) comes before pointing trim.`,
    sections: [
      {
        heading: 'Why low speed changes everything',
        body: `The keel is a foil; its lift grows with the square of boat speed. At 3 kn it produces roughly a third of the lift it produces at 5 kn for the same angle of attack. To resist the same side force from the sails, a slow boat must sail at a larger leeway angle, which means more drag and a boat that slides sideways instead of going forward. At the same time the apparent wind is further aft and lighter at low speed, so the sails need to be eased to match it.\n\nIn practice: when the boat is slow (after a tack, a penalty turn, a dial-up, a luffing duel), the sails must produce drive, not pointing. Easing gives a lower angle of attack relative to a wider apparent wind, more twist and more depth: maximum drive, less side force, less heel.`,
      },
      {
        heading: 'The acceleration sequence',
        body: `Out of a tack on a J/80: the jib comes in fast on high gear to about 2-5 cm short of the pointing mark; the main is eased a few centimetres with the top open; the helm sails 2-4° below the close-hauled course; the crew hikes hard. As the speed builds towards target (watch the speedo, or the bow wave and the feel), the jib comes in the last few centimetres on low gear, the main closes its leech, and the helm comes up to the pointing angle. Typical time to full speed: 5-15 seconds depending on wind and waves.\n\nThe call: "building ... 80% ... on". Trimming too early chokes the acceleration: the boat heels, makes leeway and slows; the helm is pushed up by the closed leeches.`,
      },
      {
        heading: 'Pre-start and match situations',
        body: `In the pre-start, the ability to accelerate from slow to full speed on time is often decisive. Practise "trigger pulls": from luffing (sails out, boat nearly stopped) to full speed in a set number of seconds. Bear away slightly, trim jib first (it pulls the bow down), then main; as speed builds, trim to the mark and head up.\n\nAfter a penalty turn or a dial-down, the same logic applies. In waves, accelerate in a flatter spot between sets and keep a bit more twist and depth. Settings depend on the boat, sails, sea state and crew weight; time your own acceleration in different conditions.`,
      },
    ],
    physics: `Keel lift L = ½ ρ V² A CL(α). At low boat speed V, the keel needs a larger leeway angle α to produce the side force that balances the sails, which greatly increases induced drag. The apparent wind at low boat speed is closer to the true wind angle (wider) and weaker, so sails trimmed for full-speed apparent wind are over-trimmed (stalled) at low speed. Eased, twisted, deeper sails maximise the drive component while limiting side force; once V rises, the keel can carry more side force and the sails can be trimmed for pointing. Inertia (F = m a) means a 1.3 t boat needs sustained drive to accelerate.`,
    effects: [
      { target: 'Leeway', effect: `Low speed = high leeway because the keel produces little lift.` },
      { target: 'Sail trim', effect: `Acceleration trim = eased, twisted, deeper.` },
      { target: 'Course', effect: `A few degrees low until speed builds.` },
    ],
    interactions: [
      { control: 'Jib sheet', relation: `Ease 2-5 cm from the pointing mark, trim progressively with speed.` },
      { control: 'Mainsheet', relation: `Open leech for acceleration, close it as speed builds; the main should follow the jib.` },
      { control: 'Traveller', relation: `Keep the car slightly lower during acceleration in breeze to reduce heel and helm.` },
      { control: 'Hiking', relation: `Max hiking during acceleration converts more of the sail force into drive.` },
    ],
    mistakes: [
      `Trimming to the pointing mark straight out of a tack.`,
      `Heading up before the boat has speed.`,
      `Trimming the main before the jib when bearing away to accelerate.`,
      `Not communicating speed state with the helm.`,
    ],
    keyPoints: [
      `Keel lift ∝ speed²: slow boat = big leeway.`,
      `Acceleration: ease 2-5 cm, twist, sail low.`,
      `Trim and head up progressively with speed.`,
      `Practise timed accelerations for the pre-start.`,
    ],
    diagram: 'apparent',
    lab: {
      controls: ['jibSheet', 'mainSheet', 'hike'],
      focus: ['speed', 'drive', 'heel', 'jibAoA'],
      tws: 10,
      twa: 45,
      presets: [
        { name: 'Acceleration trim', description: `Jib and main eased, sailing slightly low.`, controls: { jibSheet: 0.72, mainSheet: 0.7, hike: 1 }, twa: 46 },
        { name: 'Pointing trim too early', description: `Full trim at low speed: stall, leeway.`, controls: { jibSheet: 0.95, mainSheet: 0.95, hike: 1 }, twa: 40 },
        { name: 'Full speed pointing', description: `Speed built, sails on the mark.`, controls: { jibSheet: 0.86, mainSheet: 0.82, hike: 1 }, twa: 41 },
      ],
    },
    check: [
      {
        question: `Why does a slow keelboat make more leeway?`,
        options: [`The sails produce more side force`, `The keel's lift falls with speed squared, so it needs more leeway angle`, `The rudder stalls`],
        correct: 1,
        explanation: `At low speed, the keel must work at a larger angle of attack to produce enough side force.`,
      },
      {
        question: `Coming out of a tack, the jib should be...`,
        options: [`Trimmed to the mark immediately`, `About 2-5 cm short of the mark, trimmed as speed builds`, `Left eased 20 cm`],
        correct: 1,
        explanation: `A slightly eased jib produces drive while the boat accelerates.`,
      },
    ],
  },
  {
    id: 'apparent-wind',
    module: 'behavior',
    title: 'Apparent wind',
    altName: 'Vent apparent',
    level: 2,
    skill: 'balance',
    summary: `The sails only see the apparent wind: the vector sum of the true wind and the wind created by the boat's own motion; every change of speed, course or gust changes it.`,
    sections: [
      {
        heading: 'The vector sum',
        body: `When the boat moves, it creates a "headwind" equal and opposite to its velocity. The apparent wind is the vector sum of the true wind and this boat-motion wind. Upwind, the apparent wind is stronger than the true wind and comes from further forward. Downwind it is weaker and comes from further forward than the true wind (except dead downwind, where it is simply true wind minus boat speed).\n\nExample on a J/80: true wind 10 kn at 42°, boat speed 5.8 kn gives an apparent wind of roughly 14.8 kn at about 27°. At 140° true with the gennaker up and 6 kn of boat speed, the apparent wind drops to about 6.6 kn at about 105°: the boat "sees" a beam reach, which is why the gennaker is trimmed like a reaching sail and why small course changes change its trim so much.`,
      },
      {
        heading: 'What changes it',
        body: `Speed up and the apparent wind moves forward and (upwind) increases; you need to trim in. Slow down and it moves aft; ease. A gust increases true wind speed: the apparent wind moves aft (a "velocity lift") and increases, so the boat can point higher momentarily or must depower. A lull moves the apparent wind forward (a "velocity header"): ease or bear away before the sails stall.\n\nWith height, the true wind increases (gradient) while boat speed stays the same, so the apparent wind is wider aloft: this is the reason sails need twist.`,
      },
      {
        heading: 'Using it in a match',
        body: `Downwind with an asymmetric gennaker, heading up increases apparent wind speed and moves it forward; bearing away does the reverse. In a lull, head up to build apparent wind; in a gust, bear away. This is the basis of "soaking" and "heating up". Communication: "pressure on, bear away" from the gennaker trimmer to the helm.\n\nUpwind in a match, the effect of gusts and lulls on apparent wind decides whether you can point in a gust and hold your lane, or have to foot in the lull to keep the bow out. The trimmer who feels the apparent wind changes first can call them.`,
      },
    ],
    physics: `Apparent wind vector Va = Vt − Vb (true wind vector minus boat velocity vector, both relative to the water). Its magnitude is |Va| = sqrt(Vt² + Vb² + 2 Vt Vb cos β) with β the true wind angle, and its angle is given by the vector geometry. Because Vt increases with height (boundary layer) while Vb is constant, Va rotates aft and increases aloft. In a gust, Vt rises before Vb can respond (inertia), so the apparent wind angle widens; in a lull it narrows.`,
    effects: [
      { target: 'Trim', effect: `Apparent wind forward = trim in; aft = ease.` },
      { target: 'Gusts', effect: `Gust = apparent wind aft and stronger.` },
      { target: 'Lulls', effect: `Lull = apparent wind forward and weaker.` },
    ],
    interactions: [
      { control: 'Jib sheet', relation: `The trim has to follow the apparent wind angle: eased when the boat is slow (apparent wind wide), trimmed to the mark as speed builds and the apparent wind moves forward.` },
      { control: 'Mainsheet / twist', relation: `Twist exists to match the apparent wind's rotation with height; more gradient (light, stable air) needs more twist.` },
      { control: 'Traveller', relation: `In a gust the apparent wind moves aft and strengthens: dropping the car keeps the angle of attack and heel under control while the boat accelerates.` },
      { control: 'Gennaker sheet', relation: `Downwind, heading up increases and moves the apparent wind forward, so the gennaker must be trimmed in; bearing away needs an ease.` },
    ],
    mistakes: [
      `Not adjusting in lulls: the apparent wind moves forward and the jib starts to luff or the helm has to bear away.`,
      `Forgetting that acceleration moves the apparent wind forward, so the sails must be trimmed in as speed builds.`,
      `Bearing away in a lull downwind and losing the apparent wind completely.`,
      `Confusing a velocity lift in a gust with a real wind shift.`,
    ],
    keyPoints: [
      `Apparent wind = vector sum of the true wind and the wind created by the boat's motion.`,
      `Gust = apparent wind aft and stronger (velocity lift); lull = forward and weaker (velocity header).`,
      `Boat speed up = apparent wind forward: trim in.`,
      `Apparent wind is wider aloft: the reason for twist.`,
    ],
    diagram: 'apparent',
    lab: {
      controls: ['jibSheet', 'mainSheet'],
      focus: ['speed', 'jibAoA', 'mainAoA'],
      tws: 10,
      twa: 42,
      presets: [
        { name: 'Upwind', description: `Close-hauled.`, controls: { jibSheet: 0.85, mainSheet: 0.82 }, twa: 42 },
        { name: 'Reach', description: `Apparent wind wider.`, controls: { jibSheet: 0.4, mainSheet: 0.45 }, twa: 90 },
        { name: 'Deep downwind', description: `Apparent wind weak.`, controls: { jibSheet: 0.15, mainSheet: 0.15 }, twa: 150 },
      ],
    },
    check: [
      {
        question: `A gust hits upwind. The apparent wind...`,
        options: [`Moves forward`, `Moves aft and increases`, `Does not change`],
        correct: 1,
        explanation: `True wind increases faster than boat speed, so the apparent wind angle widens.`,
      },
      {
        question: `Downwind with an asymmetric, in a lull, you should...`,
        options: [`Bear away`, `Head up to build apparent wind`, `Ease the vang`],
        correct: 1,
        explanation: `Heading up increases apparent wind speed.`,
      },
    ],
  },
  {
    id: 'main-jib-balance',
    module: 'behavior',
    title: 'Balance between mainsail and jib',
    altName: 'Équilibre GV/foc',
    level: 5,
    skill: 'balance',
    summary: `Main and jib work as one wing: the jib sets the pace and pointing, the main tunes power and helm, and the slot between them must stay open and parallel.`,
    sections: [
      {
        heading: 'Two sails, one system',
        body: `The jib and main interact through their circulation. The main's circulation creates an upwash ahead of it, so the jib sees a wind that is more free (wider angle) than it would alone: the jib can sail higher and produce more lift. In return the jib's circulation slows and turns the flow ahead of the main's luff (a "header" for the main's leading edge), which is why the main luff often looks soft or slightly backwinded when the jib is trimmed. The slot is not a "nozzle" that blows air across the main; rather, the jib's trailing edge sits in the high-speed flow around the main's lee side, which lets it shed its flow at higher speed and carry more load ("dumping effect").\n\nFor the trimmers that means: the jib leech and the main's lee side should run roughly parallel, both leeches should twist similarly, and the main must be trimmed in relation to the jib, not independently.`,
      },
      {
        heading: 'Jib leads, main follows',
        body: `On a J/80-type boat, the jib is usually set first for the conditions (sheet mark, lead, halyard) and the helm steers to it. The main is then trimmed to match the jib's twist and to set the helm: tight leech for pointing when the boat is balanced and fast, more twist or car down when the helm loads up or heel goes beyond target.\n\nSymptoms of imbalance: main backwinded far back from the luff while the jib leech is hooked (jib over-trimmed or lead too far forward); main leech stalled and heavy helm with a twisted jib (main over-trimmed relative to the jib); boat bearing away and feeling dead (main too eased relative to the jib).`,
      },
      {
        heading: 'Communication in a match',
        body: `The two trimmers need a shared vocabulary and rhythm. "Jib on, main follow" after tacks; "main twist" in gusts while the jib holds; "both off 2" for a footing mode. When the jib trimmer changes the sheet or lead, the main trimmer should check the slot and leech match.\n\nIn breeze, a little backwind in the main luff is acceptable and sometimes fast, as long as the main leech is working. In light air, the slot must be generous: the flow has little energy and a narrow slot chokes it.`,
      },
    ],
    physics: `Two-element foils outperform a single element because each element modifies the other's flow field. The main's circulation produces upwash ahead of it, increasing the jib's effective angle of attack and lift; the jib's circulation reduces the main's leading-edge loading, delaying separation at the main luff. The jib's trailing edge sits in a region of high local velocity, so its leech can be more loaded without separating ("dumping effect"), and the main's boundary layer starts fresh behind the jib. If the slot is too narrow, the jib's flow is blocked and the main's luff sees reversed flow (backwind); too wide and the interaction weakens.`,
    effects: [
      { target: 'Slot', effect: `A parallel slot keeps both sails efficient.` },
      { target: 'Helm', effect: `The main tunes helm; the jib sets pace and pointing.` },
      { target: 'Pointing', effect: `A jib leech that carries on along the main's lee side lets you trim for height without choking the slot.` },
    ],
    interactions: [
      { control: 'Jib sheet / lead', relation: `Jib trim and twist set the slot shape; the main must match.` },
      { control: 'Mainsheet / traveller', relation: `Main trim tunes helm and must keep the slot parallel.` },
      { control: 'Backstay', relation: `Backstay changes both sails together; recheck balance after big changes.` },
      { control: 'Jib halyard / cunningham', relation: `Luff tensions should be adjusted together as wind builds.` },
    ],
    mistakes: [
      `Trimming main and jib independently.`,
      `Hooked jib leech backwinding the main.`,
      `Over-trimming the main relative to the jib, loading the helm.`,
    ],
    keyPoints: [
      `The jib leech carries on along the main's lee side: parallel, and twisting the same way from foot to head.`,
      `Jib leads, main follows.`,
      `Keep the slot parallel and leeches twisting together.`,
      `Some backwind in breeze is OK.`,
    ],
    diagram: 'slot',
    lab: {
      controls: ['jibSheet', 'jibLead', 'mainSheet', 'traveller'],
      focus: ['slot', 'jibTwist', 'mainTwist', 'rudder', 'speed'],
      tws: 12,
      twa: 42,
      presets: [
        { name: 'Jib choked', description: `Jib hooked, main backwinded.`, controls: { jibSheet: 1, jibLead: 0.25, mainSheet: 0.8 } },
        { name: 'Balanced', description: `Slot parallel, leeches matched.`, controls: { jibSheet: 0.85, jibLead: 0.5, mainSheet: 0.82, traveller: 0.5 } },
        { name: 'Main over-trimmed', description: `Main stalled, heavy helm.`, controls: { jibSheet: 0.78, jibLead: 0.6, mainSheet: 1, traveller: 0.7 } },
      ],
    },
    check: [
      {
        question: `What makes the jib and the main work as one wing?`,
        options: [
          `A slot as tight as possible, to speed the air over the main`,
          `Leech continuity: the jib leech carries on along the main's lee side, parallel, and both leeches twist together`,
          `Each sail trimmed on its own to its optimum`,
        ],
        correct: 1,
        explanation: `The flow leaving the jib leech must carry on along the main's lee side. A hooked jib leech blows into the main (backwind); too open and the two skins of the wing split apart. And if the twists don't match, the slot is right at the foot but wrong aloft.`,
      },
      {
        question: `The main is backwinded well aft of the luff and the jib leech is hooked. What do you change first?`,
        options: [`Trim the main harder`, `Open the jib leech (ease or lead aft)`, `Ease the outhaul`],
        correct: 1,
        explanation: `The hooked jib leech chokes the slot: its flow hits the main's lee side instead of carrying on along it. Open the jib leech first; the main follows.`,
      },
    ],
  },
  {
    id: 'upwind-downwind-modes',
    module: 'behavior',
    title: 'Upwind and downwind modes',
    altName: 'Modes de marche',
    level: 4,
    skill: 'maneuvers',
    summary: `A mode is a coordinated choice of course, speed and trim (high/pointing, VMG, footing; hot or deep downwind) that the helm and both trimmers switch into together, often for tactical reasons in a match.`,
    sections: [
      {
        heading: 'Upwind: high, normal, foot',
        body: `For each wind strength there is a combination of angle to the wind and boat speed that gives the best velocity made good (VMG) to windward. Either side of it you can trade: pointing mode sails 1-2° higher at slightly lower speed (tighter leeches, jib on the mark, main leech firm, traveller up a touch, crew hiking hard); footing mode sails 1-3° lower and faster (jib eased 1-3 cm, main twisted or car down slightly, more depth, a bit more heel tolerance). The VMG loss of a small mode change is small; the tactical gain can be large.\n\nThe mode is a crew decision. The helm cannot point if the sails are trimmed for footing; the trimmers cannot foot if the helm keeps pinching. Clear calls: "pointing mode" / "foot mode" / "back to normal".`,
      },
      {
        heading: 'Why modes matter in a match',
        body: `Match racing is about relative position. Off the start, the leeward boat often needs to point to pinch the windward boat into its bad air, while the windward boat needs to foot to roll over or break the leeward lane. When covering, the leader may sail a slightly higher mode to stay between the opponent and the mark. When you are the trailing boat and want to escape a cover, a footing mode to build speed and leverage before tacking can be the right move.\n\nDo not switch modes constantly: a 1.3 t boat needs time to settle (10-20 s), and every transition costs a bit.`,
      },
      {
        heading: 'Downwind: hot versus deep',
        body: `With an asymmetric gennaker, you choose between sailing hotter (higher angle, more apparent wind, more speed) and deeper (lower angle, more direct to the mark, less speed). In light air, sailing hot to build apparent wind is generally faster. In breeze, with enough pressure, the boat can sail deeper without losing much speed. In a match, a deeper mode can block the opponent's wind from behind, a hotter mode can roll over a boat ahead to windward.\n\nThe gennaker trimmer drives the mode with calls: "pressure, go deep", "light, heat up". The jib is usually furled or lowered, and the main is eased with vang controlling twist.`,
      },
    ],
    physics: `VMG = boat speed × cos(angle to the true wind). Near the optimum, VMG is flat: a small change in angle produces a small VMG loss but a measurable change in speed and height. Pointing mode uses firmer leeches to increase circulation, so the rig can operate at a smaller apparent wind angle; the total force has a larger side-force share, and only high boat speed lets the keel carry it without extra leeway. Footing mode reduces side force relative to drive, accepting a lower angle for more speed and lower leeway. Downwind, the apparent wind is the vector sum of true wind and boat motion; heading up increases apparent wind speed and drive, bearing away reduces it.`,
    effects: [
      { target: 'Pointing mode', effect: `Higher angle, slightly less speed, firmer leeches.` },
      { target: 'Footing mode', effect: `Lower angle, more speed, eased and twisted sails.` },
      { target: 'Downwind hot/deep', effect: `Hot = more apparent wind and speed; deep = more direct.` },
    ],
    interactions: [
      { control: 'Jib sheet', relation: `The jib is the main mode lever upwind: on the mark (leech near the spreader) for pointing, 1-3 cm off for footing, and the helm steers to the resulting telltales.` },
      { control: 'Mainsheet / traveller', relation: `Firmer leech and car slightly up for pointing; more twist or car slightly down for footing. The main must change mode with the jib or the slot and the helm go out of balance.` },
      { control: 'Backstay', relation: `A touch more backstay flattens the jib entry for pointing in flat water; slightly less gives the depth needed to foot through waves.` },
      { control: 'Hiking', relation: `Pointing mode needs maximum righting moment, because it relies on high speed and low heel to keep leeway down.` },
      { control: 'Vang (downwind)', relation: `Hotter angles load the main and need more vang to hold the leech; deep angles need the vang eased enough to let the top twist forward to the apparent wind.` },
    ],
    mistakes: [
      `Helm and trimmers in different modes (helm pinching while the sails are eased for footing).`,
      `Switching modes too often, so the boat never settles at speed.`,
      `Forcing pointing mode in waves or in light air, where the boat needs speed first.`,
      `Sailing deep downwind in light air and losing apparent wind.`,
    ],
    keyPoints: [
      `A mode is a coordinated crew decision: course, trim and crew weight together.`,
      `VMG near the optimum is flat: small mode changes cost little and can win a match situation.`,
      `Pointing needs full speed and flat water; footing is for waves, acceleration and breaking a lane.`,
      `Downwind: hotter in light air, deeper in breeze.`,
    ],
    diagram: 'apparent',
    lab: {
      controls: ['jibSheet', 'mainSheet', 'traveller', 'backstay'],
      focus: ['speed', 'drive', 'heel', 'jibAoA'],
      tws: 12,
      twa: 42,
      presets: [
        { name: 'Pointing mode', description: `Higher angle, firm leeches.`, controls: { jibSheet: 0.9, mainSheet: 0.88, traveller: 0.6, backstay: 0.5 }, twa: 39 },
        { name: 'Footing mode', description: `Lower angle, eased sheets.`, controls: { jibSheet: 0.78, mainSheet: 0.75, traveller: 0.45, backstay: 0.35 }, twa: 45 },
        { name: 'Downwind deep', description: `Sails eased, deep angle.`, controls: { jibSheet: 0.15, mainSheet: 0.15, traveller: 0.3, backstay: 0 }, twa: 150 },
      ],
    },
    check: [
      {
        question: `Why can small mode changes be tactically useful upwind?`,
        options: [`VMG near the optimum is flat`, `They increase VMG`, `They reduce heel to zero`],
        correct: 0,
        explanation: `Small angle changes cost little VMG but change height or speed.`,
      },
      {
        question: `Downwind in light air with an asymmetric, you usually...`,
        options: [`Sail deep`, `Sail hotter to build apparent wind`, `Drop the gennaker`],
        correct: 1,
        explanation: `Heating up increases apparent wind and speed.`,
      },
    ],
  },
  {
    id: 'crew-weight',
    module: 'behavior',
    title: 'Crew weight distribution',
    altName: 'Répartition des équipiers',
    level: 2,
    skill: 'balance',
    summary: `Crew weight is the largest movable ballast on a J/80-type boat: athwartships it sets righting moment and heel, fore and aft it sets wetted surface, trim and helm.`,
    sections: [
      {
        heading: 'Athwartships: righting moment',
        body: `On a 1.3 t boat, four or five crew weighing 300-350 kg in total are a large fraction of the displacement. Moving them from the centreline to the windward rail moves the centre of gravity several centimetres to windward and adds a lot of righting moment. In medium and heavy air, maximum hiking allows the sails to stay powered up longer, which is faster than depowering.\n\nIn light air, crew weight to leeward (or centre) induces a little heel (5-10°). Gravity helps the sails take shape when there is little wind, and heel reduces wetted area on many hulls.`,
      },
      {
        heading: 'Fore and aft: trim and wetted surface',
        body: `Fore-aft crew position changes the hull's trim (bow-down / bow-up attitude). In light air, weight forward lifts the wide transom clear of the water, reducing wetted surface and the drag of a dragging stern wave; it also slightly increases the bow's grip, which helps pointing. In breeze and waves, weight further aft keeps the bow from burying and lets the boat ride over the waves; downwind when surfing, weight aft keeps the bow up and the rudder immersed.\n\nA common pattern on J/80-type boats: crew tight together around the shrouds upwind (concentrated weight reduces pitching, so the boat does not "hobby-horse" in chop), a little further forward in light air, and further back downwind in breeze. Crew weight limits and the number of crew vary by class rules and event, so check your own numbers.`,
      },
      {
        heading: 'Movement and timing in a match',
        body: `Crew movement is a control, not a passenger activity. In tacks, the crew should cross and hike as the boat comes up to speed on the new tack, neither too early (the boat heels to windward and stops) nor too late (the boat heels past target and slips sideways while the jib is coming in). A smooth roll tack in light air, with the crew holding the old windward side a moment longer to flatten the boat, can even generate speed.\n\nIn gusts, hike harder before the main dumps: righting moment keeps the power in the sails, whereas easing throws power away. The jib trimmer often has to hike and trim simultaneously; set up a position from which you can see the jib's telltales and leech, reach the winch and still hike. Call the gusts: "puff in 3, hike".`,
      },
    ],
    physics: `Righting moment = displacement × GZ. Moving crew weight w a distance d athwartships moves the boat's centre of gravity by about w·d / displacement: 320 kg moved 0.8 m to windward on a 1.6 t total (boat + crew) shifts the CG by about 16 cm, a large increase in GZ at moderate heel angles. The heeling moment from the sails is fixed by the wind and trim, so more righting moment means less heel for the same power, or more power for the same heel. Fore-aft weight shifts change trim and the immersed hull shape, which changes wetted surface (friction drag), wave-making and the hull's yaw balance. Concentrating weight near the centre of the boat reduces pitch inertia and hence pitching in waves.`,
    effects: [
      { target: 'Righting moment', effect: `Hiking increases righting moment, letting the boat carry more power at the same heel.` },
      { target: 'Wetted surface', effect: `Weight forward in light air lifts the transom and reduces drag.` },
      { target: 'Pitching', effect: `Crew concentrated together reduces pitching in chop.` },
      { target: 'Helm', effect: `Less heel and a better trim attitude reduce weather helm.` },
    ],
    interactions: [
      { control: 'Mainsheet / traveller', relation: `Max hiking before depowering the main: every centimetre of eased sheet is power thrown away that hiking could have kept.` },
      { control: 'Backstay', relation: `With a lighter crew, the backstay has to come on earlier in a building breeze to keep heel at target.` },
      { control: 'Jib sheet', relation: `Light-air leeward heel helps the jib hang in shape; the trimmer can then ease slightly without the sail collapsing.` },
      { control: 'Helm / rudder', relation: `Weight aft and excessive heel load the rudder; weight forward and a flatter boat lighten it.` },
    ],
    mistakes: [
      `Hiking hard in light air, killing the heel the sails need and dragging the transom.`,
      `Crew spread out fore and aft, increasing pitching in chop.`,
      `Moving abruptly in tacks and gusts, upsetting the boat's balance.`,
      `Depowering the sails before the crew is fully hiked.`,
    ],
    keyPoints: [
      `Crew weight is the largest movable ballast on board.`,
      `Breeze: hike first, depower second.`,
      `Light air: crew inboard or to leeward, slightly forward, 5-10° of heel.`,
      `Keep crew close together to reduce pitching; move smoothly.`,
    ],
    diagram: 'heel',
    lab: {
      controls: ['hike', 'mainSheet', 'backstay'],
      focus: ['heel', 'heelMoment', 'speed', 'rudder'],
      tws: 15,
      twa: 42,
      presets: [
        { name: 'Crew inboard (15 kn)', description: `No hiking: heel beyond target, heavy helm.`, controls: { hike: 0, mainSheet: 0.85 } },
        { name: 'Full hike (15 kn)', description: `Same trim with crew maxed out: flatter and faster.`, controls: { hike: 1, mainSheet: 0.85 } },
        { name: 'Light air (5 kn)', description: `Crew inboard, slight leeward heel, sails eased for shape.`, controls: { hike: 0, mainSheet: 0.7, backstay: 0 }, tws: 5 },
      ],
    },
    check: [
      {
        question: `In 5 kn of wind and flat water, where should the crew be?`,
        options: [`Hiking on the windward rail`, `Inboard or to leeward, slightly forward`, `Grouped at the stern`],
        correct: 1,
        explanation: `Slight leeward heel helps the sails take shape and lifting the transom reduces wetted surface.`,
      },
      {
        question: `In 16 kn, why hike before easing the main?`,
        options: [`More righting moment lets the sails stay powered at the same heel`, `Hiking reduces apparent wind`, `It moves the centre of effort forward`],
        correct: 0,
        explanation: `Righting moment is free power: it balances the heeling moment without throwing away drive.`,
      },
    ],
  },
];

const KITE_PRESSURE: Lesson = {
  id: 'kite-pressure-heel',
  module: 'behavior',
  title: 'Gennaker pressure, heel and depth',
  altName: 'Pression sous spi, gîte et profondeur',
  level: 5,
  skill: 'balance',
  summary: `The same kite load can heel the boat or drive it forward. Which one you get depends on the apparent wind angle, so "pressure + heel" and "pressure, no heel" mean different things to the trimmer.`,
  sections: [
    {
      heading: 'Two situations that feel the same on the sheet',
      body: `Situation 1: a puff arrives on a hot angle. The sheet loads up, the boat heels a few degrees and the helm feels it. You call "pressure, bear away", the helm goes deeper and the boat keeps its speed for as long as the heel holds. When the heel goes, the extra pressure is gone and you heat back up.\n\nSituation 2: you are already deep. The sheet is heavy but the boat does not heel at all. That is not because the kite is doing nothing. On a deep angle almost the whole kite force points forward, so it pushes the boat along instead of over. Heel is no longer your pressure gauge. Speed, sheet load and the luff curl are.`,
    },
    {
      heading: 'Why: the force turns with the apparent wind',
      body: `A sail makes a force roughly perpendicular to the apparent wind (lift) plus a smaller force along it (drag). On a hot angle, with apparent wind around 60–70° on a J/80, the lift points mostly sideways. That side force is what heels the boat and makes the keel work. Bear away and the apparent wind moves aft, so the same lift rotates forward. At 140° true in 14 knots the model gives about 98 % of the kite force as drive and almost no heeling force. At 105–120° true it is only about 80 % drive, with around 1000 N sideways and 21° of heel.\n\nThat is the "go deep while the heel holds" rule. The heel tells you the force still has a sideways share you can turn into drive by bearing away. When the boat comes upright, the force already points forward and going deeper only gives away apparent wind and speed.`,
    },
    {
      heading: 'Heavy sheet, deep, no heel: what to check',
      body: `Ease until the luff curls. Deep, a kite that is over-sheeted is stalled. Most of its load becomes drag, and the sheet feels heavy without giving speed. In the model, over-sheeting at 150° raises the heeling force and loses speed. If the luff never curls, you are over-trimmed.\n\nIf the luff curls and the load is real, it is pressure going into speed. Ask the helm to hold the angle or go a touch deeper, but watch the apparent wind. As speed rises it moves forward, and the kite needs a little sheet again.`,
    },
    {
      heading: 'The main and the kite work together',
      body: `On a reach the main adds heel and weather helm. A main sheeted too hard on a hot angle adds about 8° of heel in the model and doubles the rudder angle, for less speed. With the kite up the main is eased until it just starts to backwind from the kite, and the vang holds the leech so the top does not twist away.\n\nDeep, the danger is the opposite: a main eased too far with the vang off lets the head twist forward of square. Together with an under-sheeted kite, that drives a roll to windward, the start of a death roll. The cure is counter-intuitive: sheet the main in a little, vang on, and keep the kite sheeted (even slightly over) while the helm comes up a few degrees. In the simulator, the roll-damping figure in the 3D view shows this. It falls when the main is too loose deep or the kite is flapping.`,
    },
  ],
  physics: `Each kite section produces lift L (perpendicular to the apparent wind) and drag D (along it). Drive = L·sin(AWA) − D·cos(AWA) and heeling force = L·cos(AWA) + D·sin(AWA). Near AWA 60°, cos(AWA) ≈ 0.5, so half the lift heels the boat. Near AWA 105–120° (about 140–150° true), cos(AWA) is near zero or negative and almost everything drives. Heeling moment = heeling force × height of the centre of effort. Righting moment comes from the hull form, the keel and the crew. When heeling moment rises the boat heels until the two balance; when the force has no side component there is nothing to heel against, however heavy the sheet. A stalled (over-sheeted) kite has a large drag coefficient. Deep, drag points forward and still drives, but far less efficiently than attached lift, which is why the sheet feels heavy and the boat does not accelerate.`,
  effects: [
    { target: 'Bear away in a puff', effect: `Rotates the kite force forward: less heel and helm, same or more speed while the puff lasts.` },
    { target: 'Heat up in a lull', effect: `Brings the apparent wind forward: rebuilds pressure and load in the kite.` },
    { target: 'Over-sheeting deep', effect: `Stalls the kite: heavy sheet, more drag and some side force, less speed.` },
    { target: 'Main too tight on a reach', effect: `More heel and weather helm, less speed.` },
  ],
  interactions: [
    { control: 'Kite sheet', relation: `Trim to the curl. The load you feel is total force, not drive; read heel and speed to know where it goes.` },
    { control: 'Mainsheet', relation: `Eased until it just backwinds on a reach (less heel and helm); not over-eased deep (roll).` },
    { control: 'Vang', relation: `Holds the main leech so the head cannot twist forward and start a roll deep downwind.` },
    { control: 'Hiking', relation: `On a hot angle the crew's righting moment lets you hold the angle longer in a puff before bearing away.` },
    { control: 'Helm angle', relation: `The trimmer's calls ("pressure, go deep" / "lighter, come up") drive the angle; the heel and the curl are the evidence.` },
  ],
  mistakes: [
    `Reading "no heel" as "no pressure" when deep. The force is going forward.`,
    `Over-sheeting a deep kite to "feel" load. A stalled kite is heavy and slow.`,
    `Not calling the bear-away in a puff on a hot angle: the boat heels, the helm loads up, speed is lost to leeway and rudder drag.`,
    `Keeping the main tight on a reach with the kite up.`,
    `Easing the main and vang too far deep in breeze, which starts a roll to windward.`,
  ],
  keyPoints: [
    `Hot angle: pressure shows as heel. Bear away while the heel holds.`,
    `Deep: pressure shows as speed and sheet load, not heel.`,
    `Heavy sheet with no curl means over-trimmed, not powered.`,
    `Main eased on the reach; main and vang held deep to stop rolling.`,
  ],
  diagram: 'apparent',
  lab: {
    headsail: 'gennaker',
    controls: ['jibSheet', 'mainSheet', 'vang', 'hike'],
    focus: ['headsailSplit', 'heel', 'sheetLoad', 'rudder'],
    tws: 14,
    twa: 110,
    presets: [
      { name: 'Puff on a hot angle (110°)', description: `Kite trimmed well. The force is partly sideways, so the boat heels.`, controls: {}, twa: 110 },
      { name: 'Same puff, borne away (140°)', description: `The force has rotated forward: upright, almost all drive.`, controls: {}, twa: 140 },
      { name: 'Deep (150°), kite over-sheeted', description: `Heavy sheet, stalled kite: side force back, speed down.`, controls: { jibSheet: 0.63 }, twa: 150 },
      { name: 'Hot (110°), main over-trimmed', description: `Main sheeted hard on the reach: more heel and helm, less speed.`, controls: { mainSheet: 0.67 }, twa: 110 },
    ],
  },
  check: [
    {
      question: `Deep downwind the kite sheet is heavy but the boat is upright. Most likely...`,
      options: [`The kite force points forward, or the kite is over-sheeted and stalled`, `There is no wind in the kite`, `The keel is stalled`],
      correct: 0,
      explanation: `Deep, the lift points forward, so there is nothing to heel against. If the luff never curls, it is also over-trimmed.`,
    },
    {
      question: `On a hot angle a puff heels the boat. The trimmer should call...`,
      options: [`"Pressure, bear away", and go deeper while the heel holds`, `"Heat up"`, `Nothing: sheet in`],
      correct: 0,
      explanation: `Bearing away rotates the force forward: the heel is turned into speed and depth.`,
    },
    {
      question: `Deep in breeze the boat starts rolling to windward. The best first action is...`,
      options: [`Sheet the main in a little, vang on, keep the kite sheeted`, `Ease the main and kite fully`, `Move the crew to leeward`],
      correct: 0,
      explanation: `A loose main and a flapping kite drive the roll. Sheeting on settles it while the helm comes up slightly.`,
    },
  ],
};

const LESSONS_EN: Lesson[] = [...HEADSAIL, ...MAINSAIL, ...BEHAVIOR, KITE_PRESSURE];

/** the lessons in the page's language (fixed at load, see src/i18n.ts) */
export const LESSONS: Lesson[] = LANG === 'fr' ? [...LESSONS_FR_HEADSAIL, ...LESSONS_FR_MAINSAIL, ...LESSONS_FR_BEHAVIOR] : LESSONS_EN;
