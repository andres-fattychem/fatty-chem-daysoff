import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;

export function db(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  _client = createClient({ url, authToken });
  return _client;
}

export type Employee = {
  id: number;
  full_name: string;
  email: string | null;
  department: string | null;
  start_date: string | null; // YYYY-MM-DD; used to derive annual_pto_days
  annual_pto_days: number;
  active: number; // 0 | 1
  created_at: string;
};

export type LeaveType =
  | "vacation"
  | "sick"
  | "personal"
  | "half_day"
  | "pto_paid"; // PTO paid out — counts against vacation bucket but employee still works
export type LeaveStatus = "pending" | "confirmed" | "rejected" | "cancelled";

export type Request = {
  id: number;
  employee_id: number;
  leave_type: LeaveType;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  // For half_day: days_count is 0.5; otherwise whole-day count
  days_count: number;
  reason: string | null;
  status: LeaveStatus;
  created_by: string | null; // admin email/name who entered
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  auto_approved: number; // 0 | 1
};
