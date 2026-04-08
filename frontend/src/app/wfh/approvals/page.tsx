"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { WFHRequest } from "@/types";

export default function WFHApprovalsPage() {
  const { data: pending, refetch } = useApi<WFHRequest[]>("/wfh/pending-approvals");
  const [comments, setComments] = useState<Record<number, string>>({});
  const [acting, setActing] = useState<number | null>(null);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    setActing(id);
    try {
      await api.post(`/wfh/${id}/${action}`, { comments: comments[id] || undefined });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActing(null);
    }
  };

  return (
    <DashboardLayout title="WFH Approvals">
      {!pending || pending.length === 0 ? (
        <div className="card text-center py-16">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-gray-500">No pending WFH requests to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{r.employee_name}</h3>
                  <p className="text-sm text-gray-500">
                    {r.department || r.department_name || "—"}
                  </p>
                </div>
                <span className="badge badge-warning">Pending</span>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Date(s)</p>
                  <p className="font-medium text-gray-900">
                    {r.request_date}
                    {r.end_date && r.end_date !== r.request_date && ` to ${r.end_date}`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Days</p>
                  <p className="font-medium text-gray-900">{r.total_days}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium text-gray-900 capitalize">{r.wfh_type?.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-gray-500">Submitted</p>
                  <p className="font-medium text-gray-900">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</p>
                </div>
              </div>

              {r.reason && (
                <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  <strong>Reason:</strong> {r.reason}
                </div>
              )}

              <div className="mt-4">
                <label htmlFor={`comment-${r.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Comments <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id={`comment-${r.id}`}
                  type="text"
                  value={comments[r.id] || ""}
                  onChange={(e) => setComments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className="input-field"
                  placeholder="Add a note..."
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleAction(r.id, "approve")}
                  disabled={acting === r.id}
                  className="btn-primary"
                >
                  {acting === r.id ? "Processing..." : "Approve"}
                </button>
                <button
                  onClick={() => handleAction(r.id, "reject")}
                  disabled={acting === r.id}
                  className="btn-danger"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
