import Column from './Column.jsx';

export default function Board({ board }) {
  const columns = Array.isArray(board.columns) ? board.columns : [];

  return (
    <section className="min-w-0">
      <div className="flex min-w-0 gap-4">
        {columns.map((column) => (
          <Column key={column.id} column={column} />
        ))}
      </div>
    </section>
  );
}
