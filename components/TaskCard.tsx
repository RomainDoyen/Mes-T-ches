import { Calendar, Check, ListTodo, Pencil, Pin, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Task } from '@/lib/types';
import { endOfToday, startOfToday } from '@/lib/utils/dates';
import './TaskCard.scss';

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  low: 'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high: 'var(--priority-high)',
  urgent: 'var(--priority-urgent)',
};

interface TaskCardProps {
  task: Task;
  index: number;
  onOpen: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function dueClass(dueAt: string | null): string {
  if (!dueAt) return '';
  const due = new Date(dueAt);
  if (due < startOfToday()) return 'is-late';
  if (due <= endOfToday()) return 'is-today';
  return '';
}

function formatDue(dueAt: string): string {
  return new Date(dueAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

export function TaskCard({
  task,
  index,
  onOpen,
  onToggle,
  onEdit,
  onPin,
  onDelete,
}: TaskCardProps) {
  const doneSub = task.subtasks.filter((s) => s.done).length;
  const totalSub = task.subtasks.length;

  return (
    <motion.article
      className={`task-card ${task.status === 'done' ? 'is-done' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03, type: 'spring', stiffness: 170, damping: 20 }}
      layout
    >
      <div
        className="task-card__priority"
        style={{ background: PRIORITY_COLOR[task.priority] }}
      />
      <button
        type="button"
        className={`task-card__check ${task.status === 'done' ? 'is-checked' : ''}`}
        onClick={onToggle}
        aria-label={task.status === 'done' ? 'Marquer à faire' : 'Terminer'}
      >
        <Check size={13} strokeWidth={3} />
      </button>
      <div className="task-card__body" onClick={onOpen} role="presentation">
        <div className="task-card__title-row">
          {task.pinned && <Pin className="task-card__pin" size={13} strokeWidth={2.4} />}
          <p className="task-card__title">{task.title}</p>
        </div>
        <div className="task-card__meta">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="task-card__tag"
              style={{ background: `${tag.color}22`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {task.dueAt && (
            <span className={`task-card__due ${dueClass(task.dueAt)}`}>
              <Calendar size={12} strokeWidth={2.2} />
              {formatDue(task.dueAt)}
            </span>
          )}
          {totalSub > 0 && (
            <span className="task-card__subprogress">
              <ListTodo size={12} strokeWidth={2.2} />
              {doneSub}/{totalSub}
            </span>
          )}
        </div>
      </div>
      <div className="task-card__actions">
        <button
          type="button"
          className={`task-card__action ${task.pinned ? 'is-active' : ''}`}
          onClick={onPin}
          title="Épingler"
        >
          <Pin size={14} strokeWidth={2.2} />
        </button>
        <button type="button" className="task-card__action" onClick={onEdit} title="Éditer">
          <Pencil size={14} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className="task-card__action is-danger"
          onClick={onDelete}
          title="Supprimer"
        >
          <Trash2 size={14} strokeWidth={2.2} />
        </button>
      </div>
    </motion.article>
  );
}
