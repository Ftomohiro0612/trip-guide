# Phase 4-1: 反応タグ機能

copyright修正後に着手してください。

## 前提確認

- visit_children は PK が (visit_id, child_id) の複合キーで、id カラムは存在しない
- 現在 visit_children.reaction_tags TEXT[] があるが設計上問題（全子ども共通・ラベル文字列のみ）
- 今回 visit_children に id を追加し、visit_child_tags を id で紐づける
- 現行の reactionTags state と reactionTagOptions（hardcode）は削除し新設計に置き換え
- 「特になし/わからない」タグは作らない。未選択を許容する。

---

## Migration 005

ファイル作成のみ。実行は手動。vercel deploy は今回不要。

### supabase/migrations/005_reaction_tags.sql

```sql
-- 1. reaction_tags マスタ
CREATE TABLE public.reaction_tags (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOL NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reaction_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reaction_tags: public read"
  ON public.reaction_tags FOR SELECT USING (true);
GRANT SELECT ON public.reaction_tags TO authenticated;

-- 2. visit_children に id を追加
ALTER TABLE public.visit_children
  ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.visit_children
  ADD CONSTRAINT visit_children_id_key UNIQUE (id);

-- 3. visit_child_tags テーブル
CREATE TABLE public.visit_child_tags (
  visit_child_id UUID NOT NULL
    REFERENCES public.visit_children(id) ON DELETE CASCADE,
  tag_id         TEXT NOT NULL
    REFERENCES public.reaction_tags(id) ON DELETE RESTRICT,
  PRIMARY KEY (visit_child_id, tag_id)
);
ALTER TABLE public.visit_child_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visit_child_tags: owner via visit"
  ON public.visit_child_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.visit_children vc
      JOIN public.visits v ON v.id = vc.visit_id
      WHERE vc.id = visit_child_id AND v.user_id = auth.uid()
    )
  );
GRANT SELECT, INSERT, DELETE ON public.visit_child_tags TO authenticated;

-- 4. シードデータ
INSERT INTO public.reaction_tags (id, label, category, sort_order) VALUES
  ('animal',              '動物',             'creature',   10),
  ('animal_contact',      'ふれあい',         'creature',   20),
  ('animal_feed',         'エサやり',         'creature',   30),
  ('water_play',          '水遊び',           'active',     40),
  ('playground',          '遊具',             'active',     50),
  ('athletic',            'アスレチック',     'active',     60),
  ('slide',               'すべり台',         'active',     70),
  ('running',             '走る',             'active',     80),
  ('wide_space',          '広い場所',         'active',     90),
  ('vehicle',             '乗り物',           'vehicle',   100),
  ('craft',               '工作',             'creative',  110),
  ('experience',          '体験',             'creative',  120),
  ('exhibition',          '展示',             'learning',  130),
  ('science',             '科学',             'learning',  140),
  ('dinosaur',            '恐竜',             'learning',  150),
  ('character',           'キャラクター',     'character', 160),
  ('nature',              '自然',             'nature',    170),
  ('food',                '食べ物',           'food',      180),
  ('played_with_friends', '友達と遊んだ',     'social',    190),
  ('played_with_siblings','きょうだいで遊んだ','social',   200),
  ('first_time',          '初めてできた',     'growth',    210),
  ('did_alone',           '一人でできた',     'growth',    220),
  ('brave_challenge',     '怖がらず挑戦した', 'growth',    230),
  ('other',               'その他',           'other',     999);
```

---

## app/mypage/visits/new/page.tsx の変更

### 追加する型・state

```ts
type ReactionTag = { id: string; label: string; category: string; sort_order: number };
const [reactionTagMaster, setReactionTagMaster] = useState<ReactionTag[]>([]);
const [childTags, setChildTags] = useState<Record<string, string[]>>({}); // child_id → tag_id[]
```

### useEffect: reaction_tags を Supabase から取得

loadChildren と同じ useEffect 内 or 別途追加:

```ts
const { data: tagData } = await supabase
  .from('reaction_tags')
  .select('id, label, category, sort_order')
  .eq('is_active', true)
  .order('sort_order');
if (tagData) setReactionTagMaster(tagData as ReactionTag[]);
```

