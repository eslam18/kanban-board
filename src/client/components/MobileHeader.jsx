const statusClasses = {
  active: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
  completed: 'border-blue-400/40 bg-blue-500/20 text-blue-200',
  archived: 'border-gray-500/50 bg-gray-600/20 text-gray-300',
};

function getStatusClass(status) {
  return statusClasses[status] || statusClasses.archived;
}

export default function MobileHeader({
  project,
  boardId,
  isSidebarOpen,
  isActivityOpen,
  onToggleSidebar,
  onToggleActivity,
  onOpenChangePassword,
  onLogout,
}) {
  const projectName = project?.name || 'No project selected';
  const projectStatus = project?.status || 'archived';

  return (
    <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-950 px-3 py-2">
      <button
        type="button"
        aria-label={isSidebarOpen ? 'Close project drawer' : 'Open project drawer'}
        aria-expanded={isSidebarOpen}
        onClick={onToggleSidebar}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-700 text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M3.5 5.5h13" strokeLinecap="round" />
          <path d="M3.5 10h13" strokeLinecap="round" />
          <path d="M3.5 14.5h13" strokeLinecap="round" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-100">{projectName}</p>
        <span
          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${getStatusClass(
            projectStatus,
          )}`}
        >
          {projectStatus}
        </span>
      </div>

      {typeof onOpenChangePassword === 'function' ? (
        <button
          type="button"
          aria-label="Open account settings"
          onClick={onOpenChangePassword}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-gray-600 px-3 text-xs font-medium text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        >
          Account
        </button>
      ) : null}

      {typeof onLogout === 'function' ? (
        <button
          type="button"
          aria-label="Logout"
          onClick={onLogout}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-gray-600 px-3 text-xs font-medium text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        >
          Logout
        </button>
      ) : null}

      <button
        type="button"
        aria-label="Toggle activity log"
        onClick={onToggleActivity}
        disabled={!boardId}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-gray-600 px-3 text-xs font-medium text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isActivityOpen ? 'Close' : 'Activity'}
      </button>
    </div>
  );
}
