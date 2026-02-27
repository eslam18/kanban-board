import { useEffect, useMemo, useState } from 'react';

function TabButton({ active, children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        active
          ? 'rounded-md bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white'
          : 'rounded-md px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-40'
      }
    >
      {children}
    </button>
  );
}

export default function DocsPanel({ projectId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [docInfo, setDocInfo] = useState(null);
  const [activeDoc, setActiveDoc] = useState('DESIGN.md');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const approval = useMemo(() => docInfo?.docs?.['DESIGN.md']?.approval ?? 'PENDING', [docInfo]);
  const repoUrl = useMemo(() => docInfo?.repoUrl ?? null, [docInfo]);
  const exists = useMemo(() => docInfo?.docs?.[activeDoc]?.exists ?? false, [docInfo, activeDoc]);

  async function loadDocInfo() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/docs`);
      if (!res.ok) throw new Error(`Failed to load docs (${res.status})`);
      const data = await res.json();
      setDocInfo(data);
    } catch (e) {
      setError(e.message || 'Failed to load docs');
    } finally {
      setLoading(false);
    }
  }

  async function loadDoc(name) {
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/docs/${encodeURIComponent(name)}`);
      if (res.status === 404) {
        setContent('');
        return;
      }
      if (!res.ok) throw new Error(`Failed to load ${name} (${res.status})`);
      const data = await res.json();
      setContent(data.content ?? '');
    } catch (e) {
      setError(e.message || `Failed to load ${name}`);
    }
  }

  useEffect(() => {
    if (!isOpen || !projectId) return;
    void loadDocInfo();
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    void loadDoc(activeDoc);
  }, [isOpen, projectId, activeDoc]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/docs/${encodeURIComponent(activeDoc)}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      );
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      await loadDocInfo();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/docs/approve`, { method: 'POST' });
      if (!res.ok) throw new Error(`Approve failed (${res.status})`);
      await loadDocInfo();
      if (activeDoc !== 'DESIGN.md') setActiveDoc('DESIGN.md');
      await loadDoc('DESIGN.md');
    } catch (e) {
      setError(e.message || 'Approve failed');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-100">Planning Docs</h2>
          <span className="rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-200">
            Approval: <span className={approval === 'APPROVED' ? 'text-green-300' : 'text-yellow-200'}>{approval}</span>
          </span>
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-gray-800 px-2 py-1 text-xs text-blue-200 hover:bg-gray-700"
              title={repoUrl}
            >
              Repo
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={saving || approval === 'APPROVED' || !docInfo?.docs?.['DESIGN.md']?.exists}
            className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !exists}
            className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-900"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-900 px-4 py-2">
        <TabButton active={activeDoc === 'BRIEF.md'} onClick={() => setActiveDoc('BRIEF.md')}>
          BRIEF
        </TabButton>
        <TabButton active={activeDoc === 'DESIGN.md'} onClick={() => setActiveDoc('DESIGN.md')}>
          DESIGN
        </TabButton>
        <TabButton active={activeDoc === 'PLAN_SUMMARY.md'} onClick={() => setActiveDoc('PLAN_SUMMARY.md')}>
          SUMMARY
        </TabButton>
        <div className="ml-auto text-xs text-gray-500">
          {loading ? 'Loading…' : docInfo?.projectDir ? `Dir: ${docInfo.projectDir}` : ''}
        </div>
      </div>

      {error ? (
        <div className="px-4 py-2 text-sm text-red-300">{error}</div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none rounded-lg border border-gray-800 bg-black p-3 font-mono text-xs leading-relaxed text-gray-100 outline-none focus:border-gray-600"
          placeholder={loading ? 'Loading…' : exists ? '' : 'File not found.'}
          disabled={loading || saving}
        />
      </div>
    </div>
  );
}
