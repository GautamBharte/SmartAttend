# SmartAttend — WhatsApp Notification System: Change Report

> **Date:** 3 March 2026
> **Scope:** Backend, Frontend, Database
> All changes relate to the WhatsApp notification flow enhancements.

---

## Table of Contents

1. [Summary of Changes](#summary-of-changes)
2. [Feature 1: Retry Logic with Exponential Backoff](#feature-1-retry-logic-with-exponential-backoff)
3. [Feature 2: Personalized Admin Names](#feature-2-personalized-admin-names)
4. [Feature 3: Truncated Name Lists](#feature-3-truncated-name-lists)
5. [Feature 4: Independent Notification Toggles (Admin)](#feature-4-independent-notification-toggles-admin)
6. [Feature 5: Employee Notification Opt-Out](#feature-5-employee-notification-opt-out)
7. [Feature 6: WhatsApp Delivery Status Webhooks](#feature-6-whatsapp-delivery-status-webhooks)
8. [Feature 7: Timezone Label in Config Modal](#feature-7-timezone-label-in-config-modal)
9. [Feature 8: Editable Check-In/Out Time](#feature-8-editable-check-inout-time)
10. [Feature 9: Overtime Toggle](#feature-9-overtime-toggle)
11. [Feature 10: Evening Checkout Reminder Template](#feature-10-evening-checkout-reminder-template)
12. [Feature 11: Auto-Checkout Removed](#feature-11-auto-checkout-removed)
13. [All Files Changed](#all-files-changed)
14. [New Environment Variables](#new-environment-variables)
15. [Database Migration](#database-migration)
16. [New Database Columns Reference](#new-database-columns-reference)
17. [API Changes](#api-changes)
18. [Post-Deploy Checklist](#post-deploy-checklist)

---

## Summary of Changes

| # | Feature | Type | Status |
|---|---------|------|--------|
| 1 | Retry logic with exponential backoff | Reliability | ✅ Done |
| 2 | Personalized admin names in templates | Enhancement | ✅ Done |
| 3 | Truncated name lists (1024-char safe) | Bugfix/Safety | ✅ Done |
| 4 | Independent notification toggles (admin) | Feature | ✅ Done |
| 5 | Employee notification opt-out | Feature | ✅ Done |
| 6 | WhatsApp delivery status webhooks | Feature | ✅ Done |
| 7 | Timezone label (IST) in config modal | UX | ✅ Done |
| 8 | Editable check-in/out time | Feature | ✅ Done |
| 9 | Overtime toggle | Feature | ✅ Done |
| 10 | Evening checkout reminder (`daily_attendence_v4`) | Feature | ✅ Done |
| 11 | Auto-checkout removed | Behavior Change | ✅ Done |

---

## Feature 1: Retry Logic with Exponential Backoff

**Problem:** A single failed HTTP request to the Meta WhatsApp API would silently drop the notification with no recovery.

**Solution:** Added retry logic to `_send_single()` in `whatsapp.py`:

| Setting | Value |
|---------|-------|
| Max retries | 3 |
| Backoff | Exponential: 2s → 4s |
| 4xx errors | **No retry** (client errors like bad auth, invalid number) |
| 5xx errors | **Retry** (server-side issues) |
| Timeouts | **Retry** (15s timeout per request) |

```
Attempt 1 → fail (5xx) → wait 2s → Attempt 2 → fail (5xx) → wait 4s → Attempt 3 → fail → GIVE UP
Attempt 1 → fail (400) → GIVE UP immediately (no retry on client errors)
```

**File:** `backend/app/whatsapp.py`

---

## Feature 2: Personalized Admin Names

**Problem:** All admin-targeted templates used a hardcoded `"Team"` as the `{{1}}` parameter (e.g. "Good morning, Team!").

**Solution:** Introduced `send_whatsapp_to_all_personalized()` which calls a `params_fn(label)` function for each admin number, passing their `WhatsAppConfig.label` as the greeting name.

**Before:**
```
👋 Good morning, Team!
✅ John has successfully logged in for the day.
```

**After:**
```
👋 Good morning, Ullekh!
✅ John has successfully logged in for the day.
```

**Templates affected:**
- `attendence_daily` (check-in alert)
- `attendence_daily_v2` (check-out alert)
- `daily_attendence_v3` (morning report)
- `daily_attendence` (evening wrap-up)

> **Important:** The `label` field in the WhatsApp Numbers config (admin panel) now serves as the admin's greeting name. If no label is set, it falls back to `"Team"`.

**Files:** `backend/app/whatsapp.py`, `backend/app/app.py`, `backend/app/routes/attendance.py`

---

## Feature 3: Truncated Name Lists

**Problem:** WhatsApp template parameters have a 1024-character limit. A team with 50+ employees could blow past this limit when sending comma-separated name lists.

**Solution:** New helper `truncate_name_list(names, max_chars=900)` in `whatsapp.py`:

```
Input:  ["Alice", "Bob", "Charlie", ..., "Zara"]  (60 names)
Output: "Alice, Bob, Charlie, David, Eve … and 55 more"
```

Uses a 900-char safety margin (out of 1024 max) to account for template boilerplate.

**Applied to:**
- Morning Report — logged in / absent lists
- Evening Wrap-Up — logged out / ghosted / still online lists

**File:** `backend/app/whatsapp.py`, `backend/app/app.py`

---

## Feature 4: Independent Notification Toggles (Admin)

**7 independent ON/OFF toggles** added to the admin WhatsApp config modal:

| Toggle | Column Name | Type | Default | Notifications Controlled |
|--------|-------------|------|---------|--------------------------|
| Attendance Reminder | `reminder_enabled` | Boolean | `true` | Pre-morning employee reminder |
| Morning Report | `morning_report_enabled` | Boolean | `true` | Daily login status to admins |
| Checkout Reminder | `evening_reminder_enabled` | Boolean | `true` | Pre-evening employee checkout nudge |
| Evening Wrap-Up | `evening_report_enabled` | Boolean | `true` | EOD summary to admins |
| Midnight Alert | `midnight_alert_enabled` | Boolean | `true` | Late-night employee alert |
| Check-In Alert | `checkin_alert_enabled` | Boolean | `true` | Instant check-in notification |
| Check-Out Alert | `checkout_alert_enabled` | Boolean | `true` | Instant check-out notification |

**How it works:**
- Each toggle is stored in the `whatsapp_schedule_config` table
- The dispatcher (`app.py`) checks the corresponding `_enabled` flag before running each section
- Instant alerts (`attendance.py`) check `checkin_alert_enabled` / `checkout_alert_enabled` before sending
- Time inputs in the UI are disabled when their toggle is off

**Files:** `backend/app/models/whatsapp_schedule.py`, `backend/app/routes/admin.py`, `backend/app/app.py`, `backend/app/routes/attendance.py`, `smartattend-frontend/src/components/dashboard/WhatsAppConfigModal.tsx`, `smartattend-frontend/src/services/adminService.ts`

---

## Feature 5: Employee Notification Opt-Out

**3 preference toggles** added to the employee profile page:

| Toggle | Column | Default | Notification |
|--------|--------|---------|--------------|
| ⏰ Attendance Reminder | `notify_reminder` | `true` | "You haven't checked in" reminder |
| 👻 Checkout Reminder | `notify_checkout` | `true` | Pre-evening "check out now" nudge |
| 🦉 Midnight Alert | `notify_midnight` | `true` | Late-night "still checked in" alert |

**How it works:**
- Stored on the `users` table as boolean columns
- Exposed via `GET /auth/profile` and `PATCH /auth/profile`
- Profile form shows a "🔔 Notification Preferences" card with Switch toggles
- Each toggle saves instantly via API (no save button needed)
- Dispatcher (`app.py`) checks `emp.notify_*` before sending to each employee
- An info banner clarifies: "Admin-sent reports cannot be opted out of here"

> **Note:** Admin-targeted notifications (morning report, evening wrap-up, check-in/out alerts) are controlled by admin toggles only — employee opt-out does not affect those.

**Files:** `backend/app/models/user.py`, `backend/app/routes/auth.py`, `backend/app/app.py`, `smartattend-frontend/src/components/profile/EditProfileForm.tsx`, `smartattend-frontend/src/services/dualModeService.ts`

---

## Feature 6: WhatsApp Delivery Status Webhooks

**New blueprint** `routes/webhook.py` for Meta WhatsApp Cloud API delivery status tracking.

### Endpoints

| Method | URL | Purpose |
|--------|-----|---------|
| `GET` | `/whatsapp/webhook` | Meta webhook verification (challenge-response) |
| `POST` | `/whatsapp/webhook` | Receives delivery status updates |

### Meta Webhook Verification Flow

```
Meta sends: GET /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>

If token matches WHATSAPP_WEBHOOK_VERIFY_TOKEN → respond with challenge (200)
If token doesn't match → respond with 403
```

### Delivery Status Updates

Meta pushes these statuses via POST:
- `sent` — Message accepted by Meta
- `delivered` — Message delivered to recipient's device
- `read` — Recipient opened the message
- `failed` — Delivery failed (error details logged)

All statuses are logged. Failed messages log the error reason.

### Setup in Meta Business Manager

1. Go to **Meta for Developers → Your App → WhatsApp → Configuration**
2. Set **Callback URL** to `https://your-domain.com/whatsapp/webhook`
3. Set **Verify Token** to the value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your `.env`
4. Subscribe to the `messages` webhook field

**Files:** `backend/app/routes/webhook.py` (NEW), `backend/app/app.py`, `backend/.env.example`

---

## Feature 7: Timezone Label in Config Modal

**Small UX improvement:** Added `(IST)` label next to "Notification Schedule" header in the WhatsApp config modal so admins know the timezone of all time pickers.

**File:** `smartattend-frontend/src/components/dashboard/WhatsAppConfigModal.tsx`

---

## Feature 8: Editable Check-In/Out Time

Employees can edit the check-in/check-out time before confirming:


1. Click Quick Check-In → confirmation dialog opens with time input (pre-filled with current time)
2. Edit the time if needed (e.g., forgot to check in at 9 AM, now it's 11 AM)
3. Confirm → edited time is sent to backend and stored

**Backend:** `_parse_custom_time()` in `attendance.py` handles `"HH:MM"` → UTC conversion.

**File:** `backend/app/routes/attendance.py`, `smartattend-frontend/src/components/dashboard/DashboardOverview.tsx`

---

## Feature 9: Overtime Toggle

An overtime button appears on the dashboard when checked in:

1. Employee clicks **🌙 Overtime** → `POST /attendance/overtime` toggles `is_overtime`
2. Overtime employees are **skipped** from midnight alerts and checkout reminders
3. Evening wrap-up shows them with `(OT)` suffix

**File:** `backend/app/routes/attendance.py`, `smartattend-frontend/src/components/dashboard/DashboardOverview.tsx`

---

## Feature 10: Evening Checkout Reminder Template

Template `daily_attendence_v4` sent before the evening report to employees still checked in:

```
👻 Don't Ghost The System! 👻
Hi {{1}} 👋, it's getting close to closing time!
We are compiling the final evening attendance report for management in {{2}}.
...
```

Employees who marked overtime are skipped.

**File:** `backend/app/app.py`

---

## Feature 11: Auto-Checkout Removed

The system **no longer** auto-fills checkout times. Employees who don't check out appear as "Still Checked In" in reports.

**File:** `backend/app/daily_report.py`

---

## All Files Changed

### Backend — New Files

| File | Description |
|------|-------------|
| `backend/app/routes/webhook.py` | WhatsApp delivery status webhook endpoint |

### Backend — Modified Files

| File | Changes |
|------|---------|
| `backend/app/whatsapp.py` | Retry logic, `truncate_name_list()`, `send_whatsapp_to_all_personalized()`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |
| `backend/app/app.py` | Webhook blueprint registered, personalized admin names, truncation, employee opt-out checks in dispatcher |
| `backend/app/models/user.py` | Added `notify_reminder`, `notify_checkout`, `notify_midnight` columns |
| `backend/app/models/whatsapp_schedule.py` | Added 7 boolean toggle columns |
| `backend/app/routes/auth.py` | Profile PATCH/GET returns and accepts notification prefs |
| `backend/app/routes/attendance.py` | Personalized admin names in check-in/out alerts, editable time, overtime, toggle checks |
| `backend/app/routes/admin.py` | Schedule PATCH handles boolean toggle fields |
| `backend/app/daily_report.py` | Auto-checkout removed |
| `backend/.env.example` | Added `WHATSAPP_API_VERSION`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |
| `backend/scripts/migrate_whatsapp_overtime.py` | Added employee notification preference columns |

### Frontend — Modified Files

| File | Changes |
|------|---------|
| `smartattend-frontend/src/components/dashboard/WhatsAppConfigModal.tsx` | IST timezone label, 7 notification toggles, required name field for numbers |
| `smartattend-frontend/src/components/profile/EditProfileForm.tsx` | Notification preferences section with Switch toggles |
| `smartattend-frontend/src/components/dashboard/DashboardOverview.tsx` | Overtime button, editable time input, removed unused state |
| `smartattend-frontend/src/services/adminService.ts` | WhatsAppSchedule interface updated with toggle fields |
| `smartattend-frontend/src/services/dualModeService.ts` | `updateProfile` accepts notification pref booleans |

---

## New Environment Variables

Add these to your `.env` file alongside existing WhatsApp variables:

```env
# Optional — defaults shown
WHATSAPP_API_VERSION=v21.0

# Required for webhook verification (must match Meta's config)
WHATSAPP_WEBHOOK_VERIFY_TOKEN=smartattend_verify_token
```

---

## Database Migration

### For Existing Databases

Run the migration script to add all new columns:

```bash
cd backend
python scripts/migrate_whatsapp_overtime.py
```

**What it does:**

1. Adds `phone_number` to `users` table
2. Adds `is_overtime` to `attendance` table
3. Adds `evening_reminder_time` to `whatsapp_schedule_config` table
4. Adds 7 toggle columns to `whatsapp_schedule_config` table:
   - `reminder_enabled`, `morning_report_enabled`, `evening_reminder_enabled`
   - `evening_report_enabled`, `midnight_alert_enabled`
   - `checkin_alert_enabled`, `checkout_alert_enabled`
5. Adds 3 notification preference columns to `users` table:
   - `notify_reminder`, `notify_checkout`, `notify_midnight`
6. Creates any missing tables via `db.create_all()`

> All `ALTER TABLE` commands use try/except so it's safe to run multiple times (idempotent).

### For New Databases

No special migration needed — `python scripts/setup_db.py` handles everything via `db.create_all()`.

---

## New Database Columns Reference

### `users` table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `phone_number` | VARCHAR(20) | NULL | Employee's WhatsApp number |
| `notify_reminder` | BOOLEAN | `true` | Opt-in for attendance reminders |
| `notify_checkout` | BOOLEAN | `true` | Opt-in for checkout reminders |
| `notify_midnight` | BOOLEAN | `true` | Opt-in for midnight alerts |

### `attendance` table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `is_overtime` | BOOLEAN | `false` | Whether employee marked overtime |

### `whatsapp_schedule_config` table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `evening_reminder_time` | VARCHAR(5) | `18:30` | When to send checkout reminders |
| `reminder_enabled` | BOOLEAN | `true` | Toggle attendance reminders |
| `morning_report_enabled` | BOOLEAN | `true` | Toggle morning report |
| `evening_reminder_enabled` | BOOLEAN | `true` | Toggle checkout reminders |
| `evening_report_enabled` | BOOLEAN | `true` | Toggle evening wrap-up |
| `midnight_alert_enabled` | BOOLEAN | `true` | Toggle midnight alerts |
| `checkin_alert_enabled` | BOOLEAN | `true` | Toggle instant check-in alerts |
| `checkout_alert_enabled` | BOOLEAN | `true` | Toggle instant check-out alerts |

---

## API Changes

### `PATCH /auth/profile`

**New accepted fields:**

```json
{
  "notify_reminder": true,
  "notify_checkout": false,
  "notify_midnight": true
}
```

**Updated response:**

```json
{
  "message": "Profile updated",
  "name": "John",
  "email": "john@example.com",
  "phone_number": "919876543210",
  "notify_reminder": true,
  "notify_checkout": false,
  "notify_midnight": true
}
```

### `GET /auth/profile`

**Updated response** — now includes notification preferences:

```json
{
  "id": 1,
  "name": "John",
  "email": "john@example.com",
  "phone_number": "919876543210",
  "role": "employee",
  "created_at": "2026-01-15T10:30:00",
  "notify_reminder": true,
  "notify_checkout": true,
  "notify_midnight": true
}
```

### `PATCH /admin/whatsapp/schedule`

**New accepted fields (all optional booleans):**

```json
{
  "reminder_enabled": true,
  "morning_report_enabled": false,
  "evening_reminder_enabled": true,
  "evening_report_enabled": true,
  "midnight_alert_enabled": true,
  "checkin_alert_enabled": true,
  "checkout_alert_enabled": false
}
```

### `GET /whatsapp/webhook` (NEW)

Meta webhook verification. Returns the challenge on valid token.

### `POST /whatsapp/webhook` (NEW)

Receives Meta delivery status updates. Always returns `200`.

---

## Post-Deploy Checklist

- [ ] **Run migration:** `cd backend && python scripts/migrate_whatsapp_overtime.py`
- [ ] **Update `.env`:** Add `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (if using webhooks)
- [ ] **Restart backend** to pick up new routes and env vars
- [ ] **Rebuild frontend** (`npm run build` or restart dev server)
- [ ] **Configure Meta webhook** (optional): Set callback URL to `https://your-domain/whatsapp/webhook` in Meta Business Manager
- [ ] **Set admin labels**: Edit existing admin WhatsApp numbers to add name labels (used for personalized greetings)
- [ ] **Inform employees**: They can now manage notification preferences in their profile page
- [ ] **Test:** Check-in → verify instant alert uses admin's name, not "Team"
