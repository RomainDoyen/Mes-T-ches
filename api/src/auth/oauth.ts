import type { Env } from '../env';

export function buildGoogleOAuthUrl(env: Env): string {
  const success = `${env.APP_ORIGIN}/auth/callback`;
  const failure = `${env.APP_ORIGIN}/auth/bridge?error=1`;
  const base = env.APPWRITE_ENDPOINT.replace(/\/$/, '');
  const params = new URLSearchParams({ success, failure });
  return `${base}/account/tokens/oauth2/google?${params}`;
}

export async function storeOAuthCode(
  env: Env,
  data: { userId: string; appwriteSession: string },
): Promise<string> {
  const code = crypto.randomUUID();
  await env.SESSIONS.put(`oauth:${code}`, JSON.stringify(data), { expirationTtl: 120 });
  return code;
}

export async function consumeOAuthCode(
  env: Env,
  code: string,
): Promise<{ userId: string; appwriteSession: string } | null> {
  const raw = await env.SESSIONS.get(`oauth:${code}`);
  if (!raw) return null;
  await env.SESSIONS.delete(`oauth:${code}`);
  try {
    return JSON.parse(raw) as { userId: string; appwriteSession: string };
  } catch {
    return null;
  }
}

export function bridgeHtml(options: { error?: boolean }): string {
  if (options.error) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connexion échouée</title>
</head>
<body>
  <p>La connexion a échoué. Vous pouvez fermer cet onglet et réessayer.</p>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connexion réussie</title>
</head>
<body>
  <p>Connexion réussie, vous pouvez fermer cet onglet.</p>
</body>
</html>`;
}
