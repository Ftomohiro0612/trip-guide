"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FamilyRevisit = "yes" | "conditional" | "once_enough" | "no";
type ParentFatigue = "easy" | "normal" | "tired" | "exhausted";
type Expectation = "exceeded" | "met" | "below";

const familyRevisitOptions: { value: FamilyRevisit; label: string }[] = [
  { value: "yes", label: "また行きたい" },
  { value: "conditional", label: "条件次第" },
  { value: "once_enough", label: "一度で十分" },
  { value: "no", label: "もう行かない" },
];

const fatigueOptions: { value: ParentFatigue; label: string }[] = [
  { value: "easy", label: "楽だった" },
  { value: "normal", label: "普通" },
  { value: "tired", label: "少し疲れた" },
  { value: "exhausted", label: "かなり疲れた" },
];

const expectationOptions: { value: Expectation; label: string }[] = [
  { value: "exceeded", label: "期待以上だった" },
  { value: "met", label: "期待どおり" },
  { value: "below", label: "期待以下" },
];

export default function EditVisitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const visitId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [visitedOn, setVisitedOn] = useState("");
  const [familyRevisit, setFamilyRevisit] = useState<FamilyRevisit | "">("");
  const [parentFatigue, setParentFatigue] = useState<ParentFatigue | "">("");
  const [expectation, setExpectation] = useState<Expectation | "">("");
  const [parentMemo, setParentMemo] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("visits")
        .select(
          "facility_name, visited_on, family_revisit, parent_fatigue, expectation_vs_reality, parent_memo",
        )
        .eq("id", visitId)
        .single();
      if (!active) return;
      if (fetchError || !data) {
        setError("記録の読み込みに失敗しました");
        setLoading(false);
        return;
      }
      setFacilityName(data.facility_name ?? "");
      setVisitedOn(data.visited_on ?? "");
      setFamilyRevisit((data.family_revisit as FamilyRevisit) ?? "");
      setParentFatigue((data.parent_fatigue as ParentFatigue) ?? "");
      setExpectation((data.expectation_vs_reality as Expectation) ?? "");
      setParentMemo(data.parent_memo ?? "");
      if (data.expectation_vs_reality || data.parent_memo) setDetailsOpen(true);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [visitId]);

  const canSubmit =
    facilityName.trim().length > 0 &&
    Boolean(familyRevisit) &&
    Boolean(parentFatigue) &&
    !saving &&
    !loading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("visits")
      .update({
        facility_name: facilityName.trim(),
        visited_on: visitedOn || null,
        family_revisit: familyRevisit,
        parent_fatigue: parentFatigue,
        expectation_vs_reality: expectation || null,
        parent_memo: parentMemo.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", visitId);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    router.push("/mypage/visits");
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="h-6 bg-slate-100 rounded animate-pulse w-24" />
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <Link
        href="/mypage/visits"
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        ← 履歴に戻る
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">記録を編集</h1>
        <p className="text-sm text-slate-500 mt-1">
          施設名・日付・評価を変更できます。
        </p>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            施設名
          </label>
          <input
            type="text"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </section>

        <section className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            訪問日
          </label>
          <input
            type="date"
            value={visitedOn}
            onChange={(e) => setVisitedOn(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </section>

        <OptionButtons
          title="また行きたいか"
          options={familyRevisitOptions}
          value={familyRevisit}
          onChange={setFamilyRevisit}
        />

        <OptionButtons
          title="親の疲れ度"
          options={fatigueOptions}
          value={parentFatigue}
          onChange={setParentFatigue}
        />

        <section className="border border-slate-200 rounded-xl bg-white">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="w-full px-4 py-3 text-left text-sm font-bold text-slate-800"
          >
            もっと詳しく記録する {detailsOpen ? "▲" : "▼"}
          </button>
          {detailsOpen && (
            <div className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600">期待との比較</p>
                <div className="grid grid-cols-3 gap-2">
                  {expectationOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setExpectation(
                          expectation === option.value ? "" : option.value,
                        )
                      }
                      className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                        expectation === option.value
                          ? "bg-brand border-brand text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">
                  親メモ
                </label>
                <textarea
                  value={parentMemo}
                  onChange={(e) => setParentMemo(e.target.value)}
                  placeholder="気づいたこと、次回メモなど"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:hover:bg-brand"
        >
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </form>
    </div>
  );
}

function OptionButtons<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
}) {
  return (
    <section className="space-y-2">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`py-2 px-2 rounded-lg border text-sm font-medium transition-colors ${
              value === option.value
                ? "bg-brand border-brand text-white"
                : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
