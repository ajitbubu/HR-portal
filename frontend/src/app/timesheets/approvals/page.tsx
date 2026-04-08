"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { WeeklyTimesheet } from "@/types";

// Step progress indicator
function StepBadge({ status }: { status: string }) {
  const steps = [
    { key: "submitted",        label: "Submitted" },
    { key: "manager_approved", label: "Manager Review" },
    { key: "approved",         label: "HR Approved" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const done    = i < currentIdx || status === "approved";
        const active  = i === currentIdx && status !== "approved";
        const rejected = status === "rejected";
        return (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              rejected && i <= currentIdx ? "bg-red-100 text-red-600" :
              done     ? "bg-emerald-100 text-emerald-700" :
              active   ? "bg-indigo-100 text-indigo-700" :
                         "bg-gray-100 text-gray-400"
            }`}>
              {done && !rejected ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <svg className="w-3 h-3 text-gray-300 mx-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface TimesheetCardProps {
  ts: WeeklyTimesheet;
  onAction: (id: number, action: string, comments?: string) => Promise<void>;
  actionLabel: string; // "Manager Approve" | "HR Final Approve"
}

function TimesheetCard({ ts, onAction, actionLabel }: TimesheetCardProps) {
  const [comments, setComments] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async (action: string) => {
    setLoading(true);
    try {
      await onAction(ts.id, action, comments || undefined);
    } finally {
      setLoading(false);
      setShowReject(false);
      setComments("");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
              {ts.employee_id}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Employee #{ts.employee_id}</p>
              <p className="text-xs text-gray-400">
                {ts.week_start} – {ts.week_end}
              </p>
            </div>
          </div>
          <StepBadge status={ts.status} />
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{ts.total_hours}h</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          {ts.overtime_hours > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{ts.overtime_hours}h</p>
              <p className="text-xs text-gray-400">Overtime</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject form */}
      {showReject && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <label className="block text-xs font-medium text-red-700 mb-1">
            Rejection reason (required)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
            className="w-full text-sm border border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400"
            placeholder="Provide a reason for rejection…"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => handle("reject")}
              disabled={!comments.trim() || loading}
              className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Confirm Reject
            </button>
            <button
              type="button"
              onClick={() => { setShowReject(false); setComments(""); }}
              className="px-4 py-1.5 text-gray-600 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {!showReject && (
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={loading}
            className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        )}
        <button
          type="button"
          onClick={() => handle("approve")}
          disabled={loading || showReject}
          className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default function TimesheetApprovalsPage() {
  const { user } = useAuth();
  const { data: pending, refetch } = useApi<WeeklyTimesheet[]>("/timesheets/weekly/pending-approval");

  const isHR = user?.role === "super_admin" || user?.role === "hr_admin";
  const isManager = user?.role === "manager";

  const handleAction = async (id: number, action: string, comments?: string) => {
    try {
      await api.post(`/timesheets/weekly/${id}/action`, { action, comments });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    }
  };

  const actionLabel = isHR ? "HR Final Approve" : "Manager Approve";

  return (
    <DashboardLayout title="Timesheet Approvals">

      {/* How it works banner */}
      <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-indigo-700">
          {isHR
            ? "As HR, you see timesheets that have been approved by managers and need your final approval."
            : isManager
            ? "As a manager, you see timesheets submitted by your direct reports awaiting your review."
            : "You can approve timesheets submitted for review."}
          {" "}The flow is: <strong>Employee submits → Manager approves → HR final approval</strong>.
        </p>
      </div>

      {/* Approval queue */}
      {pending && pending.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {isHR ? "Pending HR Final Approval" : "Pending Manager Review"}
            </span>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          </div>
          {pending.map((ts) => (
            <TimesheetCard key={ts.id} ts={ts} onAction={handleAction} actionLabel={actionLabel} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-16">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 font-medium">No timesheets awaiting your approval</p>
          <p className="text-gray-400 text-sm mt-1">Check back later or contact your team.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
