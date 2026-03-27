"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface AttendanceSummary {
  date: string;
  present: number;
  late: number;
  absent: number;
}

export default function ReportsPage() {
  const { isRole } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: summary } = useApi<AttendanceSummary[]>(`/reports/attendance/summary?month=${month}&year=${year}`);

  const download = (path: string, params = "") => {
    const token = localStorage.getItem("access_token");
    window.open(`${API_BASE}${path}?token=${token}${params}`, "_blank");
  };

  const isHR = isRole("super_admin", "hr_admin");

  return (
    <DashboardLayout title="Reports">

      {/* Attendance Chart */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h4 className="font-semibold text-gray-900">Attendance Overview</h4>
          <div className="flex items-center gap-2">
            <select
              title="Month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="input-field w-36 py-1.5 text-sm"
            >
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              title="Year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input-field w-24 py-1.5 text-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => download("/reports/attendance/csv", `&month=${month}&year=${year}`)}
              className="btn-secondary text-sm py-1.5"
            >
              Export CSV
            </button>
          </div>
        </div>

        {summary && summary.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.slice(8)}
                label={{ value: "Day", position: "insideBottom", offset: -2, fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v) => `Date: ${v}`}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" name="Present" fill="#10b981" radius={[3,3,0,0]} />
              <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[3,3,0,0]} />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            No attendance data for {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month-1]} {year}
          </div>
        )}
      </div>

      {/* Download Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isHR && (
          <div className="card">
            <h4 className="font-semibold text-gray-900">Employee Report</h4>
            <p className="text-sm text-gray-500 mt-1">Export all employee data as CSV</p>
            <button type="button" onClick={() => download("/reports/employees/csv")} className="btn-primary mt-4 text-sm">
              Download CSV
            </button>
          </div>
        )}
        {isHR && (
          <div className="card">
            <h4 className="font-semibold text-gray-900">Leave Summary</h4>
            <p className="text-sm text-gray-500 mt-1">Leave balance summary for all employees</p>
            <button type="button" onClick={() => download("/reports/leave-summary/csv")} className="btn-primary mt-4 text-sm">
              Download CSV
            </button>
          </div>
        )}
        <div className="card">
          <h4 className="font-semibold text-gray-900">Attendance Report</h4>
          <p className="text-sm text-gray-500 mt-1">
            {isHR ? "Monthly attendance for all employees" : "Monthly attendance for your team"}
          </p>
          <div className="flex gap-2 mt-4 items-center flex-wrap">
            <button
              type="button"
              onClick={() => download("/reports/attendance/csv", `&month=${month}&year=${year}`)}
              className="btn-primary text-sm"
            >
              Download CSV
            </button>
            <span className="text-xs text-gray-400">
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month-1]} {year}
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
