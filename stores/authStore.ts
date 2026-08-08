import { create } from 'zustand';
import { apiFetch, getApiBase } from '@/lib/sync/client';

const TOKEN_KEY = 'auth:token';
const USER_KEY = 'auth:user';

export type AuthUser = { id: string; email: string; name: string };

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  exchangeCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

type AuthResponse = { token: string; user: AuthUser };

async function readStoredAuth(): Promise<{
  token: string | null;
  user: AuthUser | null;
}> {
  const stored = await chrome.storage.local.get([TOKEN_KEY, USER_KEY]);
  return {
    token: (stored[TOKEN_KEY] as string | undefined) ?? null,
    user: (stored[USER_KEY] as AuthUser | undefined) ?? null,
  };
}

async function writeStoredAuth(token: string, user: AuthUser): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token, [USER_KEY]: user });
}

async function clearStoredAuth(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,

  hydrate: async () => {
    const { token, user } = await readStoredAuth();
    set({ token, user, hydrated: true });
  },

  login: async (email, password) => {
    const data = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await writeStoredAuth(data.token, data.user);
    set({ token: data.token, user: data.user });
  },

  register: async (email, password, name) => {
    const data = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    await writeStoredAuth(data.token, data.user);
    set({ token: data.token, user: data.user });
  },

  loginWithGoogle: async () => {
    const base = getApiBase();
    await chrome.tabs.create({ url: `${base}/auth/google` });
  },

  exchangeCode: async (code) => {
    const data = await apiFetch<AuthResponse>('/auth/exchange', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    await writeStoredAuth(data.token, data.user);
    set({ token: data.token, user: data.user });
  },

  logout: async () => {
    const { token } = get();
    if (token) {
      try {
        await apiFetch('/auth/logout', { method: 'POST', token });
      } catch {
        // ignore network errors on logout
      }
    }
    await clearStoredAuth();
    set({ token: null, user: null });
  },
}));
