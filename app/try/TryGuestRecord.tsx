"use client";

import { useState } from "react";
import Link from "next/link";
import { GuestRecordExperience } from "@/components/FacilityGuestRecordProvider";
import type { GuestInterestTag, GuestRecordRecommendation } from "@/lib/guest-record";

type Place = {
  slug: string;
  name: string;
  prefecture: string;
  interestTags: GuestInterestTag[];
  recommendationCandidates: GuestRecordRecommendation[];
};

export default function TryGuestRecord({ places }: { places: Place[] }) {
  const [selected, setSelected] = useState<Place | null>(null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-slate-900">
      <p className="text-xs font-black tracking-widest text-emerald-700">登録なしで記録体験</p>
      <h1 className="mt-2 text-3xl font-black">思い出から、次のおでかけへ</h1>
      <p className="mt-4 leading-relaxed text-slate-600">
        場所を選び、ひとことと子どもの反応を残してみましょう。写真は任意です。
        選んだ反応から、次に合いそうな施設が見つかります。
      </p>
      <p className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900">
        写真以外の入力は、このタブで登録・ログイン後の保存画面へ引き継ぎます。
        登録前の記録は公開されません。
      </p>
      <h2 className="mt-8 text-lg font-bold">記録する場所を選ぶ</h2>
      <p className="mt-2 text-sm text-slate-600">下の施設で体験できます。行った場所がほかにある場合は、検索した施設の「記録する」から同じ体験を始められます。</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {places.map((place) => (
          <button key={place.slug} type="button" onClick={() => setSelected(place)} className="rounded-2xl border border-emerald-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-emerald-50">
            <span className="block text-xs text-slate-500">{place.prefecture}</span>
            <span className="mt-1 block font-bold">{place.name}</span>
            <span className="mt-3 block text-sm font-bold text-emerald-700">ここでの思い出を記録 →</span>
          </button>
        ))}
      </div>
      <Link href="/facilities" className="mt-4 block rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-bold">行った場所を検索する →</Link>
      <aside className="mt-8 rounded-2xl bg-amber-50 p-5" aria-label="記録のサンプル">
        <h2 className="font-bold">記録のサンプル（架空の入力例）</h2>
        <p className="mt-2 text-sm">「何度もすべり台に挑戦して、帰る前にもう1回！」</p>
        <p className="mt-2 text-sm font-bold text-emerald-800">反応：すべり台が好き → 次も遊具を楽しめる場所へ</p>
        <p className="mt-2 text-xs text-slate-500">ほかの家族の記録ではありません。あなたが作る記録とは別の説明用サンプルです。</p>
      </aside>
      {selected && (
        <GuestRecordExperience
          key={selected.slug}
          facilitySlug={selected.slug}
          facilityName={selected.name}
          interestTags={selected.interestTags}
          recommendationCandidates={selected.recommendationCandidates}
          onClose={() => setSelected(null)}
          closeLabel="場所を選ぶ画面へ戻る"
        />
      )}
    </div>
  );
}
