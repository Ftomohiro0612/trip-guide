import { isSoudanCandidateRequest } from "@/lib/soudan-owner-server";
import type { Result, SoudanCandidateRequest } from "@/lib/soudan-owner-server";

const json = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const rejected = (error: string, status: number) => json({ ok: false, error }, status);

export async function ownerResponse(work: () => Promise<Result>): Promise<Response> {
  try {
    const result = await work();
    return json(result, !result.ok && result.error === "ログインしてください。" ? 401 : 200);
  } catch {
    return rejected("通信できませんでした。もう一度お試しください。", 503);
  }
}

/** Bound actual streamed bytes as well as Content-Length before parsing JSON. */
export async function readCandidateRequest(request: Request): Promise<SoudanCandidateRequest | Response> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return rejected("JSON 形式で送信してください。", 415);
  const limit = 8192;
  if (Number(request.headers.get("content-length")) > limit) return rejected("内容を短くして送信してください。", 413);
  try {
    const reader = request.body?.getReader();
    if (!reader) return rejected("入力内容を確認してください。", 400);
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
    const input: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return isSoudanCandidateRequest(input) ? input : rejected("入力内容を確認してください。", 400);
  } catch {
    return rejected("入力内容を確認してください。", 400);
  }
}
