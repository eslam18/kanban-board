const statusClasses = {
  pending: 'bg-gray-600 text-white',
  building: 'bg-blue-600 text-white',
  reviewing: 'bg-violet-600 text-white',
  retrying: 'bg-amber-600 text-white',
  done: 'bg-emerald-600 text-white',
  failed: 'bg-red-600 text-white',
};

function getStatusClass(status) {
  return statusClasses[status] || statusClasses.pending;
}

export default function Card({ card }) {
  const description = (card.description || '').trim();
  const snippet = description.length > 120 ? `${description.slice(0, 120)}...` : description;
  const retries = Number(card.retries) || 0;

  return (
    <article className="rounded-lg border border-gray-700 bg-gray-800 p-3.5 transition-colors hover:border-gray-600">
      <h3 className="text-sm font-semibold text-gray-100">{card.title}</h3>

      {snippet ? <p className="mt-2 text-xs leading-relaxed text-gray-300">{snippet}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold capitalize ${getStatusClass(card.status)}`}
        >
          {card.status}
        </span>

        {retries > 0 ? (
          <span className="inline-flex rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-100">
            Retries: {retries}
          </span>
        ) : null}
      </div>
    </article>
  );
}
