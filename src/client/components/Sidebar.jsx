import { useCallback, useEffect, useState } from 'react';
import CreateProjectModal from './CreateProjectModal.jsx';

const statusClasses = {
  active: {
    dot: 'bg-green-400',
    label: 'text-green-300',
  },
  completed: {
    dot: 'bg-blue-400',
    label: 'text-blue-300',
  },
  archived: {
    dot: 'bg-gray-400',
    label: 'text-gray-300',
  },
};

function getStatusClasses(status) {
  return statusClasses[status] || statusClasses.archived;
}

export default function Sidebar({ projects, selectedProjectId, onSelectProject, onProjectsChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadProjects = useCallback(
    async (preferredProjectId = null) => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error(`Failed to load projects (${response.status})`);
        }

        const list = await response.json();
        onProjectsChange(Array.isArray(list) ? list : [], preferredProjectId);
      } catch (err) {
        setError(err.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    },
    [onProjectsChange],
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function handleProjectCreated(project) {
    await loadProjects(project?.id ?? null);
    if (project?.id) {
      onSelectProject(project.id);
    }
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Workspace</p>
        <h2 className="mt-1 text-sm font-semibold tracking-wide text-gray-100">Projects</h2>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {loading ? <p className="rounded-lg px-2 py-2 text-sm text-gray-400">Loading projects...</p> : null}
        {error ? <p className="rounded-lg px-2 py-2 text-sm text-red-300">{error}</p> : null}

        {!loading && !error && projects.length === 0 ? (
          <p className="rounded-lg px-2 py-2 text-sm text-gray-400">No projects yet.</p>
        ) : null}

        {projects.map((project) => {
          const isSelected = project.id === selectedProjectId;
          const statusStyles = getStatusClasses(project.status);

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelectProject(project.id)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 ${
                isSelected
                  ? 'border-gray-700 bg-gray-900/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]'
                  : 'border-transparent bg-transparent hover:border-gray-800 hover:bg-gray-900/50'
              }`}
            >
              <div className="truncate text-sm font-medium text-gray-100">{project.name}</div>
              <div className={`mt-1.5 inline-flex items-center gap-2 text-xs capitalize ${statusStyles.label}`}>
                <span className={`h-2 w-2 rounded-full ${statusStyles.dot}`} aria-hidden="true" />
                {project.status}
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-800 p-3">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full rounded-lg border border-gray-700/90 bg-transparent px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-gray-600 hover:bg-gray-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        >
          New Project
        </button>
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleProjectCreated}
      />
    </aside>
  );
}
