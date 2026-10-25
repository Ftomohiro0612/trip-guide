import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultSoudanTitle, profileAgeBands } from "@/lib/soudan-owner";
import ConsultationForm from "@/components/soudan/ConsultationForm";

export default async function NewSoudanPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=%2Fmypage%2Fsoudan%2Fnew");
  const { data, error } = await db.from("children").select("birth_year,birth_month").eq("user_id", user.id);
  return <><Link href="/mypage/soudan" className="text-sm text-slate-500">← おでかけ相談</Link><h1 className="text-xl font-bold">新しい相談</h1><p className="text-sm text-slate-500">タイトルだけで作れます。理由や希望条件はあとからでも。</p>{error && <p className="text-xs text-slate-500">年齢帯を読み込めませんでした。希望条件から選べます。</p>}<ConsultationForm title={defaultSoudanTitle()} conditions={{ ageBands: profileAgeBands(data ?? []) }} /></>;
}
