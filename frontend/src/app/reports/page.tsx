"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const DEPT_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16"];
const TYPE_COLORS: Record<string, string> = {
  "Full Time": "#6366f1",
  "Part Time": "#f59e0b",
  "Contractor": "#10b981",
  "Intern": "#ec4899",
};

interface AttendanceSummary { date: string; present: number; late: number; absent: number; }
interface HeadcountData {
  total_active: number;
  by_department: { name: string; count: number }[];
  by_location: { name: string; count: number }[];
  by_employment_type: { name: string; count: number }[];
  monthly_hires: { month: string; count: number }[];
}

export default function ReportsPage() {
  const { isRole } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<"attendance" | "headcount">("attendance");

  const { data: summary } = useApi<AttendanceSummary[]>(`/reports/attendance/summary?month=${month}&year=${year}`);
  const { data: headcount } = useApi<HeadcountData>("/reports/headcount");

  const download = (path: string, params = "") => {
    const token = localStorage.getItem("access_token");
    window.open(`${API_BASE}${path}?token=${token}${params}`, "_blank");
  };

  const isHR = isRole("super_admin", "hr_admin");
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <DashboardLayout title="Reports">
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "attendance", label: "Attendance" },
          { key: "headcount", label: "Headcount Analytics" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
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

      {activeTab === "attendance" && (
        <>
          {/* Attendance Chart */}
          <div className="card mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h4 className="font-semibold text-gray-900">Attendance Overview</h4>
              <div className="flex items-center gap-2">
                <select title="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field w-36 py-1.5 text-sm">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select title="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-24 py-1.5 text-sm">
                  {[2024,2025,2026,2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <button type="button" onClick={() => download("/reports/attendance/csv", `&month=${month}&year=${year}`)} className="btn-secondary text-sm py-1.5">Export CSV</button>
              </div>
            </div>
            {summary && summary.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(8)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => `Date: ${v}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[3,3,0,0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No attendance data for {MONTHS[month-1]} {year}
              </div>
            )}
          </div>

          {/* Download Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isHR && (
              <div className="card">
                <h4 className="font-semibold text-gray-900">Employee Report</h4>
                <p className="text-sm text-gray-500 mt-1">Export all employee data as CSV</p>
                <button type="button" onClick={() => download("/reports/employees/csv")} className="btn-primary mt-4 text-sm">Download CSV</button>
              </div>
            )}
            {isHR && (
              <div className="card">
                <h4 className="font-semibold text-gray-900">Leave Summary</h4>
                <p className="text-sm text-gray-500 mt-1">Leave balance summary for all employees</p>
                <button type="button" onClick={() => download("/reports/leave-summary/csv")} className="btn-primary mt-4 text-sm">Download CSV</button>
              </div>
            )}
            <div className="card">
              <h4 className="font-semibold text-gray-900">Attendance Report</h4>
              <p className="text-sm text-gray-500 mt-1">{isHR ? "Monthly attendance for all employees" : "Monthly attendance for your team"}</p>
              <div className="flex gap-2 mt-4 items-center flex-wrap">
                <button type="button" onClick={() => download("/reports/attendance/csv", `&month=${month}&year=${year}`)} className="btn-primary text-sm">Download CSV</button>
                <span className="text-xs text-gray-400">{MONTHS[month-1]} {year}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "headcount" && headcount && (
        <>
          {/* Summary stat */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="card text-center">
              <p className="text-3xl font-bold text-primary-600">{headcount.total_active}</p>
              <p className="text-sm text-gray-500 mt-1">Active Employees</p>
            </div>
            {headcount.by_employment_type.map((t) => (
              <div key={t.name} className="card text-center">
                <p className="text-3xl font-bold" style={{ color: TYPE_COLORS[t.name] || "#6366f1" }}>{t.count}</p>
                <p className="text-sm text-gray-500 mt-1">{t.name}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* By Department */}
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-4">Headcount by Department</h4>
              {headcount.by_department.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={headcount.by_department} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" name="Employees" radius={[0,3,3,0]}>
                      {headcount.by_department.map((_, i) => (
                        <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-gray-400 text-center py-8">No department data</p>}
            </div>

            {/* By Location */}
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-4">Headcount by Location</h4>
              {headcount.by_location.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={headcount.by_location} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {headcount.by_location.map((_, i) => (
                        <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-gray-400 text-center py-8">No location data</p>}
            </div>
          </div>

          {/* Monthly Hires Trend */}
          <div className="card">
            <h4 className="font-semibold text-gray-900 mb-4">New Hires — Last 12 Months</h4>
            {headcount.monthly_hires.some((m) => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={headcount.monthly_hires} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" name="New Hires" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-8">No hire data in the last 12 months</p>}
          </div>
        </>
      )}

      {activeTab === "headcount" && !headcount && (
        <div className="card flex items-center justify-center h-48 text-gray-400 text-sm">Loading analytics...</div>
      )}
    </DashboardLayout>
  );
}
