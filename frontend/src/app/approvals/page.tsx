"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { LeaveRequest } from "@/types";

export default function ApprovalsPage() {
  const { data: pending, refetch: refetchPending } = useApi<LeaveRequest[]>("/approvals/pending");
  const { data: history } = useApi<LeaveRequest[]>("/approvals/history");
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});

  const handleAction = async (requestId: number, action: string) => {
    setActionLoading(requestId);
    try {
      await api.post(`/approvals/${requestId}/action`, {
        action,
        comments: comments[requestId] || null,
      });
      refetchPending();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const items = activeTab === "pending" ? pending : history;

  return (
    <DashboardLayout title="Approvals">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm rounded-lg ${activeTab === "pending" ? "bg-primary-600 text-white" : "bg-white text-gray-600 border"}`}
        >
          Pending ({pending?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm rounded-lg ${activeTab === "history" ? "bg-primary-600 text-white" : "bg-white text-gray-600 border"}`}
        >
          History
        </button>
      </div>

      {items && items.length > 0 ? (
        <div className="space-y-4">
          {items.map((lr) => (
            <div key={lr.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{lr.employee_name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{lr.leave_type?.name} &middot; {lr.start_date} to {lr.end_date} ({lr.total_days} days)</p>
                  {lr.reason && <p className="text-sm text-gray-600 mt-2">Reason: {lr.reason}</p>}
                  <div className="flex gap-3 mt-2">
                    {lr.approvals?.map((a) => (
                      <span key={a.id} className={`badge text-[10px] ${
                        a.status === "approved" ? "badge-success" :
                        a.status === "rejected" ? "badge-danger" :
                        a.status === "pending" ? "badge-warning" : "badge-gray"
                      }`}>
                        Step {a.step_order}: {a.approver_name} ({a.status})
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`badge ${
                  lr.status === "approved" ? "badge-success" :
                  lr.status === "rejected" ? "badge-danger" : "badge-warning"
                }`}>{lr.status}</span>
              </div>

              {activeTab === "pending" && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <input
                    placeholder="Add comments..."
                    value={comments[lr.id] || ""}
                    onChange={(e) => setComments({ ...comments, [lr.id]: e.target.value })}
                    className="input-field mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(lr.id, "approve")}
                      disabled={actionLoading === lr.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(lr.id, "reject")}
                      disabled={actionLoading === lr.id}
                      className="btn-danger"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(lr.id, "send_back")}
                      disabled={actionLoading === lr.id}
                      className="btn-secondary"
                    >
                      Send Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-500">{activeTab === "pending" ? "No pending approvals" : "No approval history"}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
