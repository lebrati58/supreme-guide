# CLAUDE.md — SUPREME GUIDE

Jeu de quiz de voyage mondial, « Every Journey Is a Game! » : tout trajet (avion, train, bus, voiture, marche, croisière) devient un quiz, **en ligne ou en mode avion**. La mascotte, le Supreme Guide, est un peu pompeuse et toujours bienveillante. PWA installable, en **10 langues** (dont hébreu et arabe en RTL).

Références : `README.md` (fonctions), **`ARCHITECTURE.md`** (stack, organisation, i18n, quiz liés au trajet, multijoueur), `ROADMAP.md`, `CHANGELOG.md`. Le prototype d'origine est conservé dans `public/legacy/`.

## Stack
Vite + React 18 + TypeScript (SPA statique, routeur par hash), MapLibre GL, Workbox / vite-plugin-pwa, IndexedDB (`idb`), PeerJS pour le multijoueur, Vitest + Playwright. Les données viennent de `public/data/`, générées par `scripts/build_data.py`.

## Commandes
```bash
npm install
npm run dev          # http://localhost:5173/supreme-guide/
npm run typecheck
npm test             # Vitest
npm run build && npm run preview &   # dist/ servi sur :4173
npm run test:e2e     # Playwright : smoke + mode avion
npm run i18n         # régénère src/i18n/locales/en.json
npm run i18n:check   # catalogue à jour + 10 langues complètes et valides
npm run data         # reconstruit public/data
```
Avant chaque PR, lance la même chaîne que la CI : `typecheck` → `i18n:check` → `test` → `build` → `test:e2e`. Pour les vérifications visuelles, utilise le skill **playwright** du dépôt.

## Déploiement
`.github/workflows/ci-deploy.yml` : à chaque push sur `main`, la CI vérifie les types, teste, construit, lance l'e2e en mode avion, puis publie `dist/` sur GitHub Pages (https://lebrati58.github.io/supreme-guide/). Si une étape échoue, rien n'est publié.

## Règles de travail
- **Chaque question a une réponse vérifiée**, une explication, une difficulté, une catégorie et une **source**. Les questions générées ne puisent leurs réponses que dans des données structurées. Un contenu IA est toujours marqué 🤖.
- **Tout texte nouveau passe par le système i18n** (`src/i18n/ui.ts`, puis `npm run i18n`), dans les 10 langues. Pas de chaîne en dur. Le RTL utilise des propriétés CSS logiques (`inset-inline-*`, `text-align: start`).
- **Hors ligne d'abord** : toute fonction doit marcher en mode avion, ou dire clairement qu'elle a besoin d'Internet. Le précache est versionné. Toute nouvelle ressource doit être ajoutée au précache.
- Une position de vol estimée est **toujours affichée comme une estimation**.
- Le GPS est toujours facultatif (opt-in). En mode conducteur, le verrou de sécurité reste actif.
- Licences : respecte les attributions de `README.md` (ODbL, CC BY, OSM…). Toute nouvelle donnée doit avoir une licence compatible, ajoutée aux crédits.
- Aucune clé API dans le client. Les services payants passent par un proxy serveur (`server/`), désactivé par défaut.
- Mets à jour `CHANGELOG.md` à chaque version. Travaille sur une branche avec une PR. « **yallah** » veut dire : fusionne dans `main`, puis vérifie la publication.
- Ne dis jamais qu'une chose est testée si elle ne l'a pas été.
