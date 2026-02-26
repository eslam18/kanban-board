import { useCallback, useEffect, useState } from 'react';

export default function LogsPanel({ projectId, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [projectDir, setProjectDir] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [logContent, setLogContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/logs`);
      if (!res.ok) throw new Error(`Failed to load logs (${res.status})`);
      const data = await res.json();
      setLogs(data.logs || []);
      setProjectDir(data.projectDir || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchLogContent = useCallback(async (filename) => {
    if (!projectId) return;
    setSelectedLog(filename);
    setLogContent(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/logs/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error(`Failed to load ${filename}`);
      const data = await res.json();
      setLogContent(data);
    } catch (err) {
      setLogContent({ error: err.message });
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchLogs();
    }
  }, [isOpen, projectId, fetchLogs]);

  if (!isOpen) return null;

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex max-h-[50vh] flex-col border-b border-gray-700 bg-gray-900 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-100">Build Logs</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            onClick={() => { onClose(); setSelectedLog(null); setLogContent(null); }}
            className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading && <p className="text-sm text-gray-400">Loading...</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Log file list */}
        {!selectedLog && !loading && (
          <div className="space-y-1">
            {projectDir && (
              <p className="mb-3 text-xs text-gray-500 font-mono break-all">{projectDir}/logs/</p>
            )}
            {logs.length === 0 && <p className="text-sm text-gray-400">No log files found.</p>}
            {logs.map((log) => (
              <button
                key={log.name}
                type="button"
                onClick={() => fetchLogContent(log.name)}
                className="w-full rounded-lg border border-gray-700 px-3 py-2 text-left transition hover:border-gray-500 hover:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-mono ${
                    log.name.endsWith('.json') ? 'text-yellow-300' :
                    log.name.includes('pipeline') ? 'text-blue-300' :
                    log.name.includes('result') ? 'text-green-300' :
                    'text-gray-200'
                  }`}>
                    {log.name}
                  </span>
                  <span className="text-xs text-gray-500">{formatSize(log.size)}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{formatTime(log.modified)}</div>
              </button>
            ))}
          </div>
        )}

        {/* Log file content */}
        {selectedLog && (
          <div>
            <button
              type="button"
              onClick={() => { setSelectedLog(null); setLogContent(null); }}
              className="mb-3 text-xs text-blue-400 hover:text-blue-300"
            >
              ← Back to log list
            </button>
            <h3 className="mb-2 text-sm font-mono text-gray-200">{selectedLog}</h3>

            {!logContent && <p className="text-sm text-gray-400">Loading...</p>}

            {logContent?.error && <p className="text-sm text-red-400">{logContent.error}</p>}

            {/* JSON result files */}
            {logContent && !logContent.error && !logContent.content && (
              <pre className="whitespace-pre overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-green-300 font-mono max-h-[30vh] overflow-auto">
                {JSON.stringify(logContent, null, 2)}
              </pre>
            )}

            {/* Log text files */}
            {logContent?.content && (
              <>
                <p className="mb-2 text-xs text-gray-500">
                  {logContent.returnedLines} / {logContent.totalLines} lines
                </p>
                <pre className="whitespace-pre overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300 font-mono max-h-[30vh] overflow-auto leading-relaxed">
                  {logContent.content}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
