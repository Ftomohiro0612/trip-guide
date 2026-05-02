import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-7xl mb-4" aria-hidden>
        🧭
      </p>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        ページが見つかりませんでした
      </h1>
      <p className="text-slate-600 mb-8">
        お探しのページは移動・削除されたか、URLが間違っている可能性があります。
      </p>
      <form action="/facilities" className="max-w-md mx-auto mb-8">
        <div className="flex bg-white rounded-full shadow border border-slate-200 overflow-hidden p-1">
          <input
            type="search"
            name="q"
            placeholder="施設名・地域で検索"
            className="flex-1 px-4 py-2 text-slate-900 placeholder-slate-400 outline-none text-sm"
          />
          <button
            type="submit"
            className="bg-brand hover:bg-brand-dark text-white font-bold px-5 py-2 rounded-full text-sm"
          >
            🔍 検索
          </button>
        </div>
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
        <Link
          href="/"
          className="bg-white border border-slate-200 hover:border-brand rounded-xl p-4 text-left"
        >
          <div className="text-2xl mb-1" aria-hidden>
            🏠
          </div>
          <div className="font-bold text-sm text-slate-900">トップに戻る</div>
          <div className="text-xs text-slate-500">地図から探す</div>
        </Link>
        <Link
          href="/facilities"
          className="bg-white border border-slate-200 hover:border-brand rounded-xl p-4 text-left"
        >
          <div className="text-2xl mb-1" aria-hidden>
            📋
          </div>
          <div className="font-bold text-sm text-slate-900">施設一覧</div>
          <div className="text-xs text-slate-500">条件で絞り込む</div>
        </Link>
      </div>
    </div>
  );
}
