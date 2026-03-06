import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.ts';

const typeClasses = {
  info: {
    dot: 'bg-sky-400',
    label: 'text-sky-200',
  },
  success: {
    dot: 'bg-emerald-400',
    label: 'text-emerald-200',
  },
  warning: {
    dot: 'bg-amber-400',
    label: 'text-amber-200',
  },
  error: {
    dot: 'bg-red-400',
    label: 'text-red-200',
  },
};

function getTypeClass(type) {
  return typeClasses[type] || typeClasses.info;
}

function formatTimestamp(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ActivityLog({ boardId, isOpen, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !boardId) {
      return;
    }

    const controller = new AbortController();

    async function loadLog() {
      try {
        setLoading(true);
        setError('');

        const response = await apiFetch(`/api/boards/${boardId}/log`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load activity log (${response.status})`);
        }

        const payload = await response.json();
        setEntries(Array.isArray(payload) ? payload : []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unexpected error');
        }
      } finally {
        setLoading(false);
      }
    }

    loadLog();

    return () => controller.abort();
  }, [boardId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  const desktopPanelClasses = useMemo(
    () =>
      [
        'fixed inset-y-0 right-0 z-50 flex h-full w-[400px] max-w-full flex-col border-l border-gray-700 bg-gray-900/95 p-5 shadow-2xl shadow-black/50 backdrop-blur transition-transform duration-300 ease-out',
        isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      ].join(' '),
    [isOpen],
  );

  const mobileSheetClasses = useMemo(
    () =>
      [
        'fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border border-b-0 border-gray-700 bg-gray-900/95 shadow-2xl shadow-black/60 backdrop-blur transition-transform duration-300 ease-out lg:hidden',
        isOpen ? 'translate-y-0' : 'pointer-events-none translate-y-full',
      ].join(' '),
    [isOpen],
  );

  const backdropClasses = useMemo(
    () =>
      [
        'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' '),
    [isOpen],
  );

  const entriesBody = (
    <>
      {loading ? <p className="text-sm text-gray-300">Loading activity...</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {!loading && !error && entries.length === 0 ? <p className="text-sm text-gray-400">No activity yet.</p> : null}

      {!loading &&
        !error &&
        entries.map((entry) => {
          const typeClass = getTypeClass(entry.type);

          return (
            <article
              key={entry.id}
              className="rounded-lg border border-gray-700 bg-gray-800/70 p-3 text-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${typeClass.dot}`} aria-hidden="true" />
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${typeClass.label}`}>
                    {entry.type || 'info'}
                  </span>
                </span>
                <time className="text-xs text-gray-400">{formatTimestamp(entry.created_at)}</time>
              </div>

              <p className="leading-relaxed text-gray-200">{entry.message}</p>
            </article>
          );
        })}
    </>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Close activity log"
        data-testid="activity-log-backdrop"
        className={backdropClasses}
        onClick={() => onClose?.()}
      />

      <div className="hidden lg:block">
        <aside
          className={desktopPanelClasses}
          aria-hidden={!isOpen}
          data-testid="activity-log-desktop-panel"
        >
          <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-3">
            <h2 className="text-lg font-semibold text-gray-100">Recent Activity</h2>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-md border border-gray-600 px-2 py-1 text-xs font-medium text-gray-200 transition hover:border-gray-500 hover:bg-gray-800"
            >
              Close
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-6">{entriesBody}</div>
        </aside>
      </div>

      <aside className={mobileSheetClasses} aria-hidden={!isOpen} data-testid="activity-log-mobile-sheet">
        <div className="px-4 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-600/70" aria-hidden="true" />
          <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-3">
            <h2 className="text-base font-semibold text-gray-100">Recent Activity</h2>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-md border border-gray-600 px-2 py-1 text-xs font-medium text-gray-200 transition hover:border-gray-500 hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-6">{entriesBody}</div>
      </aside>
    </>
  );
}
