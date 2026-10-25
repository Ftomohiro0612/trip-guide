import type { SharedFacts as Facts } from "@/lib/soudan-shared-facts";
import type { ConsultationResponse } from "@/lib/soudan/types";
import { isHttpUrl } from "@/lib/soudan/validation";

export function ExternalLink({ href, children }: { href: string | null | undefined; children: React.ReactNode }) {
  if (!isHttpUrl(href)) return null;
  return <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-block break-all text-sm text-brand underline">{children} ↗</a>;
}

export default function SharedFacts({ facts, responses }: { facts: Facts; responses: ConsultationResponse[] }) {
  const corrected = (field: string) => responses.some((r) => r.kind === "correction" && r.status === "open" && r.correction_field === field);
  const s = facts.snapshot;
  return <section className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm">
    <h3 className="font-bold">Memorips で分かっていること</h3>
    <p className="text-xs text-slate-500">公式確認日: {s.source_checked_at || "記録なし"}{facts.fromSnapshot ? " · 候補に入れたときの情報" : ""}</p>
    <dl className="space-y-2">{([ ["hours", "営業時間"], ["price", "料金"], ["reservation", "予約"], ["rain", "雨天"], ["age", "対象年齢"] ] as const).map(([key, label]) => <div key={key}><dt className="font-medium">{label}{corrected(key) && <span className="ml-2 text-xs text-amber-800">家族から訂正あり</span>}</dt><dd className="whitespace-pre-wrap break-words text-slate-600">{s[key] || "正本に記載なし"}</dd></div>)}</dl>
    {corrected("other") && <p className="text-xs text-amber-800">その他の項目に家族から訂正あり</p>}
    <ExternalLink href={s.official_url}>公式サイトで確認</ExternalLink>
  </section>;
}
