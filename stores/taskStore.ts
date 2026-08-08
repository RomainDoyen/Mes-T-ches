import { create } from 'zustand';
import { categoriesRepo } from '@/lib/repositories/categories';
import { tagsRepo } from '@/lib/repositories/tags';
import { subtasksRepo, tasksRepo } from '@/lib/repositories/tasks';
import type {
  Category,
  QuickFilter,
  Tag,
  Task,
  TaskInput,
} from '@/lib/types';

interface TaskState {
  tasks: Task[];
  categories: Category[];
  tags: Tag[];
  filter: QuickFilter;
  selectedTagId: string | null;
  search: string;
  drawerOpen: boolean;
  editingTaskId: string | null;
  detailTaskId: string | null;
  settingsOpen: boolean;
  toast: string | null;
  setFilter: (filter: QuickFilter) => void;
  setSelectedTagId: (tagId: string | null) => void;
  setSearch: (search: string) => void;
  openCreate: () => void;
  openEdit: (taskId: string) => void;
  openDetail: (taskId: string) => void;
  closeDetail: () => void;
  closeDrawer: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  loadForProfile: (profileId: string) => void;
  createTask: (profileId: string, input: TaskInput) => void;
  updateTask: (id: string, input: Partial<TaskInput>) => void;
  toggleDone: (id: string) => void;
  togglePin: (id: string) => void;
  toggleSubtask: (id: string) => void;
  deleteTask: (id: string) => void;
  createCategory: (
    profileId: string,
    data: { name: string; color: string; emoji?: string },
  ) => Category;
  createTag: (profileId: string, name: string, color?: string) => Tag;
  addTag: (profileId: string, name: string, color: string) => Tag;
  updateTag: (
    profileId: string,
    id: string,
    data: { name: string; color: string },
  ) => void;
  deleteTag: (profileId: string, id: string) => void;
  tagUsage: (id: string) => number;
  activeCount: () => number;
  dayProgress: (profileId: string) => { done: number; total: number };
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  categories: [],
  tags: [],
  filter: 'all',
  selectedTagId: null,
  search: '',
  drawerOpen: false,
  editingTaskId: null,
  detailTaskId: null,
  settingsOpen: false,
  toast: null,

  setFilter: (filter) => {
    set({ filter });
  },

  setSelectedTagId: (tagId) => {
    set({ selectedTagId: tagId });
  },

  setSearch: (search) => set({ search }),

  openCreate: () => set({ drawerOpen: true, editingTaskId: null }),
  openEdit: (taskId) => set({ drawerOpen: true, editingTaskId: taskId }),
  openDetail: (taskId) => set({ detailTaskId: taskId }),
  closeDetail: () => set({ detailTaskId: null }),
  closeDrawer: () => set({ drawerOpen: false, editingTaskId: null }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),

  loadForProfile: (profileId) => {
    categoriesRepo.seedDefaults(profileId);
    const { filter, search, selectedTagId } = get();
    set({
      categories: categoriesRepo.list(profileId),
      tags: tagsRepo.list(profileId),
      tasks: tasksRepo.list(profileId, {
        filter,
        search,
        tagId: selectedTagId,
      }),
    });
  },

  createTask: (profileId, input) => {
    try {
      tasksRepo.create(profileId, input);
      set({ filter: 'all', search: '', selectedTagId: null });
      get().loadForProfile(profileId);
      get().closeDrawer();
      get().showToast('Tâche créée');
    } catch (error) {
      console.error(error);
      get().showToast(
        error instanceof Error ? error.message : 'Impossible de créer la tâche',
      );
    }
  },

  updateTask: (id, input) => {
    try {
      const task = tasksRepo.update(id, input);
      if (!task) return;
      set({ filter: 'all', search: '', selectedTagId: null });
      get().loadForProfile(task.profileId);
      get().closeDrawer();
      get().showToast('Tâche enregistrée');
    } catch (error) {
      console.error(error);
      get().showToast(
        error instanceof Error ? error.message : 'Impossible d’enregistrer',
      );
    }
  },

  toggleDone: (id) => {
    const task = tasksRepo.toggleDone(id);
    if (task) get().loadForProfile(task.profileId);
  },

  togglePin: (id) => {
    const task = tasksRepo.togglePin(id);
    if (task) get().loadForProfile(task.profileId);
  },

  toggleSubtask: (id) => {
    const subtask = subtasksRepo.toggle(id);
    if (!subtask) return;
    const task = tasksRepo.get(subtask.taskId);
    if (task) get().loadForProfile(task.profileId);
  },

  deleteTask: (id) => {
    const existing = tasksRepo.get(id);
    if (!existing) return;
    tasksRepo.delete(id);
    const { detailTaskId, editingTaskId } = get();
    if (detailTaskId === id) set({ detailTaskId: null });
    if (editingTaskId === id) set({ drawerOpen: false, editingTaskId: null });
    get().loadForProfile(existing.profileId);
  },

  createCategory: (profileId, data) => {
    const category = categoriesRepo.create(profileId, data);
    set({ categories: categoriesRepo.list(profileId) });
    return category;
  },

  createTag: (profileId, name, color) => {
    const tag = tagsRepo.findOrCreate(profileId, name, color);
    set({ tags: tagsRepo.list(profileId) });
    return tag;
  },

  addTag: (profileId, name, color) => {
    const tag = tagsRepo.create(profileId, { name, color });
    set({ tags: tagsRepo.list(profileId) });
    return tag;
  },

  updateTag: (profileId, id, data) => {
    tagsRepo.update(id, data);
    get().loadForProfile(profileId);
    get().showToast('Tag mis à jour');
  },

  deleteTag: (profileId, id) => {
    tagsRepo.delete(id);
    const { selectedTagId } = get();
    if (selectedTagId === id) {
      set({ selectedTagId: null });
    }
    get().loadForProfile(profileId);
    get().showToast('Tag supprimé');
  },

  tagUsage: (id) => tagsRepo.countUsage(id),

  activeCount: () => get().tasks.filter((t) => t.status === 'todo').length,

  dayProgress: (profileId) => tasksRepo.dayProgress(profileId),
}));
