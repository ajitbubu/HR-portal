"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { WeeklyTimesheet } from "@/types";

export default function TimesheetApprovalsPage() {
  const { data: pending, refetch } = useApi<WeeklyTimesheet[]>("/timesheets/weekly/pending-approval");

  const handleAction = async (id: number, action: string) => {
    try {
      await api.post(`/timesheets/weekly/${id}/action`, { action });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    }
  };

  return (
    <DashboardLayout title="Timesheet Approvals">
      {pending && pending.length > 0 ? (
        <div className="space-y-4">
          {pending.map((ts) => (
            <div key={ts.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Employee #{ts.employee_id}</h4>
                  <p className="text-sm text-gray-500">{ts.week_start} - {ts.week_end} | {ts.total_hours}h total, {ts.overtime_hours}h overtime</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(ts.id, "approve")} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Approve</button>
                  <button onClick={() => handleAction(ts.id, "reject")} className="btn-danger">Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12"><p className="text-gray-500">No pending timesheet approvals</p></div>
      )}
    </DashboardLayout>
  );
}
