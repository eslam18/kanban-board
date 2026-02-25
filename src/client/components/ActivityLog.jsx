import { useEffect, useMemo, useState } from 'react';

const typeClasses = {
  info: 'border-gray-500/40 bg-gray-800 text-gray-200',
  success: 'border-green-500/40 bg-green-900/20 text-green-200',
  warning: 'border-yellow-500/40 bg-yellow-900/20 text-yellow-200',
  error: 'border-red-500/40 bg-red-900/20 text-red-200',
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
        'fixed right-0 top-0 z-30 h-full w-full max-w-md border-l border-gray-700 bg-gray-900/95 p-4 shadow-2xl backdrop-blur transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' '),
    [isOpen],
  );

  return (
    <>
      {isOpen ? <button type="button" aria-label="Close activity log" className="fixed inset-0 z-20 bg-black/40" onClick={onClose} /> : null}

      <aside className={panelClasses} aria-hidden={!isOpen}>
        <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-3">
          <h2 className="text-lg font-semibold text-gray-100">Recent Activity</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pb-8">
          {loading ? <p className="text-sm text-gray-300">Loading activity...</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          {!loading && !error && entries.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : null}

          {!loading &&
            !error &&
            entries.map((entry) => (
              <article
                key={entry.id}
                className={`rounded-md border p-3 text-sm ${getTypeClass(entry.type)}`}
              >
                <p className="mb-1 text-xs text-gray-400">{formatTimestamp(entry.created_at)}</p>
                <p className="leading-relaxed">{entry.message}</p>
              </article>
            ))}
        </div>
      </aside>
    </>
  );
}
