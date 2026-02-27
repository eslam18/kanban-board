import { useEffect, useRef, useState } from 'react';
import Column from './Column.jsx';

export default function Board({ board }) {
  const columns = Array.isArray(board.columns) ? board.columns : [];
  const scrollerRef = useRef(null);
  const columnNodesRef = useRef({});
  const [activeColumnId, setActiveColumnId] = useState(() => String(columns[0]?.id ?? ''));

  useEffect(() => {
    const columnIds = columns.map((column) => String(column.id));

    setActiveColumnId((currentActiveColumnId) => {
      if (columnIds.includes(currentActiveColumnId)) {
        return currentActiveColumnId;
      }

      return columnIds[0] ?? '';
    });
  }, [columns]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const scrollerNode = scrollerRef.current;
    if (!scrollerNode) {
      return undefined;
    }

    const observedNodes = columns
      .map((column) => columnNodesRef.current[String(column.id)])
      .filter(Boolean);

    if (observedNodes.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingEntries = entries.filter((entry) => entry.isIntersecting);
        if (intersectingEntries.length === 0) {
          return;
        }

        const mostVisibleEntry = intersectingEntries.reduce((bestEntry, currentEntry) =>
          currentEntry.intersectionRatio > bestEntry.intersectionRatio ? currentEntry : bestEntry,
        );

        const nextActiveColumnId = mostVisibleEntry.target.dataset.columnId;
        if (nextActiveColumnId) {
          setActiveColumnId(nextActiveColumnId);
        }
      },
      {
        root: scrollerNode,
        threshold: [0.25, 0.5, 0.75, 0.9],
      },
    );

    observedNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [columns]);

  function handleColumnSwitch(columnId) {
    const node = columnNodesRef.current[columnId];
    if (!node) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setActiveColumnId(columnId);
    node.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest',
    });
  }

  return (
    <section className="min-w-0">
      {columns.length > 0 ? (
        <nav className="mb-3 lg:hidden" aria-label="Column switcher">
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
            {columns.map((column) => {
              const columnId = String(column.id);
              const isActive = activeColumnId === columnId;

              return (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => handleColumnSwitch(columnId)}
                  className={`h-10 max-w-44 shrink-0 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 ${
                    isActive
                      ? 'border-gray-500 bg-gray-700 text-gray-100'
                      : 'border-gray-700 bg-gray-900/70 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span className="block truncate">{column.name}</span>
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}

      <div
        ref={scrollerRef}
        aria-label="Board columns"
        className="min-w-0 overflow-x-auto snap-x snap-mandatory scroll-smooth lg:overflow-x-visible lg:snap-none"
      >
        <div className="flex min-w-0 flex-nowrap gap-4">
          {columns.map((column) => (
            <div
              key={column.id}
              data-column-id={String(column.id)}
              ref={(node) => {
                const columnId = String(column.id);
                if (node) {
                  columnNodesRef.current[columnId] = node;
                } else {
                  delete columnNodesRef.current[columnId];
                }
              }}
              className="min-w-0 w-full shrink-0 snap-start lg:w-auto lg:min-w-0 lg:flex-1 lg:snap-none"
            >
              <Column column={column} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
