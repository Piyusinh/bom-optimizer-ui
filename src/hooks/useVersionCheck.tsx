import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

const VERSION_TOAST_ID = 'new-version-available';
const POLL_INTERVAL_MS = 60_000; // check every minute

/** Extract the Vite bundle hash (e.g. "index-CYaEu9Ei.js" -> "CYaEu9Ei") from an HTML string. */
function extractBundleHash(html: string): string | null {
  const match = html.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/);
  return match ? match[1] : null;
}

/** The build hash of the app currently running in this tab, read from the live DOM. */
function currentBundleHash(): string | null {
  const script = document.querySelector<HTMLScriptElement>(
    'script[src*="/assets/index-"]',
  );
  if (!script?.src) return null;
  const match = script.src.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/);
  return match ? match[1] : null;
}

/**
 * Polls the server copy of index.html and compares its bundle hash to the
 * hash of the bundle currently running. When a rebuild has been deployed,
 * the hashes differ — meaning this tab is running stale code — and the user
 * gets a persistent toast offering a one-click reload.
 *
 * This is the belt-and-suspenders complement to the server's
 * `Cache-Control: no-store` on index.html: that header stops the browser
 * from *starting* on a stale page, while this hook handles tabs that were
 * already open when a new build was deployed.
 *
 * Production only — in `vite dev` the module script has no content hash, so
 * there is nothing meaningful to compare.
 */
export function useVersionCheck() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    let notified = false;

    const check = async () => {
      if (notified) return;
      try {
        const res = await fetch('/', { cache: 'no-store' });
        if (!res.ok) return;
        const remoteHash = extractBundleHash(await res.text());
        const localHash = currentBundleHash();
        if (!remoteHash || !localHash || remoteHash === localHash) return;

        notified = true;
        toast(
          (t) => (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">
                A new version is available.
              </span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
              >
                Refresh now
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Later
              </button>
            </div>
          ),
          { id: VERSION_TOAST_ID, duration: Infinity },
        );
      } catch {
        // Never toast on network errors — this is a passive check.
      }
    };

    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
