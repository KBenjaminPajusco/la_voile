# TRIMMASTER — la voile, côté régleur

**▶ En ligne : https://benjamin.pajusco.fr/la_voile/**

Une appli d'entraînement pour régleurs de foc, de GV et de spi sur quillard de match race d'environ 8 m (type J/80) :
une école de voile avec labos 3D, un quiz de situations, des mises en situation chronométrées, un labo manœuvres,
un simulateur libre (avec un mode jeu) et des match races. En français et en anglais.

> **Un mot avant de commencer** — TRIMMASTER, c'est la voile et le réglage tels que je les comprends : ce que j'ai
> appris sur l'eau et ce que j'ai lu, mis dans un modèle physique et une appli. Ce n'est pas un VPP certifié et ce
> n'est sûrement pas parfait. Le vrai réglage dépend du bateau, du calage du gréement, des voiles, de la mer et de
> l'équipage. Sers-t'en pour réfléchir au réglage et t'entraîner l'œil, et fais confiance à l'eau quand elle n'est
> pas d'accord. — Benjamin Pajusco

*An interactive trainer for jib, main and kite trimmers on ~26 ft match-racing keelboats (J/80 type), in French and English.
It is how I understand sailing: simplified, physically informed, certainly not perfect.*

## Lancer en local / Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # vérification des types + build statique (dist/)
npm test           # scénarios headless + "bots" régleurs (cohérence physique & notation)
npm run polar      # régénère les vitesses cibles / réglages optimaux après un changement de physique
```

C'est un site 100 % statique (aucun serveur) : chaque push sur `main` est construit et publié sur GitHub Pages par
`.github/workflows/pages.yml`. La progression est sauvegardée dans le navigateur (`localStorage`).

## Contenu
- **Tableau de bord** : niveau, XP, performances récentes, compétences à travailler, exercice recommandé.
- **École de voile** : 27 leçons (foc, GV, comportement du bateau), chacune avec la physique, les interactions entre
  réglages, les erreurs fréquentes, des questions, et un **labo interactif en 3D** (mêmes voiles que le simulateur,
  pilotées par les curseurs ; les poignées 3D bougent les curseurs). Les sections de voiles ont un 3ᵉ schéma, « foc + GV = une aile », qui montre si les deux voiles forment bien les deux faces d’un même profil.
- **Quiz** : 38 situations, chacune montrée en 3D, avec réponses notées, conséquences et « quand la réponse change ».
- **Mises en situation** : 8 scénarios sous pression (surtoilé, relance après virement, risée soudaine, spi à la limite…).
  Les risées se voient arriver sur l'eau ~10 s avant de toucher le bateau. Elles descendent avec le vent : au près on
  fonce dessus, sous spi elles arrivent de derrière et nous rattrapent lentement (et restent plus longtemps).
- **Labo manœuvres** : 9 exercices (virement, empannage, relance, abattée, lofée, pré-départ, modes, risée, molle).
- **Simulateur** : entraînement libre et 3 match races, vue 3D depuis la place du régleur :
  - penons sur les deux faces du foc (vus par des fenêtres transparentes), penons de chute, guindant du spi qui roule
    quand on choque trop ;
  - caméras régleur / sous le vent / GV / barreur / poursuite / arrière (la GV vue pile de derrière), inertie de la tête, flèches de force (propulsion / gîte) ;
  - poignées 3D sur chaque réglage, avec une jauge (actuel / visé / optimal) ;
  - **équipage auto** (les voiles sont réglées pour toi, tu barres) et **mode jeu** (barre à la souris, tu prends
    n'importe quel réglage : clic gauche border, clic droit choquer).
- **Progression** : 8 niveaux, radar de compétences, meilleurs scores, historique.

## Architecture
```
src/sim/        moteur de simulation (sans React) : profil bateau, physique des voiles par sections, vent
                (risées scriptées + bruit déterministe, prévision exacte), dynamique gîte/tangage/vitesse,
                winch, barreur IA, notation
src/three/      vue 3D : TrimmerScene (caméras, voiles, penons, forces, poignées), j80Model (bateau procédural),
                j80Mesh (modèle J/80), kiteMold (spi moulé et déformé), boat3d/ (shader d'eau et état de mer)
src/content/    contenu pédagogique (leçons FR/EN, quiz FR/EN, situations, manœuvres, courses, niveaux)
src/components, src/pages, src/ui   interface React
src/i18n.ts     langue (FR/EN), choisie au chargement
```

## Crédits
- Modèle 3D du J/80 : « J-80 Sailboat », publié sur Sketchfab (les métadonnées du fichier citent *dlawlor*).
  Nettoyé pour l'appli (voiles, écoutes, bôme, barre, bout-dehors et étai retirés ; marquages effacés).
- Photo du ciel : Poly Haven (CC0). Carte de normales de l'eau : exemples three.js (MIT).
- Shader d'eau et état de mer : mon projet boat3d.
- React, TypeScript, Vite, Tailwind, three.js, Lucide.
