import { useState, useEffect, useCallback, useRef } from 'react';
import { API_CONFIG, USE_DUMMY_API } from '@/config/api';
import { WifiOff, RefreshCw, ServerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** How often (ms) to poll /ping while disconnected & tab visible. */
const RETRY_INTERVAL = 5_000;
/** Timeout for a single ping (ms). */
const PING_TIMEOUT = 5_000;

/**
 * Custom event name dispatched by the global fetch interceptor (in Index.tsx)
 * whenever a real API call fails with a network error.
 */
export const BACKEND_UNREACHABLE_EVENT = 'backend-unreachable';

/**
 * Reactive connectivity guard — zero overhead while the backend is reachable.
 *
 * Detection (instant):
 *   • Browser `offline` event
 *   • Custom `backend-unreachable` event fired by the global fetch interceptor
 *     whenever any real API call throws a TypeError (network failure)
 *
 * Recovery (polling only when down):
 *   • Pings GET /ping every 5 s until the backend responds
 *   • Pauses polling when the tab is hidden (saves CPU + network)
 *   • Resumes on `online` event or tab focus
 *
 * Skipped entirely when USE_DUMMY_API is true.
 */
export const NetworkStatus = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Ping helper ────────────────────────────────────────────────────
  const ping = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);
      const res = await fetch(`${API_CONFIG.BASE_URL}/ping`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    } finally {
      setChecking(false);
      setLastChecked(new Date());
    }
  }, []);

  // ── Mark disconnected & start recovery polling ─────────────────────
  const startRecovery = useCallback(() => {
    setIsConnected(false);

    // Don't stack timers
    if (retryTimer.current) return;

    retryTimer.current = setInterval(async () => {
      // Pause when tab is hidden
      if (document.hidden) return;

      const ok = await ping();
      if (ok) {
        setIsConnected(true);
        if (retryTimer.current) {
          clearInterval(retryTimer.current);
          retryTimer.current = null;
        }
      }
    }, RETRY_INTERVAL);
  }, [ping]);

  // ── Stop recovery polling ──────────────────────────────────────────
  const stopRecovery = useCallback(() => {
    if (retryTimer.current) {
      clearInterval(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  // ── Initial ping on mount (one-time) ──────────────────────────────
  useEffect(() => {
    if (USE_DUMMY_API) return;
    (async () => {
      const ok = await ping();
      if (!ok) startRecovery();
    })();
    return stopRecovery;
  }, [ping, startRecovery, stopRecovery]);

  // ── Browser online / offline events ────────────────────────────────
  useEffect(() => {
    if (USE_DUMMY_API) return;

    const handleOffline = () => startRecovery();
    const handleOnline = async () => {
      const ok = await ping();
      if (ok) {
        setIsConnected(true);
        stopRecovery();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [ping, startRecovery, stopRecovery]);

  // ── Custom event fired by the global fetch interceptor ─────────────
  useEffect(() => {
    if (USE_DUMMY_API) return;

    const handleUnreachable = () => startRecovery();

    window.addEventListener(BACKEND_UNREACHABLE_EVENT, handleUnreachable);
    return () => window.removeEventListener(BACKEND_UNREACHABLE_EVENT, handleUnreachable);
  }, [startRecovery]);

  // ── Resume polling when hidden tab becomes visible again ───────────
  useEffect(() => {
    if (USE_DUMMY_API) return;

    const handleVisibility = async () => {
      if (document.hidden) return;
      // Tab just became visible — do a quick check if we were disconnected
      if (!isConnected) {
        const ok = await ping();
        if (ok) {
          setIsConnected(true);
          stopRecovery();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isConnected, ping, stopRecovery]);

  // ── Manual retry ───────────────────────────────────────────────────
  const handleRetry = async () => {
    const ok = await ping();
    if (ok) {
      setIsConnected(true);
      stopRecovery();
    }
  };

  // When connected (or dummy mode), just render children
  if (USE_DUMMY_API || isConnected) return <>{children}</>;

  // ── Disconnected overlay ──────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-900/30 animate-pulse" />
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
            {navigator.onLine ? (
              <ServerOff className="w-10 h-10 text-red-500 dark:text-red-400" />
            ) : (
              <WifiOff className="w-10 h-10 text-red-500 dark:text-red-400" />
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {navigator.onLine ? 'Server Unreachable' : 'No Network Connection'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            {navigator.onLine
              ? 'Unable to connect to the AttendanceHub server. Please make sure you are connected to the office network.'
              : 'Your device is offline. Please check your network cable or Wi-Fi connection to the office network.'}
          </p>
        </div>

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-xs text-red-700 dark:text-red-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          {checking ? 'Checking connection…' : 'Reconnecting automatically…'}
        </div>

        {/* Retry button */}
        <Button
          onClick={handleRetry}
          disabled={checking}
          variant="outline"
          className="mx-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          Retry Now
        </Button>

        {/* Last checked */}
        {lastChecked && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
};
