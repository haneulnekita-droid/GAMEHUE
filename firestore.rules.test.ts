export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated get on submission',
    operation: 'get',
    path: '/submissions/sub_1',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unauthenticated list on submissions',
    operation: 'list',
    path: '/submissions',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Non-admin list on submissions',
    operation: 'list',
    path: '/submissions',
    auth: { email: 'intruder@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified admin email spoof on submissions list',
    operation: 'list',
    path: '/submissions',
    auth: { email: 'haneulnekita@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow field injection on submission create',
    operation: 'create',
    path: '/submissions/sub_2',
    auth: null,
    payload: { participantCode: 'P-01', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Forged client timestamp on submission create',
    operation: 'create',
    path: '/submissions/sub_3',
    auth: null,
    payload: { participantCode: 'P-01', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Oversized participantCode (> 50 chars)',
    operation: 'create',
    path: '/submissions/sub_4',
    auth: null,
    payload: { participantCode: 'X'.repeat(80) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Invalid enum value in huella1HabitTracker',
    operation: 'create',
    path: '/submissions/sub_5',
    auth: null,
    payload: { huella1HabitTracker: 'SIEMPRE' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Empty huella6Improve array',
    operation: 'create',
    path: '/submissions/sub_6',
    auth: null,
    payload: { huella6Improve: [] },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Invalid document ID characters',
    operation: 'create',
    path: '/submissions/bad$id!',
    auth: null,
    payload: { participantCode: 'P-01' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthenticated delete on submission',
    operation: 'delete',
    path: '/submissions/sub_1',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Non-admin write on appConfig',
    operation: 'create',
    path: '/appConfig/sheets',
    auth: { email: 'other@example.com', email_verified: true },
    payload: { spreadsheetId: 'abc' },
    expected: 'PERMISSION_DENIED',
  },
];
