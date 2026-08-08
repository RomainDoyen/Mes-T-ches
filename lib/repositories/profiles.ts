import { query, queryOne, run, transaction } from '@/lib/db/client';
import type { Profile } from '@/lib/types';
import { createId, nowIso } from '@/lib/utils/dates';

interface ProfileRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

export const profilesRepo = {
  list(): Profile[] {
    return query<ProfileRow>(
      'SELECT * FROM profiles ORDER BY created_at ASC',
    ).map(mapProfile);
  },

  get(id: string): Profile | null {
    const row = queryOne<ProfileRow>('SELECT * FROM profiles WHERE id = ?', [
      id,
    ]);
    return row ? mapProfile(row) : null;
  },

  create(name: string, color = '#0F766E'): Profile {
    const profile: Profile = {
      id: createId(),
      name,
      color,
      createdAt: nowIso(),
    };
    run(
      'INSERT INTO profiles (id, name, color, created_at) VALUES (?, ?, ?, ?)',
      [profile.id, profile.name, profile.color, profile.createdAt],
    );
    return profile;
  },

  update(id: string, data: { name?: string; color?: string }): Profile | null {
    const existing = this.get(id);
    if (!existing) return null;
    const next = {
      ...existing,
      name: data.name ?? existing.name,
      color: data.color ?? existing.color,
    };
    run('UPDATE profiles SET name = ?, color = ? WHERE id = ?', [
      next.name,
      next.color,
      id,
    ]);
    return next;
  },

  delete(id: string): void {
    const all = this.list();
    if (all.length <= 1) {
      throw new Error('Impossible de supprimer le dernier profil');
    }
    run('DELETE FROM profiles WHERE id = ?', [id]);
  },

  ensureDefault(): Profile {
    const existing = this.list();
    if (existing.length > 0) return existing[0]!;
    return this.create('Perso', '#0F766E');
  },

  replaceAll(profiles: Profile[]): void {
    transaction(() => {
      run('DELETE FROM profiles');
      for (const p of profiles) {
        run(
          'INSERT INTO profiles (id, name, color, created_at) VALUES (?, ?, ?, ?)',
          [p.id, p.name, p.color, p.createdAt],
        );
      }
    });
  },
};
