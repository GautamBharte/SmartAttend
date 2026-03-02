# WhatsApp Notification Flow

> Complete reference for the SmartAttend WhatsApp notification system using the **Meta WhatsApp Cloud API**.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Variables](#environment-variables)
3. [Templates](#templates)
4. [Notification Routing](#notification-routing)
5. [Scheduled Notifications](#scheduled-notifications)
6. [Instant Notifications](#instant-notifications)
7. [Overtime Flow](#overtime-flow)
8. [Editable Check-In/Out Time](#editable-check-inout-time)
9. [Admin Configuration](#admin-configuration)
10. [Employee Profile](#employee-profile)
11. [Database Schema](#database-schema)
12. [Migration](#migration)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SmartAttend Backend                       │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │ attendance.py │───▶│  whatsapp.py │───▶│ Meta WhatsApp API │  │
│  │  (check-in/  │    │              │    │                   │  │
│  │   check-out) │    │ send_whatsapp│    │  graph.facebook   │  │
│  └──────────────┘    │ _to_all()    │    │  .com/v21.0/      │  │
│                      │              │    │  {PHONE_ID}/      │  │
│  ┌──────────────┐    │ _send_single │    │  messages         │  │
│  │   app.py     │───▶│ ()           │    └───────────────────┘  │
│  │ (scheduler   │    └──────────────┘              │            │
│  │  dispatcher) │           │                      ▼            │
│  └──────────────┘    ┌──────────────┐    ┌───────────────────┐  │
│                      │  DB Models   │    │  Admin Numbers    │  │
│                      │              │    │  (WhatsAppConfig) │  │
│                      │ Attendance   │    ├───────────────────┤  │
│                      │ User         │    │  Employee Numbers │  │
│                      │ WhatsApp*    │    │  (User.phone_num) │  │
│                      └──────────────┘    └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Business phone number ID | `123456789012345` |
| `WHATSAPP_ACCESS_TOKEN` | Permanent or temporary access token | `EAAG...` |
| `WHATSAPP_API_VERSION` | Graph API version (optional, default `v21.0`) | `v21.0` |

Set these in your `.env` file. If either `PHONE_NUMBER_ID` or `ACCESS_TOKEN` is missing, all WhatsApp sends are silently skipped.

---

## Templates

All templates must be pre-approved in your Meta Business Manager. The system uses **template messages** with positional parameters (`{{1}}`, `{{2}}`, etc.).

### 1. `attendence_daily` — Check-In Alert

Sent **instantly** when an employee checks in.

```
👋 Good morning, {{1}}!

Just keeping you in the loop:
✅ {{2}} has successfully logged in for the day.

⏰ Check-in Time: {{3}}
📍 Location/Branch: {{4}}

Let's get to work! 🚀
```

| Param | Value |
|-------|-------|
| `{{1}}` | "Team" (recipient label) |
| `{{2}}` | Employee name |
| `{{3}}` | Check-in time (e.g. "9:15 AM") |
| `{{4}}` | "Office" |

**Sent to:** All admin numbers (`WhatsAppConfig` table)

---

### 2. `attendence_daily_v2` — Check-Out Alert

Sent **instantly** when an employee checks out.

```
Evening, {{1}} 🌇

🚪 {{2}} has just logged out and finished their shift.

⏰ Check-out Time: {{3}}
⏱️ Total Hours Logged: {{4}}

Great work today! 👏
```

| Param | Value |
|-------|-------|
| `{{1}}` | "Team" (recipient label) |
| `{{2}}` | Employee name |
| `{{3}}` | Check-out time (e.g. "6:30 PM") |
| `{{4}}` | Total hours (e.g. "9.2h") |

**Sent to:** All admin numbers (`WhatsAppConfig` table)

---

### 3. `daily_attendence_v2` — Attendance Reminder

Sent **on schedule** to employees who haven't checked in yet.

```
⚠️ Attendance Reminder ⚠️

Hi {{1}} 👋, we noticed you haven't checked in for your shift today.

⏳ The daily attendance report will be sent to management in {{2}}!

Please log in immediately via the portal to ensure you aren't marked absent.
Have a great day! 💻
```

| Param | Value |
|-------|-------|
| `{{1}}` | Employee name |
| `{{2}}` | Minutes until morning report (e.g. "30 minutes") |

**Sent to:** Each absent employee's own phone number (`User.phone_number`)
> Employees without a phone number are silently skipped.

---

### 4. `daily_attendence_v3` — Morning Report

Sent **on schedule** to admins with the current login status.

```
📋 Daily Morning Report
Hi {{1}} 👋, here is the current login status for the CATS team:

✅ Logged In:
{{2}}

❌ Not Yet Logged In / Absent:
{{3}}

☕ Wishing you and the team a highly productive shift! 💼
```

| Param | Value |
|-------|-------|
| `{{1}}` | "Team" |
| `{{2}}` | Comma-separated list of logged-in employees |
| `{{3}}` | Comma-separated list of absent employees |

**Sent to:** All admin numbers (`WhatsAppConfig` table)

---

### 5. `daily_attendence` — Evening Wrap-Up Report

Sent **on schedule** at end of day.

| Param | Value |
|-------|-------|
| `{{1}}` | "Team" |
| `{{2}}` | Total employee count |
| `{{3}}` | Logged out employees (comma-separated) |
| `{{4}}` | Absent / never logged in (comma-separated) |
| `{{5}}` | Still online, with `(OT)` suffix for overtime workers |

**Sent to:** All admin numbers (`WhatsAppConfig` table)

---

### 6. `attendence_daily_v3` — Midnight Oil Alert

Sent **on schedule** late at night to employees still checked in (who have NOT marked overtime).

| Param | Value |
|-------|-------|
| `{{1}}` | Employee name |

**Sent to:** Each employee's own phone number (`User.phone_number`)
> Employees who marked **Overtime** are skipped.
> Employees without a phone number are skipped.

---

### 7. `daily_attendence_v4` — Evening Checkout Reminder

Sent **on schedule** before the evening wrap-up to employees still checked in (who have NOT marked overtime).

```
👻 Don't Ghost The System! 👻
Hi {{1}} 👋, it's getting close to closing time!

We are compiling the final evening attendance report for management in {{2}}.
You are currently still showing as logged in.

If you are wrapping up your day, please Check-Out now so you don't end up
on the "Forgot to Checkout" list!

Or, if you're officially on the overtime grind tonight—you're a rockstar! 🎸
Just update your status so we know you're still crushing it and haven't
been abducted by aliens. 🛸 Have a great evening!
```

| Param | Value |
|-------|-------|
| `{{1}}` | Employee name |
| `{{2}}` | Minutes until the evening report (e.g. "30 minutes") |

**Sent to:** Each employee's own phone number (`User.phone_number`)
> Employees who marked **Overtime** are skipped.
> Employees without a phone number are skipped.

---

## Notification Routing

The system uses **two separate phone number sources**:

### Admin Numbers (Reports & Alerts)
- Stored in the `whatsapp_config` table
- Managed via **Admin Panel → WhatsApp Options** modal
- Receive: check-in alerts, check-out alerts, morning report, evening wrap-up

### Employee Numbers (Reminders & Personal Alerts)
- Stored in `User.phone_number` field
- Each employee sets their own number in **Profile → WhatsApp Number**
- Receive: attendance reminders, midnight oil alerts

```
┌──────────────────────────┐     ┌───────────────────────────┐
│     ADMIN NUMBERS        │     │    EMPLOYEE NUMBERS       │
│  (WhatsAppConfig table)  │     │  (User.phone_number)      │
├──────────────────────────┤     ├───────────────────────────┤
│ ✅ Check-in alert        │     │ ⏰ Attendance reminder    │
│ ✅ Check-out alert       │     │ 🦉 Midnight oil alert    │
│ 📋 Morning report        │     │    (skipped if overtime)  │
│ 📊 Evening wrap-up       │     │                           │
└──────────────────────────┘     └───────────────────────────┘
```

---

## Scheduled Notifications

All schedules are controlled via a **single interval-based dispatcher** that runs every 60 seconds. It reads schedule times from the `whatsapp_schedule_config` DB table.

### Timeline (configurable via Admin UI)

```
  10:30 AM       11:00 AM       6:30 PM        7:00 PM           11:00 PM
     │              │              │               │                  │
     ▼              ▼              ▼               ▼                  ▼
 ┌────────┐   ┌──────────┐  ┌───────────┐  ┌──────────────┐   ┌────────────┐
 │Reminder│   │ Morning  │  │ Checkout  │  │   Evening    │   │  Midnight  │
 │(to emp)│   │ Report   │  │ Reminder  │  │   Wrap-Up    │   │  Oil Alert │
 │        │   │(to admin)│  │ (to emp)  │  │  (to admin)  │   │  (to emp)  │
 └────────┘   └──────────┘  └───────────┘  └──────────────┘   └────────────┘
```

### How it works

1. Backend scheduler (`app.py`) fires `_dispatcher()` every 60 seconds
2. `_dispatcher()` reads the current time in the office timezone
3. Compares `HH:MM` to each configured schedule time
4. Uses a `_fired` set to prevent duplicate sends within the same minute
5. Stale entries are cleaned from `_fired` after 2 minutes

### Changing schedule times

- Admin opens **WhatsApp Options → Schedule** tab in the Admin Panel
- Edits any of the 4 time pickers
- Clicks **Save Schedule**
- Changes take effect within 60 seconds — **no server restart needed**

---

## Instant Notifications

Triggered by employee actions (not scheduled):

| Event | Template | Sent To | Mechanism |
|-------|----------|---------|-----------|
| Employee checks in | `attendence_daily` | Admin numbers | `send_whatsapp_async()` (background thread) |
| Employee checks out | `attendence_daily_v2` | Admin numbers | `send_whatsapp_async()` (background thread) |

These are fire-and-forget via `threading.Thread` to avoid blocking the API response.

---

## Overtime Flow

### How employees use it

1. Employee is checked in (status: `checked_in_only`)
2. Clicks the **🌙 Overtime** button (next to Quick Check-Out)
3. Button toggles to amber **"Cancel Overtime"** state
4. `POST /attendance/overtime` toggles `is_overtime` on today's record

### How it affects notifications

| Notification | Effect |
|---|---|
| **Midnight Oil Alert** | **Skipped** for overtime employees |
| **Evening Wrap-Up** | Overtime employees shown with `(OT)` suffix |
| **Check-Out Alert** | Unaffected — sent normally when they eventually check out |

### Flow diagram

```
Employee clicks "Overtime"
        │
        ▼
  POST /attendance/overtime
        │
        ▼
  Toggle is_overtime on today's record
        │
        ├── is_overtime = true
        │     └── Midnight alert: SKIP this employee
        │     └── EOD wrap-up: show "Name (OT)"
        │
        └── is_overtime = false (cancelled)
              └── Midnight alert: SEND normally
              └── EOD wrap-up: show "Name" (no suffix)
```

---

## Editable Check-In/Out Time

### How it works

1. Employee clicks **Quick Check-In** or **Quick Check-Out**
2. Confirmation dialog opens with a **time input** (HH:MM, 24h format)
3. Time is pre-filled with the current office time
4. Employee can **edit the time** if needed (e.g. they forgot to check in earlier)
5. Clicks Confirm — the edited time is sent to the backend

### Backend handling

- `POST /attendance/check-in` and `POST /attendance/check-out` accept an optional `time` field in the JSON body
- `_parse_custom_time(time_str, date)` handles conversion:
  - `"14:30"` → interpreted as office-local time → converted to naive UTC
  - ISO 8601 string → parsed directly → converted to naive UTC
- If no `time` is provided, falls back to `utc_now()` (fully backward compatible)
- The stored time is used in all WhatsApp notifications

---

## Admin Configuration

### WhatsApp Numbers (Admin Panel → WhatsApp Options → Numbers tab)

- **Add number**: Enter phone number (with country code, e.g. `919876543210`) and optional label
- **Remove number**: Click delete icon
- These numbers receive all admin-targeted notifications (check-in/out alerts, reports)

### Schedule Times (Admin Panel → WhatsApp Options → Schedule tab)

| Setting | Default | Description |
|---------|---------|-------------|
| Attendance Reminder | `10:30` | When to remind absent employees |
| Morning Report | `11:00` | When to send login status to admins |
| Checkout Reminder | `18:30` | When to remind employees to checkout before EOD |
| Evening Wrap-Up | `19:00` | When to send EOD summary to admins |
| Midnight Oil Alert | `23:00` | When to alert employees still checked in |

All times are in the office timezone (configured in `office_config.py`).

---

## Employee Profile

### WhatsApp Number (Profile → Edit → WhatsApp Number card)

- Employee enters their phone number with country code (e.g. `919876543210`)
- This number receives:
  - **Attendance reminders** (if they haven't checked in)
  - **Midnight oil alerts** (if they're still checked in and haven't marked overtime)
- Employees without a phone number are silently skipped for these notifications

---

## Database Schema

### New/Modified Tables

```sql
-- User table (modified)
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- Attendance table (modified)
ALTER TABLE attendance ADD COLUMN is_overtime BOOLEAN NOT NULL DEFAULT 0;

-- WhatsApp admin numbers (new table)
CREATE TABLE whatsapp_config (
    id          INTEGER PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    label       VARCHAR(100),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp schedule config (new table, single-row)
CREATE TABLE whatsapp_schedule_config (
    id                      INTEGER PRIMARY KEY,
    reminder_time           VARCHAR(5) NOT NULL DEFAULT '10:30',
    morning_report_time     VARCHAR(5) NOT NULL DEFAULT '11:00',
    evening_reminder_time   VARCHAR(5) NOT NULL DEFAULT '18:30',
    evening_report_time     VARCHAR(5) NOT NULL DEFAULT '19:00',
    midnight_alert_time     VARCHAR(5) NOT NULL DEFAULT '23:00'
);
```

### Key Files

| File | Purpose |
|------|---------|
| `backend/app/whatsapp.py` | Meta API integration, send helpers |
| `backend/app/app.py` | Scheduler dispatcher |
| `backend/app/routes/attendance.py` | Check-in/out/overtime endpoints |
| `backend/app/routes/admin.py` | WhatsApp number & schedule management |
| `backend/app/models/whatsapp_config.py` | Admin phone numbers model |
| `backend/app/models/whatsapp_schedule.py` | Schedule config model |
| `backend/app/models/user.py` | User model (phone_number) |
| `backend/app/models/attendance.py` | Attendance model (is_overtime) |
| `backend/app/daily_report.py` | Email daily report (no auto-checkout) |

---

## Migration

For **existing databases**, run the migration script to add new columns:

```bash
cd backend
python scripts/migrate_whatsapp_overtime.py
```

This will:
1. Add `phone_number` column to `users` table
2. Add `is_overtime` column to `attendance` table
3. Create `whatsapp_config` and `whatsapp_schedule_config` tables if they don't exist

For **new databases**, `python scripts/setup_db.py` handles everything via `db.create_all()`.

---

## Notes

- **No auto-checkout**: The system no longer auto-fills checkout times. Employees who don't check out will show "Still Checked In" in the daily email report.
- **Async sends**: All instant notifications (check-in/out) use background threads to avoid blocking the API.
- **Timezone handling**: All times are stored in UTC in the database. Display/input uses the office timezone configured in `office_config.py`.
- **Idempotent scheduler**: The `_fired` set prevents duplicate notifications even if the dispatcher runs multiple times within the same minute.
