"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { TimesheetEntry, WeeklyTimesheet, ProjectList } from "@/types";

const MAX_DAILY = 8;
const MAX_WEEKLY = 40;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKEND_DAYS = new Set([5, 6]); // indices within the week array

// ── helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── types ─────────────────────────────────────────────────────────────────────

interface CellState {
  entryId?: number;
  hours: number;       // last saved / confirmed hours
  inputVal: string;    // current string value in the <input>
  status: string;
  saving: boolean;
  error?: string;
}

type GridType = Record<number, Record<string, CellState>>;

// ── component ─────────────────────────────────────────────────────────────────

export default function TimesheetsPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekStartStr = toISO(weekStart);
  const weekEndStr   = toISO(weekDates[6]);

  // Projects
  const { data: projectData } = useApi<ProjectList>("/timesheets/projects?status=active&per_page=50");
  const projects = projectData?.items ?? [];

  // Weekly submission status for the current week
  const { data: weeklyData, refetch: refetchWeekly } = useApi<{ items: WeeklyTimesheet[] }>(
    "/timesheets/weekly/my-timesheets?per_page=52"
  );
  const currentWeekly = weeklyData?.items?.find((w) => w.week_start === weekStartStr);
  const weeklyStatus  = currentWeekly?.status ?? "draft";
  const isLocked      = weeklyStatus === "submitted" || weeklyStatus === "approved";

  // Grid state
  const [rowProjectIds, setRowProjectIds] = useState<number[]>([]);
  const [grid, setGrid]                   = useState<GridType>({});
  const [loading, setLoading]             = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [addingProject, setAddingProject] = useState(false);

  // Reset grid + rows when week changes
  useEffect(() => {
    setRowProjectIds([]);
    setGrid({});
  }, [weekStartStr]);

  // Load entries for the selected week
  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<TimesheetEntry[]>(
        `/timesheets/my-entries?start_date=${weekStartStr}&end_date=${weekEndStr}`
      );
      const newGrid: GridType = {};
      const seenIds = new Set<number>();

      for (const entry of data) {
        seenIds.add(entry.project_id);
        if (!newGrid[entry.project_id]) newGrid[entry.project_id] = {};
        newGrid[entry.project_id][entry.date] = {
          entryId:  entry.id,
          hours:    entry.hours,
          inputVal: String(entry.hours),
          status:   entry.status,
          saving:   false,
        };
      }

      setGrid(newGrid);
      setRowProjectIds((prev) => {
        const seen = Array.from(seenIds);
        const combined = [...prev, ...seen.filter((id) => !prev.includes(id))];
        return combined;
      });
    } finally {
      setLoading(false);
    }
  }, [weekStartStr, weekEndStr]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // ── computed totals ──────────────────────────────────────────────────────────

  const dailyTotals = weekDates.map((d) => {
    const ds = toISO(d);
    return rowProjectIds.reduce((sum, pid) => sum + (grid[pid]?.[ds]?.hours ?? 0), 0);
  });
  const weeklyTotal = dailyTotals.reduce((a, b) => a + b, 0);

  const projectRowTotal = (pid: number) =>
    weekDates.reduce((sum, d) => sum + (grid[pid]?.[toISO(d)]?.hours ?? 0), 0);

  // ── cell interactions ────────────────────────────────────────────────────────

  const handleCellChange = (pid: number, dateStr: string, val: string) => {
    setGrid((prev) => ({
      ...prev,
      [pid]: {
        ...prev[pid],
        [dateStr]: {
          ...(prev[pid]?.[dateStr] ?? { hours: 0, status: "draft", saving: false }),
          inputVal: val,
          error: undefined,
        },
      },
    }));
  };

  const handleCellBlur = async (pid: number, dateStr: string) => {
    const cell = grid[pid]?.[dateStr];
    if (!cell) return;

    const newHours = parseFloat(cell.inputVal) || 0;
    if (newHours === cell.hours) return; // nothing changed

    const hasEntry = !!cell.entryId;

    // Mark saving
    setGrid((prev) => ({
      ...prev,
      [pid]: {
        ...prev[pid],
        [dateStr]: { ...prev[pid][dateStr], saving: true, error: undefined },
      },
    }));

    try {
      if (newHours === 0 && hasEntry) {
        // Delete
        await api.delete(`/timesheets/entries/${cell.entryId}`);
        setGrid((prev) => ({
          ...prev,
          [pid]: {
            ...prev[pid],
            [dateStr]: { hours: 0, inputVal: "", status: "draft", saving: false },
          },
        }));
      } else if (newHours > 0 && !hasEntry) {
        // Create
        const result = await api.post<TimesheetEntry>("/timesheets/entries", {
          project_id: pid,
          date: dateStr,
          hours: newHours,
          is_billable: true,
        });
        setGrid((prev) => ({
          ...prev,
          [pid]: {
            ...prev[pid],
            [dateStr]: {
              entryId:  result.id,
              hours:    result.hours,
              inputVal: String(result.hours),
              status:   result.status,
              saving:   false,
            },
          },
        }));
      } else if (newHours > 0 && hasEntry) {
        // Update
        const result = await api.put<TimesheetEntry>(`/timesheets/entries/${cell.entryId}`, {
          hours: newHours,
        });
        setGrid((prev) => ({
          ...prev,
          [pid]: {
            ...prev[pid],
            [dateStr]: {
              entryId:  result.id,
              hours:    result.hours,
              inputVal: String(result.hours),
              status:   result.status,
              saving:   false,
            },
          },
        }));
      }
    } catch (e) {
      // Revert to last saved value on error
      setGrid((prev) => ({
        ...prev,
        [pid]: {
          ...prev[pid],
          [dateStr]: {
            ...prev[pid][dateStr],
            hours:    cell.hours,
            inputVal: cell.hours > 0 ? String(cell.hours) : "",
            saving:   false,
            error:    e instanceof Error ? e.message : "Save failed",
          },
        },
      }));
    }
  };

  // ── submit week ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (weeklyTotal === 0) {
      alert("No hours logged for this week.");
      return;
    }
    setSubmitLoading(true);
    try {
      await api.post("/timesheets/weekly/submit", { week_start: weekStartStr });
      await Promise.all([loadEntries(), refetchWeekly()]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── project row management ───────────────────────────────────────────────────

  const addProjectRow = (pid: number) => {
    if (!rowProjectIds.includes(pid)) {
      setRowProjectIds((prev) => [...prev, pid]);
    }
    setAddingProject(false);
  };

  const removeProjectRow = (pid: number) => {
    const hasHours = weekDates.some((d) => (grid[pid]?.[toISO(d)]?.hours ?? 0) > 0);
    if (hasHours) {
      alert("Clear all hours for this project before removing it.");
      return;
    }
    setRowProjectIds((prev) => prev.filter((id) => id !== pid));
  };

  const availableProjects = projects.filter((p) => !rowProjectIds.includes(p.id));

  // ── status helpers ───────────────────────────────────────────────────────────

  const weekStatusStyle: Record<string, string> = {
    draft:     "bg-gray-100 text-gray-600",
    submitted: "bg-amber-100 text-amber-700",
    approved:  "bg-emerald-100 text-emerald-700",
    rejected:  "bg-red-100 text-red-700",
  };

  const dailyPillStyle = (total: number) => {
    if (total === 0)          return "text-gray-300";
    if (total > MAX_DAILY)    return "bg-red-100 text-red-700";
    if (total === MAX_DAILY)  return "bg-emerald-100 text-emerald-700";
    return "bg-blue-50 text-blue-700";
  };

  const weekTotalStyle =
    weeklyTotal > MAX_WEEKLY  ? "bg-red-50 text-red-700 border-red-200"      :
    weeklyTotal === MAX_WEEKLY ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                 "bg-indigo-50 text-indigo-700 border-indigo-200";

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Timesheet">

      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

        {/* Week navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              title="Previous week"
              aria-label="Previous week"
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800 min-w-[200px] text-center">
              {fmtDate(weekStart)} – {fmtDate(weekDates[4])}, {weekStart.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              title="Next week"
              aria-label="Next week"
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${weekStatusStyle[weeklyStatus] ?? weekStatusStyle.draft}`}>
            {weeklyStatus}
          </span>
        </div>

        {/* Right: weekly total + links */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${weekTotalStyle}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {weeklyTotal.toFixed(1)} / {MAX_WEEKLY}h
          </div>
          <Link href="/timesheets/reports" className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors">
            Reports
          </Link>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 font-semibold text-gray-600 w-52">Project</th>
              {weekDates.map((d, i) => (
                <th key={i} className={`text-center px-3 py-3 font-semibold w-24 ${WEEKEND_DAYS.has(i) ? "bg-slate-100/80" : ""}`}>
                  <div className={WEEKEND_DAYS.has(i) ? "text-slate-500" : "text-gray-800"}>{DAYS[i]}</div>
                  <div className="text-[11px] font-normal text-gray-400">{fmtDate(d)}</div>
                  {WEEKEND_DAYS.has(i) && <div className="text-[9px] font-medium text-amber-500 mt-0.5">OT</div>}
                </th>
              ))}
              <th className="text-center px-4 py-3 font-semibold text-gray-600 w-24">Total</th>
              <th className="w-8" aria-label="Actions" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    Loading…
                  </div>
                </td>
              </tr>
            ) : rowProjectIds.length === 0 && !addingProject ? (
              <tr>
                <td colSpan={8} className="text-center py-14 text-gray-400 text-sm">
                  No projects added yet.{" "}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => setAddingProject(true)}
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      + Add your first project
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              rowProjectIds.map((pid) => {
                const project  = projects.find((p) => p.id === pid);
                const rowTotal = projectRowTotal(pid);

                return (
                  <tr key={pid} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                    {/* Project label */}
                    <td className="px-5 py-2">
                      <div className="font-semibold text-gray-800 leading-tight">
                        {project?.name ?? `Project #${pid}`}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">{project?.code}</div>
                    </td>

                    {/* Hour cells */}
                    {weekDates.map((d, dayIdx) => {
                      const dateStr   = toISO(d);
                      const cell      = grid[pid]?.[dateStr];
                      const cellLocked = isLocked || cell?.status === "submitted" || cell?.status === "approved";
                      const isWeekend = WEEKEND_DAYS.has(dayIdx);

                      return (
                        <td key={dateStr} className={`px-2 py-2 text-center relative ${isWeekend ? "bg-slate-50/60" : ""}`}>
                          {/* Saving spinner overlay */}
                          {cell?.saving && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded z-10">
                              <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}

                          <input
                            type="number"
                            min="0"
                            max={MAX_DAILY}
                            step="0.5"
                            disabled={cellLocked}
                            value={cell?.inputVal ?? ""}
                            placeholder="—"
                            onChange={(e) => handleCellChange(pid, dateStr, e.target.value)}
                            onBlur={() => handleCellBlur(pid, dateStr)}
                            className={[
                              "w-full text-center rounded-lg border py-1.5 text-sm font-medium transition-all",
                              cellLocked
                                ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed"
                                : "bg-white border-gray-200 hover:border-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-400",
                              cell?.error ? "border-red-400 bg-red-50" : "",
                            ].join(" ")}
                          />

                          {/* Error tooltip */}
                          {cell?.error && (
                            <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1.5 bg-red-600 text-white text-[11px] font-medium rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap pointer-events-none">
                              {cell.error}
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-600 rotate-45" />
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Row total */}
                    <td className={`px-4 py-2 text-center font-bold ${rowTotal > 0 ? "text-indigo-600" : "text-gray-300"}`}>
                      {rowTotal > 0 ? `${rowTotal.toFixed(1)}h` : "—"}
                    </td>

                    {/* Remove row */}
                    <td className="pr-3">
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => removeProjectRow(pid)}
                          title="Remove project row"
                          aria-label="Remove project row"
                          className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Add project row */}
            {!isLocked && (
              <tr className="border-b border-dashed border-gray-100">
                <td className="px-5 py-2.5" colSpan={8}>
                  {addingProject ? (
                    <div className="flex items-center gap-2">
                      <select
                        autoFocus
                        defaultValue=""
                        aria-label="Select a project to add"
                        title="Select a project to add"
                        onChange={(e) => e.target.value && addProjectRow(parseInt(e.target.value))}
                        onBlur={() => setAddingProject(false)}
                        className="text-sm border border-indigo-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white min-w-[200px]"
                      >
                        <option value="" disabled>Select a project…</option>
                        {availableProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setAddingProject(false)}
                        title="Cancel"
                        aria-label="Cancel adding project"
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingProject(true)}
                      disabled={availableProjects.length === 0}
                      className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Project
                    </button>
                  )}
                </td>
              </tr>
            )}

            {/* Daily totals footer row */}
            <tr className="bg-slate-50 border-t-2 border-gray-200">
              <td className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Daily Total
              </td>
              {dailyTotals.map((total, i) => (
                <td key={i} className={`px-2 py-3 text-center ${WEEKEND_DAYS.has(i) ? "bg-slate-100/60" : ""}`}>
                  <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${WEEKEND_DAYS.has(i) && total > 0 ? "bg-amber-50 text-amber-600" : dailyPillStyle(total)}`}>
                    {total > 0 ? `${total}h` : "—"}
                    {total === MAX_DAILY && !WEEKEND_DAYS.has(i) && (
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </td>
              ))}
              <td className="px-4 py-3 text-center font-bold text-gray-800">
                {weeklyTotal.toFixed(1)}h
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer actions ──────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          Hours auto-saved on blur · Max {MAX_DAILY}h/day · {MAX_WEEKLY}h/week (Mon–Fri) · Weekend hours count as overtime
        </p>

        <div className="flex items-center gap-3">
          {weeklyStatus === "rejected" && currentWeekly?.comments && (
            <p className="text-sm text-red-600 font-medium">
              Rejected: {currentWeekly.comments}
            </p>
          )}

          {!isLocked ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitLoading || weeklyTotal === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              {submitLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Week for Approval
                </>
              )}
            </button>
          ) : (
            <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${weeklyStatus === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {weeklyStatus === "approved" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {weeklyStatus === "approved" ? "Approved" : "Submitted — Pending Approval"}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
