import { useEffect, useState } from 'react';

export default function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create project (${response.status})`);
      }

      const project = await response.json();
      await onCreated(project);
      onClose();
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-5 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-100">Create Project</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="project-name" className="mb-1 block text-sm text-gray-300">
              Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none ring-0 placeholder:text-gray-500 focus:border-gray-500"
              placeholder="Project name"
              required
            />
          </div>

          <div>
            <label htmlFor="project-description" className="mb-1 block text-sm text-gray-300">
              Description
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none ring-0 placeholder:text-gray-500 focus:border-gray-500"
              placeholder="Optional one-line summary"
            />
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md border border-gray-600 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
