import React, { useState } from 'react';
import ForgotPasswordModal from '../common/ForgotPasswordModal';
import { learnendoLogoTransparent } from '../../assets/branding';

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/invalid-email':
      return 'Invalid email format.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Login failed. Please try again.';
  }
}

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
  const [entryMode, setEntryMode] = useState<'student' | 'teacher'>('student');
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
        await onLogin(email.trim(), password, entryMode);
      } else {
        await onRegister(email.trim(), password, entryMode);
      }
    } catch (err: any) {
      setError(mapAuthError(err?.code ?? ''));
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
              style={{ width: '200px', marginBottom: '12px' }}
              className="logo-login mx-auto"
              onError={() => setLogoFailed(true)}
            />
          )}
          <p className="mb-8 text-sm font-semibold text-slate-600">Log in to continue learning</p>

          <div className="space-y-4 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-slate-100 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setEntryMode('student')}
                  className={`rounded-2xl px-3 py-3 text-sm font-bold transition-colors ${
                    entryMode === 'student'
                      ? 'bg-blue-600 text-white shadow-[0_4px_0_0_#1d4ed8]'
                      : 'text-slate-600'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('teacher')}
                  className={`rounded-2xl px-3 py-3 text-sm font-bold transition-colors ${
                    entryMode === 'teacher'
                      ? 'bg-slate-800 text-white shadow-[0_4px_0_0_#0f172a]'
                      : 'text-slate-600'
                  }`}
                >
                  Teacher
                </button>
              </div>
              <p className="px-2 pb-1 pt-3 text-xs font-medium text-slate-500">
                {entryMode === 'teacher'
                  ? 'Teacher tools only open when this account has permission.'
                  : 'Students only see the classes assigned to their email.'}
              </p>
            </div>

            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            ) : null}

            <input
              type="email"
              name="email"
              autoComplete="email"
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
