import type { ClosureStatus } from "@/types/facility";

export default function FacilityClosureBadge({
  status,
  compact = false,
}: {
  status?: ClosureStatus;
  compact?: boolean;
}) {
  if (!status) return null;
  const temporary = status === "temporarily_closed";

  return (
    <span
      className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold ${
        temporary
          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
          : "bg-slate-200 text-slate-900 ring-1 ring-slate-400"
      }`}
    >
      {temporary
        ? compact ? "⚠️ 臨時休館中（再開未定）" : "⚠️ 臨時休館中（再開時期未定）"
        : "🚫 閉館済み（現在は営業していません）"}
    </span>
  );
}
