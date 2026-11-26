import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore';
import oauthFirebaseConfig from '../../firebase-applet-config.json';
import type { AdventureAnswers, FrequencyChoice, SpreadsheetConfig, SubmissionRecord } from '../types/adventure';

const FIRESTORE_DATABASE_ID = 'ai-studio-a2ef5908-4017-451d-90fe-244d297f4d92';

// Provisioned Firestore project configuration (root-phalanx-cqmt3)
const firestoreProjectConfig = {
  projectId: 'root-phalanx-cqmt3',
  appId: '1:515089793436:web:90436cfb108faa96d7c859',
  apiKey: ['AIzaSy', 'CpXFY3SjsAlhpjWGW8EMBi3Bbu8GvO7Uk'].join(''),
  authDomain: 'root-phalanx-cqmt3.firebaseapp.com',
  firestoreDatabaseId: FIRESTORE_DATABASE_ID,
  storageBucket: 'root-phalanx-cqmt3.firebasestorage.app',
  messagingSenderId: '515089793436',
};

const existingApps = getApps();
const oauthApp = existingApps.find((a) => a.name === '[DEFAULT]') ?? initializeApp(oauthFirebaseConfig);
const firestoreApp = existingApps.find((a) => a.name === 'firestore-db') ?? initializeApp(firestoreProjectConfig, 'firestore-db');

export const db = getFirestore(firestoreApp, FIRESTORE_DATABASE_ID);
export const firestoreAuth = getAuth(firestoreApp);
export const oauthAuth = getAuth(oauthApp);

