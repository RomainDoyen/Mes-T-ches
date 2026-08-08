# Mes Tâches

Extension navigateur pour organiser vos tâches : priorités, tags, catégories, sous-tâches et multi-profils. Données locales (IndexedDB) avec **sync cloud optionnelle** via compte (email ou Google).

## Architecture cloud

```
Extension (MV3)  →  Worker Cloudflare (api/)  →  Appwrite Cloud
     │                        │                         │
  IndexedDB              auth + sync              collections
  outbox offline         Bearer opaque            userId filtré
```

L’extension ne contient **aucun secret Appwrite** : elle appelle uniquement le Worker via `WXT_API_BASE_URL`. Le Worker détient `APPWRITE_API_KEY` côté serveur et filtre toutes les requêtes par `userId` de session.

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
- Compte + sync cloud (email / Google, outbox offline)

## Développement

### Extension

```bash
npm install
cp .env.example .env   # WXT_API_BASE_URL
npm run dev
npm test
npm run build
npm run build:firefox
```

### API Worker (sync + auth)

```bash
cd api
cp .dev.vars.example .dev.vars   # credentials Appwrite
npm install
npx wrangler dev
curl -s http://127.0.0.1:8787/health   # → {"ok":true}
```

Lancer **les deux** en parallèle pour tester la sync : `npm run dev` (racine) et `cd api && npx wrangler dev`.

### Variables d’environnement

| Fichier | Variables | Usage |
|---|---|---|
| `.env` (racine) | `WXT_API_BASE_URL` | URL du Worker (ex. `http://127.0.0.1:8787`) |
| `api/.dev.vars` | `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `SESSION_SECRET`, `EXTENSION_ID`, `APP_ORIGIN` | Secrets serveur (jamais dans l’extension) |

Voir `api/.dev.vars.example` pour le détail. Le namespace KV `SESSIONS` sera créé au déploiement (remplacer les IDs placeholder dans `wrangler.toml`).

### Setup Appwrite

Auth Google + secrets : **[docs/superpowers/setup-appwrite.md](docs/superpowers/setup-appwrite.md)**.

DB / tables / colonnes : automatiques via `cd api && npm run provision` (ou CI). Deploy Worker : `npm run deploy` / `npm run deploy:full`, ou le workflow GitHub Actions.

> **Google OAuth** : configuration Google Cloud Console + Appwrite (voir le guide).  
> **Sync** : `APPWRITE_API_KEY` est **obligatoire** côté Worker.

### Chrome introuvable (`CHROME_PATH`)

`npm run dev` lance Chromium automatiquement. S’il n’est pas installé système, WXT utilise le Chromium Playwright s’il est présent (`npx playwright install chromium`).

Sinon, définis le binaire :

```bash
export CHROME_PATH=/chemin/vers/google-chrome
npm run dev
```

Ou charge manuellement `.output/chrome-mv3-dev` (après `npm run dev`) / `.output/chrome-mv3` (après `npm run build`) via `chrome://extensions` → mode développeur → « Charger l’extension non empaquetée ».

Pour Brave : même dossier build Chrome, via `brave://extensions`.
