"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/ui/StatsCard";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import type { DashboardStats, Announcement, LeaveRequest } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";

interface Celebration {
  id: number;
  name: string;
  photo?: string;
  type: "birthday" | "anniversary";
  date: string;
  days_away: number;
  label: string;
}

function CelebrationCard({ c }: { c: Celebration }) {
  const photoUrl = c.photo ? `${API_BASE}${c.photo}` : null;
  const nameParts = c.name.split(" ");
  const initials = `${nameParts[0]?.[0] ?? ""}${nameParts[1]?.[0] ?? ""}`.toUpperCase();
  const isToday = c.days_away === 0;
  return (
    <Link href={`/employees/${c.id}`} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors -mx-1 group">
      <div className="relative flex-shrink-0">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={c.name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
        )}
        <span className="absolute -bottom-1 -right-1 text-sm">{c.type === "birthday" ? "🎂" : "🏅"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-700">{c.name}</p>
        <p className="text-xs text-gray-500 truncate">{c.label}</p>
      </div>
      <span className={`text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full ${isToday ? "bg-amber-100 text-amber-700" : "text-gray-400"}`}>
        {isToday ? "Today!" : `${c.days_away}d`}
      </span>
    </Link>
  );
}

function QuickAction({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-gray-50 transition-all duration-200 group">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">{label}</span>
    </Link>
  );
}

const statusStyle: Record<string, string> = {
  approved: "badge-success",
  rejected: "badge-danger",
  pending: "badge-warning",
  cancelled: "badge-gray",
  sent_back: "badge-info",
};

const priorityStyle: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-amber-500",
  normal: "border-l-blue-400",
  low: "border-l-gray-300",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useApi<DashboardStats>("/dashboard/stats");

  const canViewOrgStats =
    user?.role === "super_admin" ||
    user?.role === "hr_admin" ||
    user?.name === "Debjani Mohanty";
  const { data: announcements } = useApi<Announcement[]>("/announcements");
  const { data: recentLeave } = useApi<LeaveRequest[]>("/leave/my-requests");
  const { data: celebrations } = useApi<Celebration[]>("/dashboard/celebrations?days=30");

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <DashboardLayout title="Dashboard">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-purple-700 p-6 mb-6 text-white">
        <div className="relative z-10">
          <h3 className="text-xl font-bold">{greeting()}, {user?.name?.split(" ")[0] || "there"}</h3>
          <p className="text-primary-100 mt-1 text-sm">Here&apos;s what&apos;s happening in your organization today.</p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-2 top-8 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute right-24 -bottom-4 w-16 h-16 rounded-full bg-white/5" />
      </div>

      {/* Stats Grid */}
      {canViewOrgStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatsCard title="Total Employees" value={stats?.total_employees || 0} icon="users" color="indigo" />
          <StatsCard title="On Leave Today" value={stats?.on_leave_today || 0} icon="calendar" color="yellow" />
          <StatsCard title="Absent Today" value={stats?.absent_today || 0} icon="clock" color="red" />
          <StatsCard title="Pending Approvals" value={stats?.pending_approvals || 0} icon="check" color="purple" />
          <StatsCard title="New Hires" value={stats?.new_hires_this_month || 0} icon="sparkle" color="green" subtitle="This month" />
        </div>
      )}

      {/* Quick Actions */}
      <div className="card mb-6">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h4>
        <div className="flex flex-wrap gap-1">
          <QuickAction href="/leave/apply" icon="M12 4.5v15m7.5-7.5h-15" label="Apply Leave" color="bg-blue-50 text-blue-600" />
          <QuickAction href="/attendance" icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" label="Attendance" color="bg-emerald-50 text-emerald-600" />
          <QuickAction href="/approvals" icon="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label="Approvals" color="bg-amber-50 text-amber-600" />
          <QuickAction href="/directory" icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" label="Directory" color="bg-purple-50 text-purple-600" />
          <QuickAction href="/documents" icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" label="Documents" color="bg-orange-50 text-orange-600" />
          <QuickAction href="/profile" icon="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" label="My Profile" color="bg-pink-50 text-pink-600" />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Leave */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Recent Leave Requests</h4>
            <Link href="/leave" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          {recentLeave && recentLeave.length > 0 ? (
            <div className="space-y-1">
              {recentLeave.slice(0, 5).map((lr) => (
                <div key={lr.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors -mx-1">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lr.leave_type?.name || "Leave"}</p>
                      <p className="text-xs text-gray-400">{lr.start_date} - {lr.end_date} &middot; {lr.total_days}d</p>
                    </div>
                  </div>
                  <span className={`badge ${statusStyle[lr.status] || "badge-gray"}`}>
                    {lr.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <p className="text-sm text-gray-400">No recent leave requests</p>
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Announcements</h4>
            <Link href="/announcements" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          {announcements && announcements.length > 0 ? (
            <div className="space-y-2">
              {announcements.slice(0, 4).map((a) => (
                <div key={a.id} className={`py-3 px-3 rounded-xl border-l-[3px] bg-gray-50/50 ${priorityStyle[a.priority] || priorityStyle.normal}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    {(a.priority === "high" || a.priority === "urgent") && (
                      <span className={`badge text-[10px] py-0 ${a.priority === "urgent" ? "badge-danger" : "badge-warning"}`}>{a.priority}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{a.content}</p>
                  <p className="text-[11px] text-gray-400 mt-1.5">By {a.author_name || "System"}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09" />
              </svg>
              <p className="text-sm text-gray-400">No announcements</p>
            </div>
          )}
        </div>
      </div>

      {/* Celebrations Widget */}
      {celebrations && celebrations.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Upcoming Celebrations</h4>
            <span className="text-xs text-gray-400">Next 30 days</span>
          </div>
          <div className="divide-y divide-gray-50">
            {celebrations.slice(0, 6).map((c) => (
              <CelebrationCard key={`${c.type}-${c.id}`} c={c} />
            ))}
          </div>
        </div>
      )}

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Active Employees" value={stats?.active_employees || 0} icon="check" color="green" />
        <StatsCard title="Upcoming Holidays" value={stats?.upcoming_holidays || 0} icon="calendar" color="purple" />
        <StatsCard title="Open HR Tickets" value={stats?.pending_tickets || 0} icon="ticket" color="yellow" />
        <StatsCard title="Announcements" value={stats?.announcements_count || 0} icon="bell" color="blue" />
      </div>
    </DashboardLayout>
  );
}