### 削除するもの

- `const [reactionTags, setReactionTags] = useState<string[]>([]);`
- `const reactionTagOptions = [...]` （hardcode配列 11件）
- `function toggleReactionTag(tag: string)`
- 「もっと詳しく記録する」セクション内の「反応タグ」UI全体（lines 697-715付近）

### 子ども別満足度カードに追加

各 child の card 内、満足度ボタン `</div>` の直後（card の閉じる前）に追加:

```tsx
{satisfactions[child.id] !== 'could_not_join' && reactionTagMaster.length > 0 && (
  <div className="mt-3 space-y-1.5">
    <p className="text-xs font-bold text-slate-600">
      {child.nickname}は何を楽しんでいた？
    </p>
    <div className="flex flex-wrap gap-1.5">
      {reactionTagMaster.map((tag) => {
        const selected = (childTags[child.id] ?? []).includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() =>
              setChildTags((prev) => {
                const current = prev[child.id] ?? [];
                return {
                  ...prev,
                  [child.id]: selected
                    ? current.filter((t) => t !== tag.id)
                    : [...current, tag.id],
                };
              })
            }
            className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
              selected
                ? 'bg-brand border-brand text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
    {(childTags[child.id]?.length ?? 0) === 0 && (
      <p className="text-xs text-slate-400">スキップしてもOKです</p>
    )}
  </div>
)}
```

### handleSubmit の変更

visit_children insert を `.select('id, child_id')` で受け取る:

```ts
const { data: visitChildRows, error: childError } = await supabase
  .from('visit_children')
  .insert(rows)
  .select('id, child_id');
```

visit_children insert 後、visit_child_tags を挿入:

```ts
if (visitChildRows) {
  for (const vc of visitChildRows) {
    const tags = childTags[vc.child_id] ?? [];
    if (tags.length > 0) {
      await supabase.from('visit_child_tags').insert(
        tags.map((tagId) => ({ visit_child_id: vc.id, tag_id: tagId }))
      );
    }
  }
}
```

insert rows から `reaction_tags` フィールドを削除（旧 `reaction_tags: reactionTags.length > 0 ? reactionTags : null` の行を削除）。

---

## app/mypage/visits/[id]/page.tsx の変更

### visit_children クエリに visit_child_tags を追加

```ts
const { data: visitChildren } = await supabase
  .from('visit_children')
  .select(`
    id,
    child_id,
    satisfaction,
    children(nickname, birth_year, birth_month, avatar_url),
    visit_child_tags(tag_id, reaction_tags(label))
  `)
  .eq('visit_id', visitRow.id);
```

### 型定義追加

```ts
type VisitChildTag = {
  tag_id: string;
  reaction_tags: { label: string } | { label: string }[] | null;
};
```

VisitChild 型に `id: string` と `visit_child_tags: VisitChildTag[] | null` を追加。

### 表示: 子どもカードにタグを追加

満足度ラベルの下（各子どもカード内）に追加:

```tsx
{(() => {
  const tags = row.visit_child_tags ?? [];
  const labels = tags.map((t) =>
    Array.isArray(t.reaction_tags) ? t.reaction_tags[0]?.label : t.reaction_tags?.label
  ).filter(Boolean);
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {labels.map((label) => (
        <span key={label} className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand">
          {label}
        </span>
      ))}
    </div>
  );
})()}
```

---

## チェックリスト

- [ ] supabase/migrations/005_reaction_tags.sql 作成済み
- [ ] new/page.tsx: 旧 reactionTags/reactionTagOptions/toggleReactionTag 削除済み
- [ ] new/page.tsx: childTags state 追加、子どもカード内タグ選択UI追加
- [ ] new/page.tsx: visit_children insert が .select('id, child_id') を返す
- [ ] new/page.tsx: visit_child_tags への insert あり
- [ ] [id]/page.tsx: visit_child_tags を取得・表示している
- [ ] npm run lint 成功
- [ ] npx tsc --noEmit 成功
- [ ] npm run build 成功

Migration は手動実行するため vercel deploy は今回不要。
ファイル変更が完了したら GO を送ってください。
