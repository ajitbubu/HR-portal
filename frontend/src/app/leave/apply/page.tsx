"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { LeaveType, LeaveBalanceCheck } from "@/types";

interface EligibleApprover {
  id: number;
  name: string;
  designation: string | null;
  department: string | null;
}

interface FirstApproverConfig {
  mode: string; // disabled | employee_choice | fixed | manager | department_head
  fixed_approver_id: number | null;
  fixed_approver_name: string | null;
  eligible_approvers: EligibleApprover[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function calendarDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

export default function LeaveApplyPage() {
  const router = useRouter();
  const { data: leaveTypes } = useApi<LeaveType[]>("/leave/types");
  const { data: approverConfig } = useApi<FirstApproverConfig>("/leave/first-approver-config");

  const [form, setForm] = useState({
    leave_type_id: "", start_date: "", end_date: "",
    is_half_day: false, half_day_type: "", reason: "",
    first_approver_id: "",
  });
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [balanceCheck, setBalanceCheck] = useState<LeaveBalanceCheck | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedLeaveType = leaveTypes?.find((lt) => String(lt.id) === form.leave_type_id);
  const isSickLeave = selectedLeaveType?.code === "SL";
  const days = calendarDays(form.start_date, form.end_date);
  const needsCert = isSickLeave && !form.is_half_day && days > 2;

  const checkBalance = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) return;
    setBalanceLoading(true);
    try {
      const res = await api.get<LeaveBalanceCheck>(
        `/leave/balance-check?leave_type_id=${form.leave_type_id}&start_date=${form.start_date}&end_date=${form.end_date}&is_half_day=${form.is_half_day}`
      );
      setBalanceCheck(res);
    } catch {
      setBalanceCheck(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/leave/upload-attachment`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Upload failed");
      }
      const data: { path: string; original_name: string } = await res.json();
      setAttachmentPath(data.path);
      setAttachmentName(data.original_name);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setAttachmentPath(null);
      setAttachmentName(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsCert && !attachmentPath) {
      setError("A medical certificate is required for sick leave exceeding 2 consecutive days.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/leave/apply", {
        leave_type_id: parseInt(form.leave_type_id),
        start_date: form.start_date,
        end_date: form.end_date,
        is_half_day: form.is_half_day,
        half_day_type: form.half_day_type || null,
        reason: form.reason,
        attachment_path: attachmentPath,
        first_approver_id: form.first_approver_id ? parseInt(form.first_approver_id) : null,
      });
      router.push("/leave");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to apply leave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Apply Leave">
      <div className="max-w-2xl mx-auto">

        {/* Back breadcrumb */}
        <div className="mb-5">
          <Link href="/leave" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            My Leave
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
              <h2 className="text-base font-semibold text-gray-900">Leave Request</h2>
              <p className="text-xs text-gray-500 mt-0.5">Fill in the details below and submit for approval</p>
            </div>

            <div className="px-6 py-6 space-y-6">

              {/* Leave Type */}
              <div>
                <label htmlFor="leave-type" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="leave-type"
                  value={form.leave_type_id}
                  onChange={(e) => {
                    setForm({ ...form, leave_type_id: e.target.value });
                    setBalanceCheck(null);
                    setAttachmentPath(null);
                    setAttachmentName(null);
                  }}
                  className="input-field w-full"
                  required
                >
                  <option value="">Select leave type…</option>
                  {leaveTypes?.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => { setForm({ ...form, start_date: e.target.value }); setBalanceCheck(null); }}
                    className="input-field w-full"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => { setForm({ ...form, end_date: e.target.value }); setBalanceCheck(null); }}
                    className="input-field w-full"
                    required
                  />
                </div>
              </div>

              {/* Duration pill */}
              {days > 0 && (
                <div className="flex items-center gap-2 -mt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {form.is_half_day ? "0.5" : days} {form.is_half_day ? "day" : days === 1 ? "day" : "days"} selected
                  </span>
                </div>
              )}

              {/* Half Day */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.is_half_day}
                      onChange={(e) => setForm({ ...form, is_half_day: e.target.checked, half_day_type: "" })}
                      className="sr-only peer"
                      aria-label="Half Day"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Half Day</span>
                </label>
                {form.is_half_day && (
                  <select
                    title="Half day type"
                    value={form.half_day_type}
                    onChange={(e) => setForm({ ...form, half_day_type: e.target.value })}
                    className="input-field flex-1"
                  >
                    <option value="">Select period…</option>
                    <option value="first_half">First Half (AM)</option>
                    <option value="second_half">Second Half (PM)</option>
                  </select>
                )}
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <textarea
                  id="reason"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="input-field w-full resize-none"
                  rows={3}
                  placeholder="Briefly describe the reason for your leave…"
                />
              </div>

              {/* First Approver — rendered based on configured policy */}
              {approverConfig && approverConfig.mode !== "disabled" && (
                <div>
                  {approverConfig.mode === "employee_choice" && (
                    <>
                      <label htmlFor="first-approver" className="block text-sm font-medium text-gray-700 mb-1.5">
                        First Approver <span className="text-gray-400 font-normal text-xs">(optional)</span>
                      </label>
                      <select
                        id="first-approver"
                        value={form.first_approver_id}
                        onChange={(e) => setForm({ ...form, first_approver_id: e.target.value })}
                        className="input-field w-full"
                      >
                        <option value="">Use default approval chain</option>
                        {approverConfig.eligible_approvers.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}{a.designation ? ` — ${a.designation}` : ""}{a.department ? ` (${a.department})` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs text-gray-400">
                        Select a manager to review before the standard approval chain.
                      </p>
                    </>
                  )}

                  {approverConfig.mode === "fixed" && approverConfig.fixed_approver_name && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-50 border border-primary-100">
                      <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-primary-800">First review by</p>
                        <p className="text-sm font-semibold text-primary-900">{approverConfig.fixed_approver_name}</p>
                      </div>
                    </div>
                  )}

                  {approverConfig.mode === "manager" && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                      <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-blue-800">First review by</p>
                        <p className="text-sm font-semibold text-blue-900">Your Reporting Manager</p>
                      </div>
                    </div>
                  )}

                  {approverConfig.mode === "department_head" && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-100">
                      <svg className="w-4 h-4 text-violet-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-violet-800">First review by</p>
                        <p className="text-sm font-semibold text-violet-900">Your Department Head</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Medical Certificate — SL > 2 days */}
              {needsCert && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Medical Certificate Required</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Sick leave over 2 consecutive days requires a medical certificate. Accepted: PDF, JPG, PNG (max 10 MB).
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Medical certificate upload"
                  />
                  {attachmentPath ? (
                    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-green-200">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-gray-700 flex-1 truncate">{attachmentName}</span>
                      <button
                        type="button"
                        onClick={() => { setAttachmentPath(null); setAttachmentName(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-60"
                    >
                      {uploading ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          Upload Medical Certificate
                        </>
                      )}
                    </button>
                  )}
                  {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
                </div>
              )}

              {/* Balance check */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={checkBalance}
                  disabled={!form.leave_type_id || !form.start_date || !form.end_date || balanceLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {balanceLoading ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                  ) : (
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  )}
                  Check Balance
                </button>

                {balanceCheck && (
                  <div className={`rounded-xl border px-4 py-3 ${balanceCheck.sufficient ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{balanceCheck.leave_type}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">Available: <span className="font-semibold text-gray-800">{balanceCheck.available}d</span></span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">Requested: <span className="font-semibold text-gray-800">{balanceCheck.requested_days}d</span></span>
                      </div>
                    </div>
                    <p className={`text-xs mt-1.5 font-medium ${balanceCheck.sufficient ? "text-green-700" : "text-red-700"}`}>
                      {balanceCheck.sufficient ? "✓ " : "✗ "}{balanceCheck.message}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Card footer — actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
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
