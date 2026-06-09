"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Child = {
  id: string;
  nickname: string;
  birth_year: number;
};

type DateChoice = "today" | "yesterday" | "custom";
type FamilyRevisit = "yes" | "conditional" | "once_enough" | "no";
type ParentFatigue = "easy" | "normal" | "tired" | "exhausted";
type Satisfaction =
  | "loved"
  | "enjoyed"
  | "neutral"
  | "not_fit"
  | "could_not_join";
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

const satisfactionOptions: { value: Satisfaction; label: string }[] = [
  { value: "loved", label: "大満足" },
  { value: "enjoyed", label: "楽しんだ" },
  { value: "neutral", label: "普通" },
  { value: "not_fit", label: "合わなかった" },
  { value: "could_not_join", label: "参加できなかった" },
];

const expectationOptions: { value: Expectation; label: string }[] = [
  { value: "exceeded", label: "期待以上だった" },
  { value: "met", label: "期待どおり" },
  { value: "below", label: "期待以下" },
];

const reactionTagOptions = [
  "動物",
  "水遊び",
  "乗り物",
  "遊具",
  "工作",
  "体験",
  "展示",
  "食べ物",
  "キャラクター",
  "広い場所",
  "その他",
];

function formatDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateForChoice(choice: DateChoice, customDate: string): string {
  if (choice === "custom") return customDate;
  const date = new Date();
  if (choice === "yesterday") {
    date.setDate(date.getDate() - 1);
  }
  return formatDate(date);
}

function makeFacilitySlug(name: string): string {
  const encoded = Array.from(name.trim())
    .map((char) => char.codePointAt(0)?.toString(36) ?? "")
    .filter(Boolean)
    .join("-");
  return `manual-${encoded.slice(0, 120) || Date.now().toString(36)}`;
}

