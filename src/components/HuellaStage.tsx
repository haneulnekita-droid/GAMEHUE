import { useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import {
  HUELLA1_CARDS,
  HUELLA2_OPTIONS,
  HUELLA4_OPTIONS,
  HUELLA5_OPTIONS,
  HUELLA6_OPTIONS,
  HUELLA_STEPS,
  type AdventureAnswers,
  type FrequencyChoice,
  type Huella1Answers,
} from '../types/adventure';
import { MascotDialogue } from './MascotCharacter';
import { soundEngine } from '../services/soundEngine';

interface HuellaStageProps {
  step: number;
  answers: AdventureAnswers;
  onUpdateAnswers: (next: AdventureAnswers) => void;
  onCompleteStep: (step: number) => void;
  onBackToMap: () => void;
}

const FREQUENCY_BUTTONS: {
  value: FrequencyChoice;
  activeClass: string;
  idleClass: string;
}[] = [
  {
    value: 'SÍ',
    activeClass: 'bg-emerald-500 border-emerald-600 text-white shadow-md',
    idleClass: 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50',
  },
  {
    value: 'A VECES',
    activeClass: 'bg-amber-400 border-amber-500 text-[#2e2344] shadow-md',
    idleClass: 'bg-white border-amber-200 text-amber-900 hover:bg-amber-50',
  },
  {
    value: 'NO',
    activeClass: 'bg-rose-400 border-rose-500 text-white shadow-md',
    idleClass: 'bg-white border-rose-200 text-rose-800 hover:bg-rose-50',
  },
];

export function HuellaStage({
  step,
  answers,
  onUpdateAnswers,
  onCompleteStep,
  onBackToMap,
}: HuellaStageProps) {
  const [validationError, setValidationError] = useState('');
  const [justCelebrated, setJustCelebrated] = useState(false);

  const meta = HUELLA_STEPS[step - 1];

  const handleHuella1Select = (key: keyof Huella1Answers, val: FrequencyChoice) => {
    soundEngine.playSelectPop();
    setValidationError('');
    onUpdateAnswers({
      ...answers,
      huella1: {
        ...answers.huella1,
        [key]: val,
      },
    });
  };

  const handleHuella6Toggle = (value: string) => {
    soundEngine.playSelectPop();
    setValidationError('');
    const current = answers.huella6Improve;
    const exists = current.includes(value);
    const updated = exists ? current.filter((item) => item !== value) : [...current, value];
    onUpdateAnswers({
      ...answers,
      huella6Improve: updated,
    });
  };

  const validateStage = (): string | null => {
    if (step === 1) {
      const missing = HUELLA1_CARDS.some((c) => !answers.huella1[c.key]);
      if (missing) return 'Por favor responde SÍ, A VECES o NO en las cinco tarjetas.';
    }
    if (step === 2 && !answers.huella2Favorite) {
      return 'Elige una actividad para continuar.';
    }
    if (step === 3 && !answers.huella3Moment.trim()) {
      return 'Cuéntame brevemente ese momento antes de avanzar.';
    }
    if (step === 4) {
      if (!answers.huella4Feeling) return 'Selecciona una opción para saber cómo te sentiste.';
      if (answers.huella4Feeling === 'Otra cosa' && !answers.huella4Other.trim()) {
        return 'Escribe brevemente qué otra cosa notaste.';
      }
    }
    if (step === 5) {
      if (!answers.huella5Obstacle) return 'Selecciona una opción sobre lo que se te hizo difícil.';
      if (answers.huella5Obstacle === 'Otra dificultad' && !answers.huella5Other.trim()) {
        return 'Cuéntame cuál fue esa otra dificultad.';
      }
    }
    if (step === 6) {
      if (answers.huella6Improve.length === 0) {
        return 'Elige al menos una estrategia que quieras practicar más.';
      }
      if (answers.huella6Improve.includes('Otra') && !answers.huella6Other.trim()) {
        return 'Cuéntame qué otra estrategia te gustaría mejorar.';
      }
    }
    if (step === 7 && !answers.huella7Commitment.trim()) {
      return 'Escribe una idea o compromiso pequeño para seguir practicando.';
    }
    return null;
  };

  const handleFinishStage = () => {
    const err = validateStage();
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError('');
    setJustCelebrated(true);
    soundEngine.playStepComplete();
    confetti({
      particleCount: 55,
      spread: 65,
      origin: { y: 0.72 },
      colors: ['#a78bfa', '#38bdf8', '#f472b6', '#facc15', '#2dd4bf'],
    });

    window.setTimeout(() => {
      onCompleteStep(step);
    }, 650);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6">
      {/* Top stage header */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToMap}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 hover:bg-white border border-violet-200 text-sm font-bold text-[#3c2d57] shadow-sm transition-colors cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al mapa</span>
        </button>

        <span className="text-sm font-bold text-violet-700 font-mono-tabular whitespace-nowrap">
          Huella {step} de 7
        </span>
      </div>

      {/* Main Stage Card */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white/92 backdrop-blur-md border-2 border-violet-200 rounded-[2rem] p-5 sm:p-8 shadow-[0_18px_45px_rgba(124,90,180,0.12)] space-y-6"
      >
        <div className={`rounded-3xl bg-gradient-to-r ${meta.colorBg} border ${meta.colorBorder} p-5`}>
          <p className="text-xs font-bold text-violet-800">
            🐾 Huella {step} · Etapa interactiva
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#2e2344] mt-0.5">
            {meta.emoji} {meta.title}
          </h2>
        </div>

        <MascotDialogue
          mood={justCelebrated ? 'cheerful' : 'thinking'}
          message={justCelebrated ? '«¡Genial! ¡Has dejado una nueva huellita brillante!»' : meta.mascotMessage}
          size="sm"
        />

        {/* STAGE 1 */}
        {step === 1 && (
          <div className="space-y-4">
            {HUELLA1_CARDS.map((card, index) => {
              const selected = answers.huella1[card.key];
              return (
                <div
                  key={card.key}
                  className={`rounded-3xl border-2 p-4 sm:p-5 ${card.tint} transition-shadow`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <span className="text-3xl leading-none shrink-0" aria-hidden="true">
                        {card.emoji}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-500">Estrategia {index + 1} de 5</p>
                        <p className="text-base sm:text-lg font-bold text-[#2e2344] leading-snug">
                          {card.question}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5 shrink-0 md:w-72">
                      {FREQUENCY_BUTTONS.map((btn) => {
                        const isActive = selected === btn.value;
                        return (
                          <button
                            key={btn.value}
                            type="button"
                            onClick={() => handleHuella1Select(card.key, btn.value)}
                            className={`min-h-[48px] px-3 py-2.5 rounded-2xl border-2 font-display font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
                              isActive ? btn.activeClass : btn.idleClass
                            }`}
                          >
                            {btn.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STAGE 2 */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {HUELLA2_OPTIONS.map((opt) => {
              const isActive = answers.huella2Favorite === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    soundEngine.playSelectPop();
                    setValidationError('');
                    onUpdateAnswers({ ...answers, huella2Favorite: opt.value });
                  }}
                  className={`min-h-[82px] p-4 rounded-3xl border-2 text-left flex items-center gap-4 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500 to-violet-500 border-violet-600 text-white shadow-lg scale-[1.01]'
                      : 'bg-sky-50/60 border-sky-200 text-[#2e2344] hover:bg-sky-50'
                  }`}
                >
                  <span className="text-3xl shrink-0" aria-hidden="true">
                    {opt.emoji}
                  </span>
                  <span className="font-bold text-base leading-snug">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* STAGE 3 */}
        {step === 3 && (
          <div className="space-y-3">
            <label htmlFor="huella3-text" className="block text-lg font-bold text-[#2e2344]">
              ¿Recuerdas algún momento en el que utilizaste esa estrategia? ¿Qué estaba pasando?
            </label>
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
              «Por ejemplo: utilicé la respiración cuando estaba nervioso/a por un examen».
            </p>
            <textarea
              id="huella3-text"
              rows={4}
              maxLength={1200}
              value={answers.huella3Moment}
              onChange={(e) => {
                setValidationError('');
                onUpdateAnswers({ ...answers, huella3Moment: e.target.value });
              }}
              placeholder="Escribe aquí tu experiencia con total confianza..."
              className="w-full rounded-2xl p-4 bg-white border-2 border-amber-200 focus:border-amber-500 focus:outline-none text-base text-[#2e2344] leading-relaxed"
            />
            <p className="text-xs text-slate-500 text-right font-mono-tabular">
              {answers.huella3Moment.length}/1200
            </p>
          </div>
        )}

        {/* STAGE 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#2e2344]">
              ¿Qué pasó contigo después de utilizar esa estrategia?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HUELLA4_OPTIONS.map((opt) => {
                const isActive = answers.huella4Feeling === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      soundEngine.playSelectPop();
                      setValidationError('');
                      onUpdateAnswers({
                        ...answers,
                        huella4Feeling: opt.value,
                        huella4Other: opt.value === 'Otra cosa' ? answers.huella4Other : '',
                      });
                    }}
                    className={`min-h-[72px] p-4 rounded-3xl border-2 text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 border-pink-600 text-white shadow-lg'
                        : 'bg-pink-50/60 border-pink-200 text-[#2e2344] hover:bg-pink-50'
                    }`}
                  >
                    <span className="text-2xl shrink-0" aria-hidden="true">
                      {opt.emoji}
                    </span>
                    <span className="font-bold text-base">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {answers.huella4Feeling === 'Otra cosa' && (
              <div className="pt-2">
                <label htmlFor="huella4-other" className="block text-sm font-bold text-[#2e2344] mb-1.5">
                  Cuéntame qué otra cosa notaste:
                </label>
                <textarea
                  id="huella4-other"
                  rows={3}
                  maxLength={500}
                  value={answers.huella4Other}
                  onChange={(e) => {
                    setValidationError('');
                    onUpdateAnswers({ ...answers, huella4Other: e.target.value });
                  }}
                  placeholder="Escribe aquí lo que sentiste o notaste..."
                  className="w-full rounded-2xl p-3.5 bg-white border-2 border-pink-200 focus:border-pink-500 focus:outline-none text-base text-[#2e2344]"
                />
              </div>
            )}
          </div>
        )}

        {/* STAGE 5 */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#2e2344]">
              ¿Qué te ha impedido poner en práctica estas estrategias?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HUELLA5_OPTIONS.map((opt) => {
                const isActive = answers.huella5Obstacle === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      soundEngine.playSelectPop();
                      setValidationError('');
                      onUpdateAnswers({
                        ...answers,
                        huella5Obstacle: opt.value,
                        huella5Other: opt.value === 'Otra dificultad' ? answers.huella5Other : '',
                      });
                    }}
                    className={`min-h-[72px] p-4 rounded-3xl border-2 text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 border-teal-600 text-white shadow-lg'
                        : 'bg-teal-50/60 border-teal-200 text-[#2e2344] hover:bg-teal-50'
                    }`}
                  >
                    <span className="text-2xl shrink-0" aria-hidden="true">
                      {opt.emoji}
                    </span>
                    <span className="font-bold text-base">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {answers.huella5Obstacle === 'Otra dificultad' && (
              <div className="pt-2">
                <label htmlFor="huella5-other" className="block text-sm font-bold text-[#2e2344] mb-1.5">
                  Cuéntame cuál fue esa dificultad:
                </label>
                <textarea
                  id="huella5-other"
                  rows={3}
                  maxLength={500}
                  value={answers.huella5Other}
                  onChange={(e) => {
                    setValidationError('');
                    onUpdateAnswers({ ...answers, huella5Other: e.target.value });
                  }}
                  placeholder="Describe brevemente qué dificultó practicar..."
                  className="w-full rounded-2xl p-3.5 bg-white border-2 border-teal-200 focus:border-teal-500 focus:outline-none text-base text-[#2e2344]"
                />
              </div>
            )}
          </div>
        )}

        {/* STAGE 6 */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#2e2344]">
                ¿Qué estrategia te gustaría practicar más en tu vida diaria?
              </h3>
              <p className="text-sm text-indigo-700 mt-1">
                Puedes seleccionar una o varias opciones.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HUELLA6_OPTIONS.map((opt) => {
                const isSelected = answers.huella6Improve.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleHuella6Toggle(opt.value)}
                    className={`min-h-[72px] p-4 rounded-3xl border-2 text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500 border-indigo-600 text-white shadow-lg'
                        : 'bg-indigo-50/60 border-indigo-200 text-[#2e2344] hover:bg-indigo-50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl shrink-0" aria-hidden="true">
                        {opt.emoji}
                      </span>
                      <span className="font-bold text-base">{opt.label}</span>
                    </span>
                    <CheckCircle2
                      className={`w-6 h-6 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-200'}`}
                    />
                  </button>
                );
              })}
            </div>

            {answers.huella6Improve.includes('Otra') && (
              <div className="pt-2">
                <label htmlFor="huella6-other" className="block text-sm font-bold text-[#2e2344] mb-1.5">
                  ¿Qué otra estrategia te gustaría practicar?
                </label>
                <textarea
                  id="huella6-other"
                  rows={3}
                  maxLength={500}
                  value={answers.huella6Other}
                  onChange={(e) => {
                    setValidationError('');
                    onUpdateAnswers({ ...answers, huella6Other: e.target.value });
                  }}
                  placeholder="Escribe aquí tu idea..."
                  className="w-full rounded-2xl p-3.5 bg-white border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none text-base text-[#2e2344]"
                />
              </div>
            )}
          </div>
        )}

        {/* STAGE 7 */}
        {step === 7 && (
          <div className="space-y-3">
            <label htmlFor="huella7-text" className="block text-lg font-bold text-[#2e2344]">
              ¿Qué te ayudaría a no olvidar y seguir practicando estas estrategias?
            </label>
            <p className="text-sm text-orange-900 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-2.5">
              «Poner una alarma, organizar mis horarios, practicar con mis amigos o dedicar unos minutos al día».
            </p>
            <textarea
              id="huella7-text"
              rows={4}
              maxLength={1200}
              value={answers.huella7Commitment}
              onChange={(e) => {
                setValidationError('');
                onUpdateAnswers({ ...answers, huella7Commitment: e.target.value });
              }}
              placeholder="Escribe tu próximo compromiso contigo..."
              className="w-full rounded-2xl p-4 bg-white border-2 border-orange-200 focus:border-orange-500 focus:outline-none text-base text-[#2e2344] leading-relaxed"
            />
            <p className="text-xs text-slate-500 text-right font-mono-tabular">
              {answers.huella7Commitment.length}/1200
            </p>
          </div>
        )}

        {validationError && (
          <div
            role="alert"
            className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700"
          >
            {validationError}
          </div>
        )}

        {/* Complete Step CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleFinishStage}
            disabled={justCelebrated}
            className="w-full sm:w-auto min-h-[54px] px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-display text-lg font-bold shadow-[0_10px_25px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-70"
          >
            <Sparkles className="w-5 h-5" />
            <span>{step === 7 ? '¡Completar última huellita!' : '¡Completar Huellita!'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
