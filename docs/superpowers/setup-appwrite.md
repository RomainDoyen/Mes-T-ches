# Setup Appwrite Cloud — Mes Tâches

Guide manuel pour provisionner le projet Appwrite Cloud avant le déploiement du Worker sync.

**Décision V1 (figée) :** le Worker utilise une **API key serveur** Appwrite. Toutes les requêtes Databases passent par le Worker, qui **filtre et écrit toujours `userId`** depuis la session authentifiée (`equal("userId", userId)`). Pas de Document Security par utilisateur en V1 — plus simple pour le MVP.

---

## Checklist

- [ ] **1. Créer le projet Appwrite Cloud**
  - [Console Appwrite](https://cloud.appwrite.io) → **Create project** (ex. `mes-taches`)
  - Noter l’**endpoint régional** (ex. `https://fra.cloud.appwrite.io/v1`)

- [ ] **2. Activer Email / Password auth**
  - **Auth** → **Settings** → activer **Email/Password**
  - Optionnel : désactiver la vérification email en dev

- [ ] **3. Activer Google OAuth**
  - **Auth** → **Settings** → **OAuth2** → activer **Google**
  - Créer des identifiants OAuth dans [Google Cloud Console](https://console.cloud.google.com/) (type *Web application*)
  - Renseigner **Client ID** et **Client Secret** dans Appwrite
  - **Success URL** : `$APP_ORIGIN/auth/callback`  
    (remplacer `$APP_ORIGIN` par l’URL publique du Worker, ex. `https://mes-taches-api.<sub>.workers.dev/auth/callback`)

- [ ] **4. Créer la database**
  - **Databases** → **Create database**
  - Le **name** peut être `mes_taches` ; l’**ID** Appwrite est ce que le Worker utilise.
  - ID actuel en prod : `6a77520c003a48bce2e4` (voir `DATABASE_ID` dans `api/src/sync/collections.ts`).
  - Si tu recrées la DB, mets un ID custom ou mets à jour `DATABASE_ID` dans le code puis redeploy.

- [ ] **5. Créer les collections**
  - Créer une collection par ligne (IDs identiques aux clés de `COLLECTIONS`) :

  | Collection ID | Rôle |
  |---|---|
  | `profiles` | Profils utilisateur locaux |
  | `categories` | Catégories par profil |
  | `tags` | Tags par profil |
  | `tasks` | Tâches |
  | `task_tags` | Liaison tâche ↔ tag (N-N) |
  | `subtasks` | Sous-tâches |

- [ ] **6. Attributs par collection**

  Sur **chaque** collection, ajouter en plus des champs métier ci-dessous :

  | Attribut | Type | Requis | Index |
  |---|---|---|---|
  | `userId` | string (255) | oui | oui |
  | `updatedAt` | string (64) | oui | oui |
  | `deletedAt` | string (64) | non | — |

  > Les IDs document Appwrite = UUID locaux (1:1). Exception : `task_tags` → ID composite `{task_id}_{tag_id}`.

  ### `profiles`

  | Attribut | Type | Requis |
  |---|---|---|
  | `name` | string | oui |
  | `color` | string | oui |
  | `created_at` | string | oui |

  ### `categories`

  | Attribut | Type | Requis | Index |
  |---|---|---|---|
  | `profile_id` | string | oui | oui |
  | `name` | string | oui | |
  | `color` | string | oui | |
  | `emoji` | string | non | |
  | `created_at` | string | oui | |

  ### `tags`

  | Attribut | Type | Requis | Index |
  |---|---|---|---|
  | `profile_id` | string | oui | oui |
  | `name` | string | oui | |
  | `color` | string | oui | |
  | `created_at` | string | oui | |

  ### `tasks`

  | Attribut | Type | Requis | Index |
  |---|---|---|---|
  | `profile_id` | string | oui | oui |
  | `title` | string | oui | |
  | `description` | string | non | |
  | `status` | string | oui | |
  | `priority` | string | oui | |
  | `due_at` | string | non | oui |
  | `category_id` | string | non | |
  | `pinned` | integer | oui | |
  | `position` | integer | oui | |
  | `created_at` | string | oui | |
  | `updated_at` | string | oui | |
  | `completed_at` | string | non | |

  Valeurs attendues : `status` ∈ `todo` \| `done` ; `priority` ∈ `low` \| `medium` \| `high` \| `urgent`.

  ### `task_tags`

  | Attribut | Type | Requis | Index |
  |---|---|---|---|
  | `task_id` | string | oui | oui |
  | `tag_id` | string | oui | oui |

  ### `subtasks`

  | Attribut | Type | Requis | Index |
  |---|---|---|---|
  | `task_id` | string | oui | oui |
  | `title` | string | oui | |
  | `done` | integer | oui | |
  | `position` | integer | oui | |

- [ ] **7. Permissions documents**

  **Option retenue V1 — API key serveur + filtre `userId` :**

  - Créer une **API key** avec scopes **Databases** (read/write) uniquement
  - Permissions collections : accès **API key** (role serveur) — pas de règles `userId == $userId` côté Appwrite
  - Le Worker **doit** appliquer `Query.equal("userId", userId)` sur toute lecture et renseigner `userId` à l’écriture depuis la session Bearer

  **Alternative (non retenue V1) — Document Security :**

  - Create : `users` → any
  - Read / Update / Delete : `userId == $userId`

- [ ] **8. Noter les secrets pour le Worker**

  Renseigner dans `api/.dev.vars` (local) et secrets Wrangler (prod) :

  | Variable | Source |
  |---|---|
  | `APPWRITE_ENDPOINT` | Endpoint régional (ex. `https://fra.cloud.appwrite.io/v1`) |
  | `APPWRITE_PROJECT_ID` | **Settings** → **General** → Project ID |
  | `APPWRITE_API_KEY` | **API keys** → clé serveur (scopes Databases) |

  Ne jamais committer ces valeurs. Voir `api/.dev.vars.example`.

---

## Références code

- Constantes : `api/src/sync/collections.ts` (`DATABASE_ID`, `COLLECTIONS`)
- Schéma SQLite source : `lib/db/schema.ts`
- Design sync : `docs/superpowers/specs/2026-08-08-appwrite-sync-design.md`
