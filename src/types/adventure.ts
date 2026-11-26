export type FrequencyChoice = 'SÍ' | 'A VECES' | 'NO';

export type MascotMood = 'happy' | 'excited' | 'thinking' | 'cheerful' | 'celebrating';

export type ScreenView = 'welcome' | 'map' | 'stage' | 'goal' | 'facilitator';

export interface Huella1Answers {
  habitTracker: FrequencyChoice | '';
  breathing: FrequencyChoice | '';
  dancing: FrequencyChoice | '';
  mindfulness: FrequencyChoice | '';
  stressAwareness: FrequencyChoice | '';
}

export interface AdventureAnswers {
  huella1: Huella1Answers;
  huella2Favorite: string;
  huella3Moment: string;
  huella4Feeling: string;
  huella4Other: string;
  huella5Obstacle: string;
  huella5Other: string;
  huella6Improve: string[];
  huella6Other: string;
  huella7Commitment: string;
}

export interface SubmissionRecord {
  id: string;
  participantCode: string;
  dateKey: string;
  createdAtIso: string;
  huella1HabitTracker: FrequencyChoice;
  huella1Breathing: FrequencyChoice;
  huella1Dancing: FrequencyChoice;
  huella1Mindfulness: FrequencyChoice;
  huella1StressAwareness: FrequencyChoice;
  huella2Favorite: string;
  huella3Moment: string;
  huella4Feeling: string;
  huella4Other: string;
  huella5Obstacle: string;
  huella5Other: string;
  huella6Improve: string[];
  huella6Other: string;
  huella7Commitment: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface SpreadsheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  updatedAtIso?: string;
}

export interface HuellaStepMeta {
  step: number;
  shortTitle: string;
  title: string;
  mascotMessage: string;
  colorBg: string;
  colorBorder: string;
  colorAccent: string;
  emoji: string;
}

export const EMPTY_ANSWERS: AdventureAnswers = {
  huella1: {
    habitTracker: '',
    breathing: '',
    dancing: '',
    mindfulness: '',
    stressAwareness: '',
  },
  huella2Favorite: '',
  huella3Moment: '',
  huella4Feeling: '',
  huella4Other: '',
  huella5Obstacle: '',
  huella5Other: '',
  huella6Improve: [],
  huella6Other: '',
  huella7Commitment: '',
};

export const HUELLA_STEPS: HuellaStepMeta[] = [
  {
    step: 1,
    shortTitle: '¿Qué puse en práctica?',
    title: '¿Qué he puesto en práctica?',
    mascotMessage:
      '«¡Vamos a recordar! Desde que participaste en la capacitación, ¿has utilizado alguna de estas estrategias?»',
    colorBg: 'from-violet-100 to-fuchsia-100',
    colorBorder: 'border-violet-300',
    colorAccent: '#8b5cf6',
    emoji: '🌟',
  },
  {
    step: 2,
    shortTitle: 'Mi estrategia favorita',
    title: 'Mi estrategia favorita',
    mascotMessage:
      '«¡Ahora cuéntame! ¿Cuál de estas actividades has utilizado más veces?»',
    colorBg: 'from-sky-100 to-cyan-100',
    colorBorder: 'border-sky-300',
    colorAccent: '#0ea5e9',
    emoji: '💙',
  },
  {
    step: 3,
    shortTitle: '¿Cuándo la utilicé?',
    title: '¿Cuándo la utilicé?',
    mascotMessage:
      '«¡Qué interesante! Ahora quiero saber cuándo utilizaste esa estrategia».',
    colorBg: 'from-amber-100 to-yellow-100',
    colorBorder: 'border-amber-300',
    colorAccent: '#f59e0b',
    emoji: '🌤️',
  },
  {
    step: 4,
    shortTitle: '¿Cómo me sentí?',
    title: '¿Cómo me sentí?',
    mascotMessage:
      '«¡Muy bien! Y después de utilizarla, ¿notaste algún cambio?»',
    colorBg: 'from-pink-100 to-rose-100',
    colorBorder: 'border-pink-300',
    colorAccent: '#ec4899',
    emoji: '💖',
  },
  {
    step: 5,
    shortTitle: 'Obstáculos del camino',
    title: 'Los obstáculos del camino',
    mascotMessage:
      '«A veces no es fácil mantener una nueva costumbre. ¡Cuéntame qué se te hizo difícil!»',
    colorBg: 'from-teal-100 to-emerald-100',
    colorBorder: 'border-teal-300',
    colorAccent: '#14b8a6',
    emoji: '🧩',
  },
  {
    step: 6,
    shortTitle: 'Lo que quiero mejorar',
    title: 'Lo que quiero mejorar',
    mascotMessage:
      '«¡Ya casi llegamos! Todos tenemos algo que podemos mejorar».',
    colorBg: 'from-indigo-100 to-purple-100',
    colorBorder: 'border-indigo-300',
    colorAccent: '#6366f1',
    emoji: '🚀',
  },
  {
    step: 7,
    shortTitle: 'Mi próximo compromiso',
    title: 'Mi próximo compromiso',
    mascotMessage:
      '«¡Esta es la última huellita! Pensemos qué te ayudaría a seguir practicando lo aprendido».',
    colorBg: 'from-yellow-100 to-pink-100',
    colorBorder: 'border-amber-300',
    colorAccent: '#f97316',
    emoji: '🏆',
  },
];

