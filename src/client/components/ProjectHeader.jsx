import { useState } from 'react';

const statusClasses = {
  active: 'bg-green-600/20 text-green-300 border-green-500/40',
  completed: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  archived: 'bg-gray-600/20 text-gray-300 border-gray-500/40',
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
    <header className="mb-4 rounded-lg border border-gray-700 bg-gray-900/80 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-100">{project.name}</h1>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getStatusClass(
            project.status,
          )}`}
        >
          {project.status}
        </span>
        <label className="ml-auto flex items-center gap-2 text-xs text-gray-300">
          Status
          <select
            value={project.status}
            onChange={handleStatusChange}
            disabled={isSaving}
            className="rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-xs capitalize text-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm text-gray-300">
        {project.description && project.description.trim() ? project.description : 'No description'}
      </p>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </header>
  );
}
