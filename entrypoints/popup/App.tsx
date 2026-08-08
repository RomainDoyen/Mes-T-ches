import { AlertCircle, Database, Loader2, Plus, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { ElegantScroll } from '@/components/ElegantScroll';
import { Header } from '@/components/Header';
import { LoginScreen } from '@/components/LoginScreen';
import { ProfileSwitcher } from '@/components/ProfileSwitcher';
import { SearchFilters } from '@/components/SearchFilters';
import { Settings } from '@/components/Settings';
import { TaskDetail } from '@/components/TaskDetail';
import { TaskDrawer } from '@/components/TaskDrawer';
import { TaskList } from '@/components/TaskList';
import { initDb, isDbReady } from '@/lib/db/client';
import { tasksRepo } from '@/lib/repositories/tasks';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useTaskStore } from '@/stores/taskStore';
import { useThemeStore } from '@/stores/themeStore';

type BootState = 'loading' | 'ready' | 'error';

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const {
    hydrated: authHydrated,
    token,
    hydrate: hydrateAuth,
  } = useAuthStore();

  const {
    profiles,
    activeProfileId,
    hydrate,
    setActiveProfile,
    createProfile,
    deleteProfile,
  } = useProfileStore();

  const {
    tasks,
    categories,
    tags,
    filter,
    selectedTagId,
    search,
    drawerOpen,
    editingTaskId,
    detailTaskId,
    settingsOpen,
    toast,
    setFilter,
    setSelectedTagId,
    setSearch,
    openCreate,
    openEdit,
    openDetail,
    closeDetail,
    closeDrawer,
    openSettings,
    closeSettings,
    showToast,
    clearToast,
    loadForProfile,
    createTask,
    updateTask,
    toggleDone,
    togglePin,
    toggleSubtask,
    deleteTask,
    createTag,
    addTag,
    updateTag,
    deleteTag,
    tagUsage,
  } = useTaskStore();

  const [boot, setBoot] = useState<BootState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profilesOpen, setProfilesOpen] = useState(false);

  async function bootApp() {
    setBoot('loading');
    setErrorMessage(null);
    try {
      if (!isDbReady()) {
        await initDb();
      }
      await hydrate();
      setBoot('ready');
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Initialisation impossible',
      );
      setBoot('error');
    }
  }

  useEffect(() => {
    void hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    function onOAuthMessage(message: unknown): void {
      if (
        typeof message !== 'object' ||
        message === null ||
        !('type' in message) ||
        message.type !== 'oauth-code'
      ) {
        return;
      }
      void hydrateAuth();
    }

    chrome.runtime.onMessage.addListener(onOAuthMessage);
    return () => chrome.runtime.onMessage.removeListener(onOAuthMessage);
  }, [hydrateAuth]);

  useEffect(() => {
    if (!authHydrated || !token) return;
    void bootApp();
  }, [authHydrated, token]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (boot !== 'ready' || !activeProfileId) return;
    loadForProfile(activeProfileId);
  }, [boot, activeProfileId, filter, search, selectedTagId, loadForProfile]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => clearToast(), 2500);
    return () => window.clearTimeout(id);
  }, [toast, clearToast]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;
  const editingTask = editingTaskId ? tasksRepo.get(editingTaskId) : null;
  const detailTask =
    detailTaskId != null
      ? (tasks.find((t) => t.id === detailTaskId) ??
        tasksRepo.get(detailTaskId))
      : null;
  const detailCategory =
    detailTask?.categoryId != null
      ? (categories.find((c) => c.id === detailTask.categoryId) ?? null)
      : null;

  const progress = useMemo(() => {
    if (!activeProfileId) return 0;
    const { done, total } = tasksRepo.dayProgress(activeProfileId);
    if (total === 0) return 0;
    return done / total;
  }, [activeProfileId, tasks]);

  const activeCount = useMemo(
    () =>
      activeProfileId
        ? tasksRepo.countActive(activeProfileId)
        : tasks.filter((t) => t.status === 'todo').length,
    [activeProfileId, tasks],
  );

  if (!authHydrated) {
    return (
      <div className="popup-shell" data-theme={theme}>
        <div className="boot">
          <div className="boot__icon">
            <Loader2 size={26} strokeWidth={2} className="login__spinner" />
          </div>
          <p className="boot__text">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="popup-shell" data-theme={theme}>
        <LoginScreen />
      </div>
    );
  }

  if (boot === 'loading') {
    return (
      <div className="popup-shell" data-theme={theme}>
        <div className="boot">
          <div className="boot__icon">
            <Database size={26} strokeWidth={2} />
          </div>
          <p className="boot__text">Chargement de la base locale…</p>
        </div>
      </div>
    );
  }

  if (boot === 'error') {
    return (
      <div className="popup-shell" data-theme={theme}>
        <div className="boot">
          <div className="boot__icon" style={{ color: 'var(--danger)' }}>
            <AlertCircle size={26} strokeWidth={2} />
          </div>
          <h2 className="empty__title">Erreur base de données</h2>
          <p className="boot__text">{errorMessage}</p>
          <button
            type="button"
            className="pill-btn accent-fill"
            onClick={() => void bootApp()}
          >
            <RefreshCw size={15} strokeWidth={2.3} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-shell">
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <Header
        activeCount={activeCount}
        progress={progress}
        profileName={activeProfile?.name ?? 'Profil'}
        profileColor={activeProfile?.color ?? '#0F766E'}
        onOpenSettings={openSettings}
        onOpenProfiles={() => setProfilesOpen(true)}
      />

      <SearchFilters
        search={search}
        filter={filter}
        tags={tags}
        selectedTagId={selectedTagId}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onTagChange={setSelectedTagId}
      />

      <ElegantScroll className="scroll-area">
        <TaskList
          tasks={tasks}
          filtered={
            filter !== 'all' ||
            search.trim().length > 0 ||
            selectedTagId !== null
          }
          onOpen={openDetail}
          onToggle={toggleDone}
          onEdit={openEdit}
          onPin={togglePin}
          onDelete={deleteTask}
          onCreate={openCreate}
        />
      </ElegantScroll>

      <button type="button" className="fab accent-fill" onClick={openCreate} aria-label="Ajouter">
        <Plus size={24} strokeWidth={2.4} />
      </button>

      <TaskDetail
        open={detailTaskId != null && detailTask != null}
        task={detailTask}
        category={detailCategory}
        onClose={closeDetail}
        onEdit={() => {
          if (!detailTaskId) return;
          openEdit(detailTaskId);
        }}
        onToggle={() => detailTaskId && toggleDone(detailTaskId)}
        onPin={() => detailTaskId && togglePin(detailTaskId)}
        onDelete={() => {
          if (!detailTaskId) return;
          if (window.confirm('Supprimer cette tâche ?')) {
            deleteTask(detailTaskId);
          }
        }}
        onToggleSubtask={toggleSubtask}
      />

      <TaskDrawer
        open={drawerOpen}
        task={editingTask}
        categories={categories}
        tags={tags}
        onClose={closeDrawer}
        onCreateTag={(name) => createTag(activeProfileId!, name)}
        onSubmit={(input) => {
          if (!activeProfileId) return;
          if (editingTaskId) updateTask(editingTaskId, input);
          else createTask(activeProfileId, input);
        }}
      />

      <Settings
        open={settingsOpen}
        theme={theme}
        profileId={activeProfileId}
        tags={tags}
        tagUsage={tagUsage}
        onClose={closeSettings}
        onToggleTheme={toggleTheme}
        onImported={() => activeProfileId && loadForProfile(activeProfileId)}
        onToast={showToast}
        onCreateTag={(name, color) => {
          if (!activeProfileId) return;
          addTag(activeProfileId, name, color);
        }}
        onUpdateTag={(id, data) => {
          if (!activeProfileId) return;
          updateTag(activeProfileId, id, data);
        }}
        onDeleteTag={(id) => {
          if (!activeProfileId) return;
          deleteTag(activeProfileId, id);
        }}
      />

      <ProfileSwitcher
        open={profilesOpen}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onClose={() => setProfilesOpen(false)}
        onSelect={(id) => void setActiveProfile(id)}
        onCreate={(name) => void createProfile(name)}
        onDelete={(id) => void deleteProfile(id)}
      />
    </div>
  );
}
