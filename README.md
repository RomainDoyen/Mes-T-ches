# Mes Tâches

Extension navigateur pour organiser vos tâches **en local** : priorités, tags, catégories, sous-tâches et multi-profils. Les données restent sur votre appareil (SQLite), sans compte ni cloud.

## Compatibilité navigateurs

| Navigateur | Statut |
|---|---|
| Chrome | Cible principale (MV3) |
| Brave / Edge / Opera / Chromium | Compatible (même build Chrome) |
| Firefox | Build dédié : `npm run build:firefox` (à valider manuellement) |
| Safari | Non supporté pour l’instant |

Brave peut ignorer le style CSS des scrollbars natives (anti-fingerprinting) : l’UI utilise une scrollbar custom (`ElegantScroll`) pour garder le design teal partout.

## Fonctionnalités V1

- CRUD tâches, catégories, tags, sous-tâches
- Multi-profils locaux
- Recherche + filtres rapides + filtre par tag
- Gestion des tags (créer / renommer / couleur / supprimer)
- Dark / light
- Export / import JSON

## Développement

```bash
npm install
npm run dev
npm test
npm run build
npm run build:firefox
```

### Chrome introuvable (`CHROME_PATH`)

`npm run dev` lance Chromium automatiquement. S’il n’est pas installé système, WXT utilise le Chromium Playwright s’il est présent (`npx playwright install chromium`).

Sinon, définis le binaire :

```bash
export CHROME_PATH=/chemin/vers/google-chrome
npm run dev
```

Ou charge manuellement `.output/chrome-mv3-dev` (après `npm run dev`) / `.output/chrome-mv3` (après `npm run build`) via `chrome://extensions` → mode développeur → « Charger l’extension non empaquetée ».

Pour Brave : même dossier build Chrome, via `brave://extensions`.

## API Worker (Cloudflare)

Proxy Appwrite pour auth et sync cloud. Package séparé dans `api/`.

```bash
cd api
cp .dev.vars.example .dev.vars   # puis renseigner les secrets
npm install
npx wrangler dev
curl -s http://127.0.0.1:8787/health   # → {"ok":true}
```

Variables d’environnement : voir `api/.dev.vars.example`. Le namespace KV `SESSIONS` sera créé au déploiement (remplacer les IDs placeholder dans `wrangler.toml`).
