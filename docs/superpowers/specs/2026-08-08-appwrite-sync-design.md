# Mes Tâches — Sync Appwrite (design)

**Date:** 2026-08-08  
**Statut:** Validé (brainstorming)  
**Produit:** Extension navigateur « Mes Tâches » (WXT + React + SQLite WASM)

## Objectif

Empêcher la perte des données à la désinstallation / changement d’appareil, via un compte Appwrite Cloud, tout en gardant une UX popup fluide offline grâce à SQLite local.

## Décisions figées

| Sujet | Choix |
|---|---|
| Backend data / auth | Appwrite Cloud |
| Mode données | Hybride : SQLite local + sync cloud |
| Auth | Email + mot de passe **et** Google OAuth |
| Accès app | Connexion **obligatoire** (pas de mode invité) |
| Intégration | Extension → **Cloudflare Worker API** → Appwrite (approche 2) |
| Conflits V1 | Last-write-wins sur `updatedAt` |
| Export JSON | Conservé comme filet de sécurité |

## Architecture

```
[Popup React]
    │  CRUD immédiat → SQLite WASM (IndexedDB)
    ▼
[Background service worker]
    │  outbox de sync + session
    ▼
[Cloudflare Worker API]     ← seul host autorisé dans l’extension
    ▼
[Appwrite Cloud]
    Auth (email + Google)
    Databases (collections miroir du schéma local)
```

### Responsabilités

- **Popup** : UI, gate login, CRUD via stores/repos existants (SQLite).
- **Background** : traitement de l’outbox, refresh session, sync au démarrage / périodique.
- **Worker** : auth (login, register, OAuth start/callback, session), CRUD sync proxy vers Appwrite, validation `userId`, jamais d’API key Appwrite dans l’extension.
- **Appwrite** : source de vérité cloud ; isolation par `userId`.

## Auth

### Email / mot de passe

1. Formulaire login / register dans le popup.
2. `POST /auth/login` ou `POST /auth/register` → Worker → Appwrite Account API.
3. Worker renvoie un **token de session opaque** (Bearer) à l’extension. L’extension l’envoie en `Authorization` sur les appels API. Pas de cookie cross-origin (peu fiable depuis une extension MV3).
4. Stockage : `chrome.storage.local` sous clé scoped `session:<userId>` + métadonnées d’expiry ; le background rafraîchit via `GET /auth/me` au besoin.

### Google OAuth

1. Popup « Continuer avec Google » → ouvre un onglet vers `GET /auth/google` (Worker).
2. Worker démarre le flow OAuth Appwrite (Google).
3. Callback Worker finalise la session Appwrite.
4. Worker redirige vers une **page HTML hébergée par le Worker** (`/auth/bridge`) qui contient le code one-shot. Cette page appelle `chrome.runtime.sendMessage` si l’extension injecte un script, **sinon** affiche le code + deep link `https://<api>/auth/bridge?code=…` que le **background** intercepte via `chrome.tabs.onUpdated` en matchant l’URL du Worker (permissions `host_permissions` sur l’API). Mécanisme retenu V1 : **interception d’URL du bridge par le background** (pas de custom protocol).
5. Extension échange le code (`POST /auth/exchange`) contre le Bearer session.

### Règles session

- Pas de session valide → écran Login uniquement (shell tâches inaccessible).
- 401 / session expirée → logout soft, outbox en pause, retour Login.
- Déconnexion → purge session ; **cache SQLite conservé** ; au prochain login du **même** `userId`, resync ; si autre `userId`, vider ou isoler le cache local (règle : **isoler par userId** — une DB/clé IndexedDB par utilisateur pour éviter les fuites entre comptes).

## Modèle de données cloud

Collections Appwrite (documents), champs alignés sur SQLite actuel + :

- `userId` (string, requis, indexé)
- `updatedAt` (ISO string, requis)
- `deletedAt` (ISO string | null) — soft delete pour propagation sync

Collections :

1. `profiles`
2. `categories`
3. `tags`
4. `tasks`
5. `task_tags`
6. `subtasks`

