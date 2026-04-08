"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { WFHPolicy, WFHSummary } from "@/types";

export default function WFHApplyPage() {
  const router = useRouter();
  const { data: policy } = useApi<WFHPolicy>("/wfh/policy");
  const { data: summary } = useApi<WFHSummary>("/wfh/summary");

  const [form, setForm] = useState({
    request_date: "",
    end_date: "",
    wfh_type: "full_day",
    reason: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        request_date: form.request_date,
        wfh_type: form.wfh_type,
        reason: form.reason || undefined,
      };
      if (form.end_date) payload.end_date = form.end_date;
      await api.post("/wfh/apply", payload);
      router.push("/wfh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const previewDays = () => {
    if (!form.request_date) return 0;
    if (!form.end_date || form.end_date === form.request_date) return 1;
    const start = new Date(form.request_date);
    const end = new Date(form.end_date);
    let count = 0;
    const d = new Date(start);
    while (d <= end) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  };

  const days = previewDays();
  const weekUsed = summary?.total_this_week ?? 0;
  const monthUsed = summary?.total_this_month ?? 0;
  const weekMax = policy?.max_days_per_week ?? 0;
  const monthMax = policy?.max_days_per_month ?? 0;

  return (
    <DashboardLayout title="Work From Home Request">
      <div className="max-w-2xl mx-auto">

        {/* Back breadcrumb */}
        <div className="mb-5">
          <Link href="/wfh" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Work From Home
          </Link>
        </div>

        {/* Policy quota card */}
        {policy && summary && (
          <div className="mb-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <span className="text-sm font-semibold text-gray-800">Your WFH Quota</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* This week */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">This Week</span>
                  <span className={`text-xs font-semibold ${weekUsed >= weekMax ? "text-red-600" : "text-gray-700"}`}>
                    {weekUsed} / {weekMax}
                  </span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: weekMax }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full transition-colors ${
                        i < weekUsed
                          ? weekUsed >= weekMax ? "bg-red-400" : "bg-primary-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {/* This month */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">This Month</span>
                  <span className={`text-xs font-semibold ${monthUsed >= monthMax ? "text-red-600" : "text-gray-700"}`}>
                    {monthUsed} / {monthMax}
                  </span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(monthMax, 20) }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full transition-colors ${
                        i < monthUsed
                          ? monthUsed >= monthMax ? "bg-red-400" : "bg-primary-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
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

          {/* Main card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-base font-semibold text-gray-900">WFH Request</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select your dates and type — your manager will be notified for approval</p>
            </div>

            <div className="px-6 py-6 space-y-6">

              {/* Date range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="request_date" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="request_date"
                    name="request_date"
                    value={form.request_date}
                    onChange={handleChange}
                    className="input-field w-full"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Date
                    <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    min={form.request_date || undefined}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Duration pill */}
              {days > 0 && (
                <div className="-mt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {days} business {days === 1 ? "day" : "days"} selected
                  </span>
                </div>
              )}

              {/* WFH Type */}
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">
                  WFH Type <span className="text-red-500">*</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "full_day", label: "Full Day", icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636" />
                      </svg>
                    )},
                    { value: "first_half", label: "First Half", icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )},
                    { value: "second_half", label: "Second Half", icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                      </svg>
                    )},
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, wfh_type: value }))}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all ${
                        form.wfh_type === value
                          ? "border-primary-600 bg-primary-50 text-primary-700 shadow-sm"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason
                  <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={3}
                  className="input-field w-full resize-none"
                  placeholder="E.g., Internet installation at home, doctor visit in the afternoon…"
                />
              </div>

            </div>

            {/* Card footer — actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
              <button type="button" onClick={() => router.back()} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2 px-6"
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
