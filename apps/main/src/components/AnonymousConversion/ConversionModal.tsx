import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { createOrUpdateUserProfile } from '../../services/db';
import { convertAnonymousToUser } from '../../services/firebase';

interface ConversionModalProps {
  user: User;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  reason?: string;
}

export const ConversionModal: React.FC<ConversionModalProps> = ({
  user,
  isOpen,
  onSuccess,
  onCancel,
  reason,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter an email address.');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[ConversionModal] Starting conversion for:', user.uid);

      const convertedUser = await convertAnonymousToUser(email, password);
      console.log('[ConversionModal] Auth conversion complete');

      await createOrUpdateUserProfile(convertedUser, email);
      console.log('[ConversionModal] Firestore profile updated');

      console.log('[ConversionModal] Conversion complete. Email:', convertedUser.email);

      setEmail('');
      setPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (err: any) {
      console.error('[ConversionModal] Conversion failed:', err);
      setError(err.message || 'Conversion failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="mx-auto w-11/12 max-w-md rounded-2xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
          <p className="mt-2 text-slate-600">
            {reason || 'Create an account to unlock more features and save your progress.'}
          </p>
        </div>

        <form onSubmit={handleConvert} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@example.com"
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isLoading}
                className="absolute inset-y-0 right-4 my-auto h-fit text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Minimum 6 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                disabled={isLoading}
                className="absolute inset-y-0 right-4 my-auto h-fit text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Your progress is safe!</span> All your data will be preserved with your
              new account.
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="ml-3 text-sm text-slate-600">Converting your account...</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Converting...' : 'Create Account'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Your account will be secured with email and password authentication.
        </p>
      </div>
    </div>
  );
};
