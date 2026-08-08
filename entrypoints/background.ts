import { getApiBase } from '@/lib/sync/client';

const TOKEN_KEY = 'auth:token';
const USER_KEY = 'auth:user';

type AuthUser = { id: string; email: string; name: string };
type AuthResponse = { token: string; user: AuthUser };

export default defineBackground(() => {
  const base = getApiBase();
  const bridgePrefix = `${base}/auth/bridge`;
  const handledCodes = new Set<string>();

  chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (info.status !== 'complete' || !tab.url?.startsWith(bridgePrefix)) return;

    const code = new URL(tab.url).searchParams.get('code');
    if (!code || handledCodes.has(code)) return;
    handledCodes.add(code);

    try {
      const response = await fetch(`${base}/auth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        console.error('[oauth-bridge] exchange failed', response.status);
        handledCodes.delete(code);
        return;
      }

      const data = (await response.json()) as AuthResponse;
      await chrome.storage.local.set({
        [TOKEN_KEY]: data.token,
        [USER_KEY]: data.user,
      });

      try {
        await chrome.runtime.sendMessage({ type: 'oauth-code', code });
      } catch {
        // popup fermé — le storage suffit pour le prochain hydrateAuth
      }
    } catch (error) {
      console.error('[oauth-bridge] exchange error', error);
      handledCodes.delete(code);
      return;
    }

    void chrome.tabs.remove(tabId);
  });
});
