import { beforeEach, describe, expect, it } from 'vitest';
import { resetDbForTests } from '@/lib/db/client';
import { categoriesRepo } from '@/lib/repositories/categories';
import { profilesRepo } from '@/lib/repositories/profiles';
import { tagsRepo } from '@/lib/repositories/tags';
import { backupRepo } from '@/lib/repositories/backup';
import { subtasksRepo, tasksRepo } from '@/lib/repositories/tasks';

beforeEach(async () => {
  await resetDbForTests();
});

describe('repositories isolation', () => {
  it('keeps tasks isolated per profile', () => {
    const perso = profilesRepo.create('Perso');
    const work = profilesRepo.create('Travail');

    tasksRepo.create(perso.id, { title: 'Courses' });
    tasksRepo.create(work.id, { title: 'Sprint review' });

    expect(tasksRepo.list(perso.id)).toHaveLength(1);
    expect(tasksRepo.list(perso.id)[0]?.title).toBe('Courses');
    expect(tasksRepo.list(work.id)).toHaveLength(1);
    expect(tasksRepo.list(work.id)[0]?.title).toBe('Sprint review');
  });

  it('supports CRUD, tags, categories and subtasks', () => {
    const profile = profilesRepo.ensureDefault();
    const category = categoriesRepo.create(profile.id, {
      name: 'Maison',
      color: '#10B981',
      emoji: '🏠',
    });
    const tag = tagsRepo.create(profile.id, { name: 'urgent-maison', color: '#F59E0B' });

    const task = tasksRepo.create(profile.id, {
      title: 'Ranger',
      priority: 'high',
      categoryId: category.id,
      tagIds: [tag.id],
      subtasks: [{ title: 'Salon' }, { title: 'Cuisine' }],
    });

    expect(task.tags).toHaveLength(1);
    expect(task.subtasks).toHaveLength(2);

    subtasksRepo.toggle(task.subtasks[0]!.id);
    const updated = tasksRepo.toggleDone(task.id);
    expect(updated?.status).toBe('done');
    expect(tasksRepo.get(task.id)?.subtasks[0]?.done).toBe(true);

    tasksRepo.delete(task.id);
    expect(tasksRepo.get(task.id)).toBeNull();
  });

  it('filters urgent, search and tag', () => {
    const profile = profilesRepo.ensureDefault();
    const tag = tagsRepo.create(profile.id, { name: 'maison', color: '#0F766E' });
    tasksRepo.create(profile.id, { title: 'Normal', priority: 'low' });
    tasksRepo.create(profile.id, {
      title: 'Feu',
      priority: 'urgent',
      tagIds: [tag.id],
    });

    expect(tasksRepo.list(profile.id, { filter: 'urgent' })).toHaveLength(1);
    expect(tasksRepo.list(profile.id, { search: 'feu' })[0]?.title).toBe('Feu');
    expect(tasksRepo.list(profile.id, { tagId: tag.id })).toHaveLength(1);
    expect(tasksRepo.list(profile.id, { tagId: tag.id })[0]?.title).toBe('Feu');
  });

  it('exports and imports replacing active profile data', () => {
    const profile = profilesRepo.ensureDefault();
    tasksRepo.create(profile.id, { title: 'Avant export' });
    const payload = backupRepo.exportProfile(profile.id);

    tasksRepo.create(profile.id, { title: 'Après export' });
    expect(tasksRepo.list(profile.id)).toHaveLength(2);

    backupRepo.importReplaceActive(profile.id, payload);
    const restored = tasksRepo.list(profile.id);
    expect(restored).toHaveLength(1);
    expect(restored[0]?.title).toBe('Avant export');
  });

  it('manages tag CRUD and usage count', () => {
    const profile = profilesRepo.ensureDefault();
    const tag = tagsRepo.create(profile.id, { name: 'maison', color: '#0F766E' });
    tasksRepo.create(profile.id, { title: 'A', tagIds: [tag.id] });
    tasksRepo.create(profile.id, { title: 'B', tagIds: [tag.id] });

    expect(tagsRepo.countUsage(tag.id)).toBe(2);

    tagsRepo.update(tag.id, { name: 'courses', color: '#DC2626' });
    expect(tagsRepo.get(tag.id)?.name).toBe('courses');
    expect(tagsRepo.get(tag.id)?.color).toBe('#DC2626');

    tagsRepo.delete(tag.id);
    expect(tagsRepo.get(tag.id)).toBeNull();
    expect(tasksRepo.get(tasksRepo.list(profile.id)[0]!.id)?.tags).toHaveLength(0);
  });

  it('rejects deleting the last profile', () => {
    const profile = profilesRepo.ensureDefault();
    expect(() => profilesRepo.delete(profile.id)).toThrow();
  });
});
