import { useEffect, useMemo, useState } from 'react';

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

        const response = await fetch(`/api/boards/${boardId}/log`, {
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

  const panelClasses = useMemo(
    () =>
      [
        'fixed inset-y-0 right-0 z-40 h-full w-[400px] max-w-full border-l border-gray-700 bg-gray-900/95 p-5 shadow-2xl shadow-black/50 backdrop-blur transition-transform duration-300 ease-out',
        isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      ].join(' '),
    [isOpen],
  );

  const backdropClasses = useMemo(
    () =>
      [
        'fixed inset-0 z-30 bg-black/50 transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' '),
    [isOpen],
  );

  return (
    <>
      <button
        type="button"
        aria-label="Close activity log"
        className={backdropClasses}
        onClick={onClose}
      />

      <aside className={panelClasses} aria-hidden={!isOpen}>
        <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-3">
          <h2 className="text-lg font-semibold text-gray-100">Recent Activity</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-600 px-2 py-1 text-xs font-medium text-gray-200 transition hover:border-gray-500 hover:bg-gray-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pb-6">
          {loading ? <p className="text-sm text-gray-300">Loading activity...</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          {!loading && !error && entries.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : null}

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
        </div>
      </aside>
    </>
  );
}
