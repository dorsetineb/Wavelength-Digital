import React, { useState, useEffect, useCallback } from 'react';
import { GamePhase, ConceptCard } from './types';
import { generateConceptCards } from './services/geminiService';
import Dial from './components/Dial';
import { RefreshCcw } from 'lucide-react';

const CARD_THEMES = [
  { left: "bg-[#009CDF]", right: "bg-[#F1C6DA]" }, // Blue / Pink
  { left: "bg-[#F36B26]", right: "bg-[#F0F0F0]" }, // Orange / White
  { left: "bg-[#009B6B]", right: "bg-[#E8C5D9]" }, // Green / Pink
  { left: "bg-[#8286A2]", right: "bg-[#96D6E5]" }, // GreyBlue / LightBlue
  { left: "bg-[#009FE3]", right: "bg-[#B3DDE9]" }, // Cyan / LightCyan
  { left: "bg-[#EBBED5]", right: "bg-[#7AC1D9]" }, // Pink / Blue
];

const GameStatus = ({ phase, isSpinning, score, scoreMessage }: { phase: GamePhase, isSpinning: boolean, score: number | null, scoreMessage: string }) => {
    let content = null;

    if (phase === GamePhase.SETUP_TARGET && !isSpinning) {
        content = (
            <div className="flex flex-col text-teal-700">
                <span className="font-bold text-lg md:text-2xl">Psíquico</span>
                <span className="font-normal text-base md:text-xl">Toque para girar!</span>
            </div>
        );
    } else if (isSpinning) {
        content = (
            <div className="flex flex-col text-gray-600">
                <span className="font-bold text-lg md:text-2xl">Time</span>
                <span className="font-normal text-base md:text-xl">Sintonizando frequência...</span>
            </div>
        );
    } else if (phase === GamePhase.VIEW_TARGET) {
        content = (
            <div className="flex flex-col text-teal-700">
                <span className="font-bold text-lg md:text-2xl">Psíquico</span>
                <span className="font-normal text-base md:text-xl">Memorize! Toque para esconder.</span>
            </div>
        );
    } else if (phase === GamePhase.GUESSING) {
        content = (
            <div className="flex flex-col text-gray-600">
                <span className="font-bold text-lg md:text-2xl">Time</span>
                <span className="font-normal text-base md:text-xl">Ajustem o ponteiro. Toque para revelar.</span>
            </div>
        );
    } else if (phase === GamePhase.REVEAL) {
        content = (
            <div className="flex flex-col">
                <span className="font-bold text-lg md:text-2xl text-orange-600">{score} Pontos</span>
                <span className="font-normal text-base md:text-xl text-gray-500 leading-tight uppercase">{scoreMessage}</span>
                <span className="text-sm text-gray-400 mt-1">Toque para próxima carta</span>
            </div>
        );
    } else if (phase === GamePhase.LOADING_CARD) {
        content = <p className="text-gray-500 font-bold text-lg md:text-xl animate-pulse">Carregando...</p>;
    }

    return (
      <div className="absolute top-4 left-4 md:left-10 z-20 max-w-[85%] md:max-w-2xl text-left pointer-events-none select-none transition-all duration-300">
         {content}
      </div>
    );
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOADING_CARD);
  const [cards, setCards] = useState<ConceptCard[]>([]);
  const [currentCard, setCurrentCard] = useState<ConceptCard | null>(null);
  const [targetAngle, setTargetAngle] = useState<number | null>(null);
  const [guessAngle, setGuessAngle] = useState<number>(0); 
  const [score, setScore] = useState<number | null>(null);
  const [scoreMessage, setScoreMessage] = useState<string>("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(CARD_THEMES[0]);
  
  const [fadeConcepts, setFadeConcepts] = useState(false);

  // Initial Load & Auto Start
  useEffect(() => {
    const initGame = async () => {
      const newCards = await generateConceptCards();
      setCards(newCards);
      if (newCards.length > 0) {
        startRound(newCards);
      }
    };
    initGame();
  }, []);

  const pickRandomTheme = () => {
      const randomTheme = CARD_THEMES[Math.floor(Math.random() * CARD_THEMES.length)];
      setCurrentTheme(randomTheme);
  };

  const startRound = (availableCards: ConceptCard[]) => {
    setCurrentCard(null); // Ensure "Carregando" shows
    setFadeConcepts(false);
    setPhase(GamePhase.LOADING_CARD);
    
    setTimeout(() => {
        const card = availableCards[Math.floor(Math.random() * availableCards.length)];
        
        const newPool = [...availableCards];
        const index = newPool.indexOf(card);
        if (index > -1) {
            newPool.splice(index, 1);
            setCards(newPool);
        }

        setCurrentCard(card);
        pickRandomTheme();
        setPhase(GamePhase.SETUP_TARGET);
        setGuessAngle(0); 
        
        setTimeout(() => setFadeConcepts(true), 100);
    }, 500);
  };

  const startGame = () => {
    setPhase(GamePhase.LOADING_CARD);
    setCurrentCard(null); 
    setFadeConcepts(false);
    generateConceptCards().then(newCards => {
      setCards(newCards);
      startRound(newCards);
    });
  };

  const drawCard = useCallback(async () => {
    setPhase(GamePhase.LOADING_CARD);
    setCurrentCard(null); // Force loading state
    setTargetAngle(null);
    setGuessAngle(0); 
    setScore(null);
    setScoreMessage("");
    setIsSpinning(false);
    setFadeConcepts(false);

    let cardPool = cards;
    if (cardPool.length < 3) {
      generateConceptCards().then(newCards => setCards(prev => [...prev, ...newCards]));
    }
    
    if (cardPool.length === 0) {
       const newCards = await generateConceptCards();
       cardPool = newCards;
       setCards(newCards);
    }

    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * cardPool.length);
        const selected = cardPool[randomIndex];
        
        const newPool = [...cardPool];
        newPool.splice(randomIndex, 1);
        setCards(newPool);

        setCurrentCard(selected);
        pickRandomTheme();
        setPhase(GamePhase.SETUP_TARGET);
        
        setTimeout(() => setFadeConcepts(true), 100);
    }, 500);

  }, [cards]);

  const triggerSpin = () => {
    if (isSpinning) return;
    const randomAngle = Math.floor(Math.random() * 140) + 20;
    setTargetAngle(randomAngle);
    
    setIsSpinning(true);
    
    setTimeout(() => {
        setIsSpinning(false);
        setPhase(GamePhase.VIEW_TARGET);
    }, 3000); // 3s match duration in Dial
  };

  const hideTargetAndStartGuessing = () => {
    setPhase(GamePhase.GUESSING);
  };

  const revealResult = () => {
    if (targetAngle === null) return;
    setPhase(GamePhase.REVEAL);
    
    const diff = Math.abs(targetAngle - guessAngle);
    
    // Wedge sizes (approximate based on Dial logic):
    // 4 points: +/- 4 deg
    // 3 points: +/- 11 deg
    // 2 points: +/- 18 deg
    
    // Using slightly tighter logic to match visual exactness if needed, 
    // but these values match the visual widths in Dial.tsx
    if (diff <= 4) {
      setScore(4);
      setScoreMessage("TRANSMISSÃO DE PENSAMENTO!");
    } else if (diff <= 11) {
      setScore(3);
      setScoreMessage("SINTONIA FINA!");
    } else if (diff <= 18) {
      setScore(2);
      setScoreMessage("NA MESMA FREQUÊNCIA");
    } else {
      setScore(0);
      setScoreMessage("FORA DE SINTONIA...");
    }
  };

  const handleDialClick = () => {
    switch (phase) {
        case GamePhase.SETUP_TARGET:
            triggerSpin();
            break;
        case GamePhase.VIEW_TARGET:
            hideTargetAndStartGuessing();
            break;
        case GamePhase.GUESSING:
            revealResult();
            break;
        case GamePhase.REVEAL:
            drawCard();
            break;
        default:
            break;
    }
  };

  const handleGlobalClick = () => {
      // If spinning or loading, ignore clicks
      if (isSpinning || phase === GamePhase.LOADING_CARD) return;
      handleDialClick();
  };

  const handleRestartClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent global click from firing
      startGame();
  }

  const renderHeader = () => (
    <header className="absolute top-4 right-4 md:right-10 z-50">
      <button 
        onClick={handleRestartClick} 
        className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
      >
        <RefreshCcw size={20} /> <span className="text-sm md:text-base">Reiniciar</span>
      </button>
    </header>
  );

  return (
    <div 
        className="h-screen w-screen flex flex-col bg-white overflow-hidden text-gray-800 relative touch-none select-none font-sans"
        onClick={handleGlobalClick}
    >
      {renderHeader()}
      
      <GameStatus phase={phase} isSpinning={isSpinning} score={score} scoreMessage={scoreMessage} />

      {/* Main Content Area - Centered Vertically and Horizontally */}
      <main className="flex-1 flex flex-col items-center justify-center p-0 w-full relative">
        
        <div className="w-full flex flex-col items-center justify-center gap-4">
          
          {/* 
             Container for Dial and Card.
             Desktop: Fixed width matching max-w-4xl.
             Mobile: Full width, scaled to fit.
          */}
          <div className="w-full max-w-4xl px-2 flex flex-col items-center">
             
             {/* The Dial */}
             <div className="w-[85%] md:w-full">
                <Dial 
                    phase={phase} 
                    targetAngle={targetAngle} 
                    guessAngle={guessAngle} 
                    onAngleChange={setGuessAngle}
                    isSpinning={isSpinning}
                />
             </div>

             {/* Card Display */}
             {/* Increased top margin to separate disk from card */}
             <div className="w-full mt-4 md:mt-12 relative z-10">
                {/* Mobile: h-20, Desktop: h-32 */}
                <div className="rounded-lg relative overflow-hidden h-20 md:h-32 flex items-center justify-center w-full">
                    <div className="w-full h-full flex items-center justify-center">
                        {!currentCard ? (
                            <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-center animate-pulse border border-gray-200">
                                <span className="text-sm md:text-2xl font-bold text-gray-400">Carregando conceitos...</span>
                            </div>
                        ) : (
                            <div className={`w-full flex h-full transition-opacity duration-700 ${fadeConcepts ? 'opacity-100' : 'opacity-0'} rounded-lg overflow-hidden`}>
                                {/* Left Side */}
                                <div className={`flex-1 ${currentTheme.left} flex items-center justify-center px-2 md:px-4 text-center`}>
                                    <span className="text-sm sm:text-base md:text-3xl font-black text-black leading-tight block break-words uppercase">{currentCard.left}</span>
                                </div>
                                
                                {/* Right Side */}
                                <div className={`flex-1 ${currentTheme.right} flex items-center justify-center px-2 md:px-4 text-center`}>
                                    <span className="text-sm sm:text-base md:text-3xl font-black text-black leading-tight block break-words uppercase">{currentCard.right}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default App;