"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import type { HolidayCalendar } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type TabKey = "attendance" | "headcount" | "leave-utilization" | "pto-balance" | "approval-aging" | "team-availability" | "comp-off" | "absenteeism" | "holiday-calendar";

const TABS: { key: TabKey; label: string; hrOnly?: boolean }[] = [
  { key: "attendance",        label: "Attendance" },
  { key: "headcount",         label: "Headcount",         hrOnly: true },
  { key: "leave-utilization", label: "Leave Utilization", hrOnly: true },
  { key: "pto-balance",       label: "PTO Balances",      hrOnly: true },
  { key: "approval-aging",    label: "Approval Aging",    hrOnly: true },
  { key: "absenteeism",       label: "Absenteeism",       hrOnly: true },
  { key: "team-availability", label: "Team Availability" },
  { key: "comp-off",          label: "Comp-Off",          hrOnly: true },
  { key: "holiday-calendar",  label: "Holidays" },
];

interface AttendanceSummary { date: string; present: number; late: number; absent: number; }
interface HeadcountData {
  total_active: number;
  by_department: { name: string; count: number }[];
  by_location: { name: string; count: number }[];
  by_employment_type: { name: string; count: number }[];
  monthly_hires: { month: string; count: number }[];
}
interface LeaveUtilization {
  year: number;
  by_type: { leave_type: string; code: string; total_used: number; total_entitled: number; utilization_pct: number }[];
  by_department: { department: string; total_used: number; total_entitled: number; employee_count: number }[];
}
interface PtoBalance {
  employee_id: string; employee_name: string; department: string;
  leave_type: string; entitled: number; used: number; remaining: number;
  is_zero: boolean; is_low: boolean;
}
interface ApprovalAging {
  summary: { "1_day": number; "3_days": number; "7_days_plus": number; total: number };
  buckets: Record<string, { request_id: number; employee_name: string; leave_type: string; dates: string; days_pending: number; approver_name: string }[]>;
}
interface TeamHeatmap {
  month: number; year: number; total_employees: number;
  heatmap: { date: string; day: number; weekday: string; is_weekend: boolean; on_leave: number; available: number; total: number; availability_pct: number }[];
}
interface CompOffStatus {
  summary: { active: number; used: number; expired: number; pending: number };
  active: { id: number; employee_name: string; work_date: string; days_granted: number; expires_at: string }[];
  pending: { id: number; employee_name: string; work_date: string; days_granted: number }[];
  expired: { id: number; employee_name: string; work_date: string; days_granted: number }[];
}
interface AbsenteeismTrends {
  monthly: { month: string; absence_rate: number; absent_days: number }[];
  by_department: { department: string; absent_days: number; employee_count: number; avg_absent_per_employee: number }[];
}

