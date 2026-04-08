"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { WFHRequest, WFHSummary } from "@/types";

const statusBadge: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  cancelled: "badge-gray",
};

export default function WFHPage() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<"my" | "team">("my");

  const { data: requests, loading: loadingRequests, error: reqError, refetch } = useApi<WFHRequest[]>(
    `/wfh/my-requests?month=${month}&year=${year}`,
    [month, year]
  );
  const { data: summary, error: summaryError } = useApi<WFHSummary>("/wfh/summary");
  const { data: teamRequests, refetch: refetchTeam } = useApi<WFHRequest[]>(
    `/wfh/team?month=${month}&year=${year}`,
    [month, year]
  );

  const cancelRequest = async (id: number) => {
    if (!confirm("Cancel this WFH request?")) return;
    try {
      await api.post(`/wfh/${id}/cancel`);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  const isManager = user && ["super_admin", "hr_admin", "manager", "approver"].includes(user.role);

  return (
    <DashboardLayout title="Work From Home">
      {/* Header Actions */}
      <div className="flex justify-end mb-4">
        <Link href="/wfh/apply" className="btn-primary">+ New WFH Request</Link>
      </div>

      {/* Error Banner */}
      {(reqError || summaryError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          {reqError || summaryError}
        </div>
      )}

      {/* Loading */}
      {loadingRequests && !requests && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Week</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summary.total_this_week} / {summary.max_per_week}</p>
            <p className="text-sm text-gray-500">{summary.remaining_this_week} remaining</p>
          </div>
          <div className="card">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Month</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summary.total_this_month} / {summary.max_per_month}</p>
            <p className="text-sm text-gray-500">{summary.remaining_this_month} remaining</p>
          </div>
          <div className="card">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {requests?.filter((r) => r.status === "pending").length ?? 0}
            </p>
            <p className="text-sm text-gray-500">awaiting approval</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {isManager && (
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab("my")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${tab === "my" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              My Requests
            </button>
            <button
              onClick={() => setTab("team")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${tab === "team" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              Team Requests
            </button>
          </div>
        )}
        <select value={month} onChange={(e) => setMonth(+e.target.value)} className="input-field w-auto">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2026, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(+e.target.value)} className="input-field w-auto">
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Requests Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                {tab === "team" && <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>}
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date(s)</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Days</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(tab === "my" ? requests : teamRequests)?.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  {tab === "team" && (
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.employee_name}</td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {r.request_date}
                    {r.end_date && r.end_date !== r.request_date && ` - ${r.end_date}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.total_days}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 capitalize">{r.wfh_type?.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{r.reason || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusBadge[r.status] || "badge-gray"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {tab === "my" && r.status === "pending" && (
                      <button onClick={() => cancelRequest(r.id)} className="text-sm text-red-600 hover:text-red-800">
                        Cancel
                      </button>
                    )}
                    {tab === "team" && r.status === "pending" && (
                      <Link href="/wfh/approvals" className="text-sm text-primary-600 hover:text-primary-800">
                        Review
                      </Link>
                    )}
                  </td>
                </tr>
              )) ?? (
                <tr>
                  <td colSpan={tab === "team" ? 7 : 6} className="px-4 py-12 text-center text-gray-400">
                    No WFH requests found for this period.
                  </td>
                </tr>
              )}
              {(tab === "my" ? requests : teamRequests)?.length === 0 && (
                <tr>
                  <td colSpan={tab === "team" ? 7 : 6} className="px-4 py-12 text-center text-gray-400">
                    No WFH requests found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
