"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function ChildrenForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("ニックネームを入力してください");
      return;
    }
    if (!birthYear || !birthMonth) {
      setError("生年月を選択してください");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要です");
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.from("children").insert({
      user_id: user.id,
      nickname: nickname.trim(),
      birth_year: parseInt(birthYear),
      birth_month: parseInt(birthMonth),
      gender: gender || null,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setNickname("");
    setBirthYear("");
    setBirthMonth("");
    setGender("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-brand hover:text-brand transition-colors text-sm font-medium"
      >
        ＋ 子どもを追加する
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50"
    >
      <h3 className="font-semibold text-slate-800 text-sm">子どもを追加</h3>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          ニックネーム <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="例: 太郎、はなちゃん"
          maxLength={20}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white"
        />
        <p className="text-xs text-slate-400 mt-1">本名でなくて大丈夫です（例: はなちゃん、たろう）</p>
      </div>

      <p className="text-xs text-slate-400 -mt-2 leading-relaxed">
        生年月はおでかけ当時の年齢計算にのみ使います。公開されません。
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            生年（年） <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white"
          >
            <option value="">年を選択</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            生月（月） <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white"
          >
            <option value="">月を選択</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          性別（任意）
        </label>
        <div className="flex gap-2">
          {[
            { value: "male", label: "男の子" },
            { value: "female", label: "女の子" },
            { value: "other", label: "その他" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGender(gender === opt.value ? "" : opt.value)}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                gender === opt.value
                  ? "bg-brand border-brand text-white"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-brand text-white font-bold rounded-lg text-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {loading ? "保存中..." : "追加する"}
        </button>
      </div>
    </form>
  );
}
