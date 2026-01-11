import React, { useState, useEffect, useCallback } from 'react';
import { Domain, GameState, Question, Stats } from './types';
import { questions } from './questions';

const TIMER_START = 20 * 60; // 20 minutes

const shuffle = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.SETUP);
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [deck, setDeck] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Quiz specific state
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  const [timer, setTimer] = useState(TIMER_START);
  const [isActive, setIsActive] = useState(false);
  
  const [stats, setStats] = useState<Stats>({
    correct: 0,
    wrong: 0,
    requeued: 0,
    totalAnswered: 0
  });

  // Generate options (1 correct + 3 distractors)
  const generateOptions = useCallback((currentQ: Question, allQuestions: Question[]) => {
    // 1. Get potential distractors (same domain, not current question)
    // If mixed domain, we prefer distractors from same domain, but fallback to any if needed
    let pool = allQuestions.filter(q => q.id !== currentQ.id);
    
    // Prefer same domain for better distractors
    const sameDomainPool = pool.filter(q => q.domain === currentQ.domain);
    if (sameDomainPool.length >= 3) {
      pool = sameDomainPool;
    }

    // 2. Get unique answers to avoid duplicate options
    const uniqueAnswers = Array.from(new Set(pool.map(q => q.a)));
    
    // 3. Shuffle and pick 3
    const distractors = shuffle(uniqueAnswers).slice(0, 3);
    
    // 4. Combine and shuffle
    return shuffle([...distractors, currentQ.a]);
  }, []);

  // Initialize Quiz
  const startGame = useCallback(() => {
    let filtered = questions;
    if (selectedDomain !== 'ALL') {
      filtered = questions.filter(q => q.domain === selectedDomain);
    }
    const shuffledDeck = shuffle(filtered);
    setDeck(shuffledDeck);
    setCurrentIndex(0);
    setGameState(GameState.PLAYING);
    setTimer(TIMER_START);
    setStats({ correct: 0, wrong: 0, requeued: 0, totalAnswered: 0 });
    setIsActive(true); // Start timer immediately
    
    // Setup first card options
    if (shuffledDeck.length > 0) {
      setCurrentOptions(generateOptions(shuffledDeck[0], questions));
      setIsAnswered(false);
      setSelectedOption(null);
    }
  }, [selectedDomain, generateOptions]);

  const handleExit = () => {
    setIsActive(false);
    setGameState(GameState.SETUP);
  };

  // Timer logic
  useEffect(() => {
    let interval: number | undefined;
    if (isActive && timer > 0) {
      interval = window.setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    } else if (timer === 0 && gameState === GameState.PLAYING) {
      setIsActive(false);
      setGameState(GameState.SUMMARY);
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(() => {});
    }
    return () => clearInterval(interval);
  }, [isActive, timer, gameState]);

  const handleOptionClick = (option: string) => {
    if (isAnswered) return;

    const currentCard = deck[currentIndex];
    const isCorrect = option === currentCard.a;
    
    setSelectedOption(option);
    setIsAnswered(true);

    setStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (!isCorrect ? 1 : 0),
      requeued: prev.requeued + (!isCorrect ? 1 : 0),
      totalAnswered: prev.totalAnswered + 1
    }));

    if (!isCorrect) {
      // Re-queue at end logic
      setDeck(prev => [...prev, currentCard]);
    }
  };

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      // Generate new options for the next card
      setCurrentOptions(generateOptions(deck[nextIndex], questions));
      setIsAnswered(false);
      setSelectedOption(null);
    } else {
      setIsActive(false);
      setGameState(GameState.SUMMARY);
    }
  };

  const currentCard = deck[currentIndex];

  const accuracy = stats.totalAnswered > 0 
    ? Math.round((stats.correct / stats.totalAnswered) * 100) 
    : 0;

  // Helper for button styling
  const getOptionStyle = (option: string) => {
    const base = "w-full p-4 text-left border text-sm md:text-base transition-all duration-200 ";
    
    if (!isAnswered) {
      return base + "border-gray-700 hover:border-white hover:bg-gray-900";
    }

    if (option === currentCard.a) {
      return base + "border-green-500 text-green-500 bg-green-900/10 font-bold";
    }

    if (option === selectedOption && option !== currentCard.a) {
      return base + "border-red-500 text-red-500 bg-red-900/10 line-through decoration-1";
    }

    return base + "border-gray-800 text-gray-600 opacity-50";
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center p-4">
      {/* HEADER / TIMER */}
      <div className="w-full max-w-2xl border-b border-gray-800 pb-4 mb-6 flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tighter">DCAUTO Quiz</h1>
            {gameState === GameState.PLAYING && (
               <button 
                 onClick={handleExit}
                 className="text-xs text-red-500 border border-red-900 px-2 py-1 hover:bg-red-900/20"
               >
                 [ EXIT ]
               </button>
            )}
          </div>
          <div className="text-xs text-gray-500">v1.2 Multiple Choice</div>
        </div>
        <div className={`text-3xl font-bold ${timer < 60 ? 'text-red-500' : 'text-white'}`}>
          {formatTime(timer)}
        </div>
      </div>

      {/* SETUP PHASE */}
      {gameState === GameState.SETUP && (
        <div className="w-full max-w-md space-y-8 mt-12">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Select Domain</label>
            <select 
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-none focus:outline-none focus:border-gray-500"
            >
              <option value="ALL">ALL DOMAINS (Mixed)</option>
              {Object.values(Domain).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={startGame}
            className="w-full bg-white text-black font-bold py-4 hover:bg-gray-200 transition-colors"
          >
            START QUIZ
          </button>
          <div className="text-xs text-gray-600 text-center">
             4 Options | Instant Feedback | Adaptive Queue
          </div>
        </div>
      )}

      {/* PLAYING PHASE */}
      {gameState === GameState.PLAYING && currentCard && (
        <div className="w-full max-w-2xl flex-1 flex flex-col">
          {/* STATS BAR */}
          <div className="flex justify-between text-xs text-gray-500 mb-4 font-mono uppercase">
            <span>Card {currentIndex + 1} / {deck.length}</span>
            <span className="text-green-500">Correct: {stats.correct}</span>
            <span className="text-red-500">Wrong: {stats.wrong}</span>
          </div>

          {/* QUESTION */}
          <div className="mb-6 p-4 border-l-2 border-gray-700 bg-gray-900/30">
             <div className="text-xs text-gray-500 mb-2">{currentCard.domain.split(' ')[0]}</div>
             <div className="text-lg md:text-xl font-medium leading-relaxed">
               {currentCard.q}
             </div>
          </div>

          {/* OPTIONS GRID */}
          <div className="flex-1 space-y-3">
            {currentOptions.map((opt, idx) => (
              <button
                key={`${currentCard.id}-opt-${idx}`}
                disabled={isAnswered}
                onClick={() => handleOptionClick(opt)}
                className={getOptionStyle(opt)}
              >
                <div className="flex gap-3">
                  <span className="opacity-50 select-none">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span>{opt}</span>
                </div>
              </button>
            ))}
          </div>

          {/* FOOTER ACTION */}
          <div className="h-20 mt-6 flex items-center justify-center">
            {isAnswered && (
               <button 
                 onClick={handleNext}
                 className="w-full bg-white text-black font-bold py-3 hover:bg-gray-200"
               >
                 {currentIndex < deck.length - 1 ? "NEXT QUESTION" : "FINISH EXAM"}
               </button>
            )}
            {!isAnswered && (
              <div className="text-xs text-gray-600">Select an option to continue</div>
            )}
          </div>
        </div>
      )}

      {/* SUMMARY PHASE */}
      {gameState === GameState.SUMMARY && (
        <div className="w-full max-w-md mt-12 border border-gray-800 p-8 bg-gray-900/50">
          <h2 className="text-2xl font-bold mb-6 text-center">QUIZ COMPLETE</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">Accuracy</span>
              <span className={`text-xl font-bold ${accuracy >= 80 ? 'text-green-500' : 'text-white'}`}>{accuracy}%</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">Total Questions</span>
              <span>{stats.totalAnswered}</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">Correct</span>
              <span className="text-green-500">{stats.correct}</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">Mistakes (Re-queued)</span>
              <span className="text-red-500">{stats.wrong}</span>
            </div>
          </div>

          <button 
            onClick={() => setGameState(GameState.SETUP)}
            className="w-full border border-white text-white py-3 hover:bg-white hover:text-black transition-colors"
          >
            NEW QUIZ
          </button>
        </div>
      )}
    </div>
  );
}