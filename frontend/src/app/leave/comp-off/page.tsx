"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";

interface CompOffGrant {
  id: number;
  work_date: string;
  reason: string;
  hours_worked: number;
  days_granted: number;
  status: string;
  manager_comments?: string;
  hr_comments?: string;
  expires_at?: string;
  created_at?: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending:          "badge-warning",
  manager_approved: "badge-info",
  hr_approved:      "badge-success",
  rejected:         "badge-danger",
  expired:          "badge-gray",
};

const STATUS_LABEL: Record<string, string> = {
  pending:          "Pending Manager",
  manager_approved: "Pending HR",
  hr_approved:      "Approved",
  rejected:         "Rejected",
  expired:          "Expired",
};

export default function CompOffPage() {
  const { isRole } = useAuth();
  const { data: requests } = useApi<CompOffGrant[]>("/leave/comp-off/my-requests");
  const canApprove = isRole("manager", "approver", "hr_admin", "super_admin");

  return (
    <DashboardLayout title="Comp-Off">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Comp-Off Requests</h3>
        <div className="flex gap-3">
          {canApprove && (
            <Link href="/leave/comp-off/approvals" className="btn-secondary">Approvals</Link>
          )}
          <Link href="/leave/comp-off/apply" className="btn-primary">Apply for Comp-Off</Link>
        </div>
      </div>

      <div className="card">
        {requests && requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Work Date</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 text-sm font-medium">{r.work_date}</td>
                    <td className="py-3 text-sm text-gray-600 max-w-xs truncate">{r.reason}</td>
                    <td className="py-3 text-sm">{r.hours_worked}h</td>
                    <td className="py-3 text-sm">{r.days_granted}</td>
                    <td className="py-3">
                      <span className={`badge ${STATUS_BADGE[r.status] || "badge-gray"}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-gray-500">
                      {r.status === "hr_approved" && r.expires_at ? r.expires_at : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm mb-4">No comp-off requests yet.</p>
            <Link href="/leave/comp-off/apply" className="btn-primary">Apply for Comp-Off</Link>
          </div>
        )}
      </div>

      <div className="card mt-6">
        <h4 className="font-semibold text-gray-900 mb-3">About Comp-Off</h4>
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
          <li>Apply when you have worked on a weekend, holiday, or outside regular hours.</li>
          <li>Requests go through 2-level approval: Manager → HR.</li>
          <li>On HR approval, comp-off days are credited to your leave balance (CO type).</li>
          <li>Comp-off days expire 90 days from the work date — use them in time.</li>
        </ul>
      </div>
    </DashboardLayout>
  );
}
