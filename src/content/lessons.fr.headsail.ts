import type { Lesson } from './types';

export const LESSONS_FR_HEADSAIL: Lesson[] = [
  {
    id: 'jib-sheet',
    module: 'headsail',
    title: 'Tension d\'écoute de foc',
    altName: 'Jib sheet tension',
    level: 1,
    skill: 'headsail',
    summary: `L'écoute de foc règle en même temps l'incidence du foc, la tension de sa chute et la largeur de la fente : chaque centimètre bordé ou choqué modifie la puissance, le cap et l'écoulement sur la grand-voile.`,
    sections: [
      {
        heading: 'Ce que l\'écoute règle vraiment',
        body: `Sur un foc non recouvrant, l'écoute tire le point d'écoute à la fois vers l'arrière et vers le bas. Vers l'arrière, elle rapproche toute la voile de l'axe du bateau, ce qui réduit son incidence par rapport au vent apparent et referme la fente avec la GV. Vers le bas, elle tend la chute, ce qui ferme le haut de la voile (moins de vrillage) et aplatit un peu la bordure. C'est pour cela que l'écoute n'est pas un simple réglage « dedans / dehors » : elle agit à la fois sur l'incidence, le vrillage et le creux.\n\nConséquence pratique pour le régleur : une même position d'écoute ne donne pas la même voile à 6 nœuds et à 16 nœuds. Dans le petit temps, le tissu travaille peu et l'étai fait moins de flèche, donc quelques centimètres bordés ont un gros effet sur la chute. Dans la brise, l'étai prend plus de flèche, la voile se creuse, et il faut davantage d'écoute rien que pour garder la même forme.`,
      },
      {
        heading: 'Repères et « les 5 derniers centimètres »',
        body: `Sur un bateau type J/80, la plage utile de l'écoute de foc au près est minuscule : entre « bordé à fond pour le cap » et « choqué pour relancer », il n'y a souvent que 5 à 10 cm d'écoute au point d'écoute. Faites des repères sur l'écoute (ou servez-vous des graduations sur le pont / les rails) et apprenez la distance entre la chute du foc et le bout de barre de flèche quand c'est bordé à fond : en général quelques centimètres de la barre de flèche dans la brise moyenne, un peu plus dans le petit temps et dans le clapot.\n\nUtilisez le winch à deux vitesses en conséquence : la grande vitesse ramène l'écoute presque en place après le virement, la petite vitesse fait les 5 derniers centimètres. C'est dans ces derniers centimètres que se trouve la vitesse, et ils se bordent en accord avec le barreur, pas contre lui.`,
      },
      {
        heading: 'Le travail d\'écoute en match',
        body: `Après un virement ou un passage de bouée, ne bordez pas tout de suite au repère de cap. Le bateau a perdu de la vitesse, la quille porte peu à basse vitesse et la dérive est importante. Bordez environ 2 à 5 cm avant le repère de cap, annoncez « on relance » au barreur, et rentrez les derniers centimètres au fur et à mesure que la vitesse revient (souvent 5 à 10 secondes sur J/80). Border trop fort trop tôt fait décrocher le foc et fait lofer le bateau.\n\nEn pré-départ, l'écoute est votre accélérateur : faire faseyer le foc coupe la propulsion, le border la redonne instantanément. Entraînez-vous aux positions « mi-bordé » pour les approches contrôlées, et communiquez : « Foc dedans dans 3, 2, 1 » pour que le barreur puisse abattre et que le régleur de GV borde en même temps. Dans les risées, choquer un peu (1 à 3 cm) pendant que la GV ouvre garde le bateau à plat sans perdre la capacité du foc à faire du cap.`,
      },
    ],
    physics: `Une voile est un profil creux qui crée de la portance en déviant l'écoulement : l'air accélère côté sous le vent et ralentit côté au vent, et cette différence de pression donne une force à peu près perpendiculaire au vent apparent. La portance augmente avec l'incidence jusqu'à ce que l'écoulement ne puisse plus suivre l'extrados et se décolle (décrochage) : la portance chute alors et la traînée grimpe brutalement. L'écoute fixe l'incidence sur toute la longueur du guindant. Comme elle règle aussi la tension de chute, elle modifie le vrillage : l'angle du vent apparent est plus ouvert en hauteur (gradient de vent), donc une voile correctement vrillée garde une incidence comparable du pied à la têtière. Sur-border ferme la chute, augmente l'incidence effective en haut et fait décrocher en premier les sections hautes.`,
    effects: [
      { target: 'Incidence', effect: `Border réduit l'angle entre la corde et l'axe du bateau et augmente l'incidence pour un cap donné ; choquer la diminue jusqu'à ce que le guindant se mette à faseyer.` },
      { target: 'Vrillage / chute', effect: `Border tire le point d'écoute vers le bas et ferme le haut de la chute ; choquer laisse la têtière vriller et dépuissance le haut.` },
      { target: 'Creux', effect: `Choquer laisse la bordure et les sections basses se creuser (plus de puissance, plus de traînée) ; border les aplatit.` },
      { target: 'Fente', effect: `Border referme l'espace entre la chute du foc et le guindant de GV ; trop fermée, le foc envoie du dévent dans la GV.` },
    ],
    interactions: [
      { control: 'Chariot de foc', relation: `Le point de tire décide comment la traction de l'écoute se répartit entre chute et bordure. Chariot avancé, la même tension d'écoute ferme davantage la chute ; chariot reculé, elle aplatit la bordure et ouvre le haut. Déplacez le point de tire avant de sur-border pour corriger un problème de chute.` },
      { control: 'Pataras', relation: `Plus de pataras réduit la flèche d'étai et aplatit le foc : il faut en général un poil plus d'écoute (ou un déplacement du chariot) pour garder la même distance chute / barre de flèche.` },
      { control: 'Écoute de GV / chariot de GV', relation: `La chute du foc doit être à peu près parallèle à l'extrados de la GV. Si vous bordez le foc plus fort, la GV doit rentrer aussi, sinon elle prend du dévent ; si vous choquez pour relancer, la GV doit aussi vriller.` },
      { control: 'Drisse de foc', relation: `Une drisse plus tendue avance le creux et arrondit l'entrée, ce qui élargit la plage de barre ; avec plus de drisse, on peut souvent porter un peu plus d'écoute sans décrocher.` },
    ],
    mistakes: [
      `Border au repère de cap dès la sortie du virement, avant que le bateau ait de la vitesse : le foc décroche et la dérive augmente.`,
      `Corriger à l'écoute seule des problèmes de vrillage qui relèvent du point de tire.`,
      `Laisser l'écoute taquée dans les risées et les molles au lieu de jouer les derniers centimètres avec le barreur.`,
      `Sur-border dans le clapot : la voile devient trop plate et trop fermée pour passer dans les vagues.`,
    ],
    keyPoints: [
      `L'écoute règle simultanément l'incidence, le vrillage et la fente.`,
      `La plage utile au près ne fait que quelques centimètres : marquez l'écoute et connaissez la distance chute / barre de flèche.`,
      `Choquez de 2 à 5 cm pour relancer, ne bordez au repère qu'une fois le bateau à sa vitesse cible.`,
      `Gardez la chute du foc à peu près parallèle à la GV pour que la fente reste ouverte.`,
    ],
    diagram: 'aoa',
    lab: {
      controls: ['jibSheet', 'jibLead', 'mainSheet'],
      focus: ['jibAoA', 'jibTwist', 'slot', 'speed', 'drive'],
      tws: 10,
      twa: 42,
      presets: [
        { name: 'Relance', description: `Foc choqué de quelques centimètres sous le repère : fente plus large, plus de vrillage, plus de propulsion à basse vitesse.`, controls: { jibSheet: 0.7, mainSheet: 0.7 } },
        { name: 'Réglage cap', description: `Foc au repère, bateau lancé au près : chute près de la barre de flèche, fente parallèle.`, controls: { jibSheet: 0.85, mainSheet: 0.8 } },
        { name: 'Sur-bordé', description: `Bordé à bloc dans 10 nœuds : haut fermé, fente étranglée, penons sous le vent qui décrochent.`, controls: { jibSheet: 1, mainSheet: 0.8 } },
      ],
    },
    check: [
      {
        question: `Vous venez de virer dans 10 nœuds et le bateau est 1 nœud sous sa vitesse cible. Que faites-vous de l'écoute de foc ?`,
        options: [`Border directement au repère de cap`, `Border 2 à 5 cm avant le repère, puis finir à mesure que la vitesse revient`, `La laisser choquée de 30 cm jusqu'à la prochaine risée`],
        correct: 1,
        explanation: `À basse vitesse, la quille porte peu et le foc décroche facilement. Un foc légèrement choqué propulse davantage ; on rentre les derniers centimètres quand le bateau atteint sa vitesse cible.`,
      },
      {
        question: `Border plus fort l'écoute de foc a surtout pour effet de...`,
        options: [`Ouvrir le haut de la chute`, `Fermer la chute et refermer la fente`, `Avancer le creux`],
        correct: 1,
        explanation: `L'écoute tire le point d'écoute vers l'arrière et vers le bas : la chute se tend, le haut vrille moins et l'espace avec la GV se referme.`,
      },
    ],
  },
  {
    id: 'jib-lead',
    module: 'headsail',
    title: 'Point de tire du foc (barber / chariot)',
    altName: 'Jib lead position (barber / car)',
    level: 2,
    skill: 'headsail',
    summary: `Le chariot fixe la direction de traction de l'écoute, donc l'équilibre entre tension de bordure et tension de chute : c'est le principal réglage de vrillage d'un foc non recouvrant.`,
    sections: [
      {
        heading: 'Le vecteur d\'écoute',
        body: `Imaginez une ligne qui part du point d'écoute et passe par la poulie du chariot. Sa direction détermine comment la tension d'écoute se répartit entre la bordure (traction vers l'arrière) et la chute (traction vers le bas). Avancer le chariot rend la traction plus verticale : chute plus tendue, haut moins vrillé, bordure plus creuse. Reculer le chariot rend la traction plus horizontale : bordure plus plate, chute plus libre, haut plus vrillé. Un bon point de départ est un point de tire dont la ligne coupe à peu près l'angle du point d'écoute en deux, puis on affine aux penons.\n\nUn réglage intérieur / extérieur (barber ou angle du rail) modifie l'angle d'écoute : vers l'intérieur, on referme l'angle pour faire du cap en mer plate ; vers l'extérieur, on l'ouvre pour la puissance et au travers. Sur les bateaux type J/80, les rails sont fixes : le chariot avant / arrière et, s'il y en a, un barber ou un rappel intérieur sont vos outils.`,
      },
      {
        heading: 'Trouver la position neutre',
        body: `Foc bordé en position normale de près, demandez au barreur de lofer lentement. Si les penons au vent du haut se lèvent en premier, le haut a une incidence plus faible que le bas : il est trop vrillé, avancez le chariot. Si ce sont les penons du bas qui se lèvent en premier, la bordure est trop creuse / le haut trop fermé : reculez le chariot. La position neutre, c'est quand toutes les hauteurs décrochent ensemble, ou avec le haut juste un peu avant, ce qui est souvent souhaitable dans la brise.\n\nMarquez le rail pour les réglages petit temps, médium et brise. Schéma classique sur cette série : chariot légèrement avancé dans le clapot pour une bordure plus pleine et plus puissante (avec l'écoute un poil choquée pour que la chute ne se ferme pas), neutre ou presque dans le petit temps et le médium, et un ou deux trous en arrière dans la brise pour ouvrir le haut et aplatir la bordure. Chaque voile et chaque réglage de gréement sera différent.`,
      },
      {
        heading: 'Déplacer le chariot en match-racing',
        body: `Sur J/80, on déplace rarement le chariot sous charge au près : réglez-le avant le départ, et pendant le bord de portant pour le bord de près suivant. Surveillez les conditions dans les dernières minutes du pré-départ : si la brise monte, reculez d'un trou avant le coup de canon plutôt que de vous battre avec un foc trop puissant pendant tout le premier près.\n\nDites au barreur ce que vous avez réglé : « Chariot un trou en arrière, le haut sera un peu ouvert ». Ça explique pourquoi les penons du haut décrochent plus tôt et évite qu'il vous demande de sur-border. Pour les bords de travers, avancez le chariot et, si possible, sortez-le vers l'extérieur pour que le haut ne vrille pas trop quand vous choquez l'écoute.`,
      },
    ],
    physics: `Le vent apparent n'est pas uniforme en hauteur : comme le vent réel augmente avec l'altitude (gradient de vent) alors que la vitesse du bateau est la même partout, le vent apparent est à la fois plus fort et plus ouvert en haut. Un foc a donc besoin de vrillage pour que chaque section garde une incidence comparable. Le point de tire est l'outil géométrique qui fixe ce vrillage pour une charge d'écoute donnée. Trop en avant, la têtière est fermée par rapport au vent apparent local et les sections hautes décrochent pendant que la bordure est creuse et freine. Trop en arrière, la têtière est ouverte, faseye en premier et porte peu, pendant que la bordure est aplatie. Un point de tire correct répartit la charge de façon homogène, ce qui minimise aussi la traînée induite en se rapprochant d'une répartition de portance efficace sur la hauteur.`,
    effects: [
      { target: 'Vrillage', effect: `Chariot avancé = moins de vrillage, têtière fermée ; chariot reculé = plus de vrillage, têtière ouverte.` },
      { target: 'Creux de bordure', effect: `Chariot avancé = bordure plus creuse et plus puissante ; chariot reculé = bordure plus plate, moins de traînée.` },
      { target: 'Angle d\'écoute', effect: `Vers l'intérieur = plus de cap, plage de barre étroite ; vers l'extérieur = plus de puissance, barre plus facile, à utiliser dans le clapot et au travers.` },
    ],
    interactions: [
      { control: 'Écoute de foc', relation: `Le point de tire décide de ce que fait l'écoute. Après avoir déplacé le chariot, revérifiez le repère d'écoute : reculer demande en général un poil plus d'écoute pour garder la même distance chute / barre de flèche.` },
      { control: 'Drisse de foc', relation: `Plus de drisse remonte légèrement le point d'écoute et modifie l'angle d'écoute au point d'écoute : un gros changement de drisse peut demander d'avancer un peu le chariot pour compenser.` },
      { control: 'Pataras', relation: `En redressant l'étai, le pataras aplatit le foc et tend sa chute ; dans la brise, combinez pataras repris et chariot reculé pour garder le haut ouvert.` },
      { control: 'Vrillage de GV', relation: `Le haut du foc et le haut de la GV doivent vriller à peu près autant. Si la GV est bien vrillée dans la brise et que le haut du foc est fermé, la fente s'étrangle en hauteur : reculez le chariot de foc.` },
    ],
    mistakes: [
      `Ne jamais toucher au chariot : un seul « réglage de série » ne peut pas être bon de 5 à 20 nœuds.`,
      `Lire les penons du haut sans lofer lentement et régulièrement, puis déplacer le chariot dans le mauvais sens.`,
      `Avancer le chariot dans la brise pour « faire plus de cap » : la têtière se ferme, la gîte augmente et la fente s'étrangle.`,
      `Oublier de revérifier le repère d'écoute après un changement de point de tire.`,
    ],
    keyPoints: [
      `Chariot avancé : chute tendue, bordure creuse. Chariot reculé : haut ouvert, bordure plate.`,
      `Neutre = les penons de toutes les hauteurs décrochent ensemble quand le barreur lofe.`,
      `Réglez le chariot avant le départ et ajustez entre les bords de près, pas sous charge.`,
      `Plus de vent, c'est en général chariot en arrière ; clapot et petit temps demandent en général un réglage un peu plus plein et plus puissant.`,
    ],
    diagram: 'lead',
    lab: {
      controls: ['jibLead', 'jibSheet'],
      focus: ['jibTwist', 'jibDepth', 'jibAoA', 'drive'],
      tws: 12,
      twa: 42,
      presets: [
        { name: 'Chariot avancé', description: `Chariot bien en avant : haut fermé, bordure creuse. Le haut décroche tôt.`, controls: { jibLead: 0.2, jibSheet: 0.85 } },
        { name: 'Neutre', description: `Les penons décrochent ensemble sur toute la hauteur du guindant.`, controls: { jibLead: 0.5, jibSheet: 0.85 } },
        { name: 'Chariot reculé (brise)', description: `Chariot en arrière dans 18 nœuds : haut ouvert, bordure plate, moins de gîte.`, controls: { jibLead: 0.8, jibSheet: 0.9 }, tws: 18 },
      ],
    },
    check: [
      {
        question: `Quand le barreur lofe lentement, les penons au vent du haut se lèvent bien avant ceux du bas. Où déplacez-vous le chariot ?`,
        options: [`Vers l'avant`, `Vers l'arrière`, `Nulle part, on choque l'écoute`],
        correct: 0,
        explanation: `C'est le haut qui a l'incidence la plus faible : il est trop vrillé. Avancer le chariot tend la chute et ferme le haut.`,
      },
      {
        question: `La brise monte de 10 à 18 nœuds. Quel est le changement de point de tire classique ?`,
        options: [`Vers l'avant pour tendre la chute`, `Vers l'arrière pour ouvrir le haut et aplatir la bordure`, `Vers l'intérieur pour faire plus de cap`],
        correct: 1,
        explanation: `Dans la brise, on veut moins de puissance en haut et une bordure plus plate : reculer le chariot augmente le vrillage et réduit le couple de gîte.`,
      },
    ],
  },
  {
    id: 'jib-halyard',
    module: 'headsail',
    title: 'Tension de drisse de foc',
    altName: 'Jib halyard tension',
    level: 2,
    skill: 'headsail',
    summary: `La tension de drisse place le creux du foc d'avant en arrière et façonne son entrée, ce qui détermine la largeur de la plage de barre.`,
    sections: [
      {
        heading: 'Position du creux et entrée',
        body: `Reprendre la drisse ramène du tissu vers le guindant : le creux avance et l'entrée s'arrondit. La choquer laisse le creux reculer et affine l'entrée (plus plate à l'avant). Une entrée ronde tolère les variations d'incidence : le barreur dispose d'une plage de barre plus large avant que les penons décrochent. Une entrée fine fait plus de cap mais demande une barre précise et une mer plate.\n\nSur ce type de bateau, un foc avec le creux vers 35-40 % de la corde est un objectif raisonnable au près. Quand le vent monte, le tissu s'allonge et l'étai prend de la flèche, ce qui fait reculer le creux dans les deux cas. On reprend de la drisse pour le ramener.`,
      },
      {
        heading: 'Lire le guindant',
        body: `Des plis horizontaux (festons) qui partent du guindant signifient que la drisse est trop molle pour les conditions. Par tout petit temps et mer plate, quelques petits festons peuvent être rapides, car un guindant mou donne une entrée plus fine et plus de cap. Un pli vertical le long du guindant signifie trop de drisse : le creux est trop en avant et la voile est ronde et « poche » à l'avant, avec une moitié arrière plate et inefficace.\n\nFaites des repères sur la drisse ou sur le mât pour pouvoir reproduire vos réglages. Sur les bateaux type J/80, beaucoup d'équipages ne règlent la drisse qu'entre les manches ou au portant, mais si elle est renvoyée au cockpit, ajustez-la en pré-départ dès que vous voyez la brise du premier près.`,
      },
      {
        heading: 'S\'adapter à l\'état de la mer et au match-racing',
        body: `Dans le clapot, le bateau change sans cesse de vitesse et l'angle du vent apparent oscille. Une drisse plus tendue avec une entrée plus ronde garde le foc efficace malgré ces oscillations. En mer plate et brise régulière, un peu moins de drisse et une entrée plus fine aident à faire du cap, ce qui compte quand il faut tenir son couloir ou étouffer un adversaire.\n\nAnnoncez le compromis : « Drisse reprise, la plage est plus large » dit au barreur qu'il peut barrer plus librement ; « drisse molle, faut être précis » le prévient que serrer le vent coûtera de la vitesse si la barre est approximative. Les vrais réglages dépendent de la coupe de la voile, de la ralingue, de la tension d'étai et du poids de l'équipage au rappel.`,
      },
    ],
    physics: `Le bord d'attaque d'un profil détermine où se situe le point d'arrêt et à quel point l'écoulement doit tourner brusquement autour du guindant. Une entrée ronde avec le creux en avant accepte une plage d'incidences sans que l'écoulement se décolle d'un côté ou de l'autre : la voile est tolérante. Une entrée fine avec le creux plus en arrière a une polaire de traînée plus basse à son incidence de conception et permet un angle plus faible au vent apparent, mais décroche vite en dehors de cette plage. La tension de drisse déplace le tissu le long du guindant et modifie donc la répartition du creux. Comme la charge du vent et la flèche d'étai augmentent le creux et le font reculer, la tension de drisse doit augmenter avec le vent pour garder le creux près de sa position de conception.`,
    effects: [
      { target: 'Position du creux', effect: `Plus de drisse avance le creux ; moins de drisse le laisse reculer.` },
      { target: 'Entrée', effect: `Plus de drisse = entrée plus ronde et plus tolérante ; moins = entrée plus fine, plus de cap, plage de barre étroite.` },
      { target: 'Chute', effect: `Avancer le creux libère un peu la chute ; trop peu de drisse peut donner une chute qui semble refermée.` },
    ],
    interactions: [
      { control: 'Pataras', relation: `La tension de pataras réduit la flèche d'étai ; un étai plus droit aplatit le foc et avance le creux, donc il faut parfois moins de drisse quand le pataras est bien repris. Laissez l'étai faire de la flèche et il en faut plus.` },
      { control: 'Écoute de foc', relation: `Avec une entrée ronde (plus de drisse), on peut porter un peu plus d'écoute avant de décrocher. Avec une drisse molle, sur-border fait vite décrocher la voile.` },
      { control: 'Chariot de foc', relation: `Les gros changements de drisse modifient la hauteur du point d'écoute et l'angle d'écoute ; revérifiez le point de tire après un changement important.` },
      { control: 'Barre', relation: `La drisse fixe la largeur de la plage de barre : une plage large dans le clapot permet au barreur de négocier les vagues sans perdre le foc.` },
    ],
    mistakes: [
      `Garder le réglage de drisse du petit temps quand le vent monte, et laisser le creux reculer.`,
      `Trop tendre dans le petit temps : pli vertical et avant de voile rond qui freine.`,
      `Ignorer l'état de la mer : une entrée fine dans le clapot rend le bateau lent et difficile à barrer.`,
    ],
    keyPoints: [
      `Drisse = position du creux et forme de l'entrée.`,
      `Visez un creux vers 35-40 % de la corde sur le foc.`,
      `Festons = trop molle (parfois acceptable par tout petit temps) ; pli vertical = trop tendue.`,
      `Plus de vent ou plus de clapot = plus de drisse.`,
    ],
    diagram: 'draft',
    lab: {
      controls: ['jibHalyard', 'jibSheet', 'backstay'],
      focus: ['jibDraft', 'jibDepth', 'forestaySag', 'jibAoA'],
      tws: 12,
      twa: 42,
      presets: [
        { name: 'Drisse molle', description: `Le creux recule, entrée fine, plage de barre étroite.`, controls: { jibHalyard: 0.2 } },
        { name: 'Médium', description: `Creux vers 38 %, entrée équilibrée.`, controls: { jibHalyard: 0.55 } },
        { name: 'Drisse tendue dans la brise', description: `Creux maintenu en avant dans 18 nœuds malgré la flèche d'étai.`, controls: { jibHalyard: 0.85, backstay: 0.6 }, tws: 18 },
      ],
    },
    check: [
      {
        question: `Dans 16 nœuds avec un clapot court, le foc a son creux bien en arrière et le barreur a du mal à rester dans la plage. Que changez-vous ?`,
        options: [`Choquer la drisse`, `Reprendre la drisse`, `Avancer le chariot`],
        correct: 1,
        explanation: `Le vent et la flèche d'étai ont fait reculer le creux. Plus de drisse le ramène en avant et arrondit l'entrée, ce qui élargit la plage de barre pour le clapot.`,
      },
      {
        question: `Un pli vertical le long du guindant indique...`,
        options: [`Trop de tension de drisse`, `Pas assez de tension de drisse`, `Un chariot trop reculé`],
        correct: 0,
        explanation: `Trop de drisse ramène trop de tissu vers le guindant : on obtient un pli vertical et une entrée trop ronde.`,
      },
    ],
  },
  {
    id: 'jib-foot',
    module: 'headsail',
    title: 'Tension de bordure',
    altName: 'Foot tension',
    level: 2,
    skill: 'headsail',
    summary: `Le creux du tiers inférieur du foc gère la puissance en bas et la traînée ; sur un foc non recouvrant, il se règle avec le point de tire et la tension d'écoute plutôt qu'avec un réglage de bordure séparé.`,
    sections: [
      {
        heading: 'Le tiers inférieur, c\'est votre réserve de puissance',
        body: `La bordure du foc est la partie la plus basse de la voile, près du pont. Elle travaille dans l'air le plus lent et le plus perturbé (gradient de vent), mais elle a aussi un bras de levier de gîte court : sa puissance « coûte peu » en gîte. Une bordure plus ronde donne de la puissance pour relancer et passer dans le clapot ; une bordure plus plate réduit la traînée et permet de faire plus de cap en mer plate et dans la brise.\n\nIl n'y a pas de réglage de bordure sur un foc de J/80 classique. On règle le creux de bordure avec la position du chariot (avancé = bordure plus ronde) et la tension d'écoute (plus d'écoute = bordure plus plate, mais aussi chute plus tendue). Prenez comme repère la « poche » de bordure ou sa distance au pont / au pied de hauban.`,
      },
      {
        heading: 'La régler selon les conditions',
        body: `Petit temps (5-8 nœuds), mer plate : creux de bordure modéré ; trop rond, l'écoulement ne reste pas attaché à basse vitesse. Petit temps avec un reste de clapot : bordure plus ronde pour la puissance. Médium (8-14 nœuds) : bordure moyennement plate, près du pont si la voile le permet. Brise (15 nœuds et plus) : bordure plate, chariot reculé, pour réduire la traînée et la gîte.\n\nContrôlez avec les penons du bas et la latte basse / la chute : dans le clapot, la bordure ne doit pas être une ligne droite plaquée sur le pont, et dans la brise elle ne doit pas gonfler avec une grosse courbure.`,
      },
      {
        heading: 'En course',
        body: `Après un virement, une bordure un peu plus ronde grâce à l'écoute choquée donne un surplus de propulsion pendant que le bateau accélère. Une fois lancé, le réglage final l'aplatit. En pré-départ, quand vous êtes au travers lent sur une approche chronométrée, gardez la bordure un peu plus pleine pour que le bateau réponde quand vous remettez de la puissance.\n\nSi le barreur trouve que le bateau « colle » dans les vagues, regardez d'abord la bordure : une bordure plate avec le chariot reculé peut priver le bateau de puissance en bas. Annoncez « je te redonne de la bordure » quand vous choquez d'un centimètre ou avancez d'un trou au prochain portant.`,
      },
    ],
    physics: `Le creux augmente la portance qu'une section peut produire à une incidence donnée, mais aussi sa traînée de profil et sa sensibilité au décollement. Dans l'air lent et turbulent près du pont, l'écoulement a moins d'énergie, donc les sections creuses décrochent facilement à basse vitesse ; dans les vagues, le bateau a besoin d'un surplus de propulsion pour reprendre de la vitesse après chaque tangage. La bordure est aussi proche du pont, qui agit comme une plaque d'extrémité et réduit la traînée induite si l'espace est faible. Une bordure qui ferme sur le pont rend le foc aérodynamiquement « plus haut », ce qui améliore la finesse.`,
    effects: [
      { target: 'Creux des sections basses', effect: `Chariot avancé / écoute choquée = bordure plus creuse et plus de puissance ; chariot reculé / écoute bordée = bordure plus plate et moins de traînée.` },
      { target: 'Cap', effect: `Une bordure plus plate permet de faire plus de cap en mer plate.` },
      { target: 'Étanchéité au pont', effect: `Une bordure proche du pont réduit la traînée induite (effet plaque d'extrémité).` },
    ],
    interactions: [
      { control: 'Chariot de foc', relation: `Le point de tire est le réglage principal de la bordure : en avant pour le creux, en arrière pour aplatir. Il modifie aussi le vrillage en même temps.` },
      { control: 'Écoute de foc', relation: `Plus d'écoute aplatit la bordure mais ferme aussi la chute ; on ne peut pas changer l'un sans l'autre sans déplacer le chariot.` },
      { control: 'Bordure de GV', relation: `La bordure de GV et celle du foc partagent la fente près de la bôme. Une bordure de GV creuse avec une bordure de foc creuse étrangle le bas de la fente.` },
      { control: 'Gîte', relation: `La gîte éloigne le pont sous le vent de la bordure et casse l'effet plaque d'extrémité ; garder le bateau plus à plat garde la bordure efficace.` },
    ],
    mistakes: [
      `Aplatir la bordure dans le clapot et perdre la puissance nécessaire pour passer les vagues.`,
      `Garder une bordure très creuse dans la brise, ce qui ajoute de la gîte et de la traînée.`,
      `Oublier que chaque changement de bordure via le chariot modifie aussi le vrillage.`,
    ],
    keyPoints: [
      `Creux de bordure = puissance en bas avec un faible bras de levier de gîte.`,
      `Sur cette série, il se règle avec le point de tire et la tension d'écoute.`,
      `Plus plein pour le clapot et la relance, plus plat pour la mer plate et la brise.`,
      `Gardez la bordure près du pont pour l'effet plaque d'extrémité.`,
    ],
    diagram: 'draft',
    lab: {
      controls: ['jibLead', 'jibSheet'],
      focus: ['jibDepth', 'drive', 'heel', 'speed'],
      tws: 9,
      twa: 42,
      presets: [
        { name: 'Bordure pleine (clapot)', description: `Chariot avancé, écoute légèrement choquée : de la puissance pour passer dans les vagues.`, controls: { jibLead: 0.35, jibSheet: 0.75 } },
        { name: 'Bordure plate (mer plate)', description: `Chariot reculé, écoute bordée : peu de traînée, plus de cap.`, controls: { jibLead: 0.65, jibSheet: 0.9 } },
        { name: 'Brise', description: `Bordure plate et chariot reculé dans 18 nœuds.`, controls: { jibLead: 0.8, jibSheet: 0.9 }, tws: 18 },
      ],
    },
    check: [
      {
        question: `Sur un foc type J/80 sans réglage de bordure, comment rendre la bordure plus pleine ?`,
        options: [`Avancer le chariot ou choquer légèrement l'écoute`, `Reprendre la drisse`, `Reprendre le pataras`],
        correct: 0,
        explanation: `Avancer le chariot rend le vecteur d'écoute plus vertical, donc moins de charge part dans la bordure ; choquer l'écoute laisse aussi la bordure s'arrondir.`,
      },
      {
        question: `Pourquoi dit-on que la puissance de la bordure « coûte peu » ?`,
        options: [`L'air est plus rapide près du pont`, `Elle a un bras de levier de gîte court, donc crée peu de couple de gîte`, `Elle supprime totalement l'ardent`],
        correct: 1,
        explanation: `Une force près du pont s'applique bas au-dessus du centre de dérive : elle fait moins gîter le bateau que la même force appliquée en hauteur.`,
      },
    ],
  },
  {
    id: 'jib-leech',
    module: 'headsail',
    title: 'Tension de chute de foc',
    altName: 'Jib leech tension',
    level: 2,
    skill: 'headsail',
    summary: `La chute du foc fixe l'angle de sortie de l'écoulement et la forme de la fente : elle doit être assez tendue pour faire du cap, mais assez ouverte pour laisser respirer la GV.`,
    sections: [
      {
        heading: 'La sortie du foc, c\'est l\'entrée de la GV',
        body: `L'air qui quitte la chute du foc passe directement dans la fente, le long de l'extrados de la GV. Si la chute est refermée (elle remonte au vent à l'arrière), l'air est projeté sur l'extrados de la GV, le guindant de GV prend du dévent et tout le plan de voilure perd de la portance. Si la chute est trop ouverte, le foc porte moins et le bateau ne fait pas de cap.\n\nLe repère classique : la chute du foc doit être à peu près parallèle à l'extrados de la GV, le haut de la chute à quelques centimètres du bout de barre de flèche dans le vent médium. Les penons de chute (sur le bord de fuite) doivent filer vers l'arrière la plupart du temps.`,
      },
      {
        heading: 'Régler la tension de chute',
        body: `La tension de chute vient de l'écoute (traction vers le bas) et du point de tire (composante verticale de la traction). Plus d'écoute ou chariot avancé = chute plus tendue. La drisse et le pataras agissent indirectement : un étai plus tendu aplatit la voile et charge la chute différemment, et une drisse plus molle peut donner une chute qui semble refermée.\n\nDans le petit temps, évitez une chute tendue : l'écoulement a peu d'énergie et se décolle au bord de fuite, alors choquez un peu pour qu'il sorte proprement. Dans le médium, tenez-la ferme pour faire du cap. Dans la brise, laissez le haut s'ouvrir pour garder le bateau à plat.`,
      },
      {
        heading: 'Situations de match',
        body: `Quand vous avez besoin de hauteur pour tenir votre couloir sous le vent de l'adversaire, vous pouvez tendre un peu la chute, mais seulement une fois le bateau à pleine vitesse et seulement tant que la vitesse tient. Annoncez-le : « Chute tendue, mode cap. » Quand vous devez abattre pour la vitesse et passer sous le vent, choquez de 1 à 3 cm pour que la chute s'ouvre et que le foc propulse plus avec moins de force latérale.\n\nDans les risées, le régleur de GV ouvre en premier ; vous tenez la chute du foc stable pour que l'étrave ne tombe pas. La distance au bout de barre de flèche est votre langage commun avec le barreur.`,
      },
    ],
    physics: `La condition de Kutta impose que l'écoulement quitte un bord de fuite aigu de façon régulière. L'angle de la chute fixe donc la direction de sortie de l'écoulement et, via la circulation, la portance de toute la section. Une chute plus tendue augmente le creux effectif et la circulation (plus de portance, plus de cap), mais aussi le gradient de pression adverse près du bord de fuite, ce qui favorise le décollement quand l'écoulement est lent. Comme la circulation du foc crée une déviation vers le haut devant la GV et modifie la vitesse locale dans la fente, l'angle de chute du foc décide directement si l'écoulement sur l'extrados de la GV est accéléré (bonne fente) ou bloqué et inversé (dévent).`,
    effects: [
      { target: 'Cap', effect: `Une chute plus ferme augmente la circulation et permet de serrer davantage le vent.` },
      { target: 'Fente', effect: `Une chute refermée étrangle la fente et envoie du dévent dans la GV.` },
      { target: 'Vrillage en haut', effect: `La tension de chute règle l'ouverture de la têtière.` },
    ],
    interactions: [
      { control: 'Écoute de foc', relation: `L'écoute est le principal réglage de chute : 1 cm d'écoute change nettement la distance au bout de barre de flèche.` },
      { control: 'Chariot de foc', relation: `Chariot avancé, la chute se tend pour la même charge d'écoute ; chariot reculé, elle s'ouvre.` },
      { control: 'Écoute de GV', relation: `La chute de GV et la chute de foc doivent vriller ensemble. Si la chute de GV s'ouvre dans une risée, ouvrez aussi le haut du foc, sinon la fente se ferme en hauteur.` },
      { control: 'Pataras', relation: `Le pataras aplatit le foc et modifie un peu la tension de chute ; revérifiez l'écart à la barre de flèche après un gros changement de pataras.` },
    ],
    mistakes: [
      `Refermer la chute dans le petit temps pour essayer de faire du cap.`,
      `Ignorer le dévent au guindant de GV causé par une chute de foc trop tendue.`,
      `Tenir la chute dure dans les vagues alors que la vitesse baisse.`,
    ],
    keyPoints: [
      `Chute du foc à peu près parallèle à l'extrados de la GV.`,
      `Repères : distance au bout de barre de flèche et penons de chute.`,
      `Chute ferme = cap ; chute ouverte = relance et dépuissance.`,
      `La sortie du foc est l'entrée de la GV : une erreur de chute pénalise les deux voiles.`,
    ],
    diagram: 'slot',
    lab: {
      controls: ['jibSheet', 'jibLead', 'mainSheet'],
      focus: ['jibTwist', 'slot', 'mainAoA', 'drive'],
      tws: 11,
      twa: 42,
      presets: [
        { name: 'Chute ouverte', description: `Chute choquée : fente large, plus de propulsion, moins de cap.`, controls: { jibSheet: 0.72, jibLead: 0.6 } },
        { name: 'Parallèle', description: `Chute du foc parallèle à la GV.`, controls: { jibSheet: 0.85, jibLead: 0.5 } },
        { name: 'Refermée', description: `Chariot avancé et écoute à bloc : fente étranglée, GV qui prend du dévent.`, controls: { jibSheet: 0.98, jibLead: 0.25 } },
      ],
    },
    check: [
      {
        question: `La GV présente une poche de dévent permanente juste derrière le mât alors que le foc est bordé fort avec le chariot avancé. Cause probable ?`,
        options: [`Chariot de GV trop bas`, `Chute du foc refermée qui étrangle la fente`, `Bordure de GV trop tendue`],
        correct: 1,
        explanation: `Une chute de foc refermée projette l'air sur l'extrados de la GV et fait prendre du dévent au guindant. Ouvrez la chute du foc (choquez ou reculez le chariot).`,
      },
      {
        question: `Dans 6 nœuds, les penons de chute du foc décrochent sans arrêt derrière la voile. Que faites-vous ?`,
        options: [`Border plus fort`, `Choquer un peu pour ouvrir la chute`, `Reprendre de la drisse`],
        correct: 1,
        explanation: `Dans le petit temps, l'écoulement ne supporte pas une chute tendue ; choquer l'ouvre pour que l'air sorte proprement.`,
      },
    ],
  },
  {
    id: 'jib-draft-twist',
    module: 'headsail',
    title: 'Creux et vrillage',
    altName: 'Draft and twist',
    level: 3,
    skill: 'headsail',
    summary: `Le creux, sa position et le vrillage sont les trois variables de forme du foc ; ensemble, elles décident de la puissance, du cap et de la tolérance de la voile.`,
    sections: [
      {
        heading: 'Trois variables, plusieurs réglages',
        body: `Le creux est la profondeur de la voile rapportée à sa corde, en général autour de 10-14 % pour un foc au près. La position du creux est l'endroit où se trouve la profondeur maximale, vers 35-40 % de la corde. Le vrillage est la variation d'angle de corde du pied à la têtière. Chaque réglage agit sur plus d'une variable : l'écoute change le creux et le vrillage, le chariot change le vrillage et le creux de bordure, la drisse change la position du creux, le pataras change le creux via la flèche d'étai.\n\nRaisonnez en fonction de ce que vous cherchez : plus de puissance (plus de creux, moins de vrillage), plus de cap (entrée plus plate, chute plus ferme), moins de gîte (plus de vrillage, voile plus plate).`,
      },
      {
        heading: 'Pourquoi on a besoin de vrillage',
        body: `Le vent réel est plus faible près de l'eau à cause du frottement (gradient de vent). Le bateau avance à une seule vitesse pour tout le gréement, donc le vent apparent en haut est plus fort et plus ouvert qu'au niveau du pont. Sans vrillage, le haut de la voile aurait une incidence plus forte que le bas et décrocherait en premier. Le vrillage permet à chaque hauteur de travailler à une incidence comparable.\n\nLe vrillage est aussi un outil de dépuissance : ouvrir le haut réduit la force en hauteur, là où le bras de levier de gîte est le plus grand. Dans les conditions de match à risées, plus de vrillage donne une voile plus tolérante qui ne demande pas d'ajustements permanents.`,
      },
      {
        heading: 'Les changements de braquet sur J/80',
        body: `Petit temps (moins de 7 nœuds) : creux modéré, vrillage généreux, drisse plutôt molle, écoute choquée. Trop de creux par tout petit temps, c'est lent, car l'écoulement lent ne peut pas suivre une surface très courbée. Médium (8-14 nœuds) : le creux maximal que le bateau peut porter en restant près de sa gîte cible, vrillage réduit pour le cap. C'est le braquet « pleine puissance », celui où le poids de l'équipage au rappel rapporte le plus. Brise (15 nœuds et plus) : plus plat (pataras repris, drisse reprise), plus vrillé (chariot reculé), écoute ferme pour que la chute ne batte pas. Clapot, quelle que soit la force du vent : un peu plus de creux et de vrillage qu'en mer plate pour la puissance et une plage de barre plus large.\n\nCe sont des points de départ : vos voiles, le réglage du mât, le poids de l'équipage et l'état de la mer les feront bouger. Notez ce qui a marché à chaque manche, avec la force du vent et l'état de la mer, et partagez-le avec le barreur pour que vous reconnaissiez tous les deux les braquets.`,
      },
      {
        heading: 'Lire la forme sur l\'eau',
        body: `Regardez la voile de bas en haut depuis le point d'écoute ou depuis le bord au vent à travers la fenêtre : les bandes de creux montrent la profondeur et la position du creux, et l'angle de chaque bande par rapport à l'axe du bateau montre le vrillage. Comparez avec la GV : le profil de chute du foc doit suivre la courbe de l'extrados de la GV. Un foc « plat et joli » au ponton n'est pas forcément rapide ; jugez-le sur l'eau, à la vitesse et à la gîte.\n\nEn match, les changements de braquet se décident en équipe : « on est surtoilés, on aplatit » prévient le barreur que le cap va changer, et le régleur de GV peut ajuster vrillage et pataras en même temps. Changer le creux ou le vrillage du foc change toujours ce dont la GV a besoin.`,
      },
    ],
    physics: `La portance d'une section creuse dépend de l'incidence et du creux ; les sections plus creuses donnent plus de portance (et plus de traînée) et décrochent à des incidences plus faibles. La position du creux détermine où se trouve le pic de pression et comment l'écoulement gère le bord de fuite : creux en avant, entrée tolérante et sortie plate ; creux en arrière, entrée fine et chute plus chargée. Le vrillage adapte la voile au vent apparent vrillé créé par le gradient de vent. Une bonne répartition du vrillage réduit aussi la traînée induite en se rapprochant d'une charge elliptique sur la hauteur, et abaisse le centre de voilure, ce qui réduit le couple de gîte.`,
    effects: [
      { target: 'Creux', effect: `Plus de creux = plus de portance et de traînée, plage plus étroite avant le décrochage.` },
      { target: 'Position du creux', effect: `En avant = tolérant ; en arrière = cap mais pointu à barrer.` },
      { target: 'Vrillage', effect: `Plus de vrillage = centre de voilure plus bas, moins de gîte, moins de cap.` },
    ],
    interactions: [
      { control: 'Écoute de foc', relation: `Border réduit à la fois le creux et le vrillage ; choquer augmente les deux.` },
      { control: 'Chariot de foc', relation: `Le chariot avant / arrière arbitre entre vrillage et creux de bordure pour une charge d'écoute donnée.` },
      { control: 'Drisse de foc', relation: `La drisse déplace la position du creux sans beaucoup changer le vrillage.` },
      { control: 'Pataras', relation: `Le pataras réduit la flèche d'étai et donc le creux du foc ; un étai qui fait de la flèche rend le foc plus creux avec une entrée plus fine.` },
    ],
    mistakes: [
      `Garder un seul réglage pour toutes les conditions.`,
      `Confondre vrillage et creux : choquer l'écoute dans la brise ajoute du creux en bas en plus du vrillage.`,
      `Supprimer tout le vrillage dans le petit temps, ce qui fait décrocher le haut.`,
    ],
    keyPoints: [
      `Creux, position du creux et vrillage sont liés mais distincts.`,
      `Le vrillage existe parce que le vent apparent change avec la hauteur.`,
      `Plus de vent : plus plat, plus vrillé. Clapot : un peu plus plein et plus vrillé.`,
      `Creux vers 35-40 % sur le foc.`,
    ],
    diagram: 'twist',
    lab: {
      controls: ['jibSheet', 'jibLead', 'jibHalyard', 'backstay'],
      focus: ['jibDepth', 'jibDraft', 'jibTwist', 'heelMoment'],
      tws: 12,
      twa: 42,
      presets: [
        { name: 'Petit temps', description: `Creux modéré, plus de vrillage, drisse molle dans 6 nœuds.`, controls: { jibSheet: 0.75, jibLead: 0.45, jibHalyard: 0.35, backstay: 0.1 }, tws: 6 },
        { name: 'Pleine puissance médium', description: `Creux maximal, peu de vrillage dans 12 nœuds.`, controls: { jibSheet: 0.88, jibLead: 0.45, jibHalyard: 0.55, backstay: 0.3 } },
        { name: 'Brise', description: `Plat, vrillé, drisse ferme dans 20 nœuds.`, controls: { jibSheet: 0.9, jibLead: 0.8, jibHalyard: 0.85, backstay: 0.85 }, tws: 20 },
      ],
    },
    check: [
      {
        question: `Pourquoi un foc a-t-il besoin de vrillage ?`,
        options: [`Pour réduire la surface de voile`, `Parce que le vent apparent est plus ouvert et plus fort en hauteur`, `Pour garder les penons de chute décrochés`],
        correct: 1,
        explanation: `Le gradient de vent ouvre l'angle du vent apparent en hauteur. Le vrillage garde une incidence comparable à toutes les hauteurs.`,
      },
      {
        question: `Quel réglage déplace la position du creux en touchant le moins au vrillage ?`,
        options: [`L'écoute de foc`, `La drisse de foc`, `Le chariot de foc`],
        correct: 1,
        explanation: `La tension de drisse ramène ou relâche du tissu au guindant ; l'écoute et le chariot agissent fortement sur le vrillage.`,
      },
    ],
  },
  {
    id: 'jib-telltales',
    module: 'headsail',
    title: 'Penons',
    altName: 'Telltales',
    level: 1,
    skill: 'headsail',
    summary: `Les penons montrent si l'écoulement est attaché des deux côtés du guindant et à la chute ; bien les lire est la base de toute décision sur le foc.`,
    sections: [
      {
        heading: 'Ce que dit chaque penon',
        body: `Les penons de guindant sont près du bord d'attaque, des deux côtés, en général à trois hauteurs. Quand les deux filent vers l'arrière, l'écoulement est attaché et l'incidence est dans la bonne plage. Si le penon au vent se lève ou tourne, l'incidence est trop faible : la voile va faseyer (soit le barreur serre trop le vent, soit la voile n'est pas assez bordée). Si le penon sous le vent décroche (il retombe, tourne ou s'enroule vers l'avant), l'incidence est trop forte : l'écoulement s'est décollé côté sous le vent (barreur trop abattu ou voile sur-bordée).\n\nLes penons de chute, sur le bord de fuite, montrent si l'écoulement quitte la voile proprement. S'ils se replient derrière la voile, la chute est trop tendue pour la vitesse de l'écoulement.`,
      },
      {
        heading: 'Barrer ou régler ?',
        body: `Au près sur cette série, le barreur barre aux penons de foc et vous réglez pour qu'ils travaillent dans le mode choisi. Un penon qui décroche alors que le bateau garde un cap stable, c'est un signal de réglage ; un penon qui décroche parce que le bateau a changé de cap, c'est un signal de barre. En mode cap, le penon au vent se lève de temps en temps (il doit « danser ») ; en mode vitesse, les deux filent et celui sous le vent frétille parfois. Dans les vagues, acceptez plus de mouvement : le cap du bateau et le vent apparent oscillent, et courir après chaque frémissement à l'écoute coûte plus qu'il ne rapporte.\n\nLes trois hauteurs renseignent sur le vrillage : si toutes décrochent ensemble quand le barreur lofe lentement, le point de tire est neutre. Si le haut décroche en premier, le haut est trop vrillé (chariot en avant) ; si c'est le bas, le haut est fermé par rapport à la bordure (chariot en arrière). Dans la brise, un haut qui décroche légèrement en premier est souvent souhaitable, car cela veut dire que la têtière est dépuissancée.`,
      },
      {
        heading: 'Communication et pièges',
        body: `Le régleur de foc voit souvent mieux les penons sous le vent que le barreur. Faites des annonces courtes et constantes : « sous le vent décroche », « au vent danse », « le haut se lève », « tout file ». En match, le barreur regarde souvent l'adversaire ou la ligne ; vos annonces penons deviennent ses yeux sur le foc, et elles valent le plus cher en pré-départ et dans les premières secondes après un virement.\n\nPar tout petit temps, les penons peuvent pendre faute de vent et vous tromper : distinguez un penon qui pend (pas d'énergie dans l'écoulement, il retombe) d'un penon qui tourne ou s'enroule vers l'avant (écoulement décollé). Gardez-les propres, en laine légère ou en spi ; des penons mouillés collent à la voile et mentent. N'oubliez pas que la GV a aussi les siens : le penon de chute de la latte haute est l'équivalent, pour le régleur de GV, de vos penons de guindant, et les deux voiles se lisent ensemble.`,
      },
    ],
    physics: `Un penon est un indicateur d'écoulement : quand la couche limite est attachée, il est entraîné vers l'arrière le long de la surface. Côté au vent près du guindant, une incidence faible déplace le point d'arrêt sous le vent du bord d'attaque, si bien que l'écoulement s'inverse côté au vent et que le penon au vent se lève. Côté sous le vent, une forte incidence crée un gradient de pression adverse que la couche limite ne peut pas surmonter ; l'écoulement se décolle et le penon sous le vent décroche. Les penons de chute indiquent si l'écoulement quitte proprement le bord de fuite (condition de Kutta) ou se décolle trop tôt.`,
    effects: [
      { target: 'Penon de guindant au vent qui se lève', effect: `Incidence trop faible : abattre ou border.` },
      { target: 'Penon de guindant sous le vent qui décroche', effect: `Incidence trop forte : lofer ou choquer.` },
      { target: 'Penon de chute qui se replie', effect: `Chute trop tendue pour l'écoulement : choquer l'écoute ou reculer le chariot.` },
    ],
    interactions: [
      { control: 'Écoute de foc', relation: `L'écoute fixe l'incidence que les penons affichent ; bordez quand le penon au vent se lève à cap constant, choquez quand celui sous le vent décroche.` },
      { control: 'Chariot de foc', relation: `L'ordre dans lequel les hauteurs décrochent vous dit si le point de tire est bon.` },
      { control: 'Barre', relation: `Le barreur peut réagir aux penons plus vite que le régleur ; mettez-vous d'accord sur qui réagit à quoi.` },
      { control: 'Grand-voile', relation: `Les penons de chute de GV (latte haute) sont l'équivalent sur la GV ; surveillez les deux voiles ensemble pour l'équilibre de la fente.` },
    ],
    mistakes: [
      `Confondre les signaux au vent et sous le vent.`,
      `Sur-réagir à chaque frémissement dans les vagues.`,
      `Prendre des penons qui pendent par petit temps pour un décrochage.`,
    ],
    keyPoints: [
      `Au vent qui se lève = incidence trop faible ; sous le vent qui décroche = incidence trop forte.`,
      `Les trois hauteurs révèlent le vrillage et le point de tire.`,
      `Les penons de chute montrent si la chute est trop tendue.`,
      `Des annonces penons courtes aident le barreur en match.`,
    ],
    diagram: 'telltales',
    lab: {
      controls: ['jibSheet', 'jibLead'],
      focus: ['jibAoA', 'jibTwist', 'speed'],
      tws: 10,
      twa: 40,
      presets: [
        { name: 'Sous-bordé', description: `Penons au vent qui se lèvent.`, controls: { jibSheet: 0.6 } },
        { name: 'Correct', description: `Les deux côtés filent.`, controls: { jibSheet: 0.85 } },
        { name: 'Sur-bordé', description: `Penons sous le vent qui décrochent.`, controls: { jibSheet: 1 } },
      ],
    },
    check: [
      {
        question: `Le penon de guindant sous le vent tourne. Comment est l'incidence ?`,
        options: [`Trop faible`, `Trop forte`, `Correcte`],
        correct: 1,
        explanation: `Un décrochage sous le vent signifie que l'écoulement s'est décollé côté sous le vent, à cause d'une incidence trop forte.`,
      },
      {
        question: `Le penon au vent se lève alors que le bateau tient son cap. Réaction du régleur ?`,
        options: [`Choquer`, `Border`, `Reculer le chariot`],
        correct: 1,
        explanation: `Un penon au vent qui se lève signifie une incidence trop faible ; border l'augmente.`,
      },
    ],
  },
  {
    id: 'jib-over-under-trim',
    module: 'headsail',
    title: 'Sur-bordé / sous-bordé',
    altName: 'Over-trimming and under-trimming',
    level: 1,
    skill: 'headsail',
    summary: `L'essentiel de la vitesse perdue vient de petites erreurs de réglage : sur-border fait décrocher la voile et donne de la gîte sans vitesse, sous-border la fait faseyer et gaspille de la surface.`,
    sections: [
      {
        heading: 'Sur-border',
        body: `Sur-border augmente l'incidence au-delà du point où l'écoulement peut rester attaché côté sous le vent. Les penons sous le vent décrochent, le haut de la chute se ferme, la traînée grimpe brutalement et la force totale bascule sur le côté : on obtient de la gîte et de la dérive au lieu de la propulsion. Le bateau paraît « chargé » et puissant, la barre durcit, et la vitesse baisse progressivement, c'est pour cela qu'on s'en rend si peu compte.\n\nC'est l'erreur de régleur la plus courante, parce que border plus fort donne l'impression d'en faire plus. Elle coûte particulièrement cher dans le petit temps (l'écoulement a peu d'énergie et se décolle tôt), dans les vagues (le bateau ralentit sans cesse et le vent apparent ne cesse d'adonner) et juste après un virement, quand le bateau est sous sa vitesse cible et que le vent apparent est plus ouvert qu'à pleine vitesse.`,
      },
      {
        heading: 'Sous-border',
        body: `Sous-border diminue l'incidence jusqu'à ce que le guindant faseye et que les penons au vent décrochent. L'avant de la voile ne porte plus, une poche apparaît au guindant, le foc perd de la puissance et le bateau ne fait plus de cap ; la fente s'ouvre aussi trop, et la GV perd une partie de l'aide du foc. Dans la brise, un foc choqué de quelques centimètres pendant quelques secondes est une dépuissance légitime, mais un sous-bordage prolongé gaspille simplement de la surface.\n\nCela arrive typiquement quand on ne reborde pas après avoir choqué dans une risée, ou quand le régleur regarde l'adversaire au lieu de la voile. Un foc de J/80 n'a que quelques centimètres entre « rapide » et « faseye », donc une écoute qui glisse sur la poupée du winch suffit.`,
      },
      {
        heading: 'Trouver la limite',
        body: `Le réglage rapide est proche de la limite de décrochage, mais du côté attaché. Technique : choquez lentement jusqu'à ce que le guindant commence juste à faseyer, puis bordez jusqu'à ce que ça s'arrête, plus un centimètre. Recommencez régulièrement, et à chaque fois que le vent, l'état de la mer ou la vitesse du bateau change. Prenez la vitesse comme arbitre, pas les sensations : « vitesse moins 0,2, je choque 2 cm ».\n\nEn match, sur-border au départ ou en sortie de virement coûte des longueurs très difficiles à reprendre. Avant le coup de canon, mettez-vous d'accord avec le barreur sur le réglage « go » et ne bordez pas plus que le repère tant que le bateau n'est pas à pleine vitesse. Les repères exacts dépendent du bateau, des voiles, du réglage du gréement et de l'état de la mer.`,
      },
    ],
    physics: `La portance augmente presque linéairement avec l'incidence jusqu'à ce que l'écoulement commence à se décoller côté sous le vent ; au-delà, la portance cesse d'augmenter puis chute, tandis que la traînée grimpe fortement. La force aérodynamique totale se décompose en propulsion (le long de la route) et force latérale (perpendiculaire). Après le décrochage, le vecteur force tourne en s'éloignant de la route : moins de propulsion, autant ou plus de force latérale, plus de gîte et de dérive. Sous-border déplace le point d'arrêt côté sous le vent du guindant, si bien que l'écoulement côté au vent se décolle autour du bord d'attaque et que l'avant de la voile porte peu. La meilleure propulsion pour une gîte donnée se trouve juste avant le début du décrochage.`,
    effects: [
      { target: 'Sur-bordé', effect: `Décrochage sous le vent, chute fermée, plus de gîte et de dérive, plus de traînée, perte de vitesse progressive.` },
      { target: 'Sous-bordé', effect: `Poche au guindant, portance perdue, cap médiocre, fente trop ouverte.` },
      { target: 'Réglage à la limite', effect: `Propulsion maximale pour la gîte, les deux penons de guindant filent.` },
    ],
    interactions: [
      { control: 'Écoute de GV', relation: `La GV peut être sur-bordée exactement de la même façon (penon de chute de la latte haute caché). Les deux voiles sont souvent sur-bordées ensemble quand l'équipage « force » pour faire du cap.` },
      { control: 'Chariot de foc', relation: `Un chariot trop avancé rend le haut sur-bordé même avec une écoute correcte ; un chariot trop reculé rend le haut sous-bordé. Corrigez le point de tire avant d'accuser l'écoute.` },
      { control: 'Barre', relation: `Le sur-bordage, surtout de la GV, augmente l'ardent : le barreur se bat avec le safran et ajoute de la traînée.` },
      { control: 'Pataras', relation: `Pataras repris, le foc est plus plat et décroche à une incidence plus faible : la limite est plus proche, réglez avec plus de soin.` },
    ],
    mistakes: [
      `Border plus fort dès que la vitesse baisse.`,
      `Ne jamais choquer pour vérifier où se trouve la limite.`,
      `Laisser la voile choquée une fois la risée passée.`,
      `Border au repère de pleine vitesse alors que le bateau est encore lent.`,
    ],
    keyPoints: [
      `Le réglage rapide est juste du côté attaché de la limite de décrochage.`,
      `Sur-bordé = de la gîte sans vitesse.`,
      `Testez la limite régulièrement : choquez jusqu'à ce que le guindant faseye, puis rebordez un peu.`,
      `À basse vitesse (sortie de virement, après les vagues), le vent apparent est plus ouvert : le bon réglage est plus choqué.`,
    ],
    diagram: 'aoa',
    lab: {
      controls: ['jibSheet', 'mainSheet'],
      focus: ['jibAoA', 'drive', 'heel', 'speed'],
      tws: 10,
      twa: 42,
      presets: [
        { name: 'Sous-bordé', description: `Foc qui faseye.`, controls: { jibSheet: 0.55 } },
        { name: 'Limite', description: `Optimal.`, controls: { jibSheet: 0.85 } },
        { name: 'Sur-bordé', description: `Décroché.`, controls: { jibSheet: 1, mainSheet: 1 } },
      ],
    },
    check: [
      {
        question: `Après avoir bordé plus fort, le bateau gîte davantage mais la vitesse baisse. Que s'est-il passé ?`,
        options: [`Vous avez trouvé plus de puissance`, `Vous avez fait décrocher la voile`, `Le vent a forci`],
        correct: 1,
        explanation: `Après le décrochage, la force bascule sur le côté : plus de gîte, moins de propulsion.`,
      },
      {
        question: `Meilleure façon de trouver le bon réglage ?`,
        options: [`Border à bloc`, `Choquer jusqu'à ce que le guindant faseye, puis reborder légèrement`, `Copier le réglage de l'adversaire`],
        correct: 1,
        explanation: `On repère ainsi la limite de l'écoulement attaché et on règle juste en deçà.`,
      },
    ],
  },
];
