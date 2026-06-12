type LegalDocumentProps = {
  title: string;
  lead?: string;
  tableOfContents?: { id: string; label: string }[];
  children: React.ReactNode;
};

export default function LegalDocument({
  title,
  lead,
  tableOfContents,
  children,
}: LegalDocumentProps) {
  return (
    <div>
      <section className="bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 text-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold drop-shadow tracking-tight">
            {title}
          </h1>
          {lead ? <p className="mt-3 opacity-95">{lead}</p> : null}
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        {tableOfContents?.length ? (
          <nav
            aria-labelledby="legal-toc-heading"
            className="mb-8 rounded-lg border border-slate-200 bg-white/80 p-5 shadow-sm sm:mb-10 sm:p-6"
          >
            <h2
              id="legal-toc-heading"
              className="text-sm font-bold text-slate-900"
            >
              目次
            </h2>
            <ol className="mt-4 grid gap-2 text-sm leading-6 text-slate-700 sm:grid-cols-2 sm:gap-x-6">
              {tableOfContents.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="inline-flex rounded-sm underline-offset-4 hover:text-brand hover:underline"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="space-y-7 text-slate-700 leading-7 sm:space-y-8 sm:leading-relaxed">
          {children}
        </div>
      </article>
    </div>
  );
}
