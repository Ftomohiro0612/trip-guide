import { isPlausibleShareToken } from "./soudan/token";
import { validateResponseInput } from "./soudan/validation";
import type { SharedAddResponseArgs, SharedAddResponseResult } from "./soudan/types";

export const UNAVAILABLE_LINK = "このリンクは使えません。送ってくれた人に、新しいリンクを聞いてください";
export function responseErrorMessage(code: string): string {
  if (code === "invalid_link") return UNAVAILABLE_LINK;
  if (code === "rate_limited") return "少し時間をおいてから、もう一度お試しください。";
  if (["invalid_candidate", "invalid_reply", "invalid_reference"].includes(code)) return "内容が更新されました。ページを読み込み直してください。";
  return "入力内容を確認して、もう一度お試しください。";
}
const json = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const rejected = (message: string, status = 400) => json({ ok: false, message }, status);

/** Web APIs only; the callback is invoked strictly after bounded parsing/validation. */
export async function handleSharedResponse(request: Request, add: (args: SharedAddResponseArgs) => Promise<SharedAddResponseResult>): Promise<Response> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return rejected("JSON 形式で送信してください。", 415);
  const limit = 8192;
  if (Number(request.headers.get("content-length")) > limit) return rejected("内容を短くして送信してください。", 413);
  try {
    const reader = request.body?.getReader();
    if (!reader) return rejected("入力内容を確認してください。");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); return rejected("内容を短くして送信してください。", 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let input;
    try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { return rejected("入力内容を確認してください。"); }
    if (!input || !isPlausibleShareToken(input.token)) return rejected(UNAVAILABLE_LINK);
    const valid = validateResponseInput(input);
    if (!valid.ok) return rejected(responseErrorMessage(valid.error));
    const v = valid.value;
    const result = await add({ p_token: input.token, p_candidate_id: v.candidate_id, p_kind: v.kind, p_body: v.body, p_author_label: v.author_label, p_correction_field: v.correction_field, p_reaction: v.reaction, p_source_url: v.source_url, p_reply_to_id: v.reply_to_id });
    if (!result.ok) return rejected(responseErrorMessage(result.error), result.error === "rate_limited" ? 429 : 400);
    return json({ ok: true }, 200);
  } catch {
    return rejected("通信できませんでした。少し時間をおいてお試しください。", 503);
  }
}
