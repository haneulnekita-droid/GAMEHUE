import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  MessageSquareText,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  deleteSubmissionRecord,
  getCachedWorkspaceToken,
  hasCloudFacilitatorPasscode,
  loadLinkedSpreadsheetConfig,
  saveLinkedSpreadsheetConfig,
  setupCloudFacilitatorPasscode,
  signInFirestoreAdmin,
  signInWorkspaceForSheets,
  signOutFirestoreAdmin,
  signOutWorkspace,
  subscribeFirestoreAdminAuth,
  subscribeSubmissions,
  subscribeWorkspaceAuth,
  verifyCloudFacilitatorPasscode,
} from '../firebase/config';
import {
  buildDailySummaries,
  downloadCsvFile,
  downloadCsvForDay,
  downloadExcelForDay,
  downloadExcelWorkbook,
  groupRecordsByDay,
} from '../services/exportService';
import { createAdventureSpreadsheet, syncSubmissionsToGoogleSheet } from '../services/googleSheetsService';
import {
  HUELLA1_CARDS,
  type SpreadsheetConfig,
  type SubmissionRecord,
} from '../types/adventure';

interface FacilitatorPanelProps {
  onExitPanel: () => void;
}

type PanelTab = 'analytics' | 'responses' | 'share';

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

function OfficialGoogleButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 shadow-sm text-sm font-semibold text-slate-800 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}

