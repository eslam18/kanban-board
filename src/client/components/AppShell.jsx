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

  const sidebarContainerClasses = [
    'fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out lg:static lg:z-auto lg:shrink-0 lg:translate-x-0',
    isSidebarOpen
      ? 'translate-x-0 pointer-events-auto'
      : '-translate-x-full pointer-events-none lg:pointer-events-auto',
  ].join(' ');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
      <button
        type="button"
        aria-label="Close project drawer"
        onClick={onSidebarClose}
        className={[
          'fixed inset-0 z-30 bg-black/60 transition-opacity duration-200 lg:hidden',
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      <div className={sidebarContainerClasses}>{sidebar}</div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {header ? <header className="shrink-0">{header}</header> : null}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
