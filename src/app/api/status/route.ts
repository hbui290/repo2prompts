import { getStatusSnapshot } from "@/integrations/status-snapshot";

export async function GET() {
  return Response.json(getStatusSnapshot());
}