export default function ReportsPage() {
  const { isRole } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<TabKey>("attendance");

  const isHR = isRole("super_admin", "hr_admin");

  const { data: summary } = useApi<AttendanceSummary[]>(`/reports/attendance/summary?month=${month}&year=${year}`);
  const { data: headcount } = useApi<HeadcountData>(activeTab === "headcount" ? "/reports/headcount" : null);
  const { data: utilization } = useApi<LeaveUtilization>(activeTab === "leave-utilization" ? `/reports/leave-utilization?year=${year}` : null);
  const { data: ptoBalances } = useApi<PtoBalance[]>(activeTab === "pto-balance" ? `/reports/pto-balance-summary?year=${year}` : null);
  const { data: aging } = useApi<ApprovalAging>(activeTab === "approval-aging" ? "/reports/pending-approval-aging" : null);
  const { data: heatmap } = useApi<TeamHeatmap>(activeTab === "team-availability" ? `/reports/team-availability-heatmap?month=${month}&year=${year}` : null);
  const { data: compOff } = useApi<CompOffStatus>(activeTab === "comp-off" ? `/reports/comp-off-status?year=${year}` : null);
  const { data: absenteeism } = useApi<AbsenteeismTrends>(activeTab === "absenteeism" ? "/reports/absenteeism-trends?months=12" : null);
  const { data: holidayCalendars } = useApi<HolidayCalendar[]>(activeTab === "holiday-calendar" ? "/holidays/calendars" : null);

  const download = (path: string, params = "") => {
    const token = localStorage.getItem("access_token");
    window.open(`${API_BASE}${path}?token=${token}${params}`, "_blank");
  };

  const visibleTabs = TABS.filter((t) => !t.hrOnly || isHR);

  return (
    <DashboardLayout title="Reports & Analytics">
      {/* Tab bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Attendance ── */}
      {activeTab === "attendance" && (
        <>
          <div className="card mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h4 className="font-semibold text-gray-900">Attendance Overview</h4>
              <div className="flex items-center gap-2">
                <select title="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field w-32 py-1.5 text-sm">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select title="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-24 py-1.5 text-sm">
                  {[2024,2025,2026,2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <button type="button" onClick={() => download("/reports/attendance/csv", `&month=${month}&year=${year}`)} className="btn-secondary text-sm py-1.5">Export CSV</button>
              </div>
            </div>
            {summary && summary.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(8)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[3,3,0,0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 text-sm py-12">No attendance data for {MONTHS[month-1]} {year}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isHR && <div className="card"><h4 className="font-semibold mb-1">Employee Report</h4><p className="text-sm text-gray-500 mb-4">All employee data as CSV</p><button type="button" onClick={() => download("/reports/employees/csv")} className="btn-primary text-sm">Download CSV</button></div>}
            {isHR && <div className="card"><h4 className="font-semibold mb-1">Leave Summary</h4><p className="text-sm text-gray-500 mb-4">Leave balances for all employees</p><button type="button" onClick={() => download("/reports/leave-summary/csv")} className="btn-primary text-sm">Download CSV</button></div>}
            <div className="card"><h4 className="font-semibold mb-1">Attendance CSV</h4><p className="text-sm text-gray-500 mb-4">{MONTHS[month-1]} {year}</p><button type="button" onClick={() => download("/reports/attendance/csv", `&month=${month}&year=${year}`)} className="btn-primary text-sm">Download CSV</button></div>
          </div>
        </>
      )}

      {/* ── Headcount ── */}
      {activeTab === "headcount" && headcount && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="card text-center"><p className="text-3xl font-bold text-primary-600">{headcount.total_active}</p><p className="text-sm text-gray-500 mt-1">Active Employees</p></div>
            {headcount.by_employment_type.slice(0,3).map((t, i) => {
              const textColors = ["text-indigo-600","text-purple-600","text-pink-600"] as const;
              return (
                <div key={t.name} className="card text-center"><p className={`text-3xl font-bold ${textColors[i] ?? "text-gray-900"}`}>{t.count}</p><p className="text-sm text-gray-500 mt-1">{t.name}</p></div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <h4 className="font-semibold mb-4">By Department</h4>
              <ResponsiveContainer width="100%" height={240}><BarChart data={headcount.by_department} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} /><XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} /><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="count" name="Employees" radius={[0,3,3,0]}>{headcount.by_department.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
            </div>
            <div className="card">
              <h4 className="font-semibold mb-4">By Location</h4>
              <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={headcount.by_location} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>{headcount.by_location.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /></PieChart></ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <h4 className="font-semibold mb-4">New Hires — Last 12 Months</h4>
            <ResponsiveContainer width="100%" height={200}><LineChart data={headcount.monthly_hires} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Line type="monotone" dataKey="count" name="New Hires" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} /></LineChart></ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── Leave Utilization ── */}
      {activeTab === "leave-utilization" && (
        <>
          <div className="flex justify-end mb-4">
            <select title="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-24 py-1.5 text-sm">
              {[2024,2025,2026,2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {utilization && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h4 className="font-semibold mb-4">Usage by Leave Type</h4>
                <ResponsiveContainer width="100%" height={260}><BarChart data={utilization.by_type} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="code" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v, n) => [v, n]} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="total_entitled" name="Entitled" fill="#e0e7ff" radius={[3,3,0,0]} /><Bar dataKey="total_used" name="Used" fill="#6366f1" radius={[3,3,0,0]} /></BarChart></ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {utilization.by_type.map((lt) => (
                    <div key={lt.code} className="flex items-center gap-3">
                      <span className="text-xs w-12 text-gray-500 font-mono">{lt.code}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        {/* width must be set at runtime — cannot be expressed as a static Tailwind class */}
                        {/* eslint-disable-next-line react/forbid-component-props */}
                        <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(lt.utilization_pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-16 text-right">{lt.utilization_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h4 className="font-semibold mb-4">Usage by Department</h4>
                <ResponsiveContainer width="100%" height={260}><BarChart data={utilization.by_department} layout="vertical" margin={{ left: 5, right: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={120} /><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="total_used" name="Days Used" fill="#8b5cf6" radius={[0,3,3,0]} /></BarChart></ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PTO Balance Summary ── */}
      {activeTab === "pto-balance" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Zero balance</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />Low (≤2 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <select title="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-24 py-1.5 text-sm">
                {[2024,2025,2026,2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button type="button" onClick={() => download("/reports/leave-summary/csv", `&year=${year}`)} className="btn-secondary text-sm py-1.5">Export CSV</button>
            </div>
          </div>
          {ptoBalances && (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    {["Employee", "Department", "Leave Type", "Entitled", "Used", "Remaining"].map((h) => (
                      <th key={h} className="pb-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ptoBalances.map((b, i) => (
                    <tr key={i} className={b.is_zero ? "bg-red-50" : b.is_low ? "bg-amber-50" : ""}>
                      <td className="py-2 font-medium">{b.employee_name}</td>
                      <td className="py-2 text-gray-500">{b.department}</td>
                      <td className="py-2">{b.leave_type}</td>
                      <td className="py-2">{b.entitled}</td>
                      <td className="py-2">{b.used}</td>
                      <td className="py-2">
                        <span className={`font-semibold ${b.is_zero ? "text-red-600" : b.is_low ? "text-amber-600" : "text-green-700"}`}>{b.remaining}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Approval Aging ── */}
      {activeTab === "approval-aging" && aging && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Pending", value: aging.summary.total, color: "text-gray-900" },
              { label: "Pending 1+ day", value: aging.summary["1_day"], color: "text-yellow-600" },
              { label: "Pending 3+ days", value: aging.summary["3_days"], color: "text-orange-600" },
              { label: "Pending 7+ days", value: aging.summary["7_days_plus"], color: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {[
            { key: "7_days_plus", label: "Critical — 7+ days", color: "bg-red-50 border-red-200" },
            { key: "3_days", label: "At Risk — 3–6 days", color: "bg-orange-50 border-orange-200" },
            { key: "1_day", label: "Approaching — 1–2 days", color: "bg-yellow-50 border-yellow-200" },
          ].map(({ key, label, color }) => aging.buckets[key]?.length > 0 && (
            <div key={key} className={`card border mb-4 ${color}`}>
              <h4 className="font-semibold mb-3 text-sm">{label} ({aging.buckets[key].length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left">{["Employee", "Leave Type", "Dates", "Pending Days", "Approver"].map((h) => <th key={h} className="pb-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {aging.buckets[key].map((r) => (
                      <tr key={r.request_id}>
                        <td className="py-2 font-medium">{r.employee_name}</td>
                        <td className="py-2">{r.leave_type}</td>
                        <td className="py-2 text-gray-500">{r.dates}</td>
                        <td className="py-2 font-semibold">{r.days_pending}</td>
                        <td className="py-2 text-gray-500">{r.approver_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Team Availability ── */}
      {activeTab === "team-availability" && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <select title="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field w-32 py-1.5 text-sm">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select title="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-24 py-1.5 text-sm">
              {[2024,2025,2026,2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {heatmap && (
            <>
              <div className="card mb-6">
                <h4 className="font-semibold mb-1">{MONTHS[heatmap.month - 1]} {heatmap.year}</h4>
                <p className="text-sm text-gray-500 mb-4">Total active employees: {heatmap.total_employees}</p>
                <div className="grid grid-cols-7 gap-1">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-gray-400 pb-1">{d}</div>
                  ))}
                  {/* Offset: pad based on weekday of first day */}
                  {Array.from({ length: new Date(heatmap.year, heatmap.month - 1, 1).getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
                  {heatmap.heatmap.map((day) => {
                    const pct = day.availability_pct;
                    const bg = day.is_weekend ? "bg-gray-100"
                      : pct >= 80 ? "bg-green-100 hover:bg-green-200"
                      : pct >= 50 ? "bg-yellow-100 hover:bg-yellow-200"
                      : "bg-red-100 hover:bg-red-200";
                    return (
                      <div key={day.date} className={`${bg} rounded p-1 text-center cursor-default`} title={`${day.date}: ${day.available}/${day.total} available (${day.on_leave} on leave)`}>
                        <p className="text-xs font-medium text-gray-700">{day.day}</p>
                        {!day.is_weekend && <p className="text-xs text-gray-500">{day.on_leave > 0 ? `-${day.on_leave}` : ""}</p>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded inline-block" />≥80% available</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 rounded inline-block" />50–79% available</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded inline-block" />&lt;50% available</span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Comp-Off Status ── */}
      {activeTab === "comp-off" && compOff && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Active", value: compOff.summary.active, color: "text-green-600" },
              { label: "Pending Approval", value: compOff.summary.pending, color: "text-yellow-600" },
              { label: "Expired", value: compOff.summary.expired, color: "text-red-600" },
              { label: "Used", value: compOff.summary.used, color: "text-gray-600" },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {compOff.active.length > 0 && (
            <div className="card mb-4 overflow-x-auto">
              <h4 className="font-semibold mb-3 text-green-700">Active Comp-Offs ({compOff.active.length})</h4>
              <table className="w-full text-sm min-w-[400px]">
                <thead><tr className="border-b border-gray-200 text-left">{["Employee","Work Date","Days","Expires"].map((h) => <th key={h} className="pb-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">{compOff.active.map((r) => <tr key={r.id}><td className="py-2 font-medium">{r.employee_name}</td><td className="py-2">{r.work_date}</td><td className="py-2">{r.days_granted}</td><td className="py-2 text-orange-600">{r.expires_at}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {compOff.pending.length > 0 && (
            <div className="card mb-4 overflow-x-auto">
              <h4 className="font-semibold mb-3 text-yellow-700">Pending Approval ({compOff.pending.length})</h4>
              <table className="w-full text-sm min-w-[300px]">
                <thead><tr className="border-b border-gray-200 text-left">{["Employee","Work Date","Days"].map((h) => <th key={h} className="pb-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">{compOff.pending.map((r) => <tr key={r.id}><td className="py-2 font-medium">{r.employee_name}</td><td className="py-2">{r.work_date}</td><td className="py-2">{r.days_granted}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
      {/* ── Absenteeism Trends ── */}
      {activeTab === "absenteeism" && (
        <>
          {absenteeism ? (
            <div className="space-y-6">
              <div className="card">
                <h4 className="font-semibold mb-4">Monthly Absence Rate — Last 12 Months</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={absenteeism.monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, "auto"]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Absence Rate"]} />
                    <Line type="monotone" dataKey="absence_rate" name="Absence Rate %" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h4 className="font-semibold mb-4">Absence Days by Department</h4>
                {absenteeism.by_department.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={absenteeism.by_department} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [v, name === "absent_days" ? "Total Absent Days" : "Avg per Employee"]} />
                      <Bar dataKey="absent_days" name="Total Absent Days" fill="#f87171" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-400 text-sm py-8">No department data available</p>
                )}
                {absenteeism.by_department.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-200 text-left">{["Department","Employees","Total Absent Days","Avg per Employee"].map((h) => <th key={h} className="pb-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {absenteeism.by_department.map((d) => (
                          <tr key={d.department}>
                            <td className="py-2 font-medium">{d.department}</td>
                            <td className="py-2 text-gray-500">{d.employee_count}</td>
                            <td className="py-2">{d.absent_days}</td>
                            <td className="py-2 font-semibold">{d.avg_absent_per_employee}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-16 text-gray-400 text-sm">Loading absenteeism data…</div>
          )}
        </>
      )}

      {/* ── Holiday Calendar ── */}
      {activeTab === "holiday-calendar" && (
        <>
          {holidayCalendars ? (
            <div className="space-y-6">
              {holidayCalendars.map((cal) => {
                const today = new Date().toISOString().split("T")[0];
                const allHolidays = cal.holidays || [];
                const upcoming = allHolidays.filter((h) => h.date >= today).length;
                const optional = allHolidays.filter((h) => h.is_optional).length;
                const byMonth = allHolidays.reduce<Record<number, typeof allHolidays>>((acc, h) => {
                  const m = new Date(h.date + "T12:00:00").getMonth() + 1;
                  if (!acc[m]) acc[m] = [];
                  acc[m].push(h);
                  return acc;
                }, {});
                return (
                  <div key={cal.id}>
                    <h3 className="font-semibold text-gray-900 mb-4">{cal.name} — {cal.year}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="card text-center"><p className="text-3xl font-bold text-primary-600">{allHolidays.length}</p><p className="text-sm text-gray-500 mt-1">Total Holidays</p></div>
                      <div className="card text-center"><p className="text-3xl font-bold text-green-600">{upcoming}</p><p className="text-sm text-gray-500 mt-1">Upcoming</p></div>
                      <div className="card text-center"><p className="text-3xl font-bold text-amber-600">{optional}</p><p className="text-sm text-gray-500 mt-1">Optional / {allHolidays.length - optional} Mandatory</p></div>
                    </div>
                    {MONTHS.map((mName, mIdx) => {
                      const mHolidays = byMonth[mIdx + 1] || [];
                      if (mHolidays.length === 0) return null;
                      return (
                        <div key={mName} className="card mb-4">
                          <h4 className="font-semibold mb-3 text-sm text-gray-700">{mName} {cal.year}</h4>
                          <div className="divide-y divide-gray-50">
                            {mHolidays.sort((a, b) => a.date.localeCompare(b.date)).map((h) => (
                              <div key={h.id} className="flex items-center justify-between py-2.5">
                                <div className="flex items-center gap-3">
                                  <div className="text-center w-10 flex-shrink-0">
                                    <p className="text-xs text-gray-400">{new Date(h.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}</p>
                                    <p className="font-bold text-gray-800">{new Date(h.date + "T12:00:00").getDate()}</p>
                                  </div>
                                  <p className="text-sm font-medium text-gray-800">{h.name}</p>
                                </div>
                                <span className={`badge text-[10px] ${h.is_optional ? "badge-warning" : "badge-success"}`}>
                                  {h.is_optional ? "Optional" : "Mandatory"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-16 text-gray-400 text-sm">Loading holiday data…</div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
