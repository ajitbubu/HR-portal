"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { LeaveRequest, LeaveBalance } from "@/types";

export default function LeavePage() {
  const { data: balances } = useApi<LeaveBalance[]>("/leave/balance?year=2026");
  const { data: requests, refetch } = useApi<LeaveRequest[]>("/leave/my-requests");

  const cancelRequest = async (id: number) => {
    if (!confirm("Cancel this leave request?")) return;
    await api.post(`/leave/${id}/cancel`);
    refetch();
  };

  return (
    <DashboardLayout title="Leave Management">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">My Leave</h3>
        <div className="flex gap-3">
          <Link href="/leave/calendar" className="btn-secondary">Calendar View</Link>
          <Link href="/leave/apply" className="btn-primary">Apply Leave</Link>
        </div>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {balances?.map((b) => (
          <div key={b.id} className="card">
            <p className="text-sm font-medium text-gray-700">{b.leave_type.name}</p>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-bold text-primary-700">{b.remaining}</span>
              <span className="text-sm text-gray-400 mb-1">/ {b.entitled + b.carried_forward + b.adjusted}</span>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>Used: {b.used}</span>
              <span>Pending: {b.pending}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((b.used + b.pending) / Math.max(1, b.entitled + b.carried_forward + b.adjusted)) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Leave Requests */}
      <div className="card">
        <h4 className="font-semibold text-gray-900 mb-4">Leave History</h4>
        {requests && requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Approval</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((lr) => (
                  <tr key={lr.id}>
                    <td className="py-3 text-sm">{lr.leave_type?.name || "N/A"}</td>
                    <td className="py-3 text-sm">{lr.start_date} to {lr.end_date}</td>
                    <td className="py-3 text-sm">{lr.total_days} {lr.is_half_day ? "(Half)" : ""}</td>
                    <td className="py-3">
                      <span className={`badge ${
                        lr.status === "approved" ? "badge-success" :
                        lr.status === "rejected" ? "badge-danger" :
                        lr.status === "pending" ? "badge-warning" :
                        lr.status === "cancelled" ? "badge-gray" : "badge-info"
                      }`}>{lr.status}</span>
                    </td>
                    <td className="py-3 text-xs text-gray-500">
                      {lr.approvals?.map((a) => (
                        <span key={a.id} className="block">{a.approver_name}: {a.status}</span>
                      ))}
                    </td>
                    <td className="py-3">
                      {(lr.status === "pending" || lr.status === "sent_back") && (
                        <button onClick={() => cancelRequest(lr.id)} className="text-xs text-red-600 hover:underline">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No leave requests found</p>
        )}
      </div>
    </DashboardLayout>
  );
}
