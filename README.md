# Fatty Chem Days Off Planner

An internal web tool for tracking employee time-off requests.

**Features**

- Monthly calendar view of all approved + pending requests, color-coded by leave type.
- Admins create requests on behalf of employees from a simple form.
- Submitted requests trigger an email to a designated approver with one-click **Approve / Reject** buttons (signed magic links — no login needed from email).
- YTD report showing per-employee totals (vacation used, remaining PTO, sick, personal, pending).
- Daily auto-approval: if a pending request's date passes without a decision, it's automatically marked confirmed.
- Employee management: add, edit, deactivate.
- Single shared admin password protects the app.

---

## Setup walkthrough

This walkthrough assumes you've never deployed a web app before. You'll need accounts on three free services:

1. **GitHub** (to store the code)
2. **Vercel** (to host the app, free)
3. **Turso** (database, free)
4. **Resend** (email, free up to 100 emails/day)

Total time: ~30 minutes.

### Step 1 — Install Node.js (one-time)

Download and install Node.js 20+ from <https://nodejs.org>. After installing, open a terminal (PowerShell on Windows) and verify:

```bash
node --version   # should print v20.x or higher
```

### Step 2 — Install dependencies

From the project folder (`Fatty Chem Days of Planner`), run:

```bash
npm install
```

### Step 3 — Create a Turso database (free)

1. Go to <https://turso.tech>, sign up.
2. Install the CLI:
   - **Mac/Linux:** `curl -sSfL https://get.tur.so/install.sh | bash`
   - **Windows:** `irm get.tur.so/install.ps1 | iex`
3. Log in: `turso auth login`
4. Create the database: `turso db create fatty-chem-daysoff`
5. Get the connection URL: `turso db show fatty-chem-daysoff --url`
6. Get an auth token: `turso db tokens create fatty-chem-daysoff`

Keep both values handy.

### Step 4 — Set up Resend (email sending)

1. Sign up at <https://resend.com>.
2. Add and verify a sending domain (e.g. `fatty-chem.com`). Resend will give you DNS records to add.
   - For testing without a domain, you can use `onboarding@resend.dev` as the From address.
3. Create an API key in the dashboard.

### Step 5 — Configure environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
TURSO_DATABASE_URL=libsql://fatty-chem-daysoff-<yourname>.turso.io
TURSO_AUTH_TOKEN=<token from step 3>

# Generate a random secret (32+ bytes). On Mac/Linux:
#   openssl rand -base64 32
# On Windows PowerShell:
#   [Convert]::ToBase64String((1..32 | %{Get-Random -Maximum 256}))
APP_SECRET=<random base64 string>

# Generate the admin password hash. Run:
#   npm run hash:password "YourAdminPasswordHere"
# Then paste the output here.
ADMIN_PASSWORD_HASH=$2a$10$...

RESEND_API_KEY=re_...
APPROVER_EMAIL=approver@fatty-chem.com
EMAIL_FROM=daysoff@fatty-chem.com    # or onboarding@resend.dev for testing
NEXT_PUBLIC_APP_URL=http://localhost:3000   # we'll change this after deploying

CRON_SECRET=<another random string>
```

### Step 6 — Initialize the database

```bash
npm run db:init
```

This creates the tables and seeds 5 placeholder employees (Maria, Carlos, Ana, Luis, Sofia). You can edit them from the Employees page later.

### Step 7 — Run it locally (sanity check)

```bash
npm run dev
```

Open <http://localhost:3000>, log in with the admin password you chose, and try creating a test request. You should receive the approval email at the address in `APPROVER_EMAIL`.

### Step 8 — Deploy to Vercel

1. Sign up at <https://vercel.com> with your GitHub account.
2. Push this project to a private GitHub repo (you can use GitHub Desktop if you're not comfortable with the command line: <https://desktop.github.com>).
3. In Vercel, click **Add New → Project**, import the repo.
4. Before clicking Deploy, expand **Environment Variables** and paste in every variable from your `.env` file (except `NEXT_PUBLIC_APP_URL` — leave that until step 5).
5. Click Deploy. Vercel will give you a URL like `https://fatty-chem-daysoff.vercel.app`.
6. Go to **Settings → Environment Variables**, add `NEXT_PUBLIC_APP_URL` set to that Vercel URL, then redeploy (Deployments → … → Redeploy).

### Step 9 — Verify the cron job

The auto-approve cron runs daily at 01:00 UTC. In Vercel's project dashboard, go to **Crons** — you should see `/api/cron/auto-approve` listed.

### Step 10 — Share the URL with your admins

Share the Vercel URL and the admin password with your office admins. They can bookmark it.

---

## How approvers use the system

