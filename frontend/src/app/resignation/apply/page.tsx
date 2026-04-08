"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import type { NoticePeriodPreview } from "@/types";

function calcLastWorkingDay(resignDateStr: string, noticeDays: number): string {
  const d = new Date(resignDateStr);
  d.setDate(d.getDate() + noticeDays);
  const dow = d.getDay();
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
      // backend computes authoritatively on submit
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
      <div className="max-w-2xl mx-auto">

        {/* Back breadcrumb */}
        <div className="mb-5">
          <Link href="/resignation" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Resignation
          </Link>
        </div>

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
                  {isMandatory ? " — Mandatory (India)" : " — Flexible (US employees may be released earlier)"}
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

        <form onSubmit={handleSubmit} noValidate>
          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-base font-semibold text-gray-900">Submit Your Resignation</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                This will notify your manager and HR. Please review the notice period carefully before submitting.
              </p>
            </div>

            <div className="px-6 py-6 space-y-6">

              {/* Resignation Date */}
              <div>
                <label htmlFor="resignation_date" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Resignation Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="resignation_date"
                  type="date"
                  required
                  className="input-field w-full"
                  value={form.resignation_date}
                  min={today}
                  onChange={(e) => setForm({ ...form, resignation_date: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1.5">The date you are formally resigning — usually today.</p>
              </div>

              {/* Computed last day */}
              {computedLastDay && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Expected Last Working Day</p>
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
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason for Resignation <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  className="input-field w-full resize-none"
                  rows={4}
                  placeholder="Please share your reason for resigning…"
                  required
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>

              {/* Confirmation */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <div className="w-4 h-4 border-2 border-gray-300 peer-checked:border-primary-600 peer-checked:bg-primary-600 rounded transition-colors" />
                    {confirmed && (
                      <svg className="absolute inset-0 w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I understand that by submitting this resignation, I am committing to a{" "}
                    <strong>{noticeDays}-day notice period</strong>
                    {isMandatory
                      ? " which is mandatory and cannot be shortened without HR approval."
                      : ", which is flexible and may be adjusted with manager approval."}
                  </span>
                </label>
              </div>

            </div>

            {/* Card footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/resignation")}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !confirmed}
                className="btn-primary flex items-center gap-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Submit Resignation
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
