import { Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import iconUrl from '@/assets/icons/48.png';
import { SyncBadge } from '@/components/SyncBadge';
import './Header.scss';

interface HeaderProps {
  activeCount: number;
  progress: number;
  profileName: string;
  profileColor: string;
  onOpenSettings: () => void;
  onOpenProfiles: () => void;
}

export function Header({
  activeCount,
  progress,
  profileName,
  profileColor,
  onOpenSettings,
  onOpenProfiles,
}: HeaderProps) {
  const pct = Math.round(progress * 100);

  return (
    <header className="header glass">
      <div className="header__top">
        <img
          className="header__logo"
          src={iconUrl}
          width={34}
          height={34}
          alt=""
        />
        <div className="header__brand">
          <h1 className="header__title">Mes Tâches</h1>
          <p className="header__subtitle">{profileName}</p>
        </div>
        <span className="header__badge accent-fill" title="Tâches actives">
          {activeCount}
        </span>
        <div className="header__actions">
          <SyncBadge />
          <button
            type="button"
            className="header__icon-btn"
            onClick={onOpenProfiles}
            title={`Profil: ${profileName}`}
            aria-label="Changer de profil"
          >
            <span className="header__avatar" style={{ background: profileColor }}>
              {profileName.slice(0, 1).toUpperCase()}
            </span>
          </button>
          <button
            type="button"
            className="header__icon-btn"
            onClick={onOpenSettings}
            aria-label="Paramètres"
          >
            <Settings2 size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="header__progress-wrap">
        <span className="header__progress-label">Jour</span>
        <div className="header__progress">
          <motion.div
            className="header__progress-bar accent-fill"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>
        <span className="header__progress-label">{pct}%</span>
      </div>
    </header>
  );
}
