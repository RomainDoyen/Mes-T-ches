import { query, queryOne, run } from '@/lib/db/client';
import type { Category } from '@/lib/types';
import { createId, nowIso } from '@/lib/utils/dates';

interface CategoryRow {
  id: string;
  profile_id: string;
  name: string;
  color: string;
  emoji: string | null;
  created_at: string;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    color: row.color,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

export const categoriesRepo = {
  list(profileId: string): Category[] {
    return query<CategoryRow>(
      'SELECT * FROM categories WHERE profile_id = ? ORDER BY name ASC',
      [profileId],
    ).map(mapCategory);
  },

  get(id: string): Category | null {
    const row = queryOne<CategoryRow>('SELECT * FROM categories WHERE id = ?', [
      id,
    ]);
    return row ? mapCategory(row) : null;
  },

  create(
    profileId: string,
    data: { name: string; color: string; emoji?: string | null },
  ): Category {
    const category: Category = {
      id: createId(),
      profileId,
      name: data.name,
      color: data.color,
      emoji: data.emoji ?? null,
      createdAt: nowIso(),
    };
    run(
      `INSERT INTO categories (id, profile_id, name, color, emoji, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        category.profileId,
        category.name,
        category.color,
        category.emoji,
        category.createdAt,
      ],
    );
    return category;
  },

  delete(id: string): void {
    run('DELETE FROM categories WHERE id = ?', [id]);
  },

  seedDefaults(profileId: string): void {
    if (this.list(profileId).length > 0) return;
    this.create(profileId, { name: 'Perso', color: '#0F766E', emoji: null });
    this.create(profileId, { name: 'Travail', color: '#0369A1', emoji: null });
  },
};
