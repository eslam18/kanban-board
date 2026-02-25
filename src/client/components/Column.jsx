import Card from './Card.jsx';

export default function Column({ column }) {
  const cards = Array.isArray(column.cards) ? column.cards : [];

  return (
    <section className="w-72 flex-none rounded-lg border border-gray-700 bg-gray-800/70 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-200">{column.name}</h2>

      <div className="space-y-3">
        {cards.length > 0 ? (
          cards.map((card) => <Card key={card.id} card={card} />)
        ) : (
          <p className="rounded-md border border-dashed border-gray-700 p-3 text-xs text-gray-400">
            No cards
          </p>
        )}
      </div>
    </section>
  );
}
