import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeleteWishButton from "./DeleteWishButton";
import WishlistAddForm from "./WishlistAddForm";

export const metadata: Metadata = { title: "行きたいリスト" };

type WishlistItem = {
  id: string;
  facility_slug: string;
  facility_name: string;
  memo: string | null;
  created_at: string | null;
};

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: wishlists } = user
      ? await supabase
          .from("wishlists")
          .select("id, facility_slug, facility_name, memo, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <Link href="/mypage" className="text-slate-400 hover:text-slate-600 transition-colors">
        ← マイページ
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">行きたいリスト</h1>
        <p className="text-sm text-slate-500 mt-1">気になる施設をあとで見返せます。</p>
      </div>

      <WishlistAddForm />

      {wishlists && wishlists.length > 0 ? (
        <div className="space-y-3">
          {(wishlists as WishlistItem[]).map((item) => {
            const hasFacilityPage = !item.facility_slug.startsWith("manual-");
            return (
            <article
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-slate-900 break-words">
                    {item.facility_name}
                  </h2>
                  {item.memo && (
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed break-words">
                      {item.memo}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {hasFacilityPage && (
                      <Link
                        href={`/facilities/${item.facility_slug}`}
                        className="text-brand text-xs font-medium hover:underline"
                      >
                        施設ページを見る →
                      </Link>
                    )}
                    <Link
                      href={`/mypage/visits/new?facility=${encodeURIComponent(
                        item.facility_slug,
                      )}&name=${encodeURIComponent(item.facility_name)}`}
                      className="text-brand text-xs font-medium hover:underline"
                    >
                      行ったよ！記録する
                    </Link>
                  </div>
                </div>
                <DeleteWishButton wishId={item.id} facilityName={item.facility_name} />
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-sm space-y-3">
          <p className="text-slate-500">
            施設ページから「行きたい！」ボタンで登録できます
          </p>
          <Link href="/" className="text-brand font-medium hover:underline">
            施設を探す →
          </Link>
        </div>
      )}
    </div>
  );
}
