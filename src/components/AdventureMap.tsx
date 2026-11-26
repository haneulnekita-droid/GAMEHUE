import { motion } from 'motion/react';
import { Check, Lock, Sparkles, Trophy } from 'lucide-react';
import { HUELLA_STEPS } from '../types/adventure';
import { MascotDialogue } from './MascotCharacter';

interface AdventureMapProps {
  participantCode: string;
  completedSteps: number[];
  onSelectStep: (step: number) => void;
  onGoToGoal: () => void;
}

export function AdventureMap({
  participantCode,
  completedSteps,
  onSelectStep,
  onGoToGoal,
}: AdventureMapProps) {
  const completedCount = completedSteps.length;
  const allCompleted = completedCount === 7;
  const highestCompleted = completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
  const nextStep = Math.min(7, highestCompleted + 1);

  const mascotMessage = allCompleted
    ? '«¡Increíble! Completaste las 7 huellitas del camino. ¡Toca la meta final para recibir tu medalla y guardar tu aventura!»'
    : completedCount === 0
      ? `«¡Qué emoción, ${participantCode}! Toca la Huellita 1 para dar tu primer paso en este recorrido».`
      : `«¡Vas genial! Ya completaste ${completedCount} de 7 huellitas. Toca la Huellita ${nextStep} para seguir avanzando».`;

  const progressPercent = Math.round((completedCount / 7) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6">
      {/* Progress HUD Card */}
      <div className="bg-white/92 backdrop-blur-md border-2 border-violet-200 rounded-3xl p-5 sm:p-6 shadow-[0_12px_32px_rgba(124,90,180,0.1)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-violet-600">
              Participante: <span className="font-mono-tabular font-bold">{participantCode}</span> · Camino de 7 etapas
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#2e2344]">
              ¡Ya llevas {completedCount} de 7 huellitas!
            </h2>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono-tabular text-xl sm:text-2xl font-extrabold text-violet-700">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Colorful Progress Bar */}
        <div className="w-full h-5 rounded-full bg-violet-100 p-1 overflow-hidden border border-violet-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-fuchsia-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progressPercent, 4)}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>

        <MascotDialogue
          mood={allCompleted ? 'celebrating' : completedCount > 0 ? 'cheerful' : 'excited'}
          message={mascotMessage}
          size="sm"
        />
      </div>

      {/* Curved Trail Map of 7 Footprints */}
      <div className="relative bg-white/85 backdrop-blur-md border-2 border-sky-200 rounded-[2rem] p-5 sm:p-8 shadow-[0_18px_45px_rgba(56,189,248,0.12)] overflow-hidden">
        {/* Decorative floating clouds & stars */}
        <div className="pointer-events-none absolute top-4 left-6 text-2xl opacity-50 animate-sparkle" aria-hidden="true">
          ☁️
        </div>
        <div className="pointer-events-none absolute top-8 right-10 text-2xl opacity-60 animate-sparkle" aria-hidden="true">
          ✨
        </div>
        <div className="pointer-events-none absolute bottom-6 left-10 text-2xl opacity-50 animate-sparkle" aria-hidden="true">
          💛
        </div>

        <div className="relative z-10 flex flex-col items-center space-y-4 sm:space-y-5">
          {HUELLA_STEPS.map((item, idx) => {
            const isCompleted = completedSteps.includes(item.step);
            const isUnlocked = item.step === 1 || completedSteps.includes(item.step - 1) || isCompleted;
            const isCurrent = !isCompleted && isUnlocked;

            // Alternate horizontal offsets on larger screens for a winding curved trail
            const offsetClasses = [
              'sm:-translate-x-24',
              'sm:translate-x-12',
              'sm:translate-x-28',
              'sm:-translate-x-10',
              'sm:-translate-x-28',
              'sm:translate-x-14',
              'sm:translate-x-0',
            ][idx];

            return (
              <div key={item.step} className="w-full flex flex-col items-center">
                {/* Winding dotted paw connectors between nodes */}
                {idx > 0 && (
                  <div className="flex flex-col items-center gap-1.5 my-1 text-violet-300" aria-hidden="true">
                    <span className="text-xs leading-none">🐾</span>
                    <span className="text-xs leading-none opacity-75">🐾</span>
                  </div>
                )}

                <motion.button
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => isUnlocked && onSelectStep(item.step)}
                  whileHover={isUnlocked ? { scale: 1.02 } : undefined}
                  whileTap={isUnlocked ? { scale: 0.98 } : undefined}
                  className={`w-full max-w-md ${offsetClasses} relative flex items-center gap-4 p-4 sm:p-5 rounded-3xl border-2 text-left transition-all ${
                    isCompleted
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-teal-300 shadow-sm cursor-pointer'
                      : isCurrent
                        ? `bg-gradient-to-r ${item.colorBg} ${item.colorBorder} shadow-[0_10px_28px_rgba(139,92,246,0.22)] ring-4 ring-violet-200/70 cursor-pointer`
                        : 'bg-slate-50/80 border-slate-200 opacity-65 cursor-not-allowed'
                  }`}
                >
                  {/* Paw Circle Node */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 font-display font-extrabold text-lg shadow-sm ${
                      isCompleted
                        ? 'bg-teal-500 text-white'
                        : isCurrent
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-7 h-7" />
                    ) : !isUnlocked ? (
                      <Lock className="w-6 h-6" />
                    ) : (
                      <span>🐾 {item.step}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-violet-700">
                      Huella {item.step} · {isCompleted ? 'Completada' : isCurrent ? 'Disponible ahora' : 'Bloqueada'}
                    </p>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-[#2e2344] leading-snug">
                      {item.emoji} {item.title}
                    </h3>
                  </div>

                  {isCurrent && (
                    <span className="shrink-0 px-3 py-1.5 rounded-xl bg-white text-violet-700 font-bold text-xs shadow-sm whitespace-nowrap">
                      Jugar
                    </span>
                  )}
                  {isCompleted && (
                    <span className="shrink-0 px-3 py-1.5 rounded-xl bg-white/90 text-teal-700 font-bold text-xs shadow-sm whitespace-nowrap">
                      Revisar
                    </span>
                  )}
                </motion.button>
              </div>
            );
          })}

          {/* Connector to Finish Line */}
          <div className="flex flex-col items-center gap-1.5 my-1 text-amber-400" aria-hidden="true">
            <span className="text-xs leading-none">🐾</span>
            <span className="text-xs leading-none">✨</span>
          </div>

          {/* Finish Line Card */}
          <motion.button
            type="button"
            disabled={!allCompleted}
            onClick={() => allCompleted && onGoToGoal()}
            whileHover={allCompleted ? { scale: 1.03 } : undefined}
            whileTap={allCompleted ? { scale: 0.98 } : undefined}
            className={`w-full max-w-md p-5 sm:p-6 rounded-3xl border-2 flex items-center gap-4 text-left transition-all ${
              allCompleted
                ? 'bg-gradient-to-r from-amber-200 via-yellow-100 to-pink-200 border-amber-400 shadow-[0_14px_34px_rgba(245,158,11,0.3)] cursor-pointer'
                : 'bg-amber-50/50 border-amber-200/70 opacity-70 cursor-not-allowed'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                allCompleted ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-100 text-amber-500'
              }`}
            >
              <Trophy className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-800">
                Meta Final · {allCompleted ? '¡Desbloqueada!' : 'Completa las 7 huellitas'}
              </p>
              <h3 className="font-display text-xl font-extrabold text-[#2e2344]">
                🎉 ¡LO LOGRASTE!
              </h3>
            </div>
            {allCompleted && <Sparkles className="w-6 h-6 text-amber-600 shrink-0" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
