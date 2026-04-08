"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface CompOffGrant {
  id: number;
  employee_name: string;
  work_date: string;
  reason: string;
  hours_worked: number;
  days_granted: number;
  status: string;
  created_at?: string;
}

export default function CompOffApprovalsPage() {
  const { isRole } = useAuth();
  const { data: requests, refetch } = useApi<CompOffGrant[]>("/leave/comp-off/pending-approvals");

  const [comments, setComments] = useState<Record<number, string>>({});
  const [acting, setActing] = useState<number | null>(null);
  const [error, setError] = useState("");

  const isHR = isRole("hr_admin", "super_admin");

  const handleAction = async (grant: CompOffGrant, action: "approve" | "reject") => {
    setActing(grant.id);
    setError("");
    try {
      const endpoint = isHR
        ? `/leave/comp-off/${grant.id}/hr-action`
        : `/leave/comp-off/${grant.id}/manager-action`;
      await api.post(endpoint, { action, comments: comments[grant.id] || "" });
      setComments((prev) => { const c = { ...prev }; delete c[grant.id]; return c; });
      refetch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <DashboardLayout title="Comp-Off Approvals">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/leave/comp-off" className="text-sm text-primary-600 hover:underline">← Comp-Off</Link>
          <h3 className="text-lg font-semibold mt-1">
            {isHR ? "HR Approval — Step 2" : "Manager Approval — Step 1"}
          </h3>
          <p className="text-sm text-gray-500">
            {isHR
              ? "These requests have been approved by the manager and need final HR sign-off."
              : "Review comp-off requests from your direct reports."}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-3 mb-4">{error}</p>}

      {requests && requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900">{req.employee_name}</span>
                    <span className="badge badge-warning text-xs">
                      {isHR ? "Pending HR" : "Pending Manager"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-600">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Work Date</p>
                      <p className="font-medium">{req.work_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Hours</p>
                      <p>{req.hours_worked}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Days to Credit</p>
                      <p>{req.days_granted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Applied On</p>
                      <p>{req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>
                  {req.reason && (
                    <p className="mt-3 text-sm text-gray-700">
                      <span className="font-medium text-gray-500">Reason: </span>{req.reason}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div>
                  <label htmlFor={`comment-${req.id}`} className="block text-xs font-medium text-gray-500 mb-1">
                    Comments (optional)
                  </label>
                  <textarea
                    id={`comment-${req.id}`}
                    rows={2}
                    value={comments[req.id] ?? ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    placeholder="Add a comment…"
                    className="input-field w-full resize-none text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={acting === req.id}
                    onClick={() => handleAction(req, "approve")}
                    className="btn-primary"
                  >
                    {acting === req.id ? "Processing…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={acting === req.id}
                    onClick={() => handleAction(req, "reject")}
                    className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-500">No pending comp-off requests.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
