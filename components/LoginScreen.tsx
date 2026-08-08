import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import iconUrl from '@/assets/icons/48.png';
import { useAuthStore } from '@/stores/authStore';
import './LoginScreen.scss';

type Tab = 'login' | 'register';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
      } else {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError('Indiquez votre nom');
          return;
        }
        await register(email.trim(), password, trimmedName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d\'ouvrir Google');
    }
  }

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
  }

  return (
    <div className="login">
      <div className="login__brand">
        <img className="login__logo" src={iconUrl} width={44} height={44} alt="" />
        <h1 className="login__title">Mes Tâches</h1>
        <p className="login__subtitle">Connectez-vous pour synchroniser vos tâches</p>
      </div>

      <div className="login__tabs glass">
        <button
          type="button"
          className={`login__tab ${tab === 'login' ? 'is-active' : ''}`}
          onClick={() => switchTab('login')}
        >
          Connexion
        </button>
        <button
          type="button"
          className={`login__tab ${tab === 'register' ? 'is-active' : ''}`}
          onClick={() => switchTab('register')}
        >
          Créer un compte
        </button>
      </div>

      <form className="login__form" onSubmit={(e) => void handleSubmit(e)}>
        {tab === 'register' && (
          <label className="login__field">
            <span className="login__label">Nom</span>
            <input
              type="text"
              className="login__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
              autoComplete="name"
              required
            />
          </label>
        )}

        <label className="login__field">
          <span className="login__label">Email</span>
          <input
            type="email"
            className="login__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="login__field">
          <span className="login__label">Mot de passe</span>
          <input
            type="password"
            className="login__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
          />
        </label>

        {error && <p className="login__error">{error}</p>}

        <button type="submit" className="login__submit pill-btn accent-fill" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={16} strokeWidth={2.3} className="login__spinner" />
              {tab === 'login' ? 'Connexion…' : 'Création…'}
            </>
          ) : tab === 'login' ? (
            'Se connecter'
          ) : (
            'Créer mon compte'
          )}
        </button>
      </form>

      <div className="login__divider">
        <span>ou</span>
      </div>

      <button type="button" className="login__google glass" onClick={() => void handleGoogle()}>
        <GoogleIcon />
        Continuer avec Google
      </button>
    </div>
  );
}