1. Admin fills the form in the app on behalf of the employee.
2. An email lands in **every approver's** inbox with the request details and two buttons: **Approve** and **Reject**.
3. Clicking either button opens a confirmation page. No login required from the email — the link itself is signed and single-purpose.
4. **The first response wins.** If admin A clicks Approve and admin B clicks Reject five seconds later, admin A's approval is locked in and admin B sees "Already decided — confirmed on May 15, 2:14 PM. The first response from any admin is final, so no change was made." This is enforced at the database level with a conditional update, so the result is deterministic even if two admins click at the exact same instant.
5. If no approver ever acts and the requested date arrives, the daily cron auto-confirms the request.

### Adding or removing approvers

The list of approvers lives in the `APPROVER_EMAIL` environment variable as a comma-separated list. To change it:

1. In Vercel → your project → **Settings → Environment Variables**, edit `APPROVER_EMAIL`.
2. Set it to one or more addresses separated by commas, no spaces around the commas required:
   `boss@fatty-chem.com,ops-lead@fatty-chem.com,plant-mgr@fatty-chem.com`
3. Redeploy (Deployments tab → ⋯ → Redeploy) so the change takes effect.

No code changes needed — adding/removing an approver is purely a config change.

---

## Day-to-day operations

| Task | Where |
|---|---|
| See who's out this month | Calendar page (`/`) |
| Submit a new request | Calendar → "+ New request" |
| Approve / reject from inside the app | Requests page (`/requests`) — filter by Pending |
| See how many vacation days someone has left | YTD Report (`/ytd`) |
| Add / remove an employee | Employees page (`/employees`) |
| Change the admin password | Re-run `npm run hash:password "newpass"`, update `ADMIN_PASSWORD_HASH` in Vercel env vars, redeploy |

---

## Things to keep an eye on (per Andres's pilot notes)

- The system intentionally auto-confirms requests where the date passes without a decision. This is by design during the pilot. If you see employees submitting day-prior requests, we may want to add a "minimum N days notice" rule later.
- Sick days don't normally need pre-approval. They still go through the same flow for now — you can configure auto-approval for sick days as a future enhancement.

---

## File layout

```
app/
  page.tsx                Calendar dashboard
  login/                  Admin login
  decision/               Email magic-link landing page (approve/reject)
  requests/               Requests list + new request form
  employees/              Employee management
  ytd/                    YTD report
  api/
    auth/                 Login / logout
    employees/            CRUD
    requests/             CRUD + approval
    cron/auto-approve/    Daily auto-confirmation job
components/
  Nav.tsx                 Top navigation
  Calendar.tsx            Monthly calendar widget
lib/
  db.ts                   Database client + types
  auth.ts                 Admin session
  tokens.ts               Signed approval tokens
  email.ts                Resend integration + email template
  dates.ts                Business-day helpers
  schema.sql              Database schema
scripts/
  init-db.ts              Run schema, seed placeholder employees
  hash-password.js        Generate bcrypt hash for admin password
vercel.json               Cron configuration
```

---

## Customizing the logo

The app uses the official Fatty Chem brand assets stored in `public/`:

- `fatty-chem-logo-full.png` — full lockup (sunburst + "fattychem" + "BYPRODUCTS"). Used on the login screen.
- `fatty-chem-mark-orange.png` — orange sunburst icon only. Used as the favicon.
- `fatty-chem-mark-white.png` — white sunburst icon only. Used in the top navigation bar and the email-decision landing page.

To replace any of them, just drop a new file into `public/` with the same filename. The whole app will pick it up on the next deploy — no code changes required.

If you want to use a different variant in a specific place (e.g. switch the nav from white to orange):

- Open `components/Nav.tsx`, find `<FattyChemMark variant="white" />`, change to `variant="orange"`.

### About the approval email

The email keeps a CSS-only brand mark (an orange disc + "fattychem" text on a black bar) rather than embedding the logo PNG, because most email clients (Outlook in particular) block remote images by default. If you want to switch to using the actual logo image in emails, edit `lib/email.ts` — replace the `<div>` brand-mark with an `<img>` tag pointing at `${process.env.NEXT_PUBLIC_APP_URL}/fatty-chem-mark-orange.png`. Recipients will need to click "Display images" the first time the email arrives.

### Changing brand colors

Open `tailwind.config.ts` — all colors live under `theme.extend.colors.brand` (orange shades) and `theme.extend.colors.ink` (black/charcoal shades). Change the hex codes and the entire app re-themes automatically.

---

## Common issues

**"Email could not be sent"** — Check `RESEND_API_KEY`, `EMAIL_FROM`, and that the From domain is verified in Resend. For testing, set `EMAIL_FROM=onboarding@resend.dev`.

**"This link is invalid or has expired"** — Approval links use the `APP_SECRET`. If you rotate the secret, old links stop working. Tokens expire after 90 days.

**"Wrong password" but you typed it right** — `ADMIN_PASSWORD_HASH` must be the *bcrypt hash*, not the plain password. Re-run `npm run hash:password "yourpass"` and paste the full output.

**Calendar is empty** — Either no requests yet, or the year filter is hiding them. Submit a test request to verify.


