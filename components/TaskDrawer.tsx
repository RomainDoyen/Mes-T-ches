import {
  CalendarDays,
  Check,
  Folder,
  ListTodo,
  Plus,
  Save,
  SignalHigh,
  Tag,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Category, Tag as TagType, Task, TaskInput, TaskPriority } from '@/lib/types';
import './TaskDrawer.scss';

const PRIORITIES: Array<{ id: TaskPriority; label: string; color: string }> = [
  { id: 'low', label: 'Basse', color: '#94A3B8' },
  { id: 'medium', label: 'Moyenne', color: '#0F766E' },
  { id: 'high', label: 'Haute', color: '#D97706' },
  { id: 'urgent', label: 'Urgente', color: '#E11D48' },
];

interface TaskDrawerProps {
  open: boolean;
  task: Task | null;
  categories: Category[];
  tags: TagType[];
  onClose: () => void;
  onSubmit: (input: TaskInput) => void;
  onCreateTag: (name: string) => TagType;
}

interface DraftSubtask {
  title: string;
  done: boolean;
}

export function TaskDrawer({
  open,
  task,
  categories,
  tags,
  onClose,
  onSubmit,
  onCreateTag,
}: TaskDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueAt, setDueAt] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<DraftSubtask[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setPriority(task.priority);
      setDueAt(task.dueAt ? task.dueAt.slice(0, 10) : '');
      setCategoryId(task.categoryId);
      setTagIds(task.tags.map((t) => t.id));
      setSubtasks(task.subtasks.map((s) => ({ title: s.title, done: s.done })));
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueAt('');
      setCategoryId(null);
      setTagIds([]);
      setSubtasks([]);
    }
    setNewTag('');
  }, [open, task?.id]);

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function addPendingTag(): string[] {
    const name = newTag.trim();
    if (!name) return tagIds;
    const created = onCreateTag(name);
    const next = tagIds.includes(created.id)
      ? tagIds
      : [...tagIds, created.id];
    setTagIds(next);
    setNewTag('');
    return next;
  }

  function handleSubmit() {
    if (!title.trim()) return;
    const finalTagIds = addPendingTag();
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      dueAt: dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : null,
      categoryId,
      tagIds: finalTagIds,
      subtasks: subtasks.filter((s) => s.title.trim()),
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="drawer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="drawer"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 60 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer__handle" />
            <div className="drawer__scroll">
            <input
              className="drawer__title-input"
              placeholder="Titre de la tâche"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className="drawer__textarea"
              rows={3}
              placeholder="Description (optionnel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <span className="drawer__label">
              <SignalHigh size={12} strokeWidth={2.4} />
              Priorité
            </span>
            <div className="drawer__pills">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`drawer__pill ${priority === p.id ? 'is-active' : ''}`}
                  style={
                    priority === p.id
                      ? { background: p.color, color: '#fff', boxShadow: 'none' }
                      : undefined
                  }
                  onClick={() => setPriority(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <span className="drawer__label">
              <CalendarDays size={12} strokeWidth={2.4} />
              Échéance
            </span>
            <input
              className="drawer__field"
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />

            <span className="drawer__label">
              <Folder size={12} strokeWidth={2.4} />
              Catégorie
            </span>
            <div className="drawer__pills">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`drawer__pill ${categoryId === c.id ? 'is-active' : ''}`}
                  style={
                    categoryId === c.id
                      ? { background: c.color, color: '#fff', boxShadow: 'none' }
                      : { background: `${c.color}18`, color: c.color, borderColor: `${c.color}33` }
                  }
                  onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <span className="drawer__label">
              <Tag size={12} strokeWidth={2.4} />
              Tags
            </span>
            <div className="drawer__pills">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`drawer__pill ${tagIds.includes(t.id) ? 'is-active' : ''}`}
                  style={
                    tagIds.includes(t.id)
                      ? { background: t.color, color: '#fff', boxShadow: 'none' }
                      : undefined
                  }
                  onClick={() => toggleTag(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="drawer__tag-row">
              <input
                type="text"
                placeholder="Nouveau tag (Entrée pour ajouter)"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPendingTag();
                  }
                }}
              />
              <button
                type="button"
                className="drawer__pill"
                onClick={() => addPendingTag()}
                aria-label="Ajouter le tag"
              >
                <Plus size={14} strokeWidth={2.4} />
              </button>
            </div>

            <span className="drawer__label">
              <ListTodo size={12} strokeWidth={2.4} />
              Sous-tâches
            </span>
            <div className="drawer__subtasks">
              {subtasks.map((s, i) => (
                <div key={i} className="drawer__subtask">
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={() =>
                      setSubtasks((prev) =>
                        prev.map((item, idx) =>
                          idx === i ? { ...item, done: !item.done } : item,
                        ),
                      )
                    }
                  />
                  <input
                    type="text"
                    value={s.title}
                    placeholder="Sous-tâche"
                    onChange={(e) =>
                      setSubtasks((prev) =>
                        prev.map((item, idx) =>
                          idx === i ? { ...item, title: e.target.value } : item,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="drawer__subtask-remove"
                    onClick={() =>
                      setSubtasks((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    aria-label="Supprimer la sous-tâche"
                  >
                    <X size={14} strokeWidth={2.3} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="drawer__pill"
                onClick={() =>
                  setSubtasks((prev) => [...prev, { title: '', done: false }])
                }
              >
                <Plus size={13} strokeWidth={2.4} />
                Sous-tâche
              </button>
            </div>

            <button
              type="button"
              className="pill-btn drawer__submit accent-fill"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }}
            >
              {task ? <Save size={16} strokeWidth={2.3} /> : <Check size={16} strokeWidth={2.4} />}
              {task ? 'Enregistrer' : 'Créer la tâche'}
            </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
