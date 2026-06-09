import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "child-avatars";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function getOwnedChild(
  childId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase
    .from("children")
    .select("id, avatar_url")
    .eq("id", childId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; avatar_url: string | null } | null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: childId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const child = await getOwnedChild(childId, user.id, supabase);
  if (!child) {
    return Response.json({ error: "子どもが見つかりません" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "画像ファイルを選択してください" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "画像は2MB以下にしてください" }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return Response.json(
      { error: "JPEG、PNG、WebP の画像を選択してください" },
      { status: 400 },
    );
  }

  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .jpeg({ quality: 86 })
    .toBuffer();
  const path = `${user.id}/${childId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, output, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("children")
    .update({ avatar_url: path })
    .eq("id", childId)
    .eq("user_id", user.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ avatar_url: path });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: childId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const child = await getOwnedChild(childId, user.id, supabase);
  if (!child) {
    return Response.json({ error: "子どもが見つかりません" }, { status: 404 });
  }

  const path = child.avatar_url ?? `${user.id}/${childId}/avatar.jpg`;
  await supabase.storage.from(BUCKET).remove([path]);

  const { error: updateError } = await supabase
    .from("children")
    .update({ avatar_url: null })
    .eq("id", childId)
    .eq("user_id", user.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
