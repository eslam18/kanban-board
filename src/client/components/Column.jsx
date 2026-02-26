import Card from './Card.jsx';

export default function Column({ column }) {
  const cards = Array.isArray(column.cards) ? column.cards : [];

  return (
    <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-gray-700/80 bg-gray-800/50 p-4">
      <header className="mb-3 flex items-center justify-between border-b border-gray-700/70 pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">{column.name}</h2>
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-gray-700/90 px-2 py-0.5 text-xs font-medium text-gray-200">
          {cards.length}
        </span>
      </header>

      <div className="space-y-3">
        {cards.length > 0 ? (
          cards.map((card) => <Card key={card.id} card={card} />)
        ) : (
          <p className="rounded-md border border-gray-700/80 bg-gray-900/20 p-3 text-xs text-gray-400">
            No cards
          </p>
        )}
      </div>
    </section>
  );
}
