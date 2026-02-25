import { useEffect, useState } from 'react';
import Board from './components/Board.jsx';
import ActivityLog from './components/ActivityLog.jsx';

export default function App() {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBoard() {
      try {
        setLoading(true);
        setError('');

        const boardsResponse = await fetch('/api/boards', { signal: controller.signal });
        if (!boardsResponse.ok) {
          throw new Error(`Failed to load boards (${boardsResponse.status})`);
        }

        const boards = await boardsResponse.json();
        if (!Array.isArray(boards) || boards.length === 0) {
          setBoard(null);
          return;
        }

        const firstBoardId = boards[0].id;
        const boardResponse = await fetch(`/api/boards/${firstBoardId}`, { signal: controller.signal });
        if (!boardResponse.ok) {
          throw new Error(`Failed to load board ${firstBoardId} (${boardResponse.status})`);
        }

        const boardPayload = await boardResponse.json();
        setBoard(boardPayload);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unexpected error');
        }
      } finally {
        setLoading(false);
      }
    }

    loadBoard();

    return () => controller.abort();
  }, []);

  if (loading) {
    return <main className="p-6 text-gray-300">Loading board...</main>;
  }

  if (error) {
    return <main className="p-6 text-red-300">{error}</main>;
  }

  if (!board) {
    return <main className="p-6 text-gray-300">No boards found.</main>;
  }

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-100">
      <header className="mx-auto mb-4 flex w-full max-w-7xl items-center justify-between border-b border-gray-700 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-100">{board.name}</h1>
        <button
          type="button"
          onClick={() => setIsActivityOpen((prev) => !prev)}
          className="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-100 hover:bg-gray-800"
        >
          Activity
        </button>
      </header>

      <Board board={board} />
      <ActivityLog
        boardId={board.id}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
    </main>
  );
}
