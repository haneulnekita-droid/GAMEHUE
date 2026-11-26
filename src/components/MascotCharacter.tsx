import { motion } from 'motion/react';
import type { MascotMood } from '../types/adventure';

interface MascotCharacterProps {
  mood: MascotMood;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MascotCharacter({ mood, size = 'md', className = '' }: MascotCharacterProps) {
  const sizeClass =
    size === 'sm' ? 'w-24 h-24 sm:w-28 sm:h-28' : size === 'lg' ? 'w-40 h-40 sm:w-48 sm:h-48' : 'w-32 h-32 sm:w-36 sm:h-36';

  const bounceAnimation =
    mood === 'celebrating'
      ? { y: [0, -16, 0, -10, 0], rotate: [0, -4, 4, -2, 0] }
      : mood === 'cheerful'
        ? { y: [0, -10, 0], scale: [1, 1.04, 1] }
        : mood === 'excited'
          ? { y: [0, -6, 0], rotate: [0, 2, -2, 0] }
          : mood === 'thinking'
            ? { y: [0, -3, 0], rotate: [-2, 1, -2] }
            : { y: [0, -5, 0] };

  const bounceTransition =
    mood === 'celebrating'
      ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' as const }
      : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center select-none ${sizeClass} ${className}`}
      animate={bounceAnimation}
      transition={bounceTransition}
      aria-label="Huellita, tu mascota guía"
    >
      {/* Decorative mood sparkles */}
      {(mood === 'celebrating' || mood === 'cheerful' || mood === 'excited') && (
        <>
          <motion.span
            className="absolute -top-2 -left-1 text-xl pointer-events-none"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            aria-hidden="true"
          >
            ✨
          </motion.span>
          <motion.span
            className="absolute -top-1 -right-2 text-lg pointer-events-none"
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.1, repeat: Infinity, delay: 0.4 }}
            aria-hidden="true"
          >
            ⭐
          </motion.span>
        </>
      )}

      {mood === 'thinking' && (
        <motion.div
          className="absolute -top-2 -right-2 bg-white border-2 border-violet-200 rounded-2xl px-2 py-0.5 text-sm shadow-sm pointer-events-none"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          aria-hidden="true"
        >
          💭
        </motion.div>
      )}

      <svg
        viewBox="0 0 220 220"
        className="w-full h-full drop-shadow-[0_10px_18px_rgba(124,90,180,0.2)]"
        role="img"
        aria-label="Mascota Huellita"
      >
        {/* Ground shadow */}
        <ellipse cx="110" cy="204" rx="54" ry="10" fill="#d8c8f4" opacity="0.55" />

        {/* Wagging tail */}
        <motion.path
          d="M166 154 C190 144, 198 122, 184 114 C174 108, 166 126, 158 140 Z"
          fill="#c4b5fd"
          stroke="#5c477c"
          strokeWidth="4.5"
          strokeLinejoin="round"
          style={{ transformOrigin: '162px 148px' }}
          animate={{ rotate: mood === 'celebrating' || mood === 'excited' ? [-14, 18, -14] : [-6, 8, -6] }}
          transition={{ duration: mood === 'celebrating' ? 0.5 : 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Paw-shaped body silhouette */}
        {/* Outer left & right toe bumps + top two toe bumps */}
        <circle cx="46" cy="96" r="28" fill="#fff8eb" stroke="#5c477c" strokeWidth="5" />
        <circle cx="174" cy="96" r="28" fill="#fff8eb" stroke="#5c477c" strokeWidth="5" />
        <circle cx="80" cy="54" r="29" fill="#fff8eb" stroke="#5c477c" strokeWidth="5" />
        <circle cx="140" cy="54" r="29" fill="#fff8eb" stroke="#5c477c" strokeWidth="5" />

        {/* Main central plump body */}
        <path
          d="M44 128 C44 82, 74 58, 110 58 C146 58, 176 82, 176 128 C176 172, 148 194, 110 194 C72 194, 44 172, 44 128 Z"
          fill="#fff8eb"
          stroke="#5c477c"
          strokeWidth="5"
        />

        {/* Inner soft cream fill to merge paw toes seamlessly */}
        <circle cx="48" cy="96" r="24" fill="#fff8eb" />
        <circle cx="172" cy="96" r="24" fill="#fff8eb" />
        <circle cx="80" cy="56" r="25" fill="#fff8eb" />
        <circle cx="140" cy="56" r="25" fill="#fff8eb" />

        {/* Pastel lilac paw pads on toes (cute ear-like pads!) */}
        <ellipse cx="44" cy="94" rx="13" ry="16" transform="rotate(-18 44 94)" fill="#d8b4fe" />
        <ellipse cx="176" cy="94" rx="13" ry="16" transform="rotate(18 176 94)" fill="#d8b4fe" />
        <ellipse cx="79" cy="52" rx="14" ry="17" transform="rotate(-8 79 52)" fill="#d8b4fe" />
        <ellipse cx="141" cy="52" rx="14" ry="17" transform="rotate(8 141 52)" fill="#d8b4fe" />

        {/* Subtle eye patch */}
        <circle cx="137" cy="112" r="20" fill="#e9d5ff" opacity="0.7" />

        {/* Cute belly paw-pad patch */}
        <path
          d="M78 164 C84 150, 98 152, 110 156 C122 152, 136 150, 142 164 C146 175, 132 184, 110 184 C88 184, 74 175, 78 164 Z"
          fill="#ddd6fe"
        />

        {/* Little turquoise heart badge on chest */}
        <path
          d="M110 174 C110 174, 100 167, 100 161 C100 157.5, 103 155, 106 155 C108 155, 109.5 156.2, 110 157.5 C110.5 156.2, 112 155, 114 155 C117 155, 120 157.5, 120 161 C120 167, 110 174, 110 174 Z"
          fill="#5eead4"
        />

        {/* Rosy cheeks */}
        <ellipse cx="68" cy="128" rx="12" ry="7.5" fill="#fda4af" opacity="0.75" />
        <ellipse cx="152" cy="128" rx="12" ry="7.5" fill="#fda4af" opacity="0.75" />

        {/* Eyes based on mood */}
        {mood === 'cheerful' || mood === 'celebrating' ? (
          <>
            {/* Happy smiling arc eyes */}
            <path d="M71 114 Q83 100 95 114" fill="none" stroke="#453263" strokeWidth="5.5" strokeLinecap="round" />
            <path d="M125 114 Q137 100 149 114" fill="none" stroke="#453263" strokeWidth="5.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Big sparkling puppy eyes */}
            <circle cx="83" cy="112" r="13.5" fill="#453263" />
            <circle cx="137" cy="112" r="13.5" fill="#453263" />
            <circle cx="78" cy="107" r="4.8" fill="#ffffff" />
            <circle cx="132" cy="107" r="4.8" fill="#ffffff" />
            <circle cx="87" cy="117" r="2.3" fill="#fde047" />
            <circle cx="141" cy="117" r="2.3" fill="#fde047" />
          </>
        )}

        {/* Eyebrows */}
        {mood === 'thinking' ? (
          <>
            <path d="M72 93 Q83 89 92 94" fill="none" stroke="#5c477c" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M128 89 Q138 83 148 90" fill="none" stroke="#5c477c" strokeWidth="3.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M73 92 Q83 87 92 92" fill="none" stroke="#5c477c" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M128 92 Q137 87 147 92" fill="none" stroke="#5c477c" strokeWidth="3.5" strokeLinecap="round" />
          </>
        )}

        {/* Cute nose */}
        <ellipse cx="110" cy="123" rx="7" ry="5" fill="#f472b6" />
        <ellipse cx="108" cy="121.5" rx="2.5" ry="1.5" fill="#fbcfe8" />

        {/* Mouth expression */}
        {mood === 'thinking' ? (
          <path d="M104 134 Q110 132 117 136" fill="none" stroke="#5c477c" strokeWidth="3.8" strokeLinecap="round" />
        ) : (
          <>
            <path
              d="M97 130 Q103.5 137 110 130 Q116.5 137 123 130"
              fill="none"
              stroke="#5c477c"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            {(mood === 'excited' || mood === 'cheerful' || mood === 'celebrating') && (
              <path d="M103 133 C103 143, 117 143, 117 133 Z" fill="#fb7185" />
            )}
          </>
        )}

        {/* Little front paws */}
        <motion.g
          animate={
            mood === 'celebrating'
              ? { y: [0, -8, 0] }
              : mood === 'thinking'
                ? { y: [0, -2, 0] }
                : { y: [0, 0, 0] }
          }
          transition={{ duration: 0.7, repeat: Infinity }}
        >
          <ellipse cx="77" cy="153" rx="11" ry="8" transform="rotate(24 77 153)" fill="#fff8eb" stroke="#5c477c" strokeWidth="4" />
          <ellipse cx="143" cy="153" rx="11" ry="8" transform="rotate(-24 143 153)" fill="#fff8eb" stroke="#5c477c" strokeWidth="4" />
        </motion.g>

        {/* Feet */}
        <ellipse cx="86" cy="193" rx="13" ry="8.5" fill="#fff8eb" stroke="#5c477c" strokeWidth="4" />
        <ellipse cx="134" cy="193" rx="13" ry="8.5" fill="#fff8eb" stroke="#5c477c" strokeWidth="4" />
      </svg>
    </motion.div>
  );
}

interface MascotDialogueProps {
  mood: MascotMood;
  message: string;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

export function MascotDialogue({ mood, message, size = 'md', children }: MascotDialogueProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-5">
      <div className="shrink-0">
        <MascotCharacter mood={mood} size={size} />
      </div>
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="relative flex-1 bg-white/95 border-2 border-violet-200 rounded-3xl px-5 py-4 shadow-[0_8px_24px_rgba(124,90,180,0.1)]"
      >
        <p className="text-[15px] sm:text-base font-medium text-[#2e2344] leading-relaxed whitespace-pre-line">
          {message}
        </p>
        {children}
      </motion.div>
    </div>
  );
}
