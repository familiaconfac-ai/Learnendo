
import React, { useState, useEffect, useRef } from 'react';
import { PracticeItem, AnswerLog, UserProgress, PracticeModuleType } from '../types';
import { LESSON_CONFIGS, GRAMMAR_GUIDES, MODULE_ICONS } from '../constants';

const SUCCESS_SOUND = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3";
const ERR_SOUND = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";

const TRANSLATIONS: Record<string, string> = {
  'Identify the color of the shirt:': 'Identifique a cor da camisa:',
  'Identify the color of the car:': 'Identifique a cor do carro:',
  'Identify the color of the sky:': 'Identifique a cor do céu:',
  'Identify the color of the object:': 'Identifique a cor do objeto:',
  'Identify the color of the phone:': 'Identifique a cor do telefone:',
  'What color is it?': 'Que cor é essa?',
  'Math: What is four times two?': 'Matemática: Quanto é quatro vezes dois?',
  'Math: What is ten divided by two?': 'Matemática: Quanto é dez dividido por dois?',
  'Math: What is two plus three?': 'Matemática: Quanto é dois mais três?',
  'Math: What is ten plus five?': 'Matemática: Quanto é dez mais cinco?',
  'Type in words what you hear:': 'Digite em palavras o que você ouve:',
  'Listen and pick the correct number:': 'Ouça e escolha o número correto:',
  'Say the result:': 'Diga o resultado:',
  'Say the number:': 'Diga o número:'
};

const COLOR_STYLE_MAP: Record<string, string> = {
  'Red': 'text-red-500',
  'Blue': 'text-blue-500',
  'Green': 'text-green-500',
  'Yellow': 'text-yellow-400',
  'Orange': 'text-orange-500',
  'Purple': 'text-purple-600',
  'Black': 'text-black',
  'White': 'text-slate-300'
};

const NUMBER_MAP: Record<string, string> = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
  'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20',
  'one hundred': '100', 'one thousand': '1000'
};

export const Header: React.FC<{ lessonId: number, progress?: UserProgress }> = ({ lessonId, progress }) => {
  const lessonName = LESSON_CONFIGS.find(l => l.id === lessonId)?.name || "English Training";
  return (
    <header className="flex flex-col items-center mb-6 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between w-full mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-[0_4px_0_0_#1e40af]">
            <i className="fas fa-bolt text-sm"></i>
          </div>
          <h1 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Learnendo</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1 text-orange-500 font-black text-sm">
             <i className="fas fa-fire"></i> {progress?.streakCount || 0}
           </div>
           <div className="flex items-center gap-1 text-blue-500 font-black text-sm">
             <i className="fas fa-star"></i> {progress?.totalPoints || 0}
           </div>
        </div>
      </div>
      <div className="w-full text-center">
        <p className="text-slate-600 font-bold text-sm tracking-tight">Lesson {lessonId}: {lessonName}</p>
      </div>
    </header>
  );
};

