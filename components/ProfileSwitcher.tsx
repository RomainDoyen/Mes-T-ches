import { Plus, Trash2, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Profile } from '@/lib/types';
import './ProfileSwitcher.scss';

interface ProfileSwitcherProps {
  open: boolean;
  profiles: Profile[];
  activeProfileId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

export function ProfileSwitcher({
  open,
  profiles,
  activeProfileId,
  onClose,
  onSelect,
  onCreate,
  onDelete,
}: ProfileSwitcherProps) {
  const [name, setName] = useState('');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="profiles-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="profiles"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profiles__head">
              <h2 className="profiles__title">
                <Users size={16} strokeWidth={2.3} />
                Profils
              </h2>
              <button type="button" className="profiles__close" onClick={onClose} aria-label="Fermer">
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className="profiles__list">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`profiles__item ${p.id === activeProfileId ? 'is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="profiles__select"
                    onClick={() => {
                      onSelect(p.id);
                      onClose();
                    }}
                  >
                    <span className="profiles__dot" style={{ background: p.color }} />
                    <span className="profiles__name">{p.name}</span>
                  </button>
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      className="profiles__delete"
                      onClick={() => onDelete(p.id)}
                      title="Supprimer"
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="profiles__form">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nouveau profil"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) {
                    onCreate(name.trim());
                    setName('');
                    onClose();
                  }
                }}
              />
              <button
                type="button"
                className="profiles__add accent-fill"
                onClick={() => {
                  if (!name.trim()) return;
                  onCreate(name.trim());
                  setName('');
                  onClose();
                }}
                aria-label="Ajouter un profil"
              >
                <Plus size={18} strokeWidth={2.4} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
