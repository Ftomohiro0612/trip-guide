import { listSoudanDestinations } from "@/lib/soudan-owner-server";
import { ownerResponse } from "@/lib/soudan-owner-http";

export const dynamic = "force-dynamic";

export async function GET() {
  return ownerResponse(listSoudanDestinations);
}
