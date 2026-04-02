"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { LeaveRequest, EmployeeList } from "@/types";

export default function ApprovalsPage() {
  const { data: pending, refetch: refetchPending } = useApi<LeaveRequest[]>("/approvals/pending");
  const { data: history } = useApi<LeaveRequest[]>("/approvals/history");
  const { data: allEmployees } = useApi<EmployeeList>("/employees?per_page=100");

  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [delegatePicker, setDelegatePicker] = useState<number | null>(null); // leave request id
  const [delegateTarget, setDelegateTarget] = useState<Record<number, string>>({});

  const handleAction = async (requestId: number, action: string, delegateToId?: number) => {
    setActionLoading(requestId);
    try {
      await api.post(`/approvals/${requestId}/action`, {
        action,
        comments: comments[requestId] || null,
        delegate_to_id: delegateToId ?? null,
      });
      refetchPending?.();
      setDelegatePicker(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const items = activeTab === "pending" ? pending : history;

  return (
    <DashboardLayout title="Approvals">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "history"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              activeTab === tab ? "bg-primary-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab === "pending" ? `Pending (${pending?.length || 0})` : "History"}
          </button>
        ))}
      </div>

      {items && items.length > 0 ? (
        <div className="space-y-4">
          {items.map((lr) => (
            <div key={lr.id} className="card">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/employees/${lr.employee_id}`} className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                    {lr.employee_name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {lr.leave_type?.name} &middot; {lr.start_date} → {lr.end_date} &middot; {lr.total_days} day{lr.total_days !== 1 ? "s" : ""}
                  </p>
                  {lr.reason && <p className="text-sm text-gray-600 mt-1 italic">&ldquo;{lr.reason}&rdquo;</p>}

                  {/* Approval chain badges */}
                  {lr.approvals && lr.approvals.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {lr.approvals.map((a) => (
                        <span key={a.id} className={`badge text-[10px] ${
                          a.status === "approved" ? "badge-success" :
                          a.status === "rejected" ? "badge-danger" :
                          a.status === "pending"  ? "badge-warning" : "badge-gray"
                        }`}>
                          Step {a.step_order}: {a.approver_name} ({a.status})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`badge flex-shrink-0 ${
                  lr.status === "approved" ? "badge-success" :
                  lr.status === "rejected" ? "badge-danger" :
                  lr.status === "pending"  ? "badge-warning" : "badge-gray"
                }`}>{lr.status}</span>
              </div>

              {/* Action panel — pending tab only */}
              {activeTab === "pending" && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <input
                    placeholder="Add comments (optional)..."
                    value={comments[lr.id] || ""}
                    onChange={(e) => setComments({ ...comments, [lr.id]: e.target.value })}
                    className="input-field text-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    {/* Approve */}
                    <button
                      type="button"
                      onClick={() => handleAction(lr.id, "approve")}
                      disabled={actionLoading === lr.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Approve
                    </button>

                    {/* Reject */}
                    <button
                      type="button"
                      onClick={() => handleAction(lr.id, "reject")}
                      disabled={actionLoading === lr.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>

                    {/* Send Back */}
                    <button
                      type="button"
                      onClick={() => handleAction(lr.id, "send_back")}
                      disabled={actionLoading === lr.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                      </svg>
                      Send Back
                    </button>

                    {/* Delegate */}
                    <button
                      type="button"
                      onClick={() => setDelegatePicker(delegatePicker === lr.id ? null : lr.id)}
                      disabled={actionLoading === lr.id}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${
                        delegatePicker === lr.id
                          ? "border-primary-400 bg-primary-50 text-primary-700"
                          : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                      Delegate
                    </button>
                  </div>

                  {/* Delegate picker */}
                  {delegatePicker === lr.id && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-amber-800">Select someone to delegate this approval to:</p>
                      <select
                        title="Select delegate"
                        value={delegateTarget[lr.id] || ""}
                        onChange={(e) => setDelegateTarget({ ...delegateTarget, [lr.id]: e.target.value })}
                        className="input-field text-sm"
                      >
                        <option value="">Choose employee...</option>
                        {allEmployees?.items?.filter((e) => e.id !== lr.employee_id).map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.first_name} {e.last_name} — {e.employee_id}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (delegateTarget[lr.id]) {
                              handleAction(lr.id, "delegate", parseInt(delegateTarget[lr.id]));
                            }
                          }}
                          disabled={!delegateTarget[lr.id] || actionLoading === lr.id}
                          className="btn-primary text-sm disabled:opacity-50"
                        >
                          Confirm Delegate
                        </button>
                        <button
                          type="button"
                          onClick={() => setDelegatePicker(null)}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 font-medium">{activeTab === "pending" ? "No pending approvals" : "No approval history"}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
