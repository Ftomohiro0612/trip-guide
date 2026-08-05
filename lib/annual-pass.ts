export type PassStatusTone = "expired" | "soon" | "ok";

export function passStatus(
  expiresOn: string,
  today = new Date(),
): { label: string; tone: PassStatusTone } {
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (expiresOn < todayStr) return { label: "期限切れ", tone: "expired" };

  const expires = new Date(`${expiresOn}T00:00:00`);
  const now = new Date(`${todayStr}T00:00:00`);
  const days = Math.round((expires.getTime() - now.getTime()) / 86400000);
  if (days <= 30) return { label: `あと${days}日`, tone: "soon" };
  return { label: `あと${days}日`, tone: "ok" };
}

export function formatPassDateJa(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export const PASS_BADGE_CLASS: Record<PassStatusTone, string> = {
  expired: "bg-red-100 text-red-700",
  soon: "bg-amber-100 text-amber-700",
  ok: "bg-slate-100 text-slate-600",
};
