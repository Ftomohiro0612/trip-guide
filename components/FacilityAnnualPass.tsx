"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PASS_BADGE_CLASS, formatPassDateJa, passStatus } from "@/lib/annual-pass";

type LoadState = "loading" | "guest" | "ready";

type PassRow = {
  id: string;
  expires_on: string;
  holder_note: string | null;
  memo: string | null;
};

export default function FacilityAnnualPass({
  facilitySlug,
  facilityName,
}: {
  facilitySlug: string;
  facilityName: string;
}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [pass, setPass] = useState<PassRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [expiresOn, setExpiresOn] = useState("");
  const [holderNote, setHolderNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPass() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setLoadState("guest");
        return;
      }

      const { data } = await supabase
        .from("annual_passes")
        .select("id, expires_on, holder_note, memo")
        .eq("user_id", user.id)
        .eq("facility_slug", facilitySlug)
        .maybeSingle();
      if (!active) return;

      if (data) {
        setPass(data as PassRow);
        setExpiresOn((data as PassRow).expires_on);
        setHolderNote((data as PassRow).holder_note ?? "");
      }
      setLoadState("ready");
    }

    loadPass();

    return () => {
      active = false;
    };
  }, [facilitySlug]);

  if (loadState !== "ready") return null;

  async function handleSave() {
    if (!expiresOn) {
      setError("有効期限を選んでください");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      facility_slug: facilitySlug,
      facility_name: facilityName,
      expires_on: expiresOn,
      holder_note: holderNote.trim() || null,
    };
    const { data, error: err } = await supabase
      .from("annual_passes")
      .upsert(payload, { onConflict: "user_id,facility_slug" })
      .select("id, expires_on, holder_note, memo")
      .single();
    setSaving(false);
    if (err) {
      setError("保存できませんでした。時間をおいてお試しください。");
      return;
    }
    setPass(data as PassRow);
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!pass) return;
    if (!window.confirm("この施設の年パス登録を削除しますか？")) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("annual_passes")
      .delete()
      .eq("id", pass.id);
    if (err) return;
    setPass(null);
    setExpiresOn("");
    setHolderNote("");
    setFormOpen(false);
  }

  if (pass && !formOpen) {
    const status = passStatus(pass.expires_on);
    const badgeClass = PASS_BADGE_CLASS[status.tone];

    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-amber-900">🎫 年パス登録済み</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badgeClass}`}>
            {status.label}
          </span>
        </div>
        <dl className="mt-2 space-y-1 text-sm text-amber-950">
          <div className="flex justify-between gap-3">
            <dt className="text-amber-700">有効期限</dt>
            <dd className="font-bold">{formatPassDateJa(pass.expires_on)}</dd>
          </div>
          {pass.holder_note && (
            <div className="flex justify-between gap-3">
              <dt className="text-amber-700">対象</dt>
              <dd className="font-bold">{pass.holder_note}</dd>
            </div>
          )}
        </dl>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="text-xs font-bold text-amber-700 hover:underline"
          >
            期限を編集
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-slate-400 hover:text-red-600 hover:underline"
          >
            削除
          </button>
          <Link
            href="/mypage/passes"
            className="ml-auto text-xs font-bold text-amber-700 hover:underline"
          >
            年パス一覧 →
          </Link>
        </div>
      </div>
    );
  }

  if (!formOpen) {
    return (
      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="block w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/50 py-2.5 text-center text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50"
      >
        🎫 年パスを持っている方はこちら
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="font-bold text-amber-900">🎫 年パスを登録</h3>
      <p className="mt-1 text-xs leading-relaxed text-amber-800">
        有効期限を登録しておくと、マイページで期限が近づいたときにお知らせします。
      </p>
      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>
      )}
      <div className="mt-3 space-y-3">
        <label className="block text-xs font-bold text-amber-800">
          有効期限
          <input
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="block text-xs font-bold text-amber-800">
          対象（任意）
          <input
            type="text"
            value={holderNote}
            onChange={(e) => setHolderNote(e.target.value)}
            placeholder="例: 家族全員"
            maxLength={50}
            className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(false)}
            className="text-xs text-slate-500 hover:underline"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
