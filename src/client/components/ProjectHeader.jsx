const statusClasses = {
  active: 'bg-green-600/20 text-green-300 border-green-500/40',
  completed: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  archived: 'bg-gray-600/20 text-gray-300 border-gray-500/40',
};

function getStatusClass(status) {
  return statusClasses[status] || statusClasses.archived;
}

export default function ProjectHeader({ project }) {
  if (!project) {
    return null;
  }

  return (
    <header className="mb-4 rounded-lg border border-gray-700 bg-gray-900/80 p-4">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-100">{project.name}</h1>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getStatusClass(
            project.status,
          )}`}
        >
          {project.status}
        </span>
      </div>
      <p className="text-sm text-gray-300">
        {project.description && project.description.trim() ? project.description : 'No description'}
      </p>
    </header>
  );
}
