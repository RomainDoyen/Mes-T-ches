export async function issueBearer(
  env: { SESSIONS: KVNamespace; SESSION_SECRET: string },
  data: { userId: string; appwriteSession: string },
): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await env.SESSIONS.put(
    `bearer:${token}`,
    JSON.stringify(data),
    { expirationTtl: 60 * 60 * 24 * 30 },
  );
  return token;
}

export async function resolveBearer(
  env: { SESSIONS: KVNamespace },
  token: string,
): Promise<{ userId: string; appwriteSession: string } | null> {
  const raw = await env.SESSIONS.get(`bearer:${token}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function revokeBearer(
  env: { SESSIONS: KVNamespace },
  token: string,
): Promise<void> {
  await env.SESSIONS.delete(`bearer:${token}`);
}
