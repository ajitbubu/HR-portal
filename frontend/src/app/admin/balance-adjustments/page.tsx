"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Employee, EmployeeList, LeaveType, LeaveBalance } from "@/types";

export default function BalanceAdjustmentsPage() {
  const currentYear = new Date().getFullYear();

  const { data: empData } = useApi<EmployeeList>("/employees?per_page=200");
  const { data: leaveTypes } = useApi<LeaveType[]>("/leave/types");

  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [year, setYear] = useState(String(currentYear));
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const { data: balances, refetch: refetchBalances } = useApi<LeaveBalance[]>(
    employeeId && year ? `/admin/leave-balance/${employeeId}?year=${year}` : null,
  );
  const currentBalance = balances?.find((b) => String(b.leave_type.id) === leaveTypeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !leaveTypeId || !year || !adjustment || !reason.trim()) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.post<{ message: string; new_adjusted: number }>("/admin/leave-balance/adjust", {
        employee_id: Number(employeeId),
        leave_type_id: Number(leaveTypeId),
        year: Number(year),
        adjustment: Number(adjustment),
        reason,
      });
      setSuccess(`${res.message}. New adjustment total: ${res.new_adjusted} days.`);
      setAdjustment("");
      setReason("");
      refetchBalances();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to adjust balance");
    } finally {
      setLoading(false);
    }
  };

  const employees = empData?.items ?? [];
  const adjNum = Number(adjustment);

  return (
    <DashboardLayout title="Balance Adjustments">
      <div className="max-w-2xl mx-auto">

        <div className="mb-5">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Admin Panel
          </Link>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-base font-semibold text-gray-900">Manual Leave Balance Override</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Correct balance discrepancies or grant exception days. Every adjustment is logged in the audit trail.
              </p>
            </div>

            <div className="px-6 py-6 space-y-5">

              {/* Employee + Year side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label htmlFor="adj-employee" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="adj-employee"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="input-field w-full"
                    required
                  >
                    <option value="">Select employee…</option>
                    {employees.map((emp: Employee) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="adj-year" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="adj-year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min="2020"
                    max="2030"
                    className="input-field w-full"
                    required
                  />
                </div>
              </div>

              {/* Leave Type */}
              <div>
                <label htmlFor="adj-leave-type" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="adj-leave-type"
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="input-field w-full"
                  required
                >
                  <option value="">Select leave type…</option>
                  {leaveTypes?.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
                  ))}
                </select>
              </div>

              {/* Current balance info */}
              {currentBalance && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Current Balance</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Entitled</p>
                      <p className="text-xl font-bold text-gray-900">{currentBalance.entitled}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Used</p>
                      <p className="text-xl font-bold text-orange-600">{currentBalance.used}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Remaining</p>
                      <p className="text-xl font-bold text-green-600">{currentBalance.remaining}</p>
                    </div>
                  </div>
                  {currentBalance.adjusted !== 0 && (
                    <p className="text-xs text-gray-400 mt-3 text-center border-t border-gray-200 pt-2">
                      Previous adjustments: {currentBalance.adjusted > 0 ? "+" : ""}{currentBalance.adjusted} days
                    </p>
                  )}
                </div>
              )}

              {/* Adjustment amount */}
              <div>
                <label htmlFor="adj-amount" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adjustment (days)
                  <span className="text-xs text-gray-400 font-normal ml-2">Use negative to deduct</span>
                </label>
                <input
                  id="adj-amount"
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  step="0.5"
                  placeholder="e.g. 2 or -1"
                  className="input-field w-full"
                  required
                />
                {adjustment && (
                  <p className={`text-xs mt-1.5 font-medium ${adjNum > 0 ? "text-green-600" : adjNum < 0 ? "text-red-600" : "text-gray-400"}`}>
                    {adjNum > 0 ? `+${adjNum} days will be added` : adjNum < 0 ? `${adjNum} days will be deducted` : "No change"}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="adj-reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="adj-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this adjustment is being made…"
                  className="input-field w-full resize-none"
                  required
                />
              </div>

            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2 px-6"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Saving…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
                    </svg>
                    Apply Adjustment
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
