-- Fatty Chem Days Off Planner schema
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  annual_pto_days INTEGER NOT NULL DEFAULT 20,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('vacation','sick','personal','half_day')),
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

CREATE INDEX IF NOT EXISTS idx_requests_employee ON requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_dates ON requests(start_date, end_date);
