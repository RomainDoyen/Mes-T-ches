import { ListPlus, Sparkles } from 'lucide-react';
import './EmptyState.scss';

interface EmptyStateProps {
  onCreate: () => void;
  filtered?: boolean;
}

export function EmptyState({ onCreate, filtered = false }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden>
        <Sparkles size={34} strokeWidth={1.8} />
      </div>
      <h2 className="empty__title">
        {filtered ? 'Aucune tâche pour ce filtre' : 'Aucune tâche pour le moment'}
      </h2>
      <p className="empty__text">
        {filtered
          ? 'Modifiez les filtres ou créez une tâche qui correspond.'
          : 'Créez votre première tâche pour démarrer la journée.'}
      </p>
      <button type="button" className="pill-btn empty__cta accent-fill" onClick={onCreate}>
        <ListPlus size={16} strokeWidth={2.3} />
        Créer une tâche
      </button>
    </div>
  );
}
