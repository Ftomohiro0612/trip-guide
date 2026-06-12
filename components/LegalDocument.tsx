type LegalDocumentProps = {
  title: string;
  lead?: string;
  children: React.ReactNode;
};

export default function LegalDocument({
  title,
  lead,
  children,
}: LegalDocumentProps) {
  return (
    <div>
      <section className="bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 text-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold drop-shadow tracking-tight">
            {title}
          </h1>
          {lead ? <p className="mt-3 opacity-95">{lead}</p> : null}
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="space-y-8 text-slate-700 leading-relaxed">
          {children}
        </div>
      </article>
    </div>
  );
}
