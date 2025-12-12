import { NextRequest } from "next/server";

export function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  return Response.json({ userId: params.userId });
}