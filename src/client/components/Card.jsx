const statusClasses = {
  pending: 'bg-gray-500 text-white',
  building: 'bg-blue-500 text-white',
  reviewing: 'bg-purple-500 text-white',
  retrying: 'bg-yellow-500 text-black',
  done: 'bg-green-500 text-white',
  failed: 'bg-red-500 text-white',
};

function getStatusClass(status) {
  return statusClasses[status] || statusClasses.pending;
}

export default function Card({ card }) {
  const description = (card.description || '').trim();
  const snippet = description.length > 120 ? `${description.slice(0, 120)}...` : description;

  return (
    <article className="rounded-md border border-gray-700 bg-gray-800 p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-medium text-gray-100">{card.title}</h3>

      {snippet ? <p className="mb-3 text-xs leading-relaxed text-gray-300">{snippet}</p> : null}

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${getStatusClass(card.status)}`}
        >
          {card.status}
        </span>

        {card.retries > 0 ? (
          <span className="inline-flex rounded-full bg-yellow-500 px-2.5 py-1 text-[11px] font-medium text-black">
            Retries: {card.retries}
          </span>
        ) : null}
      </div>
    </article>
  );
}
