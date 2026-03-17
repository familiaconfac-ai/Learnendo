import React, { useState } from 'react';
import { convertAnonymousToUser } from '../../services/firebase';
import { createOrUpdateUserProfile } from '../../services/db';
import { User } from 'firebase/auth';

interface ConversionModalProps {
  user: User;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  reason?: string; // Optional context for why conversion is needed
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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

      // Step 1: Convert anonymous account to registered
      const convertedUser = await convertAnonymousToUser(email, password);
      console.log('[ConversionModal] ✅ Auth conversion complete');

      // Step 2: Update Firestore profile with email
      await createOrUpdateUserProfile(user, email);
      console.log('[ConversionModal] ✅ Firestore profile updated');

      console.log('[ConversionModal] ✅ Conversion complete. Email:', convertedUser.email);

      // Clear form and notify parent
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (err: any) {
      console.error('[ConversionModal] ❌ Conversion failed:', err);
      setError(err.message || 'Conversion failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-11/12 max-w-md mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
          <p className="text-slate-600 mt-2">
            {reason || 'Create an account to unlock more features and save your progress.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleConvert} className="space-y-4">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@example.com"
              disabled={isLoading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              disabled={isLoading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••"
              disabled={isLoading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">ℹ️ Your progress is safe!</span> All your data will be preserved with your new account.
            </p>
          </div>

          {/* Form Error (if exists) */}
          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm text-slate-600 ml-3">Converting your account...</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Converting...' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <p className="text-xs text-slate-500 text-center mt-4">
          Your account will be secured with email and password authentication.
        </p>
      </div>
    </div>
  );
};
