import * as XLSX from 'xlsx';
import type { SubmissionRecord } from '../types/adventure';

export interface DailySummaryRow {
  dateKey: string;
  count: number;
  codes: string[];
  topFavorite: string;
  topObstacle: string;
}

export function buildDailySummaries(records: SubmissionRecord[]): DailySummaryRow[] {
  const byDay = new Map<string, SubmissionRecord[]>();
  for (const r of records) {
    const day = r.dateKey || r.createdAtIso.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(r);
    byDay.set(day, list);
  }

  const summaries: DailySummaryRow[] = [];
  for (const [dateKey, list] of byDay.entries()) {
    const favCounts = new Map<string, number>();
    const obsCounts = new Map<string, number>();
    const codes: string[] = [];

    for (const item of list) {
      codes.push(item.participantCode);
      if (item.huella2Favorite) {
        favCounts.set(item.huella2Favorite, (favCounts.get(item.huella2Favorite) ?? 0) + 1);
      }
      if (item.huella5Obstacle) {
        obsCounts.set(item.huella5Obstacle, (obsCounts.get(item.huella5Obstacle) ?? 0) + 1);
      }
    }

    const topFavorite = [...favCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin datos';
    const topObstacle = [...obsCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin datos';

    summaries.push({
      dateKey,
      count: list.length,
      codes,
      topFavorite,
      topObstacle,
    });
  }

  return summaries.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function formatDateTimeParts(iso: string): { fecha: string; hora: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { fecha: iso.slice(0, 10), hora: '' };
  }
  return {
    fecha: date.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    hora: date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

export function submissionToFlatObject(r: SubmissionRecord) {
  const { fecha, hora } = formatDateTimeParts(r.createdAtIso);
  return {
    'ID Registro': r.id,
    'Nombre y Apellido': r.participantCode,
    'Día (YYYY-MM-DD)': r.dateKey,
    Fecha: fecha,
    Hora: hora,
    'H1: Horario / Habit Tracker': r.huella1HabitTracker,
    'H1: Respiración': r.huella1Breathing,
    'H1: Bailar / Mover cuerpo': r.huella1Dancing,
    'H1: Mindfulness': r.huella1Mindfulness,
    'H1: Reconocer estrés': r.huella1StressAwareness,
    'H2: Estrategia Favorita': r.huella2Favorite,
    'H3: Cuándo la utilizó (Abierta)': r.huella3Moment,
    'H4: Cómo se sintió': r.huella4Feeling,
    'H4: Otra cosa (Abierta)': r.huella4Other,
    'H5: Obstáculo del camino': r.huella5Obstacle,
    'H5: Otra dificultad (Abierta)': r.huella5Other,
    'H6: Qué quiere mejorar': r.huella6Improve.join(', '),
    'H6: Otra mejora (Abierta)': r.huella6Other,
    'H7: Próximo compromiso (Abierta)': r.huella7Commitment,
    Dispositivo: r.deviceType,
  };
}

export function downloadExcelWorkbook(records: SubmissionRecord[]) {
  const detailedRows = records.map(submissionToFlatObject);
  const dailyRows = buildDailySummaries(records).map((day) => ({
    'Día (YYYY-MM-DD)': day.dateKey,
    'Total Participantes': day.count,
    'Participantes del Día': day.codes.join(', '),
    'Estrategia Favorita Más Elegida': day.topFavorite,
    'Dificultad Más Frecuente': day.topObstacle,
  }));

  const wb = XLSX.utils.book_new();
  const wsDetail = XLSX.utils.json_to_sheet(
    detailedRows.length > 0
      ? detailedRows
      : [{ Mensaje: 'Aún no hay respuestas registradas' }]
  );
  const wsDaily = XLSX.utils.json_to_sheet(
    dailyRows.length > 0
      ? dailyRows
      : [{ Mensaje: 'Aún no hay resúmenes diarios' }]
  );

  XLSX.utils.book_append_sheet(wb, wsDetail, 'Respuestas Detalladas');
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Resumen por Día');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `la_huella_de_mi_aprendizaje_${today}.xlsx`);
}

function escapeCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

export function downloadCsvFile(records: SubmissionRecord[]) {
  const flat = records.map(submissionToFlatObject);
  if (flat.length === 0) return;

  const headers = Object.keys(flat[0]);
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...flat.map((row) =>
      headers.map((h) => escapeCsvCell(String((row as Record<string, unknown>)[h] ?? ''))).join(',')
    ),
  ];

  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `la_huella_de_mi_aprendizaje_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
