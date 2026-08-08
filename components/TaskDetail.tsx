import {
  ArrowLeft,
  CalendarDays,
  Check,
  Folder,
  ListTodo,
  Pencil,
  Pin,
  SignalHigh,
  Tag,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ElegantScroll } from '@/components/ElegantScroll';
import type { Category, Task, TaskPriority } from '@/lib/types';
import { endOfToday, startOfToday } from '@/lib/utils/dates';
import './TaskDetail.scss';

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high: 'var(--priority-high)',
  urgent: 'var(--priority-urgent)',
};

interface TaskDetailProps {
  open: boolean;
  task: Task | null;
  category: Category | null;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onPin: () => void;
  onDelete: () => void;
  onToggleSubtask: (subtaskId: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function dueClass(dueAt: string | null): string {
  if (!dueAt) return '';
  const due = new Date(dueAt);
  if (due < startOfToday()) return 'is-late';
  if (due <= endOfToday()) return 'is-today';
  return '';
}

export function TaskDetail({
  open,
  task,
  category,
  onClose,
  onEdit,
  onToggle,
  onPin,
  onDelete,
  onToggleSubtask,
}: TaskDetailProps) {
  return (
    <AnimatePresence>
      {open && task && (
        <motion.div
          className="task-detail"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          <header className="task-detail__header">
            <button
              type="button"
              className="task-detail__icon-btn"
              onClick={onClose}
              aria-label="Retour"
            >
              <ArrowLeft size={18} strokeWidth={2.3} />
            </button>
            <h2 className="task-detail__heading">Détail</h2>
            <div className="task-detail__header-actions">
              <button
                type="button"
                className={`task-detail__icon-btn ${task.pinned ? 'is-active' : ''}`}
                onClick={onPin}
                aria-label="Épingler"
              >
                <Pin size={16} strokeWidth={2.3} />
              </button>
              <button
                type="button"
                className="task-detail__icon-btn"
                onClick={onEdit}
                aria-label="Modifier"
              >
                <Pencil size={16} strokeWidth={2.3} />
              </button>
              <button
                type="button"
                className="task-detail__icon-btn is-danger"
                onClick={onDelete}
                aria-label="Supprimer"
              >
                <Trash2 size={16} strokeWidth={2.3} />
              </button>
            </div>
          </header>

          <ElegantScroll className="task-detail__body">
            <div className="task-detail__title-row">
              <button
                type="button"
                className={`task-detail__check ${task.status === 'done' ? 'is-checked' : ''}`}
                onClick={onToggle}
                aria-label={task.status === 'done' ? 'Marquer à faire' : 'Terminer'}
              >
                <Check size={16} strokeWidth={3} />
              </button>
              <h1 className={`task-detail__title ${task.status === 'done' ? 'is-done' : ''}`}>
                {task.title}
              </h1>
            </div>

            {task.description ? (
              <p className="task-detail__description">{task.description}</p>
            ) : (
              <p className="task-detail__description is-empty">Aucune description</p>
            )}

            <div className="task-detail__meta">
              <div className="task-detail__meta-item">
                <span className="task-detail__meta-label">
                  <SignalHigh size={13} strokeWidth={2.3} />
                  Priorité
                </span>
                <span
                  className="task-detail__pill"
                  style={{
                    background: `color-mix(in srgb, ${PRIORITY_COLOR[task.priority]} 18%, transparent)`,
                    color: PRIORITY_COLOR[task.priority],
                  }}
                >
                  {PRIORITY_LABEL[task.priority]}
                </span>
              </div>

              <div className="task-detail__meta-item">
                <span className="task-detail__meta-label">
                  <CalendarDays size={13} strokeWidth={2.3} />
                  Échéance
                </span>
                {task.dueAt ? (
                  <span className={`task-detail__value ${dueClass(task.dueAt)}`}>
                    {formatDate(task.dueAt)}
                  </span>
                ) : (
                  <span className="task-detail__value is-muted">Sans date</span>
                )}
              </div>

              <div className="task-detail__meta-item">
                <span className="task-detail__meta-label">
                  <Folder size={13} strokeWidth={2.3} />
                  Catégorie
                </span>
                {category ? (
                  <span
                    className="task-detail__pill"
                    style={{
                      background: `${category.color}18`,
                      color: category.color,
                    }}
                  >
                    {category.name}
                  </span>
                ) : (
                  <span className="task-detail__value is-muted">Aucune</span>
                )}
              </div>

              <div className="task-detail__meta-item">
                <span className="task-detail__meta-label">
                  <Tag size={13} strokeWidth={2.3} />
                  Tags
                </span>
                {task.tags.length > 0 ? (
                  <div className="task-detail__tags">
                    {task.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="task-detail__pill"
                        style={{
                          background: `${tag.color}18`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="task-detail__value is-muted">Aucun</span>
                )}
              </div>
            </div>

            <section className="task-detail__subtasks">
              <div className="task-detail__section-title">
                <ListTodo size={14} strokeWidth={2.3} />
                Sous-tâches
                {task.subtasks.length > 0 && (
                  <span className="task-detail__section-count">
                    {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                  </span>
                )}
              </div>
              {task.subtasks.length === 0 ? (
                <p className="task-detail__value is-muted">Aucune sous-tâche</p>
              ) : (
                <ul className="task-detail__subtask-list">
                  {task.subtasks.map((sub) => (
                    <li key={sub.id}>
                      <button
                        type="button"
                        className={`task-detail__subtask ${sub.done ? 'is-done' : ''}`}
                        onClick={() => onToggleSubtask(sub.id)}
                      >
                        <span className={`task-detail__subcheck ${sub.done ? 'is-checked' : ''}`}>
                          {sub.done && <Check size={11} strokeWidth={3} />}
                        </span>
                        <span>{sub.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="task-detail__dates">
              <span>Créée le {formatDate(task.createdAt)}</span>
              <span>Modifiée le {formatDate(task.updatedAt)}</span>
              {task.completedAt && <span>Terminée le {formatDate(task.completedAt)}</span>}
            </div>
          </ElegantScroll>

          <footer className="task-detail__footer">
            <button type="button" className="pill-btn accent-fill" onClick={onEdit}>
              <Pencil size={15} strokeWidth={2.3} />
              Modifier
            </button>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
