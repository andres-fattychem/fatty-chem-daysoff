import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Daily cron job: convert any "pending" request whose start date is in the past
 * into "confirmed" (auto-approved). Vercel calls this on the schedule defined
 * in vercel.json. Protected by CRON_SECRET (Vercel adds the header, but we
 * also accept it via Authorization for manual testing).
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  // Vercel sets Authorization: Bearer <CRON_SECRET>
  const ok = expected && authHeader === `Bearer ${expected}`;
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db().execute({
    sql: `UPDATE requests
            SET status = 'confirmed',
                decided_at = datetime('now'),
                decided_by = 'auto-approved (date passed)',
                auto_approved = 1
            WHERE status = 'pending'
              AND start_date < date('now')`,
    args: [],
  });

  return NextResponse.json({ updated: result.rowsAffected });
}
