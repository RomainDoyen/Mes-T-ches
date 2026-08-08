export interface Env {
  SESSIONS: KVNamespace;
  APPWRITE_ENDPOINT: string;
  APPWRITE_PROJECT_ID: string;
  APPWRITE_API_KEY: string;
  SESSION_SECRET: string;
  EXTENSION_ID: string;
  APP_ORIGIN: string; // URL publique du Worker, ex. https://mes-taches-api.<sub>.workers.dev
}
