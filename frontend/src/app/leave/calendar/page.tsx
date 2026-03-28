"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import type { HolidayCalendar } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";

const LEAVE_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16",
];

interface TeamLeaveEntry {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_photo: string | null;
  department: string | null;
  leave_type: string;
  leave_type_color: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
}

interface Department { id: number; name: string; }

function getInitials(name: string) {
  const parts = name.split(" ");
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function isOnLeave(entry: TeamLeaveEntry, year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day);
  const start = new Date(entry.start_date);
  const end = new Date(entry.end_date);
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  return d >= start && d <= end;
}

export default function LeaveCalendarPage() {
  const { isRole } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [deptFilter, setDeptFilter] = useState("");
  const [hoveredEntry, setHoveredEntry] = useState<TeamLeaveEntry | null>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "list" | "holidays">("calendar");

  const isHROrManager = isRole("super_admin", "hr_admin", "manager");

  const { data: teamLeave } = useApi<TeamLeaveEntry[]>(
    `/leave/team-calendar?month=${month}&year=${year}${deptFilter ? `&department_id=${deptFilter}` : ""}`
  );
  const { data: departments } = useApi<Department[]>("/admin/departments");
  const { data: calendars } = useApi<HolidayCalendar[]>("/holidays/calendars");

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun

  // Unique employees with leave this month
  const employeeColors: Record<number, string> = {};
  (teamLeave || []).forEach((e, i) => {
    if (!employeeColors[e.employee_id]) {
      employeeColors[e.employee_id] = LEAVE_COLORS[Object.keys(employeeColors).length % LEAVE_COLORS.length];
    }
  });

  // Group by employee for calendar rows
  const byEmployee: Record<number, { name: string; photo: string | null; entries: TeamLeaveEntry[] }> = {};
  (teamLeave || []).forEach((e) => {
    if (!byEmployee[e.employee_id]) {
      byEmployee[e.employee_id] = { name: e.employee_name, photo: e.employee_photo, entries: [] };
    }
    byEmployee[e.employee_id].entries.push(e);
  });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <DashboardLayout title="Leave Calendar">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button type="button" title="Previous month" onClick={prevMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h3 className="text-lg font-semibold text-gray-900 w-44 text-center">{MONTHS[month-1]} {year}</h3>
          <button type="button" title="Next month" onClick={nextMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
          {isHROrManager && (
            <select title="Filter by department" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-field py-1.5 text-sm w-44 ml-2">
              <option value="">All Departments</option>
              {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["calendar","list","holidays"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      {activeTab === "calendar" && (
        <div className="card overflow-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1 min-w-[560px]">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px min-w-[560px]">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-gray-50/50 rounded-lg" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
              const onLeaveToday = (teamLeave || []).filter((e) => isOnLeave(e, year, month, day));

              return (
                <div key={day} className={`h-24 rounded-lg p-1.5 border ${isToday ? "border-primary-400 bg-primary-50/30" : "border-gray-100 bg-white"} overflow-hidden`}>
                  <p className={`text-xs font-semibold mb-1 ${isToday ? "text-primary-600" : "text-gray-700"}`}>{day}</p>
                  <div className="space-y-0.5 overflow-hidden">
                    {onLeaveToday.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="relative group/tip"
                        onMouseEnter={() => setHoveredEntry(e)}
                        onMouseLeave={() => setHoveredEntry(null)}
                      >
                        <div
                          className="text-white text-[9px] font-medium px-1 py-0.5 rounded truncate cursor-default"
                          style={{ backgroundColor: employeeColors[e.employee_id] || "#6366f1" }}
                        >
                          {e.employee_name.split(" ")[0]}
                        </div>
                      </div>
                    ))}
                    {onLeaveToday.length > 3 && (
                      <p className="text-[9px] text-gray-400 font-medium">+{onLeaveToday.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hover tooltip */}
          {hoveredEntry && (
            <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 shadow-lg rounded-2xl p-4 w-64 pointer-events-none">
              <div className="flex items-center gap-3 mb-2">
                {hoveredEntry.employee_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API_BASE}${hoveredEntry.employee_photo}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(hoveredEntry.employee_name)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{hoveredEntry.employee_name}</p>
                  {hoveredEntry.department && <p className="text-xs text-gray-500">{hoveredEntry.department}</p>}
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Type:</span> {hoveredEntry.leave_type}</p>
                <p><span className="font-medium">From:</span> {hoveredEntry.start_date}</p>
                <p><span className="font-medium">To:</span> {hoveredEntry.end_date}</p>
                <p><span className="font-medium">Days:</span> {hoveredEntry.total_days}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${hoveredEntry.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {hoveredEntry.status}
                </span>
              </div>
            </div>
          )}

          {/* Legend */}
          {Object.keys(byEmployee).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              {Object.entries(byEmployee).map(([empId, { name }]) => (
                <div key={empId} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: employeeColors[parseInt(empId)] }} />
                  <span className="text-xs text-gray-600">{name.split(" ")[0]} {name.split(" ")[1]?.[0]}.</span>
                </div>
              ))}
            </div>
          )}

          {(teamLeave?.length === 0 || !teamLeave) && (
            <div className="text-center py-12 text-gray-400 text-sm">No leave scheduled for {MONTHS[month-1]} {year}</div>
          )}
        </div>
      )}

      {/* List View */}
      {activeTab === "list" && (
        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-4">Leave Schedule — {MONTHS[month-1]} {year}</h4>
          {teamLeave && teamLeave.length > 0 ? (
            <div className="space-y-2">
              {teamLeave.map((e) => {
                const photoUrl = e.employee_photo ? `${API_BASE}${e.employee_photo}` : null;
                return (
                  <div key={e.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-primary-200 transition-colors">
                    <div className="flex-shrink-0">
                      {photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(e.employee_name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/employees/${e.employee_id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600">{e.employee_name}</Link>
                      {e.department && <p className="text-xs text-gray-400">{e.department}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-gray-700">{e.leave_type}</p>
                      <p className="text-xs text-gray-400">{e.start_date} → {e.end_date} · {e.total_days}d</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${e.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {e.status}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">No leave scheduled for {MONTHS[month-1]} {year}</p>
          )}
        </div>
      )}

      {/* Holidays View */}
      {activeTab === "holidays" && (
        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-4">Holiday Calendar</h4>
          {calendars?.map((cal) => (
            <div key={cal.id} className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">{cal.name} ({cal.year})</p>
              <div className="space-y-1">
                {cal.holidays?.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-2 px-3 rounded-xl border border-gray-50 hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
                      <span className="text-sm text-gray-800">{h.name}</span>
                      {h.is_optional && <span className="badge badge-info text-[10px]">Optional</span>}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(!calendars || calendars.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-10">No holiday calendars configured</p>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
