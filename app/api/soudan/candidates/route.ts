import { addSoudanCandidate } from "@/lib/soudan-owner-server";
import { ownerResponse, readCandidateRequest } from "@/lib/soudan-owner-http";

export async function POST(request: Request) {
  const input = await readCandidateRequest(request);
  if (input instanceof Response) return input;
  return ownerResponse(() => addSoudanCandidate({ kind: input.kind, reference: input.reference }, input.destination));
}