function buildDistribution(values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const total = values.filter(Boolean).length || 1;
  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function FacilitatorPanel({ onExitPanel }: FacilitatorPanelProps) {
  // Firestore Admin auth state
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [dbAuthReady, setDbAuthReady] = useState(false);
  const [dbAuthLoading, setDbAuthLoading] = useState(false);
  const [dbError, setDbError] = useState('');
  const [unauthorizedDomainHost, setUnauthorizedDomainHost] = useState<string | null>(null);

  // Cloud-persisted passcode gate state (works identically on Vercel and AI Studio)
  const [passcodeState, setPasscodeState] = useState<'checking' | 'needs-setup' | 'locked' | 'unlocked'>('checking');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [confirmPasscodeInput, setConfirmPasscodeInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Workspace Google Sheets auth state
  const [sheetsUser, setSheetsUser] = useState<User | null>(null);
  const [sheetsToken, setSheetsToken] = useState<string | null>(getCachedWorkspaceToken());
  const [linkedSheet, setLinkedSheet] = useState<SpreadsheetConfig | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  // Submissions & UI filters
  const [records, setRecords] = useState<SubmissionRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<PanelTab>('analytics');
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isConfirmRunning, setIsConfirmRunning] = useState(false);

  useEffect(() => {
    const unsubDb = subscribeFirestoreAdminAuth((user) => {
      setDbUser(user);
      setDbAuthReady(true);
    });
    const unsubWs = subscribeWorkspaceAuth(
      (user, token) => {
        setSheetsUser(user);
        setSheetsToken(token);
      },
      () => {
        setSheetsToken(null);
      }
    );
    return () => {
      unsubDb();
      unsubWs();
    };
  }, []);

  const isAuthorizedDbAdmin =
    Boolean(dbUser) && dbUser?.email === ADMIN_EMAIL && dbUser?.emailVerified === true;

  // Check whether facilitator passcode is already set in Firestore once signed in as admin
  useEffect(() => {
    if (!dbAuthReady) return;
    if (!isAuthorizedDbAdmin) {
      setPasscodeState('locked');
      return;
    }

    let cancelled = false;
    setPasscodeState('checking');
    hasCloudFacilitatorPasscode()
      .then((exists) => {
        if (cancelled) return;
        setPasscodeState(exists ? 'locked' : 'needs-setup');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setPasscodeState('needs-setup');
      });

    return () => {
      cancelled = true;
    };
  }, [dbAuthReady, isAuthorizedDbAdmin]);

  // Subscribe to real-time submissions when authenticated as admin AND passcode unlocked
  useEffect(() => {
    if (!isAuthorizedDbAdmin || passcodeState !== 'unlocked') {
      setRecords([]);
      return;
    }

    setLoadingRecords(true);
    setDbError('');

    loadLinkedSpreadsheetConfig()
      .then((cfg) => {
        if (cfg) setLinkedSheet(cfg);
      })
      .catch(() => {
        // Ignore if no spreadsheet linked yet
      });

    const unsub = subscribeSubmissions(
      (data) => {
        setRecords(data);
        setLoadingRecords(false);
      },
      (err) => {
        console.error(err);
        setDbError(`No se pudieron cargar las respuestas (${err.message}).`);
        setLoadingRecords(false);
      }
    );

    return () => unsub();
  }, [isAuthorizedDbAdmin, passcodeState]);

  // Auto-sync to Google Sheets when enabled
  useEffect(() => {
    if (!autoSyncEnabled || !sheetsToken || !linkedSheet?.spreadsheetId || records.length === 0) {
      return;
    }
    let cancelled = false;
    syncSubmissionsToGoogleSheet(sheetsToken, linkedSheet.spreadsheetId, records)
      .then((res) => {
        if (cancelled) return;
        if (res.appendedCount > 0) {
          setSyncStatus(
            `Sincronización automática: +${res.appendedCount} registro(s) nuevo(s) añadido(s) a tu Google Sheet.`
          );
        } else {
          setSyncStatus(`Hoja al día (${res.totalRows} registros totales).`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setSyncStatus(err instanceof Error ? err.message : 'Error al sincronizar con Google Sheets.');
      });
    return () => {
      cancelled = true;
    };
  }, [autoSyncEnabled, sheetsToken, linkedSheet?.spreadsheetId, records]);

  const handleDbGoogleSignIn = async () => {
    setDbAuthLoading(true);
    setDbError('');
    setUnauthorizedDomainHost(null);
    try {
      const user = await signInFirestoreAdmin();
      if (user.email !== ADMIN_EMAIL) {
        setDbError(
          `Iniciaste sesión como ${user.email}, pero solo ${ADMIN_EMAIL} tiene acceso a los resultados.`
        );
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/unauthorized-domain') {
        setUnauthorizedDomainHost(window.location.hostname);
        setDbError(
          `Este dominio (${window.location.hostname}) aún no está autorizado en Firebase Authentication.`
        );
      } else if (code === 'auth/popup-blocked') {
        setDbError('Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e intenta de nuevo.');
      } else {
        setDbError('No se pudo iniciar sesión con Google. Intenta nuevamente.');
      }
    } finally {
      setDbAuthLoading(false);
    }
  };

  const handleSetupPasscode = async (e: FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim().length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (passcodeInput.trim() !== confirmPasscodeInput.trim()) {
      setAuthError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError('');
    try {
      await setupCloudFacilitatorPasscode(passcodeInput.trim());
      setPasscodeState('unlocked');
      setPasscodeInput('');
      setConfirmPasscodeInput('');
    } catch (err) {
      console.error(err);
      setAuthError('No se pudo guardar la contraseña en la nube. Intenta de nuevo.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleVerifyPasscode = async (e: FormEvent) => {
    e.preventDefault();
    if (!passcodeInput.trim()) {
      setAuthError('Ingresa la contraseña del facilitador.');
      return;
    }
    setIsSubmittingAuth(true);
    setAuthError('');
    try {
      const valid = await verifyCloudFacilitatorPasscode(passcodeInput.trim());
      if (!valid) {
        setAuthError('Contraseña incorrecta.');
        return;
      }
      setPasscodeState('unlocked');
      setPasscodeInput('');
    } catch (err) {
      console.error(err);
      setAuthError('Error al verificar la contraseña.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleConnectSheets = async () => {
    setSyncStatus('');
    try {
      const { user, accessToken } = await signInWorkspaceForSheets();
      setSheetsUser(user);
      setSheetsToken(accessToken);
      setSyncStatus(`Conectado a Google Sheets como ${user.email ?? 'tu cuenta'}.`);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/unauthorized-domain') {
        setSyncStatus(
          `Para conectar Google Sheets desde ${window.location.hostname}, agrega ese dominio en Firebase Console (proyecto gen-lang-client-0625964269 -> Authentication -> Authorized domains). Mientras tanto puedes descargar Excel (.xlsx) directamente.`
        );
      } else {
        setSyncStatus(err instanceof Error ? err.message : 'No se pudo conectar con Google Sheets.');
      }
    }
  };

  const handleRequestCreateSheet = () => {
    if (!sheetsToken) return;
    setConfirmDialog({
      title: 'Crear nueva hoja de cálculo en Google Drive',
      description:
        'Se creará el archivo "La Huella de mi Aprendizaje - Registro de Respuestas" en tu Google Drive con las pestañas "Todas las Respuestas" y "Resumen por Día", y se copiarán los registros actuales.',
      confirmLabel: 'Crear y sincronizar',
      onConfirm: async () => {
        setIsSyncingSheets(true);
        try {
          const cfg = await createAdventureSpreadsheet(sheetsToken);
          await saveLinkedSpreadsheetConfig(cfg);
          setLinkedSheet(cfg);
          const syncRes = await syncSubmissionsToGoogleSheet(sheetsToken, cfg.spreadsheetId, records);
          setAutoSyncEnabled(true);
          setSyncStatus(
            `¡Hoja creada en tu nube! Se registraron ${syncRes.totalRows} respuestas y el resumen por día.`
          );
        } finally {
          setIsSyncingSheets(false);
        }
      },
    });
  };

  const handleRequestManualSync = () => {
    if (!sheetsToken || !linkedSheet?.spreadsheetId) return;
    setConfirmDialog({
      title: 'Actualizar hoja de cálculo en Google Sheets',
      description: `Se agregarán los registros nuevos a "${linkedSheet.spreadsheetTitle}" y se actualizará la pestaña "Resumen por Día".`,
      confirmLabel: 'Sincronizar ahora',
      onConfirm: async () => {
        setIsSyncingSheets(true);
        try {
          const res = await syncSubmissionsToGoogleSheet(
            sheetsToken,
            linkedSheet.spreadsheetId,
            records
          );
          setAutoSyncEnabled(true);
          setSyncStatus(
            `Sincronización completada: ${res.appendedCount} nuevo(s), ${res.totalRows} registros en total.`
          );
        } finally {
          setIsSyncingSheets(false);
        }
      },
    });
  };

  const handleRequestDeleteRecord = (record: SubmissionRecord) => {
    setConfirmDialog({
      title: `Eliminar registro de ${record.participantCode}`,
      description:
        'Esta acción eliminará permanentemente esta respuesta de la base de datos en la nube.',
      confirmLabel: 'Eliminar registro',
      onConfirm: async () => {
        await deleteSubmissionRecord(record.id);
      },
    });
  };

  const dailySummaries = useMemo(() => buildDailySummaries(records), [records]);

  const filteredRecords = useMemo(() => {
    const q = searchCode.trim().toLowerCase();
    return records.filter((r) => {
      const matchesDay = selectedDay === 'ALL' || r.dateKey === selectedDay;
      const matchesCode = !q || r.participantCode.toLowerCase().includes(q);
      return matchesDay && matchesCode;
    });
  }, [records, selectedDay, searchCode]);

  const filteredDailyGroups = useMemo(() => groupRecordsByDay(filteredRecords), [filteredRecords]);

  const stats = useMemo(() => {
    const favDist = buildDistribution(filteredRecords.map((r) => r.huella2Favorite));
    const feelingDist = buildDistribution(filteredRecords.map((r) => r.huella4Feeling));
    const obstacleDist = buildDistribution(filteredRecords.map((r) => r.huella5Obstacle));
    const improveDist = buildDistribution(filteredRecords.flatMap((r) => r.huella6Improve));

    const h1Stats = HUELLA1_CARDS.map((card) => {
      const fieldMap: Record<string, keyof SubmissionRecord> = {
        habitTracker: 'huella1HabitTracker',
        breathing: 'huella1Breathing',
        dancing: 'huella1Dancing',
        mindfulness: 'huella1Mindfulness',
        stressAwareness: 'huella1StressAwareness',
      };
      const field = fieldMap[card.key];
      const total = filteredRecords.length || 1;
      const si = filteredRecords.filter((r) => r[field] === 'SÍ').length;
      const aveces = filteredRecords.filter((r) => r[field] === 'A VECES').length;
      const no = filteredRecords.filter((r) => r[field] === 'NO').length;
      return {
        label: card.question,
        emoji: card.emoji,
        si,
        aveces,
        no,
        siPct: Math.round((si / total) * 100),
        avecesPct: Math.round((aveces / total) * 100),
        noPct: Math.round((no / total) * 100),
      };
    });

    const huella3Responses = filteredRecords.filter((r) => r.huella3Moment.trim().length > 0);
    const huella4OtherResponses = filteredRecords.filter((r) => r.huella4Other.trim().length > 0);
    const huella5OtherResponses = filteredRecords.filter((r) => r.huella5Other.trim().length > 0);
    const huella6OtherResponses = filteredRecords.filter((r) => r.huella6Other.trim().length > 0);
    const huella7Responses = filteredRecords.filter((r) => r.huella7Commitment.trim().length > 0);

    return {
      favDist,
      feelingDist,
      obstacleDist,
      improveDist,
      h1Stats,
      huella3Responses,
      huella4OtherResponses,
      huella5OtherResponses,
      huella6OtherResponses,
      huella7Responses,
      topFavorite: favDist[0]?.label ?? 'Sin datos',
      topObstacle: obstacleDist[0]?.label ?? 'Sin datos',
    };
  }, [filteredRecords]);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Ignore clipboard errors
    }
  };

  // GATE 1: Google Sign-In as Facilitator (works on Vercel & AI Studio without Express backend)
  if (!isAuthorizedDbAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white/95 border-2 border-violet-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onExitPanel}
              className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al juego</span>
            </button>
            <Lock className="w-5 h-5 text-violet-500" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-extrabold text-[#2e2344]">
              Acceso Privado del Facilitador
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Inicia sesión con tu cuenta autorizada (<span className="font-semibold">{ADMIN_EMAIL}</span>) para desbloquear y consultar todas las respuestas guardadas en la nube desde cualquier dispositivo o desde Vercel.
            </p>
          </div>

          {!dbAuthReady ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <OfficialGoogleButton
                label={dbAuthLoading ? 'Abriendo Google...' : 'Sign in with Google'}
                onClick={handleDbGoogleSignIn}
                disabled={dbAuthLoading}
              />

              {dbUser && dbUser.email !== ADMIN_EMAIL && (
                <button
                  type="button"
                  onClick={() => signOutFirestoreAdmin()}
                  className="block text-xs font-bold text-violet-700 hover:underline cursor-pointer"
                >
                  Cambiar cuenta (sesión actual: {dbUser.email})
                </button>
              )}

              {dbError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-2.5 text-xs text-rose-800">
                  <p className="font-bold">{dbError}</p>
                  {unauthorizedDomainHost && (
                    <div className="space-y-2 text-slate-700">
                      <p>
                        Como publicaste en <span className="font-mono-tabular font-bold">{unauthorizedDomainHost}</span>, debes autorizar ese dominio una sola vez en Firebase Console:
                      </p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Abre Authentication &rarr; Settings &rarr; Authorized domains</li>
                        <li>Haz clic en <strong>Add domain</strong> y pega <span className="font-mono-tabular font-bold">{unauthorizedDomainHost}</span></li>
                        <li>Recarga esta página e inicia sesión con Google</li>
                      </ol>
                      <a
                        href="https://console.firebase.google.com/project/root-phalanx-cqmt3/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700"
                      >
                        <span>Abrir Firebase Authorized Domains</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // GATE 2: Cloud-stored Facilitator Passcode (persisted in Firestore /facilitatorSecurity/passcode)
  if (passcodeState !== 'unlocked') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white/95 border-2 border-violet-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onExitPanel}
              className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al juego</span>
            </button>
            <button
              type="button"
              onClick={() => signOutFirestoreAdmin()}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cerrar sesión ({dbUser?.email})
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-extrabold text-[#2e2344]">
              {passcodeState === 'needs-setup'
                ? 'Crea tu contraseña del panel'
                : 'Contraseña del Facilitador'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {passcodeState === 'needs-setup'
                ? 'Esta contraseña se guarda cifrada en la nube para proteger tus resultados tanto aquí como en Vercel.'
                : 'Ingresa la contraseña de tu panel para ver las respuestas y estadísticas.'}
            </p>
          </div>

          {passcodeState === 'checking' ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
            </div>
          ) : passcodeState === 'needs-setup' ? (
            <form onSubmit={handleSetupPasscode} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#2e2344] mb-1.5">
                  Nueva contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-violet-200 focus:border-violet-500 focus:outline-none text-base"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#2e2344] mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmPasscodeInput}
                  onChange={(e) => setConfirmPasscodeInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-violet-200 focus:border-violet-500 focus:outline-none text-base"
                  placeholder="••••••••"
                />
              </div>
              {authError && <p className="text-sm font-bold text-rose-600">{authError}</p>}
              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold cursor-pointer disabled:opacity-60"
              >
                {isSubmittingAuth ? 'Guardando en la nube...' : 'Guardar contraseña y ver resultados'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPasscode} className="space-y-4">
              <div>
                <label htmlFor="facilitator-pass" className="block text-sm font-bold text-[#2e2344] mb-1.5">
                  Contraseña del panel
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="facilitator-pass"
                    type="password"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-violet-200 focus:border-violet-500 focus:outline-none text-base"
                    placeholder="Ingresa tu contraseña"
                  />
                </div>
              </div>
              {authError && <p className="text-sm font-bold text-rose-600">{authError}</p>}
              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold cursor-pointer disabled:opacity-60"
              >
                {isSubmittingAuth ? 'Verificando...' : 'Ver resultados'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Panel Top Bar */}
      <div className="bg-white/95 border border-violet-200 rounded-3xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-xs font-semibold text-violet-700">
            <button
              type="button"
              onClick={onExitPanel}
              className="inline-flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la aventura</span>
            </button>
            <span aria-hidden="true">·</span>
            <span>Panel Privado del Facilitador ({dbUser?.email})</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#2e2344]">
            Resultados y Registro en la Nube
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              selectedDay !== 'ALL'
                ? downloadExcelForDay(selectedDay, filteredRecords)
                : downloadExcelWorkbook(filteredRecords)
            }
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              {selectedDay !== 'ALL'
                ? `Descargar Excel (${selectedDay})`
                : 'Descargar Excel (.xlsx)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              selectedDay !== 'ALL'
                ? downloadCsvForDay(selectedDay, filteredRecords)
                : downloadCsvFile(filteredRecords)
            }
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>
              {selectedDay !== 'ALL' ? `Descargar CSV (${selectedDay})` : 'Descargar CSV'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPasscodeState('locked')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span>Bloquear</span>
          </button>
        </div>
      </div>

      {/* Cloud Database & Google Sheets Sync Connections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/95 border border-violet-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-violet-600 shrink-0" />
              <div>
                <h3 className="font-display text-lg font-bold text-[#2e2344]">
                  Base de Datos Centralizada
                </h3>
                <p className="text-xs text-slate-600">
                  Recibe en vivo todas las respuestas de celulares, tablets y computadoras.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOutFirestoreAdmin()}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer whitespace-nowrap"
            >
              Cerrar sesión
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5">
            <span>Conectado en tiempo real como {dbUser?.email}</span>
            <span className="font-mono-tabular font-bold">{records.length} registros</span>
          </div>
          {dbError && <p className="text-xs font-bold text-rose-600">{dbError}</p>}
        </div>

        <div className="bg-white/95 border border-emerald-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-display text-lg font-bold text-[#2e2344]">
                  Excel en la Nube (Google Sheets)
                </h3>
                <p className="text-xs text-slate-600">
                  Guarda y actualiza las respuestas y el resumen por día en tu Google Drive.
                </p>
              </div>
            </div>
            {sheetsToken && (
              <button
                type="button"
                onClick={() => signOutWorkspace()}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer whitespace-nowrap"
              >
                Desconectar
              </button>
            )}
          </div>

          {!sheetsToken ? (
            <div className="pt-1 space-y-2">
              <p className="text-sm text-slate-700">
                Conecta tu Google Drive ({sheetsUser?.email || ADMIN_EMAIL}) para crear tu hoja de cálculo y sincronizar las respuestas por día.
              </p>
              <OfficialGoogleButton label="Sign in with Google" onClick={handleConnectSheets} />
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                {!linkedSheet ? (
                  <button
                    type="button"
                    onClick={handleRequestCreateSheet}
                    disabled={isSyncingSheets}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-60"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Crear Google Sheet en mi cuenta</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleRequestManualSync}
                      disabled={isSyncingSheets}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                      <span>Sincronizar ahora</span>
                    </button>

                    <a
                      href={linkedSheet.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-sm font-bold"
                    >
                      <span>Abrir Google Sheet</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </>
                )}
              </div>

              {linkedSheet && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    className="rounded border-emerald-300 text-emerald-600"
                  />
                  <span>Sincronizar automáticamente las respuestas nuevas mientras este panel esté abierto</span>
                </label>
              )}
            </div>
          )}

          {syncStatus && (
            <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-200">
              {syncStatus}
            </p>
          )}
        </div>
      </div>

      {/* Navigation Tabs + Prominent Day & Name Filters */}
      <div className="bg-white/95 border border-violet-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-violet-50 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-white text-violet-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Gráficos y Días</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('responses')}
              className={`px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'responses'
                  ? 'bg-white text-violet-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquareText className="w-4 h-4" />
              <span>Respuestas ({filteredRecords.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('share')}
              className={`px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'share'
                  ? 'bg-white text-violet-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Enlace y QR</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Buscar por nombre y apellido..."
                className="pl-9 pr-4 py-2 rounded-xl border border-violet-200 focus:border-violet-500 focus:outline-none text-sm bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="day-date-picker" className="text-xs font-bold text-violet-800 whitespace-nowrap">
                Calendario:
              </label>
              <input
                id="day-date-picker"
                type="date"
                value={selectedDay === 'ALL' ? '' : selectedDay}
                onChange={(e) => setSelectedDay(e.target.value || 'ALL')}
                className="px-3 py-2 rounded-xl border border-violet-200 focus:border-violet-500 focus:outline-none text-sm bg-white font-mono-tabular text-[#2e2344]"
              />
            </div>

            <div className="relative flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-violet-500" />
              <select
                aria-label="Seleccionar día"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-3 py-2 rounded-xl border border-violet-200 focus:border-violet-500 focus:outline-none text-sm bg-white font-medium text-[#2e2344]"
              >
                <option value="ALL">Todos los días ({records.length})</option>
                {dailySummaries.map((d) => (
                  <option key={d.dateKey} value={d.dateKey}>
                    {d.dateKey} ({d.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Clickable Day Selector Strip */}
        <div className="pt-3 border-t border-violet-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 mr-1 inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-violet-600" />
            <span>Seleccionar por día:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedDay('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap border ${
              selectedDay === 'ALL'
                ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                : 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100'
            }`}
          >
            Todos los días ({records.length})
          </button>
          {dailySummaries.map((d) => {
            const isSelected = selectedDay === d.dateKey;
            return (
              <button
                key={d.dateKey}
                type="button"
                onClick={() => setSelectedDay(isSelected ? 'ALL' : d.dateKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono-tabular transition-colors cursor-pointer whitespace-nowrap border ${
                  isSelected
                    ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                    : 'bg-white border-violet-200 text-[#2e2344] hover:bg-violet-50'
                }`}
              >
                {d.dateKey} ({d.count})
              </button>
            );
          })}
          {selectedDay !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedDay('ALL')}
              className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
            >
              Limpiar filtro ({selectedDay})
            </button>
          )}
        </div>
      </div>

      {/* TAB: SHARE & QR */}
      {activeTab === 'share' && (
        <div className="bg-white/95 border border-violet-200 rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h3 className="font-display text-2xl font-extrabold text-[#2e2344]">
              Comparte la aventura desde cualquier dispositivo
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Todos los participantes pueden ingresar al mismo tiempo desde sus celulares, tablets o computadoras usando este enlace o escaneando el código QR.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono-tabular text-slate-700"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copiado' : 'Copiar enlace'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-violet-50/70 border border-violet-200">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-violet-100">
              <QRCodeSVG value={shareUrl} size={196} bgColor="#ffffff" fgColor="#2e2344" />
            </div>
            <p className="mt-3 text-xs font-bold text-violet-800">
              Escanea para abrir «La Huella de mi Aprendizaje»
            </p>
          </div>
        </div>
      )}

      {/* TAB: ANALYTICS & DAILY SUMMARY */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/95 border border-violet-200 rounded-3xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Participantes completados</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-violet-700 font-mono-tabular">
                {filteredRecords.length}
              </p>
            </div>
            <div className="bg-white/95 border border-sky-200 rounded-3xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Días con registros</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-sky-700 font-mono-tabular">
                {dailySummaries.length}
              </p>
            </div>
            <div className="bg-white/95 border border-emerald-200 rounded-3xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Estrategia más utilizada</p>
              <p className="mt-1 text-base font-bold text-emerald-800 leading-snug">
                {stats.topFavorite}
              </p>
            </div>
            <div className="bg-white/95 border border-amber-200 rounded-3xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Dificultad más frecuente</p>
              <p className="mt-1 text-base font-bold text-amber-800 leading-snug">
                {stats.topObstacle}
              </p>
            </div>
          </div>

          {loadingRecords ? (
            <div className="bg-white/95 border border-violet-200 rounded-3xl p-12 flex items-center justify-center gap-3 text-violet-700 font-semibold">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Cargando registros en tiempo real...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white/95 border border-violet-200 rounded-3xl p-10 text-center space-y-2">
              <p className="font-display text-xl font-bold text-[#2e2344]">
                Aún no hay participaciones registradas
              </p>
              <p className="text-sm text-slate-600">
                Comparte el enlace o el código QR con los participantes para ver aquí los resultados en vivo.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white/95 border border-violet-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-bold text-[#2e2344]">
                    Registro agrupado por día
                  </h3>
                  <span className="text-xs text-slate-500">
                    Haz clic en un día para filtrar sus respuestas
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-violet-100 text-xs text-slate-500">
                        <th className="py-2.5 pr-4 font-semibold">Día</th>
                        <th className="py-2.5 pr-4 font-semibold">Participantes</th>
                        <th className="py-2.5 pr-4 font-semibold">Nombres del día</th>
                        <th className="py-2.5 pr-4 font-semibold">Estrategia más elegida</th>
                        <th className="py-2.5 pr-4 font-semibold">Obstáculo principal</th>
                        <th className="py-2.5 font-semibold">Descargar día</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySummaries.map((day) => (
                        <tr
                          key={day.dateKey}
                          onClick={() =>
                            setSelectedDay((prev) => (prev === day.dateKey ? 'ALL' : day.dateKey))
                          }
                          className={`border-b border-slate-100 cursor-pointer transition-colors ${
                            selectedDay === day.dateKey ? 'bg-violet-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 pr-4 font-mono-tabular font-bold text-violet-800 whitespace-nowrap">
                            {day.dateKey}
                          </td>
                          <td className="py-3 pr-4 font-mono-tabular font-bold text-[#2e2344]">
                            {day.count}
                          </td>
                          <td className="py-3 pr-4 text-slate-700 text-xs">
                            {day.codes.join(', ')}
                          </td>
                          <td className="py-3 pr-4 text-slate-800">{day.topFavorite}</td>
                          <td className="py-3 pr-4 text-slate-700">{day.topObstacle}</td>
                          <td
                            className="py-3 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedDay((prev) => (prev === day.dateKey ? 'ALL' : day.dateKey))
                                }
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                                  selectedDay === day.dateKey
                                    ? 'bg-violet-600 border-violet-600 text-white'
                                    : 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-800'
                                }`}
                              >
                                {selectedDay === day.dateKey ? 'Filtrando' : 'Seleccionar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadExcelForDay(day.dateKey, records)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold cursor-pointer"
                              >
                                Excel
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadCsvForDay(day.dateKey, records)}
                                className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold cursor-pointer"
                              >
                                CSV
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="bg-white/95 border border-violet-200 rounded-3xl p-8 text-center space-y-3">
                  <p className="font-display text-lg font-bold text-[#2e2344]">
                    No hay registros para el día o filtro seleccionado
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDay('ALL');
                      setSearchCode('');
                    }}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Mostrar todos los días
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-white/95 border border-violet-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                    <h3 className="font-display text-xl font-bold text-[#2e2344]">
                      Huella 1 · Uso de estrategias (SÍ / A VECES / NO)
                    </h3>
                    <div className="space-y-4">
                      {stats.h1Stats.map((item) => (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
                            <span className="font-semibold text-[#2e2344]">
                              {item.emoji} {item.label}
                            </span>
                            <span className="font-mono-tabular text-xs text-slate-600 shrink-0">
                              SÍ: {item.siPct}% ({item.si}) · A VECES: {item.avecesPct}% ({item.aveces}) · NO: {item.noPct}% ({item.no})
                            </span>
                          </div>
                          <div className="h-4 rounded-full bg-slate-100 overflow-hidden flex">
                            <div
                              style={{ width: `${item.siPct}%` }}
                              className="bg-emerald-500 h-full"
                              title={`SÍ: ${item.siPct}%`}
                            />
                            <div
                              style={{ width: `${item.avecesPct}%` }}
                              className="bg-amber-400 h-full"
                              title={`A VECES: ${item.avecesPct}%`}
                            />
                            <div
                              style={{ width: `${item.noPct}%` }}
                              className="bg-rose-400 h-full"
                              title={`NO: ${item.noPct}%`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {[
                      {
                        title: 'Huella 2 · Estrategia favorita',
                        data: stats.favDist,
                        bar: 'bg-sky-500',
                        otherLabel: '',
                        otherRecords: [] as { id: string; participantCode: string; dateKey: string; text: string }[],
                      },
                      {
                        title: 'Huella 4 · ¿Cómo se sintieron?',
                        data: stats.feelingDist,
                        bar: 'bg-pink-500',
                        otherLabel: 'Respuestas escritas en «Otra cosa»:',
                        otherRecords: stats.huella4OtherResponses.map((r) => ({
                          id: r.id,
                          participantCode: r.participantCode,
                          dateKey: r.dateKey,
                          text: r.huella4Other,
                        })),
                      },
                      {
                        title: 'Huella 5 · Obstáculos del camino',
                        data: stats.obstacleDist,
                        bar: 'bg-teal-500',
                        otherLabel: 'Respuestas escritas en «Otra dificultad»:',
                        otherRecords: stats.huella5OtherResponses.map((r) => ({
                          id: r.id,
                          participantCode: r.participantCode,
                          dateKey: r.dateKey,
                          text: r.huella5Other,
                        })),
                      },
                      {
                        title: 'Huella 6 · Lo que quieren mejorar',
                        data: stats.improveDist,
                        bar: 'bg-indigo-500',
                        otherLabel: 'Respuestas escritas en «Otra»:',
                        otherRecords: stats.huella6OtherResponses.map((r) => ({
                          id: r.id,
                          participantCode: r.participantCode,
                          dateKey: r.dateKey,
                          text: r.huella6Other,
                        })),
                      },
                    ].map((chart) => (
                      <div
                        key={chart.title}
                        className="bg-white/95 border border-violet-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
                      >
                        <h3 className="font-display text-lg font-bold text-[#2e2344]">{chart.title}</h3>
                        <div className="space-y-3">
                          {chart.data.map((row) => (
                            <div key={row.label} className="space-y-1">
                              <div className="flex justify-between gap-2 text-sm">
                                <span className="font-medium text-slate-800">{row.label}</span>
                                <span className="font-mono-tabular text-xs font-bold text-slate-600 shrink-0">
                                  {row.count} ({row.pct}%)
                                </span>
                              </div>
                              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  style={{ width: `${Math.max(row.pct, 2)}%` }}
                                  className={`h-full rounded-full ${chart.bar}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {chart.otherRecords.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <p className="text-xs font-bold text-violet-800">{chart.otherLabel}</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {chart.otherRecords.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-2xl bg-violet-50/70 border border-violet-100 px-3 py-2 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2 font-bold text-[#2e2344]">
                                    <span>{item.participantCode}</span>
                                    <span className="font-mono-tabular text-slate-500">{item.dateKey}</span>
                                  </div>
                                  <p className="mt-1 text-slate-700 whitespace-pre-line">{item.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Huella 3 & Huella 7 Open-ended Written Responses */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white/95 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-[#2e2344]">
                          Huella 3 · ¿Cuándo la utilicé? (Respuestas escritas)
                        </h3>
                        <span className="text-xs font-mono-tabular font-bold text-amber-800">
                          {stats.huella3Responses.length} respuesta(s)
                        </span>
                      </div>
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {stats.huella3Responses.map((r) => (
                          <div
                            key={r.id}
                            className="rounded-2xl bg-amber-50/80 border border-amber-200 p-3.5 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-900">
                              <span>{r.participantCode}</span>
                              <span className="font-mono-tabular text-slate-600">{r.dateKey}</span>
                            </div>
                            <p className="mt-1.5 text-slate-800 whitespace-pre-line leading-relaxed">
                              {r.huella3Moment}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/95 border border-orange-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-[#2e2344]">
                          Huella 7 · Mi próximo compromiso (Respuestas escritas)
                        </h3>
                        <span className="text-xs font-mono-tabular font-bold text-orange-800">
                          {stats.huella7Responses.length} respuesta(s)
                        </span>
                      </div>
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {stats.huella7Responses.map((r) => (
                          <div
                            key={r.id}
                            className="rounded-2xl bg-orange-50/80 border border-orange-200 p-3.5 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-orange-900">
                              <span>{r.participantCode}</span>
                              <span className="font-mono-tabular text-slate-600">{r.dateKey}</span>
                            </div>
                            <p className="mt-1.5 text-slate-800 whitespace-pre-line leading-relaxed">
                              {r.huella7Commitment}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: INDIVIDUAL & OPEN-ENDED RESPONSES GROUPED BY DAY */}
      {activeTab === 'responses' && (
        <div className="space-y-6">
          {filteredDailyGroups.length === 0 ? (
            <div className="bg-white/95 border border-violet-200 rounded-3xl p-10 text-center text-slate-600">
              No hay respuestas que coincidan con los filtros actuales.
            </div>
          ) : (
            filteredDailyGroups.map((group) => (
              <div key={group.dateKey} className="space-y-3">
                <div className="bg-violet-50/90 border border-violet-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="w-5 h-5 text-violet-600 shrink-0" />
                    <h3 className="font-display text-lg font-extrabold text-[#2e2344] font-mono-tabular">
                      Día {group.dateKey}
                    </h3>
                    <span className="text-xs font-semibold text-violet-700 font-mono-tabular">
                      · {group.records.length} registro(s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadExcelForDay(group.dateKey, filteredRecords)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel de este día</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCsvForDay(group.dateKey, filteredRecords)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV de este día</span>
                    </button>
                  </div>
                </div>

                {group.records.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white/95 border border-violet-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-display text-lg font-extrabold text-violet-800">
                          {r.participantCode}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">·</span>
                        <span className="text-xs font-mono-tabular text-slate-600">
                          {r.dateKey} ·{' '}
                          {new Date(r.createdAtIso).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">·</span>
                        <span className="text-xs text-slate-500">{r.deviceType}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteRecord(r)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer self-start sm:self-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    <div className="text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      <div>
                        <span className="font-semibold">Habit Tracker:</span> {r.huella1HabitTracker}
                      </div>
                      <div>
                        <span className="font-semibold">Respiración:</span> {r.huella1Breathing}
                      </div>
                      <div>
                        <span className="font-semibold">Bailar:</span> {r.huella1Dancing}
                      </div>
                      <div>
                        <span className="font-semibold">Mindfulness:</span> {r.huella1Mindfulness}
                      </div>
                      <div>
                        <span className="font-semibold">Estrés:</span> {r.huella1StressAwareness}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3.5">
                        <p className="text-xs font-bold text-sky-800">Huella 2 · Estrategia favorita</p>
                        <p className="mt-1 text-slate-800">{r.huella2Favorite}</p>
                      </div>
                      <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5">
                        <p className="text-xs font-bold text-amber-800">Huella 3 · ¿Cuándo la utilizó? (Abierta)</p>
                        <p className="mt-1 text-slate-800 whitespace-pre-line">{r.huella3Moment}</p>
                      </div>
                      <div className="bg-pink-50/70 border border-pink-100 rounded-2xl p-3.5">
                        <p className="text-xs font-bold text-pink-800">Huella 4 · ¿Cómo se sintió?</p>
                        <p className="mt-1 text-slate-800">{r.huella4Feeling}</p>
                        {r.huella4Other && (
                          <p className="mt-1.5 text-xs text-pink-900 bg-white/80 border border-pink-200 rounded-xl px-2.5 py-1.5 whitespace-pre-line">
                            <span className="font-bold">Otro (escrito):</span> {r.huella4Other}
                          </p>
                        )}
                      </div>
                      <div className="bg-teal-50/70 border border-teal-100 rounded-2xl p-3.5">
                        <p className="text-xs font-bold text-teal-800">Huella 5 · Obstáculos</p>
                        <p className="mt-1 text-slate-800">{r.huella5Obstacle}</p>
                        {r.huella5Other && (
                          <p className="mt-1.5 text-xs text-teal-900 bg-white/80 border border-teal-200 rounded-xl px-2.5 py-1.5 whitespace-pre-line">
                            <span className="font-bold">Otro (escrito):</span> {r.huella5Other}
                          </p>
                        )}
                      </div>
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5">
                        <p className="text-xs font-bold text-indigo-800">Huella 6 · Qué quiere mejorar</p>
                        <p className="mt-1 text-slate-800">{r.huella6Improve.join(', ')}</p>
                        {r.huella6Other && (
                          <p className="mt-1.5 text-xs text-indigo-900 bg-white/80 border border-indigo-200 rounded-xl px-2.5 py-1.5 whitespace-pre-line">
                            <span className="font-bold">Otro (escrito):</span> {r.huella6Other}
                          </p>
                        )}
                      </div>
                      <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-3.5">
                        <p className="text-xs font-bold text-orange-800">Huella 7 · Próximo compromiso (Abierta)</p>
                        <p className="mt-1 text-slate-800 whitespace-pre-line">{r.huella7Commitment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-violet-200 space-y-4">
            <h3 className="font-display text-xl font-extrabold text-[#2e2344]">
              {confirmDialog.title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{confirmDialog.description}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isConfirmRunning}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isConfirmRunning}
                onClick={async () => {
                  setIsConfirmRunning(true);
                  try {
                    await confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  } catch (err) {
                    setSyncStatus(err instanceof Error ? err.message : 'Ocurrió un error.');
                    setConfirmDialog(null);
                  } finally {
                    setIsConfirmRunning(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isConfirmRunning && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{confirmDialog.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