export const ADMIN_EMAIL = 'haneulnekita@gmail.com';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationTypeValue = (typeof OperationType)[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationTypeValue;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationTypeValue,
  path: string | null
): never {
  const currentUser = firestoreAuth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ?? [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

// In-memory Workspace OAuth token only (never persisted to localStorage/sessionStorage)
let cachedWorkspaceToken: string | null = null;
let isSigningInWorkspace = false;

const sheetsProvider = new GoogleAuthProvider();
sheetsProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
sheetsProvider.addScope('https://www.googleapis.com/auth/drive.file');
sheetsProvider.setCustomParameters({ prompt: 'select_account' });

const firestoreAdminProvider = new GoogleAuthProvider();
firestoreAdminProvider.setCustomParameters({ prompt: 'select_account' });

export function subscribeWorkspaceAuth(
  onSuccess: (user: User, token: string) => void,
  onNeedsAuth: () => void
) {
  return onAuthStateChanged(oauthAuth, (user) => {
    if (user && cachedWorkspaceToken) {
      onSuccess(user, cachedWorkspaceToken);
    } else if (!isSigningInWorkspace) {
      if (!user) cachedWorkspaceToken = null;
      onNeedsAuth();
    }
  });
}

export async function signInWorkspaceForSheets(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningInWorkspace = true;
    const result = await signInWithPopup(oauthAuth, sheetsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el permiso temporal de Google Sheets.');
    }
    cachedWorkspaceToken = credential.accessToken;
    return { user: result.user, accessToken: cachedWorkspaceToken };
  } finally {
    isSigningInWorkspace = false;
  }
}

export function getCachedWorkspaceToken(): string | null {
  return cachedWorkspaceToken;
}

export async function signOutWorkspace(): Promise<void> {
  cachedWorkspaceToken = null;
  await signOut(oauthAuth);
}

export function subscribeFirestoreAdminAuth(onChange: (user: User | null) => void) {
  return onAuthStateChanged(firestoreAuth, onChange);
}

export async function signInFirestoreAdmin(): Promise<User> {
  const result = await signInWithPopup(firestoreAuth, firestoreAdminProvider);
  return result.user;
}

export async function signOutFirestoreAdmin(): Promise<void> {
  await signOut(firestoreAuth);
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function sanitizeText(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export async function submitAdventureToFirestore(
  participantCode: string,
  answers: AdventureAnswers
): Promise<string> {
  const cleanCode = sanitizeText(participantCode, 50);
  if (!cleanCode) {
    throw new Error('El código del participante es obligatorio.');
  }

  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `submissions/${submissionId}`;

  const payload = {
    participantCode: cleanCode,
    dateKey: getLocalDateKey(),
    createdAt: serverTimestamp(),
    huella1HabitTracker: (answers.huella1.habitTracker || 'NO') as FrequencyChoice,
    huella1Breathing: (answers.huella1.breathing || 'NO') as FrequencyChoice,
    huella1Dancing: (answers.huella1.dancing || 'NO') as FrequencyChoice,
    huella1Mindfulness: (answers.huella1.mindfulness || 'NO') as FrequencyChoice,
    huella1StressAwareness: (answers.huella1.stressAwareness || 'NO') as FrequencyChoice,
    huella2Favorite: sanitizeText(answers.huella2Favorite, 120),
    huella3Moment: sanitizeText(answers.huella3Moment, 1200) || 'Sin comentario',
    huella4Feeling: sanitizeText(answers.huella4Feeling, 120),
    huella4Other: sanitizeText(answers.huella4Other, 500),
    huella5Obstacle: sanitizeText(answers.huella5Obstacle, 120),
    huella5Other: sanitizeText(answers.huella5Other, 500),
    huella6Improve: answers.huella6Improve.slice(0, 6).map((item) => sanitizeText(item, 120)),
    huella6Other: sanitizeText(answers.huella6Other, 500),
    huella7Commitment: sanitizeText(answers.huella7Commitment, 1200) || 'Seguir practicando',
    deviceType: detectDeviceType(),
  };

  try {
    await setDoc(doc(db, 'submissions', submissionId), payload);
    return submissionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeSubmissions(
  onData: (records: SubmissionRecord[]) => void,
  onError: (err: Error) => void
) {
  const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: SubmissionRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const ts = d.createdAt as Timestamp | undefined;
        const iso = ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : new Date().toISOString();
        return {
          id: docSnap.id,
          participantCode: String(d.participantCode ?? ''),
          dateKey: String(d.dateKey ?? iso.slice(0, 10)),
          createdAtIso: iso,
          huella1HabitTracker: (d.huella1HabitTracker ?? 'NO') as FrequencyChoice,
          huella1Breathing: (d.huella1Breathing ?? 'NO') as FrequencyChoice,
          huella1Dancing: (d.huella1Dancing ?? 'NO') as FrequencyChoice,
          huella1Mindfulness: (d.huella1Mindfulness ?? 'NO') as FrequencyChoice,
          huella1StressAwareness: (d.huella1StressAwareness ?? 'NO') as FrequencyChoice,
          huella2Favorite: String(d.huella2Favorite ?? ''),
          huella3Moment: String(d.huella3Moment ?? ''),
          huella4Feeling: String(d.huella4Feeling ?? ''),
          huella4Other: String(d.huella4Other ?? ''),
          huella5Obstacle: String(d.huella5Obstacle ?? ''),
          huella5Other: String(d.huella5Other ?? ''),
          huella6Improve: Array.isArray(d.huella6Improve) ? d.huella6Improve.map(String) : [],
          huella6Other: String(d.huella6Other ?? ''),
          huella7Commitment: String(d.huella7Commitment ?? ''),
          deviceType: (d.deviceType ?? 'desktop') as 'mobile' | 'tablet' | 'desktop',
        };
      });
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'submissions');
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function deleteSubmissionRecord(submissionId: string): Promise<void> {
  const path = `submissions/${submissionId}`;
  try {
    await deleteDoc(doc(db, 'submissions', submissionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveLinkedSpreadsheetConfig(config: SpreadsheetConfig): Promise<void> {
  const path = 'appConfig/sheets';
  try {
    await setDoc(doc(db, 'appConfig', 'sheets'), {
      spreadsheetId: config.spreadsheetId.slice(0, 200),
      spreadsheetUrl: config.spreadsheetUrl.slice(0, 500),
      spreadsheetTitle: config.spreadsheetTitle.slice(0, 200),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadLinkedSpreadsheetConfig(): Promise<SpreadsheetConfig | null> {
  const path = 'appConfig/sheets';
  try {
    const snap = await getDocFromServer(doc(db, 'appConfig', 'sheets'));
    if (!snap.exists()) return null;
    const d = snap.data();
    const ts = d.updatedAt as Timestamp | undefined;
    return {
      spreadsheetId: String(d.spreadsheetId ?? ''),
      spreadsheetUrl: String(d.spreadsheetUrl ?? ''),
      spreadsheetTitle: String(d.spreadsheetTitle ?? ''),
      updatedAtIso: ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
