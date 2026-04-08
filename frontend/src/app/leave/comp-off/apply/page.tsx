"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";

export default function CompOffApplyPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    work_date: "",
    reason: "",
    hours_worked: 8,
    days_granted: 1 as 0.5 | 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.work_date || !form.reason.trim()) {
      setError("Work date and reason are required.");
      return;
    }
    if (form.work_date >= today) {
      setError("Work date must be in the past.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/leave/comp-off/apply", form);
      router.push("/leave/comp-off");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Apply for Comp-Off">
      <div className="max-w-2xl mx-auto">

        {/* Back breadcrumb */}
        <div className="mb-5">
          <Link href="/leave/comp-off" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Comp-Off
          </Link>
        </div>

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

          {/* Main card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-base font-semibold text-gray-900">Comp-Off Request</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                For days worked outside regular hours — weekends, holidays, or extra shifts. Reviewed by your manager then HR.
              </p>
            </div>

            <div className="px-6 py-6 space-y-6">

              {/* Work Date */}
              <div>
                <label htmlFor="co-work-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Work Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="co-work-date"
                  type="date"
                  value={form.work_date}
                  onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                  max={today}
                  className="input-field w-full"
                  required
                />
                <p className="text-xs text-gray-400 mt-1.5">The actual date you worked — must be in the past.</p>
              </div>

              {/* Hours Worked + Days to Credit — side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="co-hours" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Hours Worked
                  </label>
                  <input
                    id="co-hours"
                    type="number"
                    value={form.hours_worked}
                    onChange={(e) => setForm({ ...form, hours_worked: parseFloat(e.target.value) })}
                    min="1"
                    max="24"
                    step="0.5"
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-1.5">Days to Credit</p>
                  <div className="flex gap-2 h-[42px]">
                    {([0.5, 1] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm({ ...form, days_granted: val })}
                        className={`flex-1 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.days_granted === val
                            ? "border-primary-600 bg-primary-50 text-primary-700 shadow-sm"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                        }`}
                      >
                        {val === 0.5 ? "Half (0.5)" : "Full (1.0)"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="co-reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="co-reason"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={4}
                  placeholder="Describe the work you did and why it was outside regular hours…"
                  className="input-field w-full resize-none"
                  required
                />
              </div>

            </div>

            {/* Card footer — actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
              <Link href="/leave/comp-off" className="btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2 px-6"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Submit Request
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
