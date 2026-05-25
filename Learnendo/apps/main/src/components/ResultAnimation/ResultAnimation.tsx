import React, { useEffect, useState } from 'react';

interface ResultAnimationProps {
  streak: number;
  freeze: number;
  diamonds: number;
  stars: number;
  /** Accuracy percentage (0–100). Shown below the stars count when provided. */
  percentage?: number;
  newWords?: number;
  onClose: () => void;
}

function useCountUp(target: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || target === 0) {
      setValue(active ? target : 0);
      return;
    }
    const steps = 30;
    const stepMs = duration / steps;
    let current = 0;
    const id = setInterval(() => {
      current += 1;
      setValue(Math.round((target * current) / steps));
      if (current >= steps) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [target, duration, active]);

  return value;
}

interface StatProps {
  icon: string;
  label: string;
  value: number;
  active: boolean;
  delay: number;
}

const Stat: React.FC<StatProps> = ({ icon, label, value, active, delay }) => {
  const [visible, setVisible] = useState(false);
  const displayed = useCountUp(value, 600, visible);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(id);
  }, [active, delay]);

  return (
    <div
      className={`flex flex-col items-center gap-1 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <span className="text-3xl leading-none">{icon}</span>
      <span className="text-2xl font-bold text-slate-800">{displayed}</span>
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
    </div>
  );
};

export const ResultAnimation: React.FC<ResultAnimationProps> = ({
  streak,
  freeze,
  diamonds,
  stars,
  percentage,
  newWords,
  onClose,
}) => {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [starsVisible, setStarsVisible] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);
  const starsCount = useCountUp(stars, 800, starsVisible);

  useEffect(() => {
    const t1 = setTimeout(() => setOverlayVisible(true), 10);
    const t2 = setTimeout(() => setCardVisible(true), 100);
    const t3 = setTimeout(() => setStarsVisible(true), 400);
    const t4 = setTimeout(() => setBtnVisible(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 bg-black/70 ${
        overlayVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-8 w-[320px] max-w-[90vw] text-center transition-all duration-400 ${
          cardVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Mascot */}
        <img src="/mascot.png" alt="Learnendo" className="w-16 h-16 object-contain mx-auto mb-3" />
        {/* Title */}
        <p className="text-sm font-semibold text-blue-500 uppercase tracking-widest mb-4">
          Lesson Complete!
        </p>
        {/* New words block */}
        {!!newWords && (
          <div className="flex items-center justify-center gap-2 mb-5 bg-amber-50 rounded-xl py-2 px-4 border border-amber-200">
            <span className="text-xl leading-none">🦉</span>
            <span className="text-sm font-bold text-amber-700">{newWords} new words</span>
          </div>
        )}

        {/* Small stats row */}
        <div className="flex justify-around mb-8">
          <Stat icon="🔥" label="Streak" value={streak} active={cardVisible} delay={200} />
          <Stat icon="❄️" label="Freeze" value={freeze} active={cardVisible} delay={400} />
          <Stat icon="💎" label="Diamonds" value={diamonds} active={cardVisible} delay={600} />
        </div>

        {/* Stars — main focus */}
        <div
          className={`flex flex-col items-center mb-8 transition-all duration-500 ${
            starsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <span className="text-[72px] leading-none drop-shadow-lg">⭐</span>
          <span className="text-[48px] font-black text-slate-800 leading-tight mt-1">
            {starsCount}
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-widest mt-1">Stars</span>
          {percentage !== undefined && (
            <span className="text-sm font-semibold text-slate-500 mt-2">{percentage}% accuracy</span>
          )}
        </div>

        {/* Continue button */}
        <button
          onPointerDown={(e) => { e.preventDefault(); onClose(); }}
          className={`w-full py-3 rounded-xl bg-blue-500 text-white font-bold text-base shadow-md active:scale-95 transition-all duration-300 hover:bg-blue-600 [touch-action:manipulation] ${
            btnVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
