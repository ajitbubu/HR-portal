"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/ui/StatsCard";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import type { DashboardStats, Announcement, LeaveRequest } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useApi<DashboardStats>("/dashboard/stats");
  const { data: announcements } = useApi<Announcement[]>("/announcements");
  const { data: recentLeave } = useApi<LeaveRequest[]>("/leave/my-requests");

  return (
    <DashboardLayout title="Dashboard">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Welcome back, {user?.name || "User"}</h3>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening in your organization today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Employees" value={stats?.total_employees || 0} color="blue" />
        <StatsCard title="On Leave Today" value={stats?.on_leave_today || 0} color="yellow" />
        <StatsCard title="Pending Approvals" value={stats?.pending_approvals || 0} color="red" />
        <StatsCard title="New Hires This Month" value={stats?.new_hires_this_month || 0} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-4">Recent Leave Requests</h4>
          {recentLeave && recentLeave.length > 0 ? (
            <div className="space-y-3">
              {recentLeave.slice(0, 5).map((lr) => (
                <div key={lr.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-medium">{lr.leave_type?.name || "Leave"}</p>
                    <p className="text-xs text-gray-500">{lr.start_date} - {lr.end_date}</p>
                  </div>
                  <span className={`badge ${
                    lr.status === "approved" ? "badge-success" :
                    lr.status === "rejected" ? "badge-danger" :
                    lr.status === "pending" ? "badge-warning" : "badge-gray"
                  }`}>
                    {lr.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent leave requests</p>
          )}
        </div>

        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-4">Announcements</h4>
          {announcements && announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.slice(0, 5).map((a) => (
                <div key={a.id} className="py-2 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.priority === "high" && <span className="badge badge-danger">High</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No announcements</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatsCard title="Active Employees" value={stats?.active_employees || 0} color="green" />
        <StatsCard title="Upcoming Holidays" value={stats?.upcoming_holidays || 0} color="purple" />
        <StatsCard title="Open HR Tickets" value={stats?.pending_tickets || 0} color="yellow" />
        <StatsCard title="Announcements" value={stats?.announcements_count || 0} color="blue" />
      </div>
    </DashboardLayout>
  );
}
