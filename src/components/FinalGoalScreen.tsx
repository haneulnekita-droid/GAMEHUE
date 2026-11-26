import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Send } from 'lucide-react';
import { submitAdventureToFirestore } from '../firebase/config';
import { soundEngine } from '../services/soundEngine';
import type { AdventureAnswers } from '../types/adventure';
import { MascotCharacter } from './MascotCharacter';

interface FinalGoalScreenProps {
  participantCode: string;
  answers: AdventureAnswers;
  onBackToMap: () => void;
  onResetAdventure: () => void;
}

const CELEBRATION_MESSAGE = `«¡¡¡LO LOGRASTE!!! 🐾🎉

Has completado todo el recorrido.

Recuerda que no necesitas hacer grandes cambios de un día para otro. Cada pequeño paso que das para cuidar de ti cuenta.

¡Sigue dejando huellitas positivas en tu vida!»`;

export function FinalGoalScreen({
  participantCode,
  answers,
  onBackToMap,
  onResetAdventure,
}: FinalGoalScreenProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    soundEngine.playVictoryFanfare();
    confetti({
      particleCount: 95,
      spread: 85,
      origin: { y: 0.6 },
      colors: ['#a78bfa', '#38bdf8', '#f472b6', '#facc15', '#2dd4bf'],
    });
  }, []);

  const handleSave = async () => {
    if (isSaving || savedId) return;
    setIsSaving(true);
    setErrorMsg('');
    try {
      const id = await submitAdventureToFirestore(participantCode, answers);
      setSavedId(id);
      soundEngine.playVictoryFanfare();
      confetti({
        particleCount: 110,
        spread: 95,
        origin: { y: 0.55 },
        colors: ['#34d399', '#38bdf8', '#f472b6', '#facc15', '#a78bfa'],
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(
        'No pudimos guardar tus respuestas en este momento. Verifica tu conexión a internet e intenta de nuevo.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="relative overflow-hidden rounded-[2.2rem] bg-white/95 border-2 border-amber-300 shadow-[0_24px_60px_rgba(245,158,11,0.18)] p-6 sm:p-10 space-y-8">
        {/* Decorative floating celebration icons */}
        <div className="pointer-events-none flex justify-between text-2xl sm:text-3xl opacity-75" aria-hidden="true">
          <span>🌟</span>
          <span>🐾</span>
          <span>🎉</span>
          <span>💖</span>
          <span>⭐</span>
        </div>

        {/* Mascot + Golden Medal Showcase */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10">
          <MascotCharacter mood="celebrating" size="lg" />

          <motion.div
            initial={{ scale: 0.85, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col items-center text-center"
          >
            <img
              src="/src/assets/images/victory_golden_medal_1795666216004.jpg"
              alt="Medalla dorada de logro"
              referrerPolicy="no-referrer"
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl object-cover border-4 border-amber-200 shadow-lg"
            />
            <p className="mt-2 text-xs font-bold text-amber-800">
              Medalla de Bienestar · {participantCode}
            </p>
          </motion.div>
        </div>

        {/* Celebration Speech Bubble */}
        <div className="bg-gradient-to-br from-amber-50 via-white to-pink-50 border-2 border-amber-200 rounded-3xl p-6 sm:p-7 text-center space-y-4">
          <p className="text-base sm:text-lg font-medium text-[#2e2344] leading-relaxed whitespace-pre-line">
            {CELEBRATION_MESSAGE}
          </p>
          <p className="font-display text-lg sm:text-xl font-extrabold text-violet-700 pt-2 border-t border-amber-200/80">
            «Cada estrategia que aplico deja una huella positiva en mi bienestar»
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-bold text-rose-700 text-center"
          >
            {errorMsg}
          </div>
        )}

        {/* Action or Saved Confirmation */}
        {!savedId ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onBackToMap}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white border-2 border-violet-200 hover:bg-violet-50 text-[#3c2d57] font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Revisar mis huellitas</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto min-h-[58px] px-9 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:via-teal-600 hover:to-sky-600 text-white font-display text-lg sm:text-xl font-extrabold shadow-[0_12px_30px_rgba(20,184,166,0.35)] inline-flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Guardando en la nube...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>ENVIAR MIS RESPUESTAS</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-emerald-50 border-2 border-emerald-300 p-6 text-center space-y-4"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-white shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-extrabold text-emerald-900">
              ¡Tus respuestas se guardaron correctamente! Gracias por compartir tu experiencia
            </h3>
            <p className="text-xs font-mono-tabular text-emerald-700">
              Registro guardado: {savedId}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onResetAdventure}
                className="px-6 py-3 rounded-2xl bg-white border-2 border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Iniciar nueva aventura</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
