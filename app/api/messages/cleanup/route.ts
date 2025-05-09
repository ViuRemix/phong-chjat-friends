// api/messages/cleanup/route.ts
import { NextResponse } from "next/server";
import { deleteExpiredMessages } from "@/lib/message-cleaner";

export async function GET() {
  await deleteExpiredMessages();
  return NextResponse.json({ success: true, message: "Old messages deleted" });
}
