"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { LeaveType, LeaveBalanceCheck } from "@/types";

export default function LeaveApplyPage() {
  const router = useRouter();
  const { data: leaveTypes } = useApi<LeaveType[]>("/leave/types");

  const [form, setForm] = useState({
    leave_type_id: "", start_date: "", end_date: "",
    is_half_day: false, half_day_type: "", reason: "",
  });
  const [balanceCheck, setBalanceCheck] = useState<LeaveBalanceCheck | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkBalance = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) return;
    try {
      const res = await api.get<LeaveBalanceCheck>(
        `/leave/balance-check?leave_type_id=${form.leave_type_id}&start_date=${form.start_date}&end_date=${form.end_date}&is_half_day=${form.is_half_day}`
      );
      setBalanceCheck(res);
    } catch {
      setBalanceCheck(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
            <select
              value={form.leave_type_id}
              onChange={(e) => { setForm({ ...form, leave_type_id: e.target.value }); setBalanceCheck(null); }}
              className="input-field"
              required
            >
              <option value="">Select Leave Type</option>
              {leaveTypes?.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input-field" required />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_half_day} onChange={(e) => setForm({ ...form, is_half_day: e.target.checked })} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Half Day</span>
            </label>
            {form.is_half_day && (
              <select value={form.half_day_type} onChange={(e) => setForm({ ...form, half_day_type: e.target.value })} className="input-field max-w-[200px]">
                <option value="">Select Half</option>
                <option value="first_half">First Half</option>
                <option value="second_half">Second Half</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input-field" rows={3} placeholder="Optional reason for leave..." />
          </div>

          <button type="button" onClick={checkBalance} className="btn-secondary text-sm">
            Check Balance
          </button>

          {balanceCheck && (
            <div className={`p-4 rounded-lg ${balanceCheck.sufficient ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <p className="text-sm font-medium">{balanceCheck.leave_type}</p>
              <p className="text-sm mt-1">Available: {balanceCheck.available} days | Requested: {balanceCheck.requested_days} days</p>
              <p className={`text-sm mt-1 ${balanceCheck.sufficient ? "text-green-700" : "text-red-700"}`}>{balanceCheck.message}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? "Submitting..." : "Submit Leave Request"}</button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
