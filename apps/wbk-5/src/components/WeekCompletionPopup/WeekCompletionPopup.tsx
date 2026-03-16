import React from 'react';
import { WeekCompletionResult } from '../../services/db';

interface WeekCompletionPopupProps {
  result: WeekCompletionResult;
  onClose: () => void;
}

export const WeekCompletionPopup: React.FC<WeekCompletionPopupProps> = ({ result, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-bounce-in">
        {/* Celebration emoji */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Week Complete!</h1>
          <p className="text-slate-500 text-sm">Amazing work this week!</p>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {/* Diamonds */}
          <div className="bg-blue-50 rounded-2xl p-3 text-center border border-blue-200">
            <div className="text-2xl mb-1">💎</div>
            <div className="text-xl font-bold text-blue-600">{result.diamondsEarned}</div>
            <div className="text-xs text-slate-600 font-medium">Diamonds</div>
          </div>

          {/* Fire */}
          <div className="bg-orange-50 rounded-2xl p-3 text-center border border-orange-200">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-xl font-bold text-orange-600">{result.fireCount}</div>
            <div className="text-xs text-slate-600 font-medium">Fire</div>
          </div>

          {/* Ice */}
          <div className="bg-cyan-50 rounded-2xl p-3 text-center border border-cyan-200">
            <div className="text-2xl mb-1">❄️</div>
            <div className="text-xl font-bold text-cyan-600">{result.iceCount}</div>
            <div className="text-xs text-slate-600 font-medium">Ice</div>
          </div>

          {/* Stars */}
          <div className="bg-yellow-50 rounded-2xl p-3 text-center border border-yellow-200">
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-xl font-bold text-yellow-600">{result.starsEarned}</div>
            <div className="text-xs text-slate-600 font-medium">Stars</div>
          </div>
        </div>

        {/* Stats explanation */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200 text-sm space-y-2">
          <p className="text-slate-700">
            <span className="font-semibold text-blue-600">💎 {result.diamondsEarned}</span> - Days completed
          </p>
          <p className="text-slate-700">
            <span className="font-semibold text-orange-600">🔥 {result.fireCount}</span> - Days on schedule
          </p>
          <p className="text-slate-700">
            <span className="font-semibold text-cyan-600">❄️ {result.iceCount}</span> - Days completed late
          </p>
          <p className="text-slate-700 border-t border-slate-300 pt-2 mt-2">
            <span className="font-semibold text-yellow-600">⭐ {result.starsEarned}</span> - Total week stars
          </p>
        </div>

        {/* Motivational message */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl p-4 mb-6 border border-blue-200 text-center">
          <p className="text-sm font-semibold text-blue-900">
            {result.starsEarned >= 12 && 'Perfect week! You\'re a learning champion! 🏆'}
            {result.starsEarned >= 9 && result.starsEarned < 12 && 'Excellent progress! Keep it up! 💪'}
            {result.starsEarned >= 7 && result.starsEarned < 9 && 'Great effort! You\'re making progress! 📈'}
            {result.starsEarned < 7 && 'Good start! Every day counts! 🌟'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          Continue to Next Week
        </button>
      </div>
    </div>
  );
};