export const LearningPathView: React.FC<{ 
  progress: UserProgress; 
  onSelectModule: (type: PracticeModuleType) => void; 
  moduleNames: Record<string, string>;
}> = ({ progress, onSelectModule, moduleNames }) => {
  const [selectedMod, setSelectedMod] = useState<PracticeModuleType | null>(null);
  const lessonConfig = LESSON_CONFIGS[progress.currentLesson - 1] || LESSON_CONFIGS[0];
  const modules = lessonConfig.modules.map((type, idx) => ({
    type: type as PracticeModuleType,
    icon: MODULE_ICONS[type] || 'fa-graduation-cap',
    color: ['bg-amber-400', 'bg-orange-400', 'bg-rose-400', 'bg-emerald-400', 'bg-teal-400', 'bg-indigo-400', 'bg-purple-500'][idx],
    shadow: ['bg-amber-600', 'bg-orange-600', 'bg-rose-600', 'bg-emerald-600', 'bg-teal-600', 'bg-indigo-600', 'bg-purple-700'][idx]
  }));

  return (
    <div className="flex flex-col items-center py-10 relative">
      <div className="absolute top-0 bottom-0 w-2 bg-slate-200 rounded-full left-1/2 -translate-x-1/2 -z-10" />
      {modules.map((mod, idx) => {
        const isUnlocked = progress.unlockedModules.includes(mod.type);
        const isCompleted = progress.completedModules.includes(mod.type);
        const xPos = idx % 2 === 0 ? '-translate-x-12' : 'translate-x-12';
        
        return (
          <div key={mod.type} className={`mb-12 flex flex-col items-center ${xPos}`}>
            <div className="relative">
               <div className={`absolute top-2 w-20 h-20 rounded-full ${isUnlocked ? mod.shadow : 'bg-slate-300'} -z-10`} />
               <button 
                disabled={!isUnlocked}
                onClick={() => setSelectedMod(mod.type)}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl transition-all ${isUnlocked ? mod.color : 'bg-slate-200 text-slate-400'} shadow-[inset_0_-8px_0_rgba(0,0,0,0.15)] active:translate-y-1`}
              >
                {isUnlocked ? <i className={`fas ${mod.icon}`}></i> : <i className="fas fa-lock text-xl"></i>}
                {isCompleted && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-[10px] text-white">
                    <i className="fas fa-check"></i>
                  </div>
                )}
               </button>
            </div>
            <p className={`text-[10px] font-black uppercase mt-4 tracking-wider text-center max-w-[90px] leading-tight ${isUnlocked ? 'text-slate-800' : 'text-slate-300'}`}>
              {moduleNames[mod.type] || "Tracking"}
            </p>
          </div>
        );
      })}

      {selectedMod && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in slide-in-from-bottom-5">
            <h3 className="text-xl font-black text-slate-800 mb-4 uppercase tracking-tight">{moduleNames[selectedMod] || "Track Details"}</h3>
            <div className="space-y-3 mb-8">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Grammar Guide:</p>
              {(GRAMMAR_GUIDES[selectedMod] || ["Complete this track to master the concepts."])?.map((point, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <p className="text-xs font-bold text-slate-600 leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { onSelectModule(selectedMod); setSelectedMod(null); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[0_6px_0_0_#1e40af] active:translate-y-1">START TRACK</button>
              <button onClick={() => setSelectedMod(null)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PracticeSection: React.FC<{ item: PracticeItem; onResult: (correct: boolean, val: string) => void; currentIdx: number; totalItems: number; lessonId: number; }> = ({ item, onResult, currentIdx, totalItems, lessonId }) => {
  const [userInput, setUserInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<'none'|'correct'|'wrong'>('none');
  const [showFooter, setShowFooter] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [praiseText, setPraiseText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserInput('');
    setFeedback('none');
    setShowFooter(false);
    setShowHint(false);
    
    if (item.audioValue && item.type !== 'speaking') {
      speak(item.audioValue);
    }
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [item]);

  const speak = (text: string, rate = 1) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    window.speechSynthesis.speak(u);
  };

  const handleSTT = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Mic not supported");
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => { setUserInput(e.results[0][0].transcript); setIsListening(false); };
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  const handleCheck = (val?: string) => {
    const response = (val || userInput).trim().toLowerCase().replace(/[.,!?;:]/g, "");
    const cleanTarget = item.correctValue.toLowerCase().replace(/[.,!?;:]/g, "");
    
    // Check for Word-to-Digit or Digit-to-Word matches
    const isCorrect = (response === cleanTarget) || 
                      (NUMBER_MAP[response] === cleanTarget) || 
                      (NUMBER_MAP[cleanTarget] === response);
    
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setShowFooter(true);
    if (isCorrect) {
      new Audio(SUCCESS_SOUND).play().catch(()=>{});
      const p = ["Excellent!", "Great job!", "Perfect!", "Spot on!"][Math.floor(Math.random()*4)];
      setPraiseText(p);
      speak(p);
    } else {
      new Audio(ERR_SOUND).play().catch(()=>{});
      setPraiseText("Try again!");
      speak("Almost there!");
    }
  };

  const renderDisplay = () => {
    if (item.displayValue?.startsWith('fa-')) {
        const colorClass = COLOR_STYLE_MAP[item.correctValue] || 'text-blue-900';
        return (
            <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
               <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center border-4 border-slate-100 shadow-inner">
                  <i className={`fas ${item.displayValue} text-7xl ${colorClass}`}></i>
               </div>
            </div>
        );
    }
    return (
        <div className={`text-6xl font-black mb-2 select-none tracking-tighter text-center transition-colors duration-500 ${item.isNewVocab && !showFooter ? 'text-blue-500' : 'text-blue-900'}`}>
          {item.displayValue}
        </div>
    );
  };

  const translation = TRANSLATIONS[item.instruction];

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center outline-none">
      <div className="w-full max-sm:px-4 max-w-sm px-6 pt-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(currentIdx / totalItems) * 100}%` }} />
          </div>
        </div>
        <Header lessonId={lessonId} />
      </div>

      <div className="flex-1 w-full max-w-sm px-6 flex flex-col justify-center pb-40">
        <div className="relative group mb-8 cursor-help" onClick={() => setShowHint(!showHint)}>
          <h2 className="text-base font-black text-slate-800 text-center uppercase tracking-tight leading-relaxed transition-colors hover:text-blue-600">
            {item.instruction}
          </h2>
          {translation && showHint && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1 font-bold">
              {translation}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-4">
            {item.audioValue && (
               <button onClick={() => speak(item.audioValue)} className="w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-[0_6px_0_0_#1e40af] text-3xl active:translate-y-1 transition-all flex items-center justify-center">
                  <i className="fa-solid fa-volume-high"></i>
               </button>
            )}
            {item.audioValue && (
               <button onClick={() => speak(item.audioValue, 0.40)} className="w-16 h-16 bg-orange-400 text-white rounded-2xl shadow-[0_6px_0_0_#c2410c] text-4xl active:translate-y-1 transition-all flex items-center justify-center">
                  <i className="fa-solid fa-turtle text-white drop-shadow-md"></i>
               </button>
            )}
          </div>
          
          {item.displayValue && renderDisplay()}
          
          {(item.type === 'multiple-choice' || item.type === 'identification') && item.options ? (
             <div className="grid grid-cols-2 gap-3 w-full">
               {item.options.map((opt) => (
                 <button 
                  key={opt}
                  disabled={showFooter}
                  onClick={() => { setUserInput(opt); handleCheck(opt); }}
                  className={`p-6 border-2 rounded-2xl font-black uppercase text-lg transition-all flex flex-col items-center gap-2 ${userInput === opt ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-100 text-slate-800'}`}
                 >
                   {opt}
                 </button>
               ))}
             </div>
          ) : (
            <div className="w-full relative group">
              <input 
                ref={inputRef} 
                disabled={showFooter} 
                className={`w-full p-6 border-4 rounded-3xl text-center text-3xl font-black focus:border-blue-500 outline-none bg-white transition-all ${feedback === 'wrong' ? 'border-red-200 text-red-600' : 'border-slate-100 text-slate-800 shadow-sm'}`} 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)} 
                placeholder="..." 
              />
              {item.type === 'speaking' && !showFooter && (
                <button onClick={handleSTT} className={`absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-100 text-slate-400 hover:text-blue-500'}`}>
                  <i className="fas fa-microphone"></i>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 p-6 flex flex-col items-center border-t-4 transition-all ${feedback === 'correct' ? 'bg-green-100 border-green-200' : feedback === 'wrong' ? 'bg-red-100 border-red-200' : 'bg-white border-slate-100'}`}>
        <div className="w-full max-sm:max-w-xs max-w-sm">
          {showFooter ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <div className={`font-black uppercase text-lg tracking-widest animate-in slide-in-from-left-2 ${feedback === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                  {praiseText}
                </div>
                {feedback === 'wrong' && (
                  <div className="text-red-700 font-bold text-xs mt-1 animate-in fade-in">
                    Correct: <span className="font-black text-sm uppercase">{item.correctValue}</span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => onResult(feedback === 'correct', userInput)} 
                className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[0_6px_0_0_#1e40af] active:translate-y-1 transition-all shrink-0"
              >
                CONTINUE
              </button>
            </div>
          ) : (
            (item.type !== 'multiple-choice' && item.type !== 'identification') && (
              <button 
                disabled={!userInput.trim()}
                onClick={() => handleCheck()} 
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[0_6px_0_0_#1e40af] active:translate-y-1 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
              >
                CHECK
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export const ResultDashboard: React.FC<{ 
  score: number; 
  totalTime: number; 
  sentToTeacher?: boolean; 
  currentLesson: number;
  onWhatsApp?: () => void; 
  onNextLesson?: () => void;
  onRestart: () => void 
}> = ({ score, totalTime, sentToTeacher, currentLesson, onWhatsApp, onNextLesson, onRestart }) => {
  const handleWA = () => {
    const text = `Learnendo Mastery: Lesson ${currentLesson} complete with ${score.toFixed(1)}/10 in ${Math.round(totalTime)}s!`;
    window.open(`https://wa.me/5517991010930?text=${encodeURIComponent(text)}`, '_blank');
    onWhatsApp?.();
  };

  const isPerfect = score >= 10;

  return (
    <div className="p-10 text-center bg-white rounded-[3rem] shadow-2xl border-4 border-blue-50 animate-in zoom-in duration-300">
      <div className={`w-24 h-24 ${isPerfect ? 'bg-yellow-400' : 'bg-slate-200'} rounded-full flex items-center justify-center text-white text-5xl mx-auto mb-8 shadow-[0_8px_0_0_rgba(0,0,0,0.1)]`}><i className={`fas ${isPerfect ? 'fa-trophy' : 'fa-star-half-alt text-slate-400'}`}></i></div>
      <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tighter">{isPerfect ? 'Unit Mastered!' : 'Keep Practicing'}</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Mastery</p>
          <p className={`text-3xl font-black ${isPerfect ? 'text-blue-600' : 'text-orange-500'}`}>{score.toFixed(1)}/10</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Time</p>
          <p className="text-3xl font-black text-slate-800">{Math.round(totalTime)}s</p>
        </div>
      </div>
      
      {isPerfect && !sentToTeacher && (
        <button onClick={handleWA} className="w-full py-5 bg-green-500 text-white rounded-3xl font-black uppercase mb-4 shadow-[0_8px_0_0_#15803d] active:translate-y-1 transition-all">
          <i className="fab fa-whatsapp mr-2 text-xl"></i> Send to Teacher
        </button>
      )}

      {isPerfect && currentLesson < 12 && (
        <button onClick={onNextLesson} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase mb-4 shadow-[0_6px_0_0_#1e40af] active:translate-y-1 transition-all">
          Unlock Lesson {currentLesson + 1}
        </button>
      )}

      {!isPerfect && (
        <button onClick={onRestart} className="w-full py-5 bg-orange-500 text-white rounded-3xl font-black uppercase mb-4 shadow-[0_8px_0_0_#c2410c] active:translate-y-1 transition-all">
          Try Mastery Again
        </button>
      )}

      <button onClick={onRestart} className="w-full py-4 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase transition-all hover:bg-slate-200">
        Back to Path
      </button>
    </div>
  );
};

export const InfoSection: React.FC<{ onStart: (name: string, email: string) => void }> = ({ onStart }) => {
  const [name, setName] = useState('');
  return (
    <div className="text-center py-10 flex flex-col items-center animate-in fade-in zoom-in">
      <div className="w-36 h-36 mb-10 bg-white rounded-3xl p-1 border-4 border-blue-100 shadow-2xl overflow-hidden relative group">
        <img 
          src="https://img.freepik.com/free-vector/cyborg-face-concept_23-2148529452.jpg" 
          alt="Learnendo AI Tutor" 
          className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-blue-600/20 mix-blend-overlay"></div>
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Learnendo AI Tutor</h2>
      <div className="mb-12 space-y-1">
        <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Mastering Day by Day</p>
        <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em]">Workbook 1</p>
        <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest">A1 Proficiency</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if(name.trim()) onStart(name, ''); }} className="w-full max-w-[320px] space-y-4">
        <input 
          placeholder="What is your name?" 
          className="w-full p-5 border-4 border-slate-100 rounded-3xl bg-white font-black text-center text-xl focus:border-blue-500 outline-none transition-all shadow-sm" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <button className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xl shadow-[0_8px_0_0_#1e40af] active:translate-y-1 transition-all uppercase tracking-widest">
          LET'S START
        </button>
      </form>
    </div>
  );
};
