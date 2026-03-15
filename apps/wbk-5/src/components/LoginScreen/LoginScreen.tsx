import React, { useState } from 'react';

interface LoginScreenProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  menuOpen,
  onToggleMenu,
  onLogin,
  onRegister,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        await onLogin(email.trim(), password);
      } else {
        await onRegister(email.trim(), password);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="relative max-w-[420px] mx-auto px-4 pt-8 pb-10 min-h-screen flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="absolute top-4 left-4 text-[28px] p-[10px] cursor-pointer text-slate-700 rounded-2xl bg-white shadow-sm active:scale-95"
        >
          ☰
        </button>

        {menuOpen && (
          <div className="absolute top-20 left-4 right-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
            <p className="text-sm font-semibold text-slate-700">Sign in to access your courses and progress.</p>
          </div>
        )}

        <div className="w-full text-center">
          <img
            src="/learnendo-logo-transp.png"
            alt="Learnendo Logo"
            style={{ width: '200px', marginBottom: '12px' }}
            className="logo-login mx-auto"
          />
          <p className="text-slate-600 font-semibold text-sm mb-8">Log in to continue learning</p>

          <div className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-5 space-y-4">
            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
            />

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
          </div>
        </div>
      </div>
    </div>
  );
};
