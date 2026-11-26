import { useState } from 'react';
import { ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { AdventureMap } from './components/AdventureMap';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FacilitatorPanel } from './components/FacilitatorPanel';
import { FinalGoalScreen } from './components/FinalGoalScreen';
import { HuellaStage } from './components/HuellaStage';
import { WelcomeScreen } from './components/WelcomeScreen';
import { soundEngine } from './services/soundEngine';
import { EMPTY_ANSWERS, type AdventureAnswers, type ScreenView } from './types/adventure';

export default function App() {
  const [screen, setScreen] = useState<ScreenView>('welcome');
  const [participantCode, setParticipantCode] = useState('');
  const [answers, setAnswers] = useState<AdventureAnswers>(EMPTY_ANSWERS);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getMuted());

  const handleToggleSound = () => {
    const nextMuted = soundEngine.toggleSound();
    setIsMuted(nextMuted);
  };

  const handleStartAdventure = (code: string) => {
    setParticipantCode(code);
    soundEngine.playStartChime();
    setScreen('map');
  };

  const handleSelectStep = (step: number) => {
    setActiveStep(step);
    setScreen('stage');
  };

  const handleCompleteStep = (step: number) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
    if (step === 7) {
      setScreen('goal');
    } else {
      setScreen('map');
    }
  };

  const handleResetAdventure = () => {
    setParticipantCode('');
    setAnswers(EMPTY_ANSWERS);
    setCompletedSteps([]);
    setActiveStep(1);
    setScreen('welcome');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen pastel-adventure-bg flex flex-col">
        {/* Clean compact top bar (3-zone contract) */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-violet-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                if (screen === 'facilitator') {
                  setScreen(participantCode ? 'map' : 'welcome');
                }
              }}
              className="font-display text-base sm:text-lg font-extrabold text-[#2e2344] whitespace-nowrap shrink-0 cursor-pointer"
            >
              🐾 La Huella de mi Aprendizaje
            </button>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={handleToggleSound}
                aria-label={isMuted ? 'Activar música y sonidos' : 'Silenciar música y sonidos'}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-xs sm:text-sm font-bold text-violet-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isMuted ? 'Sonido: Apagado' : 'Sonido: Activo'}</span>
              </button>

              {screen !== 'facilitator' && (
                <button
                  type="button"
                  onClick={() => setScreen('facilitator')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-4 h-4 text-violet-600" />
                  <span>Facilitador</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Game / Panel Stage */}
        <main className="flex-1">
          {screen === 'welcome' && (
            <WelcomeScreen initialCode={participantCode} onStart={handleStartAdventure} />
          )}

          {screen === 'map' && (
            <AdventureMap
              participantCode={participantCode}
              completedSteps={completedSteps}
              onSelectStep={handleSelectStep}
              onGoToGoal={() => setScreen('goal')}
            />
          )}

          {screen === 'stage' && (
            <HuellaStage
              step={activeStep}
              answers={answers}
              onUpdateAnswers={setAnswers}
              onCompleteStep={handleCompleteStep}
              onBackToMap={() => setScreen('map')}
            />
          )}

          {screen === 'goal' && (
            <FinalGoalScreen
              participantCode={participantCode}
              answers={answers}
              onBackToMap={() => setScreen('map')}
              onResetAdventure={handleResetAdventure}
            />
          )}

          {screen === 'facilitator' && (
            <FacilitatorPanel
              onExitPanel={() => setScreen(participantCode ? 'map' : 'welcome')}
            />
          )}
        </main>

        <footer className="py-4 px-4 text-center text-xs text-slate-500">
          La Huella de mi Aprendizaje · «Cada pequeño paso deja una gran huella»
        </footer>
      </div>
    </ErrorBoundary>
  );
}
