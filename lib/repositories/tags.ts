import { query, queryOne, run } from '@/lib/db/client';
import { enqueueOutbox } from '@/lib/sync/outbox';
import type { Tag } from '@/lib/types';
import { createId, nowIso } from '@/lib/utils/dates';

interface TagRow {
  id: string;
  profile_id: string;
  name: string;
  color: string;
  created_at: string;
}

export const TAG_COLORS = [
  '#0F766E',
  '#0369A1',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#D97706',
  '#65A30D',
  '#475569',
] as const;

function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

export const tagsRepo = {
  list(profileId: string): Tag[] {
    return query<TagRow>(
      'SELECT * FROM tags WHERE profile_id = ? ORDER BY name ASC',
      [profileId],
    ).map(mapTag);
  },

  get(id: string): Tag | null {
    const row = queryOne<TagRow>('SELECT * FROM tags WHERE id = ?', [id]);
    return row ? mapTag(row) : null;
  },

  create(profileId: string, data: { name: string; color: string }): Tag {
    const name = data.name.trim();
    if (!name) throw new Error('Le nom du tag est requis');

    const duplicate = this.list(profileId).find(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      throw new Error('Un tag avec ce nom existe déjà');
    }

    const tag: Tag = {
      id: createId(),
      profileId,
      name,
      color: data.color,
      createdAt: nowIso(),
    };
    run(
      `INSERT INTO tags (id, profile_id, name, color, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [tag.id, tag.profileId, tag.name, tag.color, tag.createdAt],
    );
    void enqueueOutbox({
      entity: 'tags',
      entityId: tag.id,
      op: 'upsert',
      payload: {
        id: tag.id,
        profileId: tag.profileId,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
      },
      updatedAt: tag.createdAt,
    });
    return tag;
  },

  findOrCreate(
    profileId: string,
    name: string,
    color: string = TAG_COLORS[0],
  ): Tag {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Le nom du tag est requis');
    const existing = this.list(profileId).find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;
    return this.create(profileId, { name: trimmed, color });
  },

  update(
    id: string,
    data: { name?: string; color?: string },
  ): Tag | null {
    const existing = this.get(id);
    if (!existing) return null;

    const name = data.name?.trim() ?? existing.name;
    if (!name) throw new Error('Le nom du tag est requis');

    const duplicate = this.list(existing.profileId).find(
      (t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      throw new Error('Un tag avec ce nom existe déjà');
    }

    const next: Tag = {
      ...existing,
      name,
      color: data.color ?? existing.color,
    };
    run('UPDATE tags SET name = ?, color = ? WHERE id = ?', [
      next.name,
      next.color,
      id,
    ]);
    const updatedAt = nowIso();
    void enqueueOutbox({
      entity: 'tags',
      entityId: id,
      op: 'upsert',
      payload: {
        id: next.id,
        profileId: next.profileId,
        name: next.name,
        color: next.color,
        createdAt: next.createdAt,
      },
      updatedAt,
    });
    return next;
  },

  countUsage(id: string): number {
    const row = queryOne<{ c: number }>(
      'SELECT COUNT(*) as c FROM task_tags WHERE tag_id = ?',
      [id],
    );
    return row?.c ?? 0;
  },

  delete(id: string): void {
    run('DELETE FROM task_tags WHERE tag_id = ?', [id]);
    run('DELETE FROM tags WHERE id = ?', [id]);
    void enqueueOutbox({
      entity: 'tags',
      entityId: id,
      op: 'delete',
      payload: {},
      updatedAt: nowIso(),
    });
  },
};
