import { create } from 'zustand';
import { storage } from 'wxt/utils/storage';
import { profilesRepo } from '@/lib/repositories/profiles';
import type { Profile } from '@/lib/types';

const ACTIVE_KEY = 'todo-active-profile';
const activeProfileItem = storage.defineItem<string | null>(
  `local:${ACTIVE_KEY}`,
  { fallback: null },
);

async function readActiveId(): Promise<string | null> {
  try {
    return (await activeProfileItem.getValue()) ?? null;
  } catch {
    return localStorage.getItem(ACTIVE_KEY);
  }
}

async function writeActiveId(id: string): Promise<void> {
  try {
    await activeProfileItem.setValue(id);
  } catch {
    localStorage.setItem(ACTIVE_KEY, id);
  }
}

interface ProfileState {
  profiles: Profile[];
  activeProfileId: string | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  setActiveProfile: (id: string) => Promise<void>;
  createProfile: (name: string, color?: string) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  refresh: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  activeProfileId: null,
  loading: true,

  refresh: () => {
    const profiles = profilesRepo.list();
    set({ profiles });
  },

  hydrate: async () => {
    set({ loading: true });
    const defaultProfile = profilesRepo.ensureDefault();
    const profiles = profilesRepo.list();
    const stored = await readActiveId();
    const active =
      profiles.find((p) => p.id === stored)?.id ?? defaultProfile.id;
    await writeActiveId(active);
    set({ profiles, activeProfileId: active, loading: false });
  },

  setActiveProfile: async (id) => {
    await writeActiveId(id);
    set({ activeProfileId: id });
  },

  createProfile: async (name, color) => {
    const profile = profilesRepo.create(name, color);
    get().refresh();
    await get().setActiveProfile(profile.id);
    return profile;
  },

  deleteProfile: async (id) => {
    const { activeProfileId } = get();
    profilesRepo.delete(id);
    const profiles = profilesRepo.list();
    const next =
      activeProfileId === id ? profiles[0]?.id ?? null : activeProfileId;
    if (next) await writeActiveId(next);
    set({ profiles, activeProfileId: next });
  },
}));
