import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG, USE_DUMMY_API } from '@/config/api';
import { WifiOff, RefreshCw, ServerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** How often (ms) to ping the backend while connected. */
const PING_INTERVAL = 15_000;
/** How often (ms) to retry when disconnected. */
const RETRY_INTERVAL = 5_000;
/** Timeout for a single ping request (ms). */
const PING_TIMEOUT = 5_000;

/**
 * Full-screen overlay shown when the backend is unreachable.
 * Periodically pings `GET /ping` and auto-recovers once the backend responds.
 * Skipped entirely when running in dummy-API mode.
 */
export const NetworkStatus = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const ping = useCallback(async () => {
    if (USE_DUMMY_API) return; // no backend to ping
    setChecking(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);

      const res = await fetch(`${API_CONFIG.BASE_URL}/ping`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      setIsConnected(res.ok);
    } catch {
      setIsConnected(false);
    } finally {
      setChecking(false);
      setLastChecked(new Date());
    }
  }, []);

  // Initial check + periodic polling
  useEffect(() => {
    if (USE_DUMMY_API) return;

    // Check immediately on mount
    ping();

    const id = setInterval(ping, isConnected ? PING_INTERVAL : RETRY_INTERVAL);
    return () => clearInterval(id);
  }, [ping, isConnected]);

  // Also listen to browser online/offline events
  useEffect(() => {
    if (USE_DUMMY_API) return;

    const goOnline = () => ping();
    const goOffline = () => setIsConnected(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [ping]);

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
          onClick={ping}
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
