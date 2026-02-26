import { useState } from 'react';

const statusClasses = {
  active: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
  completed: 'border-blue-400/40 bg-blue-500/20 text-blue-200',
  archived: 'border-gray-500/50 bg-gray-600/20 text-gray-300',
};

function getStatusClass(status) {
  return statusClasses[status] || statusClasses.archived;
}

const statusOptions = ['active', 'completed', 'archived'];

export default function ProjectHeader({ project, onProjectUpdated }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!project) {
    return null;
  }

  async function handleStatusChange(event) {
    const nextStatus = event.target.value;
    if (!nextStatus || nextStatus === project.status) {
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status (${response.status})`);
      }

      const updatedProject = await response.json();
      onProjectUpdated?.(updatedProject);
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <header className="mb-5 border-b border-gray-800 pb-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-100">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {project.description && project.description.trim() ? project.description : 'No description'}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getStatusClass(
              project.status,
            )}`}
          >
            {project.status}
          </span>

          <label htmlFor="project-status" className="text-xs font-medium text-gray-300">
            Status
          </label>
          <select
            id="project-status"
            value={project.status}
            onChange={handleStatusChange}
            disabled={isSaving}
            className="rounded-md border border-gray-600 bg-gray-950 px-2.5 py-1.5 text-xs font-medium capitalize text-gray-100 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isSaving ? <p className="mt-2 text-xs text-gray-400">Saving status...</p> : null}
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </header>
  );
}