Permissions Appwrite : documents lisibles/modifiables uniquement par le propriétaire (`userId` = user). Le Worker utilise la session utilisateur (ou API key serveur + filtre strict `userId`) — **préférer session user** pour respecter les permissions documentaires.

IDs : réutiliser les UUID locaux comme IDs documents Appwrite pour un mapping 1:1.

## Sync

### Pull (boot / focus popup / périodique)

1. Lire `lastSyncAt` pour le `userId` courant.
2. Worker renvoie les documents avec `updatedAt > lastSyncAt` (toutes collections).
3. Merge dans SQLite : si cloud `updatedAt` ≥ local → overwrite ; soft-deleted → supprimer localement.
4. Mettre à jour `lastSyncAt`.

### Push (outbox)

1. Chaque mutation locale (create/update/delete) écrit une entrée outbox : `{ entity, id, op, payload, updatedAt }`.
2. Background drain l’outbox vers `POST /sync/push` (batch).
3. Succès → retirer de l’outbox ; échec réseau → retry avec backoff.
4. Conflit même id : LWW via `updatedAt` (le serveur peut renvoyer le gagnant pour recalage local).

### États UI sync

- `synced` — outbox vide, dernier pull OK  
- `pending` — outbox non vide  
- `offline` — pas de réseau / Worker injoignable  
- `error` — échecs répétés (toast + détail dans Paramètres)

## UI

- **Écran Login** : email, mot de passe, liens créer un compte, bouton Google.
- **Header** : pastille sync (synced / pending / offline / error).
- **Paramètres** : email du compte, état sync + dernière sync, déconnexion, export/import JSON inchangés.

Design system existant (teal / glass) conservé ; pas de refonte visuelle hors écrans auth.

## API Worker (esquisse)

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/auth/register` | Création compte email |
| POST | `/auth/login` | Login email |
| GET | `/auth/google` | Démarre OAuth |
| GET | `/auth/callback` | Callback OAuth |
| POST | `/auth/exchange` | Code → session extension |
| POST | `/auth/logout` | Invalide session |
| GET | `/auth/me` | User courant |
| GET | `/sync/pull?since=` | Delta documents |
| POST | `/sync/push` | Batch mutations |

Config extension : `VITE_API_BASE_URL` (ou équivalent WXT).  
Secrets Appwrite uniquement dans les env du Worker.

## Erreurs & résilience

- Offline : CRUD local OK ; pastille `offline` ; outbox s’accumule.
- Sync error persistante : toast + `error` ; retry manuel possible depuis Paramètres.
- Pas de perte locale volontaire à la déco (sauf changement de `userId`).

## Hors scope V1

- Mode invité / usage sans compte  
- Collab multi-users, partage de listes  
- Realtime Appwrite  
- Résolution de conflits autre que LWW  
- Migration automatique des données locales « pré-compte » (utilisateur utilise import JSON si besoin)  
- Self-host Appwrite  
- Safari  

## Tests

### Automatisés

- Merge LWW (local vs cloud, soft delete)
- Sérialisation outbox / mapping document ↔ rows SQLite
- Worker auth handlers (mocks Appwrite) si faisable en CI

### Manuels

- Register + login email  
- Login Google bout-en-bout  
- CRUD offline puis online (outbox drain)  
- Réinstall extension + login → données revenues  
- Deux profils navigateur / deux machines (même compte)  
- Déconnexion / reconnexion même user  

## Risques

| Risque | Mitigation |
|---|---|
| OAuth + extension fragile | Bridge via Worker + code one-shot |
| Fuite de données entre comptes | IndexedDB / clé storage scoped `userId` |
| Outbox qui grossit offline | Batch + UI pending ; pas de limite stricte V1 |
| Schema drift SQLite ↔ Appwrite | Une couche mapping unique + tests |

## Critères de succès V1

1. Impossible d’utiliser les tâches sans être connecté.  
2. Après désinstallation + réinstall + login, les données cloud sont restaurées.  
3. CRUD fonctionne offline et se synchronise au retour réseau.  
4. Aucune clé secrète Appwrite dans le bundle extension.
