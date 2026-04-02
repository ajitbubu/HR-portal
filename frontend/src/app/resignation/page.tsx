"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { ResignationRequest } from "@/types";

function formatDate(str?: string | null) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    submitted: "Resignation submitted",
    approved: "Approved by manager",
    rejected: "Rejected by manager",
    withdrawn: "Withdrawn by employee",
    auto_approved: "Auto-approved (notice period expired)",
    modified_last_day: "Last day modified by manager",
    hr_note_added: "HR note added",
    completed: "Offboarding initiated by HR",
  };
  return map[action] ?? action;
}

const statusBadge: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  auto_approved: "badge-purple",
  rejected: "badge-danger",
  withdrawn: "badge-gray",
  completed: "badge-info",
};

export default function ResignationPage() {
  const { user } = useAuth();
  const isHR = user?.role === "super_admin" || user?.role === "hr_admin";
  const isManager = user?.role === "manager" || user?.role === "super_admin" || user?.role === "hr_admin";

  const { data: myResignations, refetch: refetchMy } = useApi<ResignationRequest[]>("/resignation/my");
  const { data: teamResignations, refetch: refetchTeam } = useApi<ResignationRequest[]>(
    isManager ? "/resignation/team" : ""
  );
  const { data: allResignations, refetch: refetchAll } = useApi<ResignationRequest[]>(
    isHR ? "/resignation/all" : ""
  );

  const myResignation = myResignations?.[0] ?? null;

  // Manager action state
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [newLastDay, setNewLastDay] = useState<Record<number, string>>({});
  const [hrNotes, setHrNotes] = useState<Record<number, string>>({});
  const [actionError, setActionError] = useState<Record<number, string>>({});

  async function handleManagerAction(id: number, action: string, extra?: { new_last_day?: string }) {
    setActionLoading(id);
    setActionError((prev) => ({ ...prev, [id]: "" }));
    try {
      await api.post(`/resignation/${id}/manager-action`, {
        action,
        comments: comments[id] || null,
        new_last_day: extra?.new_last_day || null,
      });
      refetchTeam?.();
      refetchAll?.();
    } catch (err) {
      setActionError((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Action failed",
      }));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleWithdraw(id: number) {
    if (!confirm("Are you sure you want to withdraw your resignation? This cannot be undone.")) return;
    try {
      await api.post(`/resignation/${id}/withdraw`);
      refetchMy?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to withdraw");
    }
  }

  async function handleComplete(id: number) {
    if (!confirm("Initiate offboarding for this employee? This will mark them as terminated and create exit tasks.")) return;
    try {
      await api.post(`/resignation/${id}/complete`);
      refetchAll?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete");
    }
  }

  async function handleHRNotes(id: number) {
    if (!hrNotes[id]?.trim()) return;
    try {
      await api.post(`/resignation/${id}/hr-notes`, { hr_notes: hrNotes[id] });
      setHrNotes((prev) => ({ ...prev, [id]: "" }));
      refetchAll?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save notes");
    }
  }

  return (
    <DashboardLayout title="Resignation">

      {/* ── Employee: own resignation ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">My Resignation</h4>
          {!myResignation && (
            <Link href="/resignation/apply" className="btn-primary text-sm">
              Submit Resignation
            </Link>
          )}
        </div>

        {!myResignation ? (
          <div className="card text-center py-10">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <p className="text-sm text-gray-400">You have not submitted a resignation.</p>
            <Link href="/resignation/apply" className="mt-3 inline-block text-sm text-indigo-600 hover:underline font-medium">
              Submit a resignation →
            </Link>
          </div>
        ) : (
          <div className="card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">
                  Submitted on <span className="font-medium text-gray-700">{formatDate(myResignation.resignation_date)}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Notice period:{" "}
                  <span className="font-medium text-gray-700">{myResignation.notice_period_days} days</span>
                  <span className={`ml-2 text-xs font-semibold ${myResignation.is_mandatory ? "text-red-600" : "text-blue-600"}`}>
                    {myResignation.is_mandatory ? "Mandatory" : "Flexible"}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  Expected last day:{" "}
                  <span className="font-medium text-gray-700">{formatDate(myResignation.expected_last_day)}</span>
                </p>
                {myResignation.actual_last_day && (
                  <p className="text-sm text-gray-500">
                    Confirmed last day:{" "}
                    <span className="font-bold text-gray-900">{formatDate(myResignation.actual_last_day)}</span>
                  </p>
                )}
              </div>
              <span className={`badge ${statusBadge[myResignation.status] ?? "badge-gray"}`}>
                {myResignation.status.replace("_", " ")}
              </span>
            </div>

            {myResignation.reason && (
              <p className="mt-3 text-sm italic text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                &ldquo;{myResignation.reason}&rdquo;
              </p>
            )}

            {myResignation.manager_comments && (
              <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-xs font-medium text-blue-700">Manager Comments</p>
                <p className="text-sm text-blue-900 mt-0.5">{myResignation.manager_comments}</p>
              </div>
            )}

            {/* Action timeline */}
            {myResignation.action_logs && myResignation.action_logs.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Timeline</p>
                <div className="space-y-2">
                  {myResignation.action_logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <span className="text-gray-400 text-xs flex-shrink-0 pt-0.5 min-w-[90px]">
                        {formatDate(log.created_at)}
                      </span>
                      <div>
                        <span className="font-medium text-gray-700">{actionLabel(log.action)}</span>
                        {log.comments && (
                          <span className="text-gray-500"> — {log.comments}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myResignation.status === "pending" && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <button
                  onClick={() => handleWithdraw(myResignation.id)}
                  className="text-sm text-red-500 hover:text-red-700 font-medium hover:underline"
                >
                  Withdraw Resignation
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Manager: team resignations ── */}
      {isManager && !isHR && teamResignations && teamResignations.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">Team Resignations</h4>
          <div className="space-y-4">
            {teamResignations.map((r) => (
              <ResignationCard
                key={r.id}
                r={r}
                isHR={false}
                actionLoading={actionLoading}
                comments={comments}
                setComments={setComments}
                newLastDay={newLastDay}
                setNewLastDay={setNewLastDay}
                hrNotes={hrNotes}
                setHrNotes={setHrNotes}
                actionError={actionError}
                onManagerAction={handleManagerAction}
                onComplete={handleComplete}
                onHRNotes={handleHRNotes}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── HR / Admin: all resignations ── */}
      {isHR && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">All Resignations</h4>
          {allResignations && allResignations.length > 0 ? (
            <div className="space-y-4">
              {allResignations.map((r) => (
                <ResignationCard
                  key={r.id}
                  r={r}
                  isHR
                  actionLoading={actionLoading}
                  comments={comments}
                  setComments={setComments}
                  newLastDay={newLastDay}
                  setNewLastDay={setNewLastDay}
                  hrNotes={hrNotes}
                  setHrNotes={setHrNotes}
                  actionError={actionError}
                  onManagerAction={handleManagerAction}
                  onComplete={handleComplete}
                  onHRNotes={handleHRNotes}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-sm text-gray-400">No resignation records found.</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Resignation Card (used for both manager and HR views) ──────────────────────

interface ResignationCardProps {
  r: ResignationRequest;
  isHR: boolean;
  actionLoading: number | null;
  comments: Record<number, string>;
  setComments: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  newLastDay: Record<number, string>;
  setNewLastDay: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  hrNotes: Record<number, string>;
  setHrNotes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  actionError: Record<number, string>;
  onManagerAction: (id: number, action: string, extra?: { new_last_day?: string }) => Promise<void>;
  onComplete: (id: number) => Promise<void>;
  onHRNotes: (id: number) => Promise<void>;
}

function ResignationCard({
  r, isHR, actionLoading, comments, setComments,
  newLastDay, setNewLastDay, hrNotes, setHrNotes,
  actionError, onManagerAction, onComplete, onHRNotes,
}: ResignationCardProps) {
  const isBusy = actionLoading === r.id;

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-gray-900">{r.employee_name}</p>
          <p className="text-xs text-gray-500">{r.employee_code} · {r.department_name} · {r.location_name}</p>
          <div className="flex flex-wrap gap-4 mt-2">
            <div>
              <p className="text-xs text-gray-400">Resignation Date</p>
              <p className="text-sm font-medium text-gray-700">{formatDate(r.resignation_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Expected Last Day</p>
              <p className="text-sm font-medium text-gray-700">{formatDate(r.expected_last_day)}</p>
            </div>
            {r.actual_last_day && (
              <div>
                <p className="text-xs text-gray-400">Confirmed Last Day</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(r.actual_last_day)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Notice</p>
              <p className="text-sm font-medium text-gray-700">
                {r.notice_period_days}d
                <span className={`ml-1 text-xs font-semibold ${r.is_mandatory ? "text-red-500" : "text-blue-500"}`}>
                  {r.is_mandatory ? "Mandatory" : "Flexible"}
                </span>
              </p>
            </div>
          </div>
          {r.reason && (
            <p className="mt-2 text-xs italic text-gray-400">&ldquo;{r.reason}&rdquo;</p>
          )}
        </div>
        <span className={`badge flex-shrink-0 ${statusBadge[r.status] ?? "badge-gray"}`}>
          {r.status.replace("_", " ")}
        </span>
      </div>

      {actionError[r.id] && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {actionError[r.id]}
        </div>
      )}

      {/* Manager action panel — only for pending resignations */}
      {r.status === "pending" && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
          <textarea
            className="input-field text-sm"
            rows={2}
            placeholder="Add comments (optional)..."
            value={comments[r.id] ?? ""}
            onChange={(e) => setComments((prev) => ({ ...prev, [r.id]: e.target.value }))}
          />

          <div className="flex flex-wrap gap-2">
            {/* Approve */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onManagerAction(r.id, "approve")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Approve
            </button>

            {/* Reject — only for US/non-mandatory */}
            {!r.is_mandatory && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onManagerAction(r.id, "reject")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            )}
          </div>

          {/* Modify last day */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Approve with Modified Last Day</label>
              <input
                type="date"
                className="input-field text-sm"
                value={newLastDay[r.id] ?? ""}
                min={r.is_mandatory ? r.expected_last_day : new Date().toISOString().split("T")[0]}
                onChange={(e) => setNewLastDay((prev) => ({ ...prev, [r.id]: e.target.value }))}
              />
            </div>
            <button
              type="button"
              disabled={isBusy || !newLastDay[r.id]}
              onClick={() => onManagerAction(r.id, "modify_last_day", { new_last_day: newLastDay[r.id] })}
              className="px-3 py-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-medium transition-colors disabled:opacity-40"
            >
              Set Last Day
            </button>
          </div>
        </div>
      )}

      {/* HR: notes + complete button */}
      {isHR && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
          {r.hr_notes && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-indigo-700">HR Notes</p>
              <p className="text-sm text-indigo-900 mt-0.5">{r.hr_notes}</p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field text-sm flex-1"
              placeholder="Add HR note..."
              value={hrNotes[r.id] ?? ""}
              onChange={(e) => setHrNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
            />
            <button
              type="button"
              disabled={!hrNotes[r.id]?.trim()}
              onClick={() => onHRNotes(r.id)}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium disabled:opacity-40"
            >
              Save
            </button>
          </div>

          {r.status === "approved" || r.status === "auto_approved" ? (
            <button
              type="button"
              onClick={() => onComplete(r.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Initiate Offboarding
            </button>
          ) : null}
        </div>
      )}

      {/* Action timeline */}
      {r.action_logs && r.action_logs.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-indigo-600 cursor-pointer hover:underline">View timeline</summary>
          <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-gray-100">
            {r.action_logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-xs">
                <span className="text-gray-400 flex-shrink-0">{formatDate(log.created_at)}</span>
                <span className="text-gray-600">{actionLabel(log.action)}</span>
                {log.comments && <span className="text-gray-400">— {log.comments}</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