export const HUELLA1_CARDS: {
  key: keyof Huella1Answers;
  question: string;
  emoji: string;
  tint: string;
}[] = [
  {
    key: 'habitTracker',
    question: '¿Has organizado tus tareas usando un horario o Habit Tracker?',
    emoji: '📅',
    tint: 'bg-violet-50 border-violet-200',
  },
  {
    key: 'breathing',
    question: '¿Has hecho ejercicios de respiración para tranquilizarte?',
    emoji: '🌬️',
    tint: 'bg-sky-50 border-sky-200',
  },
  {
    key: 'dancing',
    question: '¿Has bailado o movido tu cuerpo para sentirte mejor?',
    emoji: '💃',
    tint: 'bg-pink-50 border-pink-200',
  },
  {
    key: 'mindfulness',
    question: '¿Has practicado mindfulness, es decir, prestar atención al momento presente?',
    emoji: '🧘',
    tint: 'bg-teal-50 border-teal-200',
  },
  {
    key: 'stressAwareness',
    question: '¿Has reconocido qué situaciones o cosas te producen estrés?',
    emoji: '❤️',
    tint: 'bg-amber-50 border-amber-200',
  },
];

export const HUELLA2_OPTIONS = [
  { value: 'Organizar mi tiempo y mis tareas', label: 'Organizar mi tiempo y mis tareas.', emoji: '📅' },
  { value: 'Hacer ejercicios de respiración', label: 'Hacer ejercicios de respiración.', emoji: '🌬️' },
  { value: 'Bailar o mover mi cuerpo', label: 'Bailar o mover mi cuerpo.', emoji: '💃' },
  { value: 'Practicar mindfulness y relajarme', label: 'Practicar mindfulness y relajarme.', emoji: '🧘' },
  { value: 'Reconocer lo que siento', label: 'Reconocer lo que siento.', emoji: '❤️' },
  { value: 'Todavía no he utilizado ninguna', label: 'Todavía no he utilizado ninguna.', emoji: '🐾' },
];

export const HUELLA4_OPTIONS = [
  { value: 'Me sentí más tranquilo/a', label: 'Me sentí más tranquilo/a.', emoji: '😊' },
  { value: 'Pude organizar mejor mis tareas', label: 'Pude organizar mejor mis tareas.', emoji: '📅' },
  { value: 'Comprendí mejor lo que estaba sintiendo', label: 'Comprendí mejor lo que estaba sintiendo.', emoji: '❤️' },
  { value: 'No noté ningún cambio', label: 'No noté ningún cambio.', emoji: '😐' },
  { value: 'Todavía no la he utilizado', label: 'Todavía no la he utilizado.', emoji: '🐾' },
  { value: 'Otra cosa', label: 'Otra cosa.', emoji: '✨' },
];

export const HUELLA5_OPTIONS = [
  { value: 'No tengo mucho tiempo', label: 'No tengo mucho tiempo.', emoji: '⏰' },
  { value: 'Me olvido de practicarlas', label: 'Me olvido de practicarlas.', emoji: '🤔' },
  { value: 'No sé cuándo utilizar cada estrategia', label: 'No sé cuándo utilizar cada estrategia.', emoji: '😕' },
  { value: 'Me falta motivación', label: 'Me falta motivación.', emoji: '😴' },
  { value: 'No he tenido ninguna dificultad', label: 'No he tenido ninguna dificultad.', emoji: '😊' },
  { value: 'Otra dificultad', label: 'Otra dificultad.', emoji: '✨' },
];

export const HUELLA6_OPTIONS = [
  { value: 'Organizar mejor mi tiempo', label: 'Organizar mejor mi tiempo.', emoji: '📅' },
  { value: 'Respirar para tranquilizarme', label: 'Respirar para tranquilizarme.', emoji: '🌬️' },
  { value: 'Bailar y mover mi cuerpo', label: 'Bailar y mover mi cuerpo.', emoji: '💃' },
  { value: 'Practicar mindfulness', label: 'Practicar mindfulness.', emoji: '🧘' },
  { value: 'Reconocer y expresar mis emociones', label: 'Reconocer y expresar mis emociones.', emoji: '❤️' },
  { value: 'Otra', label: 'Otra', emoji: '✨' },
];
