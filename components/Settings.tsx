import {
  Cloud,
  Download,
  LogOut,
  Moon,
  RefreshCw,
  Settings2,
  Sun,
  Tag,
  Upload,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { ElegantScroll } from '@/components/ElegantScroll';
import { TagManager } from '@/components/TagManager';
import { backupRepo } from '@/lib/repositories/backup';
import type { Tag as TagType } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import type { SyncStatus } from '@/lib/sync/types';
import type { ThemeMode } from '@/stores/themeStore';
import './Settings.scss';

const SYNC_LABELS: Record<SyncStatus, string> = {
  synced: 'Synchronisé',
  pending: 'En attente',
  offline: 'Hors ligne',
  error: 'Erreur',
};

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Jamais';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

interface SettingsProps {
  open: boolean;
  theme: ThemeMode;
  profileId: string | null;
  tags: TagType[];
  tagUsage: (id: string) => number;
  onClose: () => void;
  onToggleTheme: () => void;
  onImported: () => void;
  onToast: (message: string) => void;
  onCreateTag: (name: string, color: string) => void;
  onUpdateTag: (id: string, data: { name: string; color: string }) => void;
  onDeleteTag: (id: string) => void;
}

export function Settings({
  open,
  theme,
  profileId,
  tags,
  tagUsage,
  onClose,
  onToggleTheme,
  onImported,
  onToast,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: SettingsProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { lastSyncAt, lastError, status, syncNow, refreshStatus } = useSyncStore();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (open) void refreshStatus();
  }, [open, refreshStatus]);

  const usageById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tag of tags) {
      map[tag.id] = tagUsage(tag.id);
    }
    return map;
  }, [tags, tagUsage]);

  function handleExport() {
    if (!profileId) return;
    try {
      const payload = backupRepo.exportProfile(profileId);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-taches-${payload.profile.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onToast('Export téléchargé');
    } catch {
      onToast("Échec de l'export");
    }
  }

  function handleImport(file: File | null) {
    if (!file || !profileId) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        backupRepo.importReplaceActive(profileId, raw);
        onImported();
        onToast('Import réussi');
      } catch {
        onToast('JSON invalide — aucune donnée modifiée');
      }
    };
    reader.readAsText(file);
  }

  function safeCreate(name: string, color: string) {
    try {
      onCreateTag(name, color);
      onToast('Tag créé');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Impossible de créer le tag');
    }
  }

  function safeUpdate(id: string, data: { name: string; color: string }) {
    try {
      onUpdateTag(id, data);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Impossible de modifier le tag');
    }
  }

  function safeDelete(id: string) {
    const usage = tagUsage(id);
    const ok = window.confirm(
      usage > 0
        ? `Supprimer ce tag ? Il sera retiré de ${usage} tâche${usage > 1 ? 's' : ''}.`
        : 'Supprimer ce tag ?',
    );
    if (!ok) return;
    try {
      onDeleteTag(id);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Impossible de supprimer le tag');
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await syncNow();
      onToast('Synchronisation réussie');
    } catch {
      onToast('Échec de la synchronisation');
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogout() {
    await logout();
    useSyncStore.setState({
      status: 'synced',
      lastSyncAt: null,
      lastError: null,
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="settings-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="settings"
            initial={{ x: 40 }}
            animate={{ x: 0 }}
            exit={{ x: 60 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings__head">
              <h2 className="settings__title">Paramètres</h2>
              <button type="button" className="settings__close" onClick={onClose} aria-label="Fermer">
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            <ElegantScroll className="settings__scroll">
            <div className="settings__section">
              <span className="settings__section-title">
                <User size={13} strokeWidth={2.3} />
                Compte
              </span>
              <div className="settings__account">
                <span className="settings__email">{user?.email ?? '—'}</span>
                <div className="settings__sync-meta">
                  <span className={`settings__sync-status settings__sync-status--${status}`}>
                    <Cloud size={12} strokeWidth={2.3} />
                    {SYNC_LABELS[status]}
                  </span>
                  <span className="settings__sync-time">
                    Dernière sync : {formatLastSync(lastSyncAt)}
                  </span>
                </div>
                {lastError && status === 'error' && (
                  <p className="settings__sync-error">{lastError}</p>
                )}
              </div>
              <button
                type="button"
                className="pill-btn settings__btn accent-fill"
                onClick={() => void handleSyncNow()}
                disabled={syncing}
              >
                <RefreshCw
                  size={15}
                  strokeWidth={2.3}
                  className={syncing ? 'settings__spin' : undefined}
                />
                {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
              </button>
              <button
                type="button"
                className="pill-btn settings__btn settings__btn--ghost"
                onClick={() => void handleLogout()}
              >
                <LogOut size={15} strokeWidth={2.3} />
                Déconnexion
              </button>
            </div>

            <div className="settings__section">
              <span className="settings__section-title">
                <Settings2 size={13} strokeWidth={2.3} />
                Apparence
              </span>
              <div className="settings__row">
                <span className="settings__label">
                  {theme === 'dark' ? (
                    <Moon size={16} strokeWidth={2.2} />
                  ) : (
                    <Sun size={16} strokeWidth={2.2} />
                  )}
                  {theme === 'dark' ? 'Mode sombre' : 'Mode clair'}
                </span>
                <button
                  type="button"
                  className={`settings__switch ${theme === 'dark' ? 'is-on' : ''}`}
                  onClick={onToggleTheme}
                  aria-label="Basculer le thème"
                >
                  <span className="settings__switch-knob" />
                </button>
              </div>
            </div>

            <div className="settings__section">
              <span className="settings__section-title">
                <Tag size={13} strokeWidth={2.3} />
                Tags du profil
              </span>
              <TagManager
                tags={tags}
                usageById={usageById}
                onCreate={safeCreate}
                onUpdate={safeUpdate}
                onDelete={safeDelete}
              />
            </div>

            <div className="settings__section">
              <span className="settings__section-title">
                <Download size={13} strokeWidth={2.3} />
                Données du profil
              </span>
              <button
                type="button"
                className="pill-btn settings__btn accent-fill"
                onClick={handleExport}
              >
                <Download size={15} strokeWidth={2.3} />
                Exporter JSON
              </button>
              <label className="pill-btn settings__btn accent-fill" style={{ cursor: 'pointer' }}>
                <Upload size={15} strokeWidth={2.3} />
                Importer JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => handleImport(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="settings__version">Mes Tâches v1.0.0</div>
            </ElegantScroll>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
