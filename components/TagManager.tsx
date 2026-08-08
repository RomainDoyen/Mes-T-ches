import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ElegantScroll } from '@/components/ElegantScroll';
import type { Tag as TagType } from '@/lib/types';
import { TAG_COLORS } from '@/lib/repositories/tags';
import './TagManager.scss';

interface TagManagerProps {
  tags: TagType[];
  usageById: Record<string, number>;
  onCreate: (name: string, color: string) => void;
  onUpdate: (id: string, data: { name: string; color: string }) => void;
  onDelete: (id: string) => void;
}

export function TagManager({
  tags,
  usageById,
  onCreate,
  onUpdate,
  onDelete,
}: TagManagerProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>(TAG_COLORS[0]);

  function startEdit(tag: TagType) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditColor(TAG_COLORS[0]);
  }

  function submitCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, color);
    setName('');
    setColor(TAG_COLORS[0]);
  }

  function submitEdit() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    onUpdate(editingId, { name: trimmed, color: editColor });
    cancelEdit();
  }

  return (
    <div className="tag-manager">
      <ElegantScroll className="tag-manager__list">
        {tags.length === 0 && (
          <p className="tag-manager__empty">Aucun tag pour ce profil.</p>
        )}
        {tags.map((tag) => {
          const usage = usageById[tag.id] ?? 0;
          const editing = editingId === tag.id;

          if (editing) {
            return (
              <div key={tag.id} className="tag-manager__edit">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
                <div className="tag-manager__swatches">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`tag-manager__swatch ${editColor === c ? 'is-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setEditColor(c)}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                </div>
                <div className="tag-manager__edit-actions">
                  <button type="button" className="tag-manager__icon-btn is-ok" onClick={submitEdit}>
                    <Check size={14} strokeWidth={2.4} />
                  </button>
                  <button type="button" className="tag-manager__icon-btn" onClick={cancelEdit}>
                    <X size={14} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={tag.id} className="tag-manager__item">
              <span className="tag-manager__dot" style={{ background: tag.color }} />
              <div className="tag-manager__meta">
                <span className="tag-manager__name">{tag.name}</span>
                <span className="tag-manager__usage">
                  {usage} tâche{usage === 1 ? '' : 's'}
                </span>
              </div>
              <button
                type="button"
                className="tag-manager__icon-btn"
                onClick={() => startEdit(tag)}
                aria-label={`Modifier ${tag.name}`}
              >
                <Pencil size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className="tag-manager__icon-btn is-danger"
                onClick={() => onDelete(tag.id)}
                aria-label={`Supprimer ${tag.name}`}
              >
                <Trash2 size={14} strokeWidth={2.2} />
              </button>
            </div>
          );
        })}
      </ElegantScroll>

      <div className="tag-manager__create">
        <span className="tag-manager__create-label">
          <Tag size={12} strokeWidth={2.3} />
          Nouveau tag
        </span>
        <div className="tag-manager__create-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du tag"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate();
            }}
          />
          <button
            type="button"
            className="tag-manager__add accent-fill"
            onClick={submitCreate}
            aria-label="Créer le tag"
          >
            <Plus size={16} strokeWidth={2.4} />
          </button>
        </div>
        <div className="tag-manager__swatches">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`tag-manager__swatch ${color === c ? 'is-active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Couleur ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
