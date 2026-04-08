"use client";

import { use } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";

interface TimelineEvent {
  event: string;
  actor: string;
  timestamp: string | null;
  details: string;
}

interface LeaveDetail {
  id: number;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  reason?: string;
  status: string;
  attachment_path?: string;
  created_at?: string;
  timeline: TimelineEvent[];
}

const EVENT_STYLES: Record<string, { dot: string; label: string }> = {
  submitted:     { dot: "bg-blue-500",   label: "Submitted" },
  approved:      { dot: "bg-green-500",  label: "Approved" },
  rejected:      { dot: "bg-red-500",    label: "Rejected" },
  sent_back:     { dot: "bg-yellow-500", label: "Sent Back" },
  cancelled:     { dot: "bg-gray-400",   label: "Cancelled" },
  pending_review:{ dot: "bg-gray-300",   label: "Pending Review" },
  delegated:     { dot: "bg-purple-500", label: "Delegated" },
};

const STATUS_BADGE: Record<string, string> = {
  approved:  "badge-success",
  rejected:  "badge-danger",
  pending:   "badge-warning",
  cancelled: "badge-gray",
  sent_back: "badge-info",
};

function fmt(ts: string | null) {
  if (!ts) return null;
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function LeaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error } = useApi<LeaveDetail>(`/leave/request/${id}/detail`);

  return (
    <DashboardLayout title="Leave Request Detail">
      <div className="mb-4">
        <Link href="/leave" className="text-sm text-primary-600 hover:underline">← Back to Leave</Link>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">Failed to load: {error}</p>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary card */}
          <div className="lg:col-span-1">
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Request #{data.id}</h3>
                <span className={`badge ${STATUS_BADGE[data.status] || "badge-info"}`}>{data.status}</span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Employee</p>
                  <p className="text-gray-900 font-medium">{data.employee_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Leave Type</p>
                  <p className="text-gray-900">{data.leave_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Dates</p>
                  <p className="text-gray-900">{data.start_date} → {data.end_date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Duration</p>
                  <p className="text-gray-900">
                    {data.total_days} day{data.total_days !== 1 ? "s" : ""}
                    {data.is_half_day ? " (Half Day)" : ""}
                  </p>
                </div>
                {data.reason && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Reason</p>
                    <p className="text-gray-700">{data.reason}</p>
                  </div>
                )}
                {data.attachment_path && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Attachment</p>
                    <a href={data.attachment_path} target="_blank" rel="noreferrer"
                       className="text-primary-600 hover:underline text-xs">View document</a>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Applied On</p>
                  <p className="text-gray-900">{data.created_at ? fmt(data.created_at) : "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-2">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-6">Approval Timeline</h3>
              <ol className="relative border-l border-gray-200 space-y-6 ml-3">
                {data.timeline.map((ev, i) => {
                  const style = EVENT_STYLES[ev.event] || { dot: "bg-gray-400", label: ev.event };
                  const isPending = ev.event === "pending_review";
                  return (
                    <li key={i} className="ml-6">
                      <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${style.dot} ${isPending ? "opacity-40" : ""}`} />
                      <div className={isPending ? "opacity-50" : ""}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">{style.label}</span>
                          {ev.timestamp && (
                            <time className="text-xs text-gray-400">{fmt(ev.timestamp)}</time>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-gray-800">{ev.actor}</span>
                          {" — "}
                          {ev.details}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
