import { useEffect, useMemo, useState } from 'react';
import { DualModeService } from '@/services/dualModeService';
import { OFFICE } from '@/config/api';

type DayType = 'work' | 'leave' | 'tour' | 'holiday' | 'weekend';

interface DayData {
  type: DayType;
  intensity: number;
  hours?: number;
  tooltip?: string;
}

interface CalendarMap {
  [dateStr: string]: DayData;
}

/* ── Sizing constants (px) ─────────────────────────────────────────── */
const CELL = 13;
const GAP = 3;
const PITCH = CELL + GAP;

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2020;

export const ContributionCalendar = () => {
  const [calendarData, setCalendarData] = useState<CalendarMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR; y >= MIN_YEAR; y--) years.push(y);
    return years;
  }, []);

  /* ── Fetch data ─────────────────────────────────────────────────── */
  useEffect(() => { fetchCalendarData(); }, []);

  const fetchCalendarData = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const [attendanceRes, leaves, tours, holidaysCur, holidaysPrev, weekendConfig] = await Promise.all([
        DualModeService.getAttendanceHistory(),
        DualModeService.getLeaveHistory(),
        DualModeService.getTourHistory(),
        DualModeService.getHolidays(currentYear),
        DualModeService.getHolidays(currentYear - 1),
        DualModeService.getWeekendConfig(),
      ]);

      const map: CalendarMap = {};

      // Get weekend days from config (default to Sunday only if not available)
      const weekendDays = weekendConfig?.weekend_days || [6]; // 6 = Sunday

      // Mark holidays first (lowest priority — attendance/leave/tour override)
      const allHolidays = [...(holidaysPrev ?? []), ...(holidaysCur ?? [])];
      const holidaySet = new Set<string>();
      for (const h of allHolidays) {
        holidaySet.add(h.date);
        map[h.date] = { type: 'holiday', intensity: 1, tooltip: `🏷️ ${h.name}` };
      }

      // Mark weekend days in the visible range (past year)
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      // JavaScript getDay(): Sunday=0, Monday=1, ..., Saturday=6
      // Python weekday: Monday=0, ..., Sunday=6
      // Convert Python weekday to JavaScript getDay()
      const jsWeekendDays = weekendDays.map((pyDay: number) => {
        // Python: Mon=0, Tue=1, ..., Sun=6
        // JS: Sun=0, Mon=1, ..., Sat=6
        if (pyDay === 6) return 0; // Sunday: Python 6 -> JS 0
        return pyDay + 1; // Others: Python 0-5 -> JS 1-6
      });

      for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const jsDay = d.getDay(); // JavaScript day (0=Sunday, 6=Saturday)
        if (jsWeekendDays.includes(jsDay)) {
          const ds = d.toLocaleDateString('en-CA', { timeZone: OFFICE.TIMEZONE });
          if (!map[ds]) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            map[ds] = { type: 'weekend', intensity: 1, tooltip: `${dayNames[jsDay]} (weekly off)` };
          }
        }
      }

      const history = Array.isArray(attendanceRes)
        ? attendanceRes
        : attendanceRes?.history ?? [];

      for (const record of history) {
        const dateStr: string = record.date;
        if (!dateStr) continue;
        let hours = 0;
        if (record.check_in_time && record.check_out_time) {
          hours = Math.round(((new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / 3_600_000) * 10) / 10;
        } else if (record.check_in_time) {
          hours = Math.round(((Date.now() - new Date(record.check_in_time).getTime()) / 3_600_000) * 10) / 10;
        }
        const intensity = hours <= 2 ? 1 : hours <= 4 ? 2 : hours <= 6 ? 3 : 4;
        map[dateStr] = {
          type: 'work', intensity, hours,
          tooltip: record.check_out_time ? `Worked ${hours}h` : `Checked in (${hours}h so far)`,
        };
      }

      const leaveList = Array.isArray(leaves) ? leaves : [];
      for (const leave of leaveList) {
        if (leave.status === 'rejected') continue;
        const start = new Date(leave.start_date + 'T00:00:00');
        const end = new Date(leave.end_date + 'T00:00:00');
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const ds = d.toLocaleDateString('en-CA', { timeZone: OFFICE.TIMEZONE });
          if (!map[ds] || map[ds].type === 'weekend' || map[ds].type === 'holiday') {
            // Don't override attendance data with leave
          }
          if (!map[ds] || map[ds].type !== 'work') {
            map[ds] = { type: 'leave', intensity: 1, tooltip: `Leave${leave.status === 'pending' ? ' (pending)' : ''}${leave.reason ? ': ' + leave.reason : ''}` };
          }
        }
      }

      const tourList = Array.isArray(tours) ? tours : [];
      for (const tour of tourList) {
        if (tour.status === 'rejected') continue;
        const start = new Date(tour.start_date + 'T00:00:00');
        const end = new Date(tour.end_date + 'T00:00:00');
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const ds = d.toLocaleDateString('en-CA', { timeZone: OFFICE.TIMEZONE });
          if (!map[ds] || (map[ds].type !== 'work' && map[ds].type !== 'leave')) {
            map[ds] = { type: 'tour', intensity: 1, tooltip: `Tour: ${tour.location || ''}${tour.status === 'pending' ? ' (pending)' : ''}` };
          }
        }
      }

      setCalendarData(map);
    } catch (err) {
      console.error('ContributionCalendar: failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Build 1-year grid ──────────────────────────────────────────── */
  const { weeks, monthLabels, totalWeeks } = useMemo(() => {
    const today = new Date();
    const endDate = selectedYear === CURRENT_YEAR
      ? new Date(today)
      : new Date(selectedYear, today.getMonth(), today.getDate());

    const startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() + 1);

    const gridStart = new Date(startDate);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const gridEnd = new Date(endDate);
    gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

    const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;
    const numWeeks = Math.ceil(totalDays / 7);

    const weeksArr: { date: string; data: DayData | null; inRange: boolean }[][] = [];
    const months: { label: string; colStart: number }[] = [];
    let lastMonth = -1;

    const cur = new Date(gridStart);
    for (let w = 0; w < numWeeks; w++) {
      const week: { date: string; data: DayData | null; inRange: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const ds = cur.toLocaleDateString('en-CA', { timeZone: OFFICE.TIMEZONE });
        const inRange = cur >= startDate && cur <= endDate;
        week.push({ date: ds, data: inRange ? (calendarData[ds] ?? null) : null, inRange });

        if (d === 0 && inRange) {
          const m = cur.getMonth();
          if (m !== lastMonth) {
            months.push({
              label: cur.toLocaleDateString('en-US', { month: 'short', timeZone: OFFICE.TIMEZONE }),
              colStart: w,
            });
            lastMonth = m;
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
      weeksArr.push(week);
    }
    return { weeks: weeksArr, monthLabels: months, totalWeeks: numWeeks };
  }, [calendarData, selectedYear]);

  /* ── Colour helpers (native theme) ──────────────────────────────── */
  const cellStyle = (data: DayData | null, inRange: boolean): string => {
    if (!inRange) return '';
    if (!data) return 'bg-gray-200 dark:bg-gray-800';

    switch (data.type) {
      case 'work': {
        const shades = [
          'bg-green-200 dark:bg-green-900',   // level 1 – least
          'bg-green-300 dark:bg-green-700',   // level 2
          'bg-green-500 dark:bg-green-500',   // level 3
          'bg-green-600 dark:bg-green-400',   // level 4 – most
        ];
        return shades[Math.min(data.intensity, 4) - 1];
      }
      case 'leave':
        return 'bg-yellow-300 dark:bg-yellow-500';
      case 'tour':
        return 'bg-blue-300 dark:bg-blue-500';
      case 'holiday':
        return 'bg-red-300 dark:bg-red-500';
      case 'weekend':
        return 'bg-gray-300 dark:bg-gray-600';
      default:
        return 'bg-gray-200 dark:bg-gray-800';
    }
  };

  const legendCellStyle = (level: number) => {
    const shades = [
      'bg-gray-200 dark:bg-gray-800',        // empty
      'bg-green-200 dark:bg-green-900',       // level 1
      'bg-green-300 dark:bg-green-700',       // level 2
      'bg-green-500 dark:bg-green-500',       // level 3
      'bg-green-600 dark:bg-green-400',       // level 4
    ];
    return shades[level];
  };

  const getTooltip = (date: string, data: DayData | null, inRange: boolean) => {
    if (!inRange) return '';
    const d = new Date(date + 'T00:00:00');
    const monthDay = d.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', timeZone: OFFICE.TIMEZONE,
    }); // e.g. "February 10"

    if (!data) return `No activity on ${monthDay}`;

    switch (data.type) {
      case 'work': {
        const hrs = data.hours ?? 0;
        return `${hrs} hr on ${monthDay}`;
      }
      case 'leave':
        return `Leave on ${monthDay}`;
      case 'tour':
        return `Tour on ${monthDay}`;
      case 'holiday':
        return data.tooltip || `Holiday on ${monthDay}`;
      case 'weekend':
        return data.tooltip || `Weekend (weekly off) – ${monthDay}`;
      default:
        return `No activity on ${monthDay}`;
    }
  };

  /* ── Day labels (GitHub shows only Mon, Wed, Fri) ───────────────── */
  const dayLabels: (string | null)[] = [null, 'Mon', null, 'Wed', null, 'Fri', null];

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* ── Top bar: year selector + type legend ───────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y - 1} – {y}
            </option>
          ))}
        </select>

        {/* Type legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-[10px] h-[10px] rounded-sm bg-green-500 dark:bg-green-500" />
            <span>Work</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-[10px] h-[10px] rounded-sm bg-yellow-400 dark:bg-yellow-500" />
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-[10px] h-[10px] rounded-sm bg-blue-400 dark:bg-blue-500" />
            <span>Tour</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-[10px] h-[10px] rounded-sm bg-red-400 dark:bg-red-500" />
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-[10px] h-[10px] rounded-sm bg-gray-300 dark:bg-gray-600" />
            <span>Weekend</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          Loading activity data…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col">
              {/* ── Month headers ──────────────────────────────────── */}
              <div className="flex text-xs text-gray-500 dark:text-gray-400 mb-[2px]" style={{ paddingLeft: 36 }}>
                {monthLabels.map((m, i) => {
                  const nextCol = monthLabels[i + 1]?.colStart ?? totalWeeks;
                  const span = nextCol - m.colStart;
                  return (
                    <div
                      key={`${m.label}-${m.colStart}`}
                      style={{ width: span * PITCH }}
                      className="text-left"
                    >
                      {m.label}
                    </div>
                  );
                })}
              </div>

              {/* ── Grid ───────────────────────────────────────────── */}
              <div className="flex" style={{ gap: GAP }}>
                {/* Day-of-week labels */}
                <div className="flex flex-col shrink-0" style={{ gap: GAP, width: 30 }}>
                  {dayLabels.map((label, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-end pr-1 text-[11px] text-gray-500 dark:text-gray-400"
                      style={{ height: CELL }}
                    >
                      {label ?? ''}
                    </div>
                  ))}
                </div>

                {/* Week columns */}
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                    {week.map((day, di) => {
                      const tip = getTooltip(day.date, day.data, day.inRange);
                      return (
                        <div
                          key={di}
                          className="relative group/cell"
                          style={{ width: CELL, height: CELL }}
                        >
                          <div
                            className={`w-full h-full rounded-[3px] border border-gray-300/40 dark:border-gray-700/40 ${cellStyle(day.data, day.inRange)}`}
                          />
                          {tip && (
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 hidden group-hover/cell:block whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-medium px-2 py-1 shadow-lg">
                              {tip}
                              {/* arrow */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom bar: Less ◻◻◻◻◻ More ───────────────────────── */}
          <div className="flex items-center justify-end gap-[6px] mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`rounded-[3px] border border-gray-300/40 dark:border-gray-700/40 ${legendCellStyle(level)}`}
                style={{ width: CELL - 2, height: CELL - 2 }}
              />
            ))}
            <span>More</span>
          </div>
        </>
      )}
    </div>
  );
};
