import { createSoudanAnonClient } from "@/lib/soudan-anon";
import { handleSharedResponse } from "@/lib/soudan-respond";
import type { SharedAddResponseResult } from "@/lib/soudan/types";

export async function POST(request: Request) {
  return handleSharedResponse(request, async (args) => {
    const { data, error } = await createSoudanAnonClient().rpc("soudan_shared_add_response", args);
    if (error || !data) throw new Error("response_unavailable");
    return data as SharedAddResponseResult;
  });
}
