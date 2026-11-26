import type { SpreadsheetConfig, SubmissionRecord } from '../types/adventure';
import { buildDailySummaries, groupRecordsByDay } from './exportService';

const SHEET_RESPONSES_TITLE = 'Todas las Respuestas';
const SHEET_DAILY_TITLE = 'Resumen por Día';

const RESPONSE_HEADERS = [
  'ID Registro',
  'Nombre y Apellido',
  'Día (YYYY-MM-DD)',
  'Fecha y Hora',
  'H1: Habit Tracker',
  'H1: Respiración',
  'H1: Bailar/Mover cuerpo',
  'H1: Mindfulness',
  'H1: Reconocer estrés',
  'H2: Estrategia Favorita',
  'H3: Cuándo la utilizó',
  'H4: Cómo se sintió',
  'H4: Otra cosa',
  'H5: Obstáculo',
  'H5: Otra dificultad',
  'H6: Qué quiere mejorar',
  'H6: Otra mejora',
  'H7: Próximo compromiso',
  'Dispositivo',
];

const DAILY_HEADERS = [
  'Día (YYYY-MM-DD)',
  'Total Participantes',
  'Participantes del Día',
  'Estrategia Favorita Más Elegida',
  'Dificultad Más Frecuente',
];

async function sheetsFetch(url: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Error de Google Sheets (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function createAdventureSpreadsheet(accessToken: string): Promise<SpreadsheetConfig> {
  const title = 'La Huella de mi Aprendizaje - Registro de Respuestas';
  const created = await sheetsFetch('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title,
        locale: 'es_ES',
      },
      sheets: [
        { properties: { title: SHEET_DAILY_TITLE } },
        { properties: { title: SHEET_RESPONSES_TITLE } },
      ],
    }),
  });

  const spreadsheetId = String(created.spreadsheetId);
  const spreadsheetUrl = String(
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  );

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `'${SHEET_RESPONSES_TITLE}'!A1:S1`,
            values: [RESPONSE_HEADERS],
          },
          {
            range: `'${SHEET_DAILY_TITLE}'!A1:E1`,
            values: [DAILY_HEADERS],
          },
        ],
      }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle: title,
  };
}

function recordToSheetRow(r: SubmissionRecord): string[] {
  const localTime = new Date(r.createdAtIso).toLocaleString('es-PE');
  return [
    r.id,
    r.participantCode,
    r.dateKey,
    localTime,
    r.huella1HabitTracker,
    r.huella1Breathing,
    r.huella1Dancing,
    r.huella1Mindfulness,
    r.huella1StressAwareness,
    r.huella2Favorite,
    r.huella3Moment,
    r.huella4Feeling,
    r.huella4Other,
    r.huella5Obstacle,
    r.huella5Other,
    r.huella6Improve.join(', '),
    r.huella6Other,
    r.huella7Commitment,
    r.deviceType,
  ];
}

export async function syncSubmissionsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  records: SubmissionRecord[]
): Promise<{ appendedCount: number; totalRows: number }> {
  const meta = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    accessToken
  );

  const sheetTitles: string[] = Array.isArray(meta.sheets)
    ? meta.sheets.map((s: { properties?: { title?: string } }) => String(s.properties?.title ?? ''))
    : [];

  const dailyGroups = groupRecordsByDay(records);
  const desiredSheets = [
    SHEET_DAILY_TITLE,
    SHEET_RESPONSES_TITLE,
    ...dailyGroups.map((g) => `Día ${g.dateKey}`),
  ];

  const missingSheets = desiredSheets.filter((title) => !sheetTitles.includes(title));

  if (missingSheets.length > 0) {
    await sheetsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: missingSheets.map((title) => ({ addSheet: { properties: { title } } })),
        }),
      }
    );
  }

  // Update main "Todas las Respuestas" tab
  const existingIdRes = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `'${SHEET_RESPONSES_TITLE}'!A:A`
    )}`,
    accessToken
  );

  const existingValues: string[][] = Array.isArray(existingIdRes.values) ? existingIdRes.values : [];
  const existingIds = new Set(existingValues.flat().filter(Boolean));

  const missingRecords = records
    .filter((r) => !existingIds.has(r.id))
    .sort((a, b) => a.createdAtIso.localeCompare(b.createdAtIso));

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `'${SHEET_RESPONSES_TITLE}'!A1:S1`
    )}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [RESPONSE_HEADERS] }),
    }
  );

  if (missingRecords.length > 0) {
    await sheetsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        `'${SHEET_RESPONSES_TITLE}'!A:S`
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          values: missingRecords.map(recordToSheetRow),
        }),
      }
    );
  }

  // Rebuild daily summary tab + each exact day tab ("Día YYYY-MM-DD")
  const dailyRows = buildDailySummaries(records).map((day) => [
    day.dateKey,
    String(day.count),
    day.codes.join(', '),
    day.topFavorite,
    day.topObstacle,
  ]);

  const clearRanges = [
    `'${SHEET_DAILY_TITLE}'!A:E`,
    ...dailyGroups.map((g) => `'Día ${g.dateKey}'!A:S`),
  ];

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ ranges: clearRanges }),
    }
  );

  const batchData = [
    {
      range: `'${SHEET_DAILY_TITLE}'!A1:E${dailyRows.length + 1}`,
      values: [DAILY_HEADERS, ...dailyRows],
    },
    ...dailyGroups.map((g) => ({
      range: `'Día ${g.dateKey}'!A1:S${g.records.length + 1}`,
      values: [RESPONSE_HEADERS, ...g.records.map(recordToSheetRow)],
    })),
  ];

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  return {
    appendedCount: missingRecords.length,
    totalRows: records.length,
  };
}
