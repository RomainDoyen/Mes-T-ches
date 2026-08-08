import { run, transaction } from '@/lib/db/client';
import { categoriesRepo } from '@/lib/repositories/categories';
import { profilesRepo } from '@/lib/repositories/profiles';
import { tagsRepo } from '@/lib/repositories/tags';
import { tasksRepo } from '@/lib/repositories/tasks';
import type { BackupPayload, Category, Profile, Subtask, Tag } from '@/lib/types';
import { z } from 'zod';

const backupSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  profile: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    createdAt: z.string(),
  }),
  categories: z.array(
    z.object({
      id: z.string(),
      profileId: z.string(),
      name: z.string(),
      color: z.string(),
      emoji: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  tags: z.array(
    z.object({
      id: z.string(),
      profileId: z.string(),
      name: z.string(),
      color: z.string(),
      createdAt: z.string(),
    }),
  ),
  tasks: z.array(
    z.object({
      id: z.string(),
      profileId: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      status: z.enum(['todo', 'done']),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      dueAt: z.string().nullable(),
      categoryId: z.string().nullable(),
      pinned: z.boolean(),
      position: z.number(),
      createdAt: z.string(),
      updatedAt: z.string(),
      completedAt: z.string().nullable(),
      tagIds: z.array(z.string()),
    }),
  ),
  subtasks: z.array(
    z.object({
      id: z.string(),
      taskId: z.string(),
      title: z.string(),
      done: z.boolean(),
      position: z.number(),
    }),
  ),
});

export const backupRepo = {
  exportProfile(profileId: string): BackupPayload {
    const profile = profilesRepo.get(profileId);
    if (!profile) throw new Error('Profil introuvable');

    const categories = categoriesRepo.list(profileId);
    const tags = tagsRepo.list(profileId);
    const tasks = tasksRepo.list(profileId);
    const subtasks: Subtask[] = tasks.flatMap((t) => t.subtasks);

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      profile,
      categories,
      tags,
      tasks: tasks.map(({ tags: taskTags, subtasks: _s, ...rest }) => ({
        ...rest,
        tagIds: taskTags.map((t) => t.id),
      })),
      subtasks,
    };
  },

  importReplaceActive(profileId: string, raw: unknown): void {
    const parsed = backupSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error('Fichier JSON invalide');
    }
    const data = parsed.data;
    const active = profilesRepo.get(profileId);
    if (!active) throw new Error('Profil actif introuvable');

    transaction(() => {
      run('DELETE FROM tasks WHERE profile_id = ?', [profileId]);
      run('DELETE FROM categories WHERE profile_id = ?', [profileId]);
      run('DELETE FROM tags WHERE profile_id = ?', [profileId]);

      run('UPDATE profiles SET name = ?, color = ? WHERE id = ?', [
        data.profile.name,
        data.profile.color,
        profileId,
      ]);

      for (const c of data.categories) {
        insertCategory(profileId, c);
      }
      for (const t of data.tags) {
        insertTag(profileId, t);
      }

      const categoryIdMap = new Map(
        data.categories.map((c) => [c.id, c.id] as const),
      );
      // Remap IDs kept as-is but force profileId
      for (const task of data.tasks) {
        run(
          `INSERT INTO tasks (
            id, profile_id, title, description, status, priority, due_at,
            category_id, pinned, position, created_at, updated_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id,
            profileId,
            task.title,
            task.description,
            task.status,
            task.priority,
            task.dueAt,
            task.categoryId && categoryIdMap.has(task.categoryId)
              ? task.categoryId
              : null,
            task.pinned ? 1 : 0,
            task.position,
            task.createdAt,
            task.updatedAt,
            task.completedAt,
          ],
        );
        for (const tagId of task.tagIds) {
          run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [
            task.id,
            tagId,
          ]);
        }
      }

      for (const s of data.subtasks) {
        run(
          `INSERT INTO subtasks (id, task_id, title, done, position)
           VALUES (?, ?, ?, ?, ?)`,
          [s.id, s.taskId, s.title, s.done ? 1 : 0, s.position],
        );
      }
    });
  },
};

function insertCategory(profileId: string, c: Category): void {
  run(
    `INSERT INTO categories (id, profile_id, name, color, emoji, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [c.id, profileId, c.name, c.color, c.emoji, c.createdAt],
  );
}

function insertTag(profileId: string, t: Tag): void {
  run(
    `INSERT INTO tags (id, profile_id, name, color, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [t.id, profileId, t.name, t.color, t.createdAt],
  );
}

export type { Profile };
