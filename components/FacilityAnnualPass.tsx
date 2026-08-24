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
  const [passes, setPasses] = useState<PassRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expiresOn, setExpiresOn] = useState("");
  const [holderNote, setHolderNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPasses() {
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
        .order("expires_on", { ascending: true });
      if (!active) return;

      setPasses((data ?? []) as PassRow[]);
      setLoadState("ready");
    }

    loadPasses();

    return () => {
      active = false;
    };
  }, [facilitySlug]);

  if (loadState !== "ready") return null;

  function resetForm() {
    setExpiresOn("");
    setHolderNote("");
    setError(null);
    setEditingId(null);
    setFormOpen(false);
  }

  function openNewForm() {
    setExpiresOn("");
    setHolderNote("");
    setError(null);
    setEditingId(null);
    setFormOpen(true);
  }

  function openEditForm(pass: PassRow) {
    setExpiresOn(pass.expires_on);
    setHolderNote(pass.holder_note ?? "");
    setError(null);
    setEditingId(pass.id);
    setFormOpen(true);
  }

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

    const values = {
      expires_on: expiresOn,
      holder_note: holderNote.trim() || null,
    };
    const query = editingId
      ? supabase.from("annual_passes").update(values).eq("id", editingId)
      : supabase.from("annual_passes").insert({
          ...values,
          user_id: user.id,
          facility_slug: facilitySlug,
          facility_name: facilityName,
        });
    const { data, error: err } = await query
      .select("id, expires_on, holder_note, memo")
      .single();
    setSaving(false);
    if (err) {
      setError("保存できませんでした。時間をおいてお試しください。");
      return;
    }
    const savedPass = data as PassRow;
    setPasses((current) =>
      (editingId
        ? current.map((pass) => (pass.id === editingId ? savedPass : pass))
        : [...current, savedPass]
      ).sort((a, b) => a.expires_on.localeCompare(b.expires_on)),
    );
    resetForm();
  }

  async function handleDelete(passId: string) {
    if (!window.confirm("この施設の年パス登録を削除しますか？")) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("annual_passes")
      .delete()
      .eq("id", passId);
    if (err) return;
    setPasses((current) => current.filter((pass) => pass.id !== passId));
    if (editingId === passId) resetForm();
  }

  function passForm(title: string) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-bold text-amber-900">🎫 {title}</h3>
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
              onClick={resetForm}
              className="text-xs text-slate-500 hover:underline"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (passes.length === 0) {
    if (formOpen) return passForm("年パスを登録");

    return (
      <button
        type="button"
        onClick={openNewForm}
        className="block w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/50 py-2.5 text-center text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50"
      >
        🎫 年パスを持っている方はこちら
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {passes.map((pass) => {
        if (editingId === pass.id) {
          return <div key={pass.id}>{passForm("年パスを編集")}</div>;
        }

        const status = passStatus(pass.expires_on);
        const badgeClass = PASS_BADGE_CLASS[status.tone];

        return (
          <div key={pass.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
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
                onClick={() => openEditForm(pass)}
                className="text-xs font-bold text-amber-700 hover:underline"
              >
                期限を編集
              </button>
              <button
                type="button"
                onClick={() => handleDelete(pass.id)}
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
      })}
      {formOpen && editingId === null ? (
        passForm("別の年パスを追加")
      ) : (
        <button
          type="button"
          onClick={openNewForm}
          className="block w-full rounded-xl border-2 border-dashed border-amber-300 py-3 text-center text-sm font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-50"
        >
          ＋ 別の年パスを追加する
        </button>
      )}
    </div>
  );
}
