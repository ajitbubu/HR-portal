"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { LeaveRequest, HolidayCalendar } from "@/types";

export default function LeaveCalendarPage() {
  const { data: requests } = useApi<LeaveRequest[]>("/leave/my-requests");
  const { data: calendars } = useApi<HolidayCalendar[]>("/holidays/calendars");

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <DashboardLayout title="Leave Calendar">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-4">My Leave Schedule</h4>
          {requests && requests.length > 0 ? (
            <div className="space-y-2">
              {requests.filter((r) => r.status === "approved" || r.status === "pending").map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${r.status === "approved" ? "bg-green-500" : "bg-yellow-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.leave_type?.name}</p>
                    <p className="text-xs text-gray-500">{r.start_date} - {r.end_date} ({r.total_days} days)</p>
                  </div>
                  <span className={`badge ${r.status === "approved" ? "badge-success" : "badge-warning"}`}>{r.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No upcoming leave</p>
          )}
        </div>

        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-4">Holiday Calendar</h4>
          {calendars?.map((cal) => (
            <div key={cal.id} className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{cal.name} ({cal.year})</p>
              <div className="space-y-1">
                {cal.holidays?.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{h.name}</span>
                      {h.is_optional && <span className="badge badge-info text-[10px]">Optional</span>}
                    </div>
                    <span className="text-xs text-gray-500">{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(!calendars || calendars.length === 0) && (
            <p className="text-sm text-gray-500">No holiday calendars configured</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
