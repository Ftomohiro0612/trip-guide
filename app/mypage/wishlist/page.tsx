import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeleteWishButton from "./DeleteWishButton";

export const metadata: Metadata = { title: "行きたいリスト" };

type WishlistItem = {
  id: string;
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
        .select("id, facility_name, memo, created_at")
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

      {wishlists && wishlists.length > 0 ? (
        <div className="space-y-3">
          {(wishlists as WishlistItem[]).map((item) => (
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
                </div>
                <DeleteWishButton wishId={item.id} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400 text-sm">
          まだ登録されていません
        </div>
      )}
    </div>
  );
}
