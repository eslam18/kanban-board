import { useEffect } from 'react';

export default function AppShell({ sidebar, header, isSidebarOpen, onSidebarClose, children }) {
  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onSidebarClose?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, onSidebarClose]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isSidebarOpen]);

  const sidebarContainerClasses = [
    'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:static lg:z-auto lg:shrink-0 lg:translate-x-0',
    isSidebarOpen
      ? 'translate-x-0 pointer-events-auto'
      : '-translate-x-full pointer-events-none lg:pointer-events-auto',
  ].join(' ');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
      <button
        type="button"
        aria-label="Close project drawer"
        data-testid="app-shell-backdrop"
        onClick={onSidebarClose}
        className={[
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 lg:hidden',
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      <div className={sidebarContainerClasses} data-testid="app-shell-drawer">
        <div className="relative h-full">
          <button
            type="button"
            aria-label="Close project drawer"
            data-testid="app-shell-drawer-close"
            onClick={onSidebarClose}
            className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-700 bg-gray-900/90 text-gray-100 transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 lg:hidden"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M5 5l10 10" strokeLinecap="round" />
              <path d="M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>

          {sidebar}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {header ? <header className="shrink-0">{header}</header> : null}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
