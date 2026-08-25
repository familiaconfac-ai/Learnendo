import React, { useState } from 'react';
import ForgotPasswordModal from '../common/ForgotPasswordModal';
import { learnendoLogoTransparent } from '../../assets/branding';
import { mapAuthError } from './authErrorMessage';

interface LoginScreenProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onLogin: (email: string, password: string, viewMode: 'student' | 'teacher') => Promise<void>;
  onRegister: (email: string, password: string, viewMode: 'student' | 'teacher') => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  menuOpen,
  onToggleMenu,
  onLogin,
  onRegister,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in email and password.');
      return false;
    }

    return true;
  };

  const handleAction = async (action: 'login' | 'register') => {
    if (!validate()) return;

    setError('');
    setIsSubmitting(true);
    try {
      if (action === 'login') {
        await onLogin(email.trim(), password, 'student');
      } else {
        await onRegister(email.trim(), password, 'student');
      }
    } catch (err: any) {
      if (action === 'register') {
        console.error('[Create account] Firebase registration failed:', {
          code: err?.code ?? 'unknown',
          message: err?.message ?? String(err),
        });
      }
      setError(mapAuthError(err?.code ?? '', action));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="relative mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center px-4 pb-10 pt-8">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="absolute left-4 top-4 rounded-2xl bg-white p-[10px] text-[28px] text-slate-700 shadow-sm active:scale-95"
        >
          <span aria-hidden="true">&#9776;</span>
        </button>

        {menuOpen ? (
          <div className="absolute left-4 right-4 top-20 rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
            <p className="text-sm font-semibold text-slate-700">Sign in to access your courses and progress.</p>
          </div>
        ) : null}

        <div className="w-full text-center">
          {logoFailed ? (
            <div className="mx-auto mb-3 inline-flex rounded-3xl bg-blue-600 px-6 py-4 text-3xl font-black text-white shadow-[0_4px_0_0_#1d4ed8]">
              Learnendo
            </div>
          ) : (
            <img
              src={learnendoLogoTransparent}
              alt="Learnendo Logo"
              style={{ width: '200px', marginBottom: '18px' }}
              className="logo-login mx-auto"
              onError={() => setLogoFailed(true)}
            />
          )}

          <div className="space-y-4 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            ) : null}

            <input
              type="email"
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-20 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-4 my-auto h-fit text-xs font-bold text-blue-600 hover:text-blue-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction('login')}
              className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5 disabled:opacity-60"
            >
              Login
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction('register')}
              className="w-full rounded-2xl bg-slate-100 px-4 py-4 text-sm font-bold text-slate-700 active:scale-[0.99] disabled:opacity-60"
            >
              Create account
            </button>

            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="w-full pt-1 text-center text-xs font-medium text-blue-500 hover:text-blue-700"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        open={showForgot}
        onClose={() => setShowForgot(false)}
        initialEmail={email}
      />
    </div>
  );
};
