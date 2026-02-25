import Column from './Column.jsx';

export default function Board({ board }) {
  const columns = Array.isArray(board.columns) ? board.columns : [];

  return (
    <section>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((column) => (
          <Column key={column.id} column={column} />
        ))}
      </div>
    </section>
  );
}
