"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import type { NoticePeriodPreview } from "@/types";

function calcLastWorkingDay(resignDateStr: string, noticeDays: number): string {
  const d = new Date(resignDateStr);
  d.setDate(d.getDate() + noticeDays);
  const dow = d.getDay(); // 0=Sun, 6=Sat
  if (dow === 6) d.setDate(d.getDate() - 1);
  if (dow === 0) d.setDate(d.getDate() - 2);
  return d.toISOString().split("T")[0];
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function ResignationApplyPage() {
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ resignation_date: today, reason: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<NoticePeriodPreview | null>(null);

  // Computed live preview (client-side mirrors backend logic)
  const computedLastDay = preview
    ? calcLastWorkingDay(form.resignation_date, preview.notice_period_days)
    : null;

  const fetchPreview = useCallback(async (resDate: string) => {
    setPreviewLoading(true);
    try {
      const data = await api.get<NoticePeriodPreview>(
        `/resignation/notice-period-preview?resignation_date=${resDate}`
      );
      setPreview(data);
    } catch {
      // fallback — still allow submission; backend computes authoritatively
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview(form.resignation_date);
  }, [form.resignation_date, fetchPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError("Please confirm you understand the notice period requirements.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/resignation/submit", {
        resignation_date: form.resignation_date,
        reason: form.reason || null,
      });
      router.push("/resignation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit resignation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const noticeDays = preview?.notice_period_days ?? "—";
  const isMandatory = preview?.is_mandatory ?? true;

  return (
    <DashboardLayout title="Submit Resignation">
      <div className="max-w-2xl">

        {/* Notice period info banner */}
        {!previewLoading && preview && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Notice Period: {noticeDays} days
                  {isMandatory
                    ? " — Mandatory (India)"
                    : " — Flexible (US employees may be released earlier)"}
                </p>
                {computedLastDay && (
                  <p className="mt-1 text-sm text-amber-700">
                    Expected last working day: <strong>{formatDate(computedLastDay)}</strong>
                  </p>
                )}
                {isMandatory && (
                  <p className="mt-1 text-xs text-amber-600">
                    India-based employees must serve the full 90-day notice period unless the last day falls on a weekend (adjusted to Friday).
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Submit Your Resignation</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              This will notify your manager and HR. Please review the notice period carefully before submitting.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Resignation Date */}
          <div>
            <label htmlFor="resignation_date" className="block text-sm font-medium text-gray-700 mb-1">
              Resignation Date <span className="text-red-500">*</span>
            </label>
            <input
              id="resignation_date"
              type="date"
              required
              title="Resignation Date"
              className="input-field"
              value={form.resignation_date}
              min={today}
              onChange={(e) => setForm({ ...form, resignation_date: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">The date you are formally resigning. Usually today.</p>
          </div>

          {/* Computed last day display */}
          {computedLastDay && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expected Last Working Day</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{formatDate(computedLastDay)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Notice</p>
                  <p className="text-sm font-semibold text-gray-700">{noticeDays} days</p>
                </div>
              </div>
              {!isMandatory && (
                <p className="text-xs text-blue-600 mt-2">
                  Your manager may approve an earlier last day at their discretion.
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Resignation <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Please share your reason for resigning..."
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              I understand that by submitting this resignation, I am committing to a{" "}
              <strong>{noticeDays}-day notice period</strong>
              {isMandatory
                ? " which is mandatory and cannot be shortened without HR approval."
                : ", which is flexible and may be adjusted with manager approval."}
            </span>
          </label>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading || !confirmed}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Resignation"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/resignation")}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