export default function NewVisitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const facilitySlugFromUrl = searchParams.get("facility") ?? "";
  const nameFromUrl = searchParams.get("name") ?? "";

  const [facilityName, setFacilityName] = useState(nameFromUrl);
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [customDate, setCustomDate] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [satisfactions, setSatisfactions] = useState<Record<string, Satisfaction>>({});
  const [familyRevisit, setFamilyRevisit] = useState<FamilyRevisit | "">("");
  const [parentFatigue, setParentFatigue] = useState<ParentFatigue | "">("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expectation, setExpectation] = useState<Expectation | "">("");
  const [reactionTags, setReactionTags] = useState<string[]>([]);
  const [parentMemo, setParentMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadChildren() {
      const supabase = createClient();
      const { data, error: childrenError } = await supabase
        .from("children")
        .select("id, nickname, birth_year")
        .order("sort_order", { ascending: true });

      if (!active) return;
      if (childrenError) {
        setError(childrenError.message);
      } else {
        const childRows = (data ?? []) as Child[];
        setChildren(childRows);
        setSelectedChildIds(childRows.map((child) => child.id));
      }
      setInitializing(false);
    }

    loadChildren();
    return () => {
      active = false;
    };
  }, []);

  const visitedOn = useMemo(
    () => dateForChoice(dateChoice, customDate),
    [dateChoice, customDate],
  );

  const selectedChildren = children.filter((child) =>
    selectedChildIds.includes(child.id),
  );

  const allSelectedChildrenRated =
    selectedChildren.length === 0 ||
    selectedChildren.every((child) => satisfactions[child.id]);

  const canSubmit =
    facilityName.trim().length > 0 &&
    Boolean(visitedOn) &&
    Boolean(familyRevisit) &&
    Boolean(parentFatigue) &&
    allSelectedChildrenRated &&
    !loading &&
    !initializing;

  function toggleChild(childId: string) {
    setSelectedChildIds((current) =>
      current.includes(childId)
        ? current.filter((id) => id !== childId)
        : [...current, childId],
    );
  }

  function toggleReactionTag(tag: string) {
    setReactionTags((current) =>
      current.includes(tag)
        ? current.filter((currentTag) => currentTag !== tag)
        : [...current, tag],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

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

    const visitedDate = new Date(`${visitedOn}T00:00:00`);
    const visitedYear = visitedDate.getFullYear();
    const visitedMonth = visitedDate.getMonth() + 1;
    const today = formatDate(new Date());

    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .insert({
        user_id: user.id,
        facility_slug: facilitySlugFromUrl || makeFacilitySlug(facilityName),
        facility_name: facilityName.trim(),
        visited_on: visitedOn,
        visited_year: visitedYear,
        visited_month: visitedMonth,
        date_precision: "exact",
        is_past_entry: visitedOn < today,
        family_revisit: familyRevisit,
        parent_fatigue: parentFatigue,
        expectation_vs_reality: expectation || null,
        parent_memo: parentMemo.trim() || null,
      })
      .select("id")
      .single();

    if (visitError || !visit) {
      setError(visitError?.message ?? "保存に失敗しました");
      setLoading(false);
      return;
    }

    if (selectedChildren.length > 0) {
      const rows = selectedChildren.map((child) => ({
        visit_id: visit.id,
        child_id: child.id,
        satisfaction: satisfactions[child.id],
        child_age_at_visit: visitedYear - child.birth_year,
        reaction_tags: reactionTags.length > 0 ? reactionTags : null,
      }));

      const { error: childError } = await supabase.from("visit_children").insert(rows);
      if (childError) {
        setError(childError.message);
        setLoading(false);
        return;
      }
    }

    router.push(children.length === 0 ? "/mypage/visits?no_child=1" : "/mypage/visits");
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <Link href="/mypage" className="text-slate-400 hover:text-slate-600 transition-colors">
        ← マイページ
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">おでかけを記録</h1>
        <p className="text-sm text-slate-500 mt-1">必須項目だけなら30秒で残せます。</p>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">施設名</label>
          {facilitySlugFromUrl && (
            <p className="text-xs text-emerald-600 font-medium">施設ページから自動入力</p>
          )}
          <input
            type="text"
            value={facilityName}
            onChange={(event) => setFacilityName(event.target.value)}
            placeholder="施設名を入力、例: 富士山こどもの国"
            className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </section>

        <section className="space-y-2">
          <p className="text-sm font-bold text-slate-800">訪問日</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "today", label: "今日" },
              { value: "yesterday", label: "昨日" },
              { value: "custom", label: "日付を選ぶ" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDateChoice(option.value as DateChoice)}
                className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                  dateChoice === option.value
                    ? "bg-brand border-brand text-white"
                    : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {dateChoice === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(event) => setCustomDate(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          )}
        </section>

        {children.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-bold text-slate-800">今回行った子ども</p>
            <div className="space-y-2">
              {children.map((child) => (
                <label
                  key={child.id}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedChildIds.includes(child.id)}
                    onChange={() => toggleChild(child.id)}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="font-medium text-slate-800">{child.nickname}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {selectedChildren.length > 0 && (
          <section className="space-y-3">
            <p className="text-sm font-bold text-slate-800">子どもごとの満足度</p>
            {selectedChildren.map((child) => (
              <div key={child.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <p className="text-sm font-semibold text-slate-800">{child.nickname}</p>
                <div className="grid grid-cols-2 gap-2">
                  {satisfactionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setSatisfactions((current) => ({
                          ...current,
                          [child.id]: option.value,
                        }))
                      }
                      className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                        satisfactions[child.id] === option.value
                          ? "bg-brand border-brand text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

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
                        setExpectation(expectation === option.value ? "" : option.value)
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
                <p className="text-xs font-bold text-slate-600">反応タグ</p>
                <div className="flex flex-wrap gap-2">
                  {reactionTagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleReactionTag(tag)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                        reactionTags.includes(tag)
                          ? "bg-brand border-brand text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">親メモ</label>
                <textarea
                  value={parentMemo}
                  onChange={(event) => setParentMemo(event.target.value)}
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
          {loading ? "保存中..." : "保存する"}
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
