import React, { useEffect, useRef, useState } from 'react';
import { sendPasswordReset } from '../../services/firebase';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

type Status = 'idle' | 'loading' | 'success' | 'error';

type Props = {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
};

const SUCCESS_MESSAGE = 'If this email exists, a reset link has been sent.';

const ForgotPasswordModal: React.FC<Props> = ({ open, onClose, initialEmail = '' }) => {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync email when modal opens / initialEmail changes
  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setStatus('idle');
      setMessage('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialEmail]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      await sendPasswordReset(email.trim());
    } catch {
      // Intentionally swallowed — we never reveal whether the email exists
    }

    // Always show the same success message (prevents user enumeration)
    setStatus('success');
    setMessage(SUCCESS_MESSAGE);
    setTimeout(() => onClose(), 3000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reset password"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-slate-800">Reset password</h2>
        <p className="mb-4 text-sm text-slate-500">
          Enter your email and we'll send you a reset link.
        </p>

        {status === 'success' ? (
          <div className="rounded-2xl bg-green-50 px-4 py-4 text-sm font-medium text-green-700">
            {message}
          </div>
        ) : (
          <>
            {status === 'error' && (
              <div className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {message}
              </div>
            )}

            <input
              ref={inputRef}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
              onKeyDown={handleKeyDown}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
            />

            <button
              type="button"
              disabled={status === 'loading'}
              onClick={handleSubmit}
              className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-bold text-white shadow-[0_4px_0_0_#1d4ed8] active:translate-y-0.5 disabled:opacity-60"
            >
              {status === 'loading' ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          Back to login
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
