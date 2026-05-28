-- Migration 001: PTO tiers + PTO-paid leave type
-- ---------------------------------------------------------------------------
-- Adds:
--   • employees.start_date     (TEXT YYYY-MM-DD; tenure for PTO tier)
--   • requests.leave_type now accepts 'pto_paid' (CHECK constraint dropped)
--
-- Run this once in the Turso web console for an existing database.
-- Safe to run on a fresh DB too — the ALTER will fail harmlessly if the
-- column already exists; the requests-table rebuild is idempotent in spirit.

-- Step 1: add start_date column to employees (NULL for existing rows)
ALTER TABLE employees ADD COLUMN start_date TEXT;

-- Step 2: rebuild the requests table to drop the leave_type CHECK constraint.
-- SQLite can't ALTER a CHECK constraint in place, so we rename, recreate,
-- copy, and drop.

ALTER TABLE requests RENAME TO requests_old;

CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days_count REAL NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','cancelled')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT,
  decided_by TEXT,
  auto_approved INTEGER NOT NULL DEFAULT 0
);

INSERT INTO requests SELECT * FROM requests_old;

DROP TABLE requests_old;

CREATE INDEX IF NOT EXISTS idx_requests_employee ON requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_dates ON requests(start_date, end_date);
