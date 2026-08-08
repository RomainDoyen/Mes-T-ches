import {
  CalendarDays,
  CalendarRange,
  Flame,
  LayoutList,
  Search,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import type { QuickFilter, Tag as TagType } from '@/lib/types';
import './SearchFilters.scss';

const CHIPS: Array<{ id: QuickFilter; label: string; Icon: LucideIcon }> = [
  { id: 'all', label: 'Toutes', Icon: LayoutList },
  { id: 'today', label: "Aujourd'hui", Icon: CalendarDays },
  { id: 'urgent', label: 'Urgent', Icon: Flame },
  { id: 'week', label: 'Semaine', Icon: CalendarRange },
];

interface SearchFiltersProps {
  search: string;
  filter: QuickFilter;
  tags: TagType[];
  selectedTagId: string | null;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: QuickFilter) => void;
  onTagChange: (tagId: string | null) => void;
}

export function SearchFilters({
  search,
  filter,
  tags,
  selectedTagId,
  onSearchChange,
  onFilterChange,
  onTagChange,
}: SearchFiltersProps) {
  return (
    <div className="filters">
      <label className="filters__search">
        <Search className="filters__search-icon" size={16} strokeWidth={2.2} />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher une tâche..."
        />
      </label>
      <div className="filters__chips">
        {CHIPS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`filters__chip ${filter === id ? 'is-active' : ''}`}
            onClick={() => onFilterChange(id)}
          >
            <Icon size={13} strokeWidth={2.3} />
            {label}
          </button>
        ))}
      </div>
      {tags.length > 0 && (
        <div className="filters__tags">
          <span className="filters__tags-label">
            <Tag size={12} strokeWidth={2.3} />
            Tags
          </span>
          <div className="filters__chips filters__chips--tags">
            <button
              type="button"
              className={`filters__chip filters__chip--tag ${selectedTagId === null ? 'is-active' : ''}`}
              onClick={() => onTagChange(null)}
            >
              Tous
            </button>
            {tags.map((tag) => {
              const active = selectedTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`filters__chip filters__chip--tag ${active ? 'is-active' : ''}`}
                  style={
                    active
                      ? {
                          background: tag.color,
                          borderColor: 'transparent',
                          color: '#fff',
                        }
                      : {
                          background: `${tag.color}18`,
                          borderColor: `${tag.color}44`,
                          color: tag.color,
                        }
                  }
                  onClick={() => onTagChange(active ? null : tag.id)}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
