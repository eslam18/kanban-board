import Column from './Column.jsx';

export default function Board({ board }) {
  const columns = Array.isArray(board.columns) ? board.columns : [];

  return (
    <section className="mx-auto max-w-7xl">
      <header className="mb-6 border-b border-gray-700 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-100">{board.name}</h1>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((column) => (
          <Column key={column.id} column={column} />
        ))}
      </div>
    </section>
  );
}
