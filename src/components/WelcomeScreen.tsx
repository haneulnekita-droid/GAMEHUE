import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, User } from 'lucide-react';
import { MascotCharacter } from './MascotCharacter';

interface WelcomeScreenProps {
  initialCode: string;
  onStart: (code: string) => void;
}

const WELCOME_MESSAGE = `«¡Holaaa! 🐾 ¡Qué alegría tenerte aquí!

Hoy vamos a recorrer un caminito de huellitas. Quiero saber si has puesto en práctica algunas de las cosas que aprendiste para sentirte mejor, organizar tu tiempo y manejar el estrés.

¡No te preocupes! No es un examen y no hay respuestas buenas ni malas. Solo quiero que me cuentes cómo te ha ido.

Responde con sinceridad, completa cada huellita y llega hasta la meta.

¿Listo/a para comenzar? ¡Vamos!»`;

export function WelcomeScreen({ initialCode, onStart }: WelcomeScreenProps) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim();
    if (!cleaned) {
      setError('Escribe tu nombre y apellido para empezar tu camino.');
      return;
    }
    if (cleaned.length > 100) {
      setError('Tu nombre y apellido pueden tener máximo 100 caracteres.');
      return;
    }
    setError('');
    onStart(cleaned);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="relative overflow-hidden rounded-[2rem] bg-white/88 backdrop-blur-md border-2 border-violet-200/80 shadow-[0_20px_50px_rgba(124,90,180,0.14)]">
        {/* Soft illustrated world header strip */}
        <div className="relative h-36 sm:h-44 w-full overflow-hidden">
          <img
            src="/src/assets/images/pastel_adventure_backdrop_1795666215398.jpg"
            alt="Paisaje pastel de la aventura"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/95" />
          <div className="absolute inset-x-0 bottom-3 text-center px-4">
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-[#2e2344] drop-shadow-sm text-balance">
              🐾 LA HUELLA DE MI APRENDIZAJE
            </h1>
            <p className="mt-1 text-sm sm:text-lg font-semibold text-violet-700">
              «Cada pequeño paso deja una gran huella»
            </p>
          </div>
        </div>

        {/* Main interactive welcome layout */}
        <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Mascot showcase column */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative flex flex-col items-center">
              <div className="animate-float-slow">
                <MascotCharacter mood="happy" size="lg" />
              </div>
              <div className="mt-3 flex items-center gap-3 bg-amber-50/90 border border-amber-200 rounded-2xl px-4 py-2 shadow-sm">
                <img
                  src="/src/assets/images/mascot_badge_welcome_1795666216254.jpg"
                  alt="Ilustración de Huellita"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-amber-200"
                />
                <div className="text-left">
                  <p className="text-xs font-bold text-amber-900">Tu guía: Huellita</p>
                  <p className="text-xs text-amber-700">7 etapas · Camino interactivo</p>
                </div>
              </div>
            </div>
          </div>

          {/* Speech bubble + Participant code entry */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-gradient-to-br from-violet-50/90 via-white to-sky-50/90 border-2 border-violet-200 rounded-3xl p-5 sm:p-6 shadow-sm"
            >
              <p className="text-[15px] sm:text-base text-[#2e2344] leading-relaxed whitespace-pre-line font-medium">
                {WELCOME_MESSAGE}
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="participant-code"
                  className="block text-sm font-bold text-[#3c2d57] mb-2"
                >
                  Escribe tu nombre y apellido para comenzar
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-violet-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="participant-code"
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Ejemplo: Camila Torres"
                    maxLength={100}
                    autoComplete="name"
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-2 border-violet-200 focus:border-violet-500 focus:outline-none text-base font-semibold text-[#2e2344] placeholder:text-slate-400 transition-colors"
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm font-semibold text-rose-600" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full min-h-[56px] px-7 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 hover:from-violet-700 hover:via-fuchsia-600 hover:to-pink-600 text-white font-display text-lg sm:text-xl font-bold shadow-[0_10px_25px_rgba(168,85,247,0.35)] active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>¡EMPEZAR AVENTURA!</span>
                <ArrowRight className="w-6 h-6" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
