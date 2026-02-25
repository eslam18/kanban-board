import { useCallback, useEffect, useState } from 'react';
import CreateProjectModal from './CreateProjectModal.jsx';

const statusClasses = {
  active: {
    pill: 'bg-green-600/20 text-green-300 border-green-500/40',
    dot: 'bg-green-400',
  },
  completed: {
    pill: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
    dot: 'bg-blue-400',
  },
  archived: {
    pill: 'bg-gray-600/20 text-gray-300 border-gray-500/40',
    dot: 'bg-gray-400',
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
    <aside className="fixed left-0 top-0 flex h-screen w-[260px] flex-col border-r border-gray-800 bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Projects</h2>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {loading ? <p className="px-2 py-2 text-sm text-gray-400">Loading projects...</p> : null}
        {error ? <p className="px-2 py-2 text-sm text-red-300">{error}</p> : null}

        {!loading && !error && projects.length === 0 ? (
          <p className="px-2 py-2 text-sm text-gray-400">No projects yet.</p>
        ) : null}

        {projects.map((project) => {
          const isSelected = project.id === selectedProjectId;
          const statusStyles = getStatusClasses(project.status);

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelectProject(project.id)}
              className={`w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-gray-800 ${
                isSelected
                  ? 'border-gray-600 bg-gray-800/80'
                  : 'border-transparent bg-transparent'
              }`}
            >
              <div className="mb-1 text-sm font-medium text-gray-100">{project.name}</div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusStyles.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} aria-hidden="true" />
                {project.status}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-800 p-3">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full rounded-md border border-gray-700 px-3 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800"
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
