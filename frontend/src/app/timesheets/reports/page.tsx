"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";

export default function TimesheetReportsPage() {
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [utilization, setUtilization] = useState<any[]>([]);
  const [overtime, setOvertime] = useState<any[]>([]);

  const loadReports = async () => {
    try {
      const [util, ot] = await Promise.all([
        api.get(`/timesheets/reports/utilization?start_date=${startDate}&end_date=${endDate}`),
        api.get(`/timesheets/reports/overtime?start_date=${startDate}&end_date=${endDate}`),
      ]);
      setUtilization(util as any[]);
      setOvertime(ot as any[]);
    } catch {}
  };

  return (
    <DashboardLayout title="Timesheet Reports">
      <div className="card mb-6">
        <div className="flex gap-3 items-end">
          <div><label className="text-sm text-gray-600">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" /></div>
          <div><label className="text-sm text-gray-600">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" /></div>
          <button onClick={loadReports} className="btn-primary">Load Reports</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card overflow-x-auto">
          <h3 className="font-medium mb-4">Employee Utilization</h3>
          <table className="w-full text-sm min-w-[300px]">
            <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Employee</th><th className="pb-2">Hours</th><th className="pb-2">Utilization</th></tr></thead>
            <tbody>{utilization.map((u: any, i: number) => (
              <tr key={i} className="border-b border-gray-50"><td className="py-2">{u.employee_name}</td><td>{u.total_hours}h / {u.available_hours}h</td><td>{u.utilization_pct}%</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="card overflow-x-auto">
          <h3 className="font-medium mb-4">Overtime Report</h3>
          <table className="w-full text-sm min-w-[300px]">
            <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Employee</th><th className="pb-2">OT Hours</th><th className="pb-2">Entries</th></tr></thead>
            <tbody>{overtime.map((o: any, i: number) => (
              <tr key={i} className="border-b border-gray-50"><td className="py-2">{o.employee_name}</td><td>{o.total_overtime_hours}h</td><td>{o.overtime_entries}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
