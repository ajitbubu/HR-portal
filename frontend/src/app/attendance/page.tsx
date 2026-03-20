"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { AttendanceRecord } from "@/types";

export default function AttendancePage() {
  const { data: records, refetch } = useApi<AttendanceRecord[]>("/attendance/my-records");
  const [message, setMessage] = useState("");

  const checkIn = async () => {
    try {
      const res = await api.post<{ message: string; time: string }>("/attendance/check-in");
      setMessage(`Checked in at ${res.time}`);
      refetch();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  };

  const checkOut = async () => {
    try {
      const res = await api.post<{ message: string; hours_worked: number }>("/attendance/check-out");
      setMessage(`Checked out. Hours: ${res.hours_worked}`);
      refetch();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <DashboardLayout title="Attendance">
      <div className="flex gap-4 mb-6">
        <button onClick={checkIn} className="btn-primary">Check In</button>
        <button onClick={checkOut} className="btn-secondary">Check Out</button>
        {message && <span className="self-center text-sm text-green-600">{message}</span>}
      </div>

      <div className="card">
        <h4 className="font-semibold text-gray-900 mb-4">Attendance Records</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records?.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 text-sm">{r.date}</td>
                  <td className="py-2.5 text-sm">{r.check_in || "-"}</td>
                  <td className="py-2.5 text-sm">{r.check_out || "-"}</td>
                  <td className="py-2.5 text-sm">{r.hours_worked || 0}h</td>
                  <td className="py-2.5"><span className={`badge ${r.status === "present" ? "badge-success" : r.status === "absent" ? "badge-danger" : "badge-info"}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!records || records.length === 0) && <p className="text-sm text-gray-500 text-center py-8">No records</p>}
      </div>
    </DashboardLayout>
  );
}
