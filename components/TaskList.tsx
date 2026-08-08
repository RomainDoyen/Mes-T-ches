import type { Task } from '@/lib/types';
import { endOfToday, startOfToday } from '@/lib/utils/dates';
import { EmptyState } from './EmptyState';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  filtered?: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

function groupLabel(task: Task): string {
  if (task.pinned && task.status !== 'done') return 'Épinglées';
  if (!task.dueAt) return 'Sans date';
  const due = new Date(task.dueAt);
  if (due < startOfToday()) return 'En retard';
  if (due <= endOfToday()) return "Aujourd'hui";
  const tomorrow = new Date(startOfToday());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endTomorrow = new Date(tomorrow);
  endTomorrow.setHours(23, 59, 59, 999);
  if (due <= endTomorrow) return 'Demain';
  return 'Plus tard';
}

const ORDER = ['Épinglées', 'En retard', "Aujourd'hui", 'Demain', 'Plus tard', 'Sans date'];

export function TaskList({
  tasks,
  filtered = false,
  onOpen,
  onToggle,
  onEdit,
  onPin,
  onDelete,
  onCreate,
}: TaskListProps) {
  if (tasks.length === 0) {
    return <EmptyState onCreate={onCreate} filtered={filtered} />;
  }

  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const label = groupLabel(task);
    const list = groups.get(label) ?? [];
    list.push(task);
    groups.set(label, list);
  }

  let index = 0;
  return (
    <div>
      {ORDER.filter((label) => groups.has(label)).map((label) => (
        <section key={label}>
          <div className="group-label">{label}</div>
          {groups.get(label)!.map((task) => {
            const i = index++;
            return (
              <TaskCard
                key={task.id}
                task={task}
                index={i}
                onOpen={() => onOpen(task.id)}
                onToggle={() => onToggle(task.id)}
                onEdit={() => onEdit(task.id)}
                onPin={() => onPin(task.id)}
                onDelete={() => onDelete(task.id)}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}
