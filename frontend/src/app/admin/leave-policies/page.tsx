"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { LeaveType } from "@/types";

export default function LeavePoliciesPage() {
  const { data: leaveTypes, refetch } = useApi<LeaveType[]>("/admin/leave-types");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", default_days: 0, is_paid: true,
    carry_forward: false, max_carry_forward_days: 0,
    requires_document: false, description: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/admin/leave-types", form);
    setShowForm(false);
    setForm({ name: "", code: "", default_days: 0, is_paid: true, carry_forward: false, max_carry_forward_days: 0, requires_document: false, description: "" });
    refetch();
  };

  return (
    <DashboardLayout title="Leave Policies">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Leave Types & Policies</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">Add Leave Type</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Days</label>
              <input type="number" value={form.default_days} onChange={(e) => setForm({ ...form, default_days: parseFloat(e.target.value) })} className="input-field" />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} className="rounded" /><span className="text-sm">Paid Leave</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.carry_forward} onChange={(e) => setForm({ ...form, carry_forward: e.target.checked })} className="rounded" /><span className="text-sm">Carry Forward</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.requires_document} onChange={(e) => setForm({ ...form, requires_document: e.target.checked })} className="rounded" /><span className="text-sm">Requires Document</span></label>
          </div>
          <button type="submit" className="btn-primary">Create Leave Type</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaveTypes?.map((lt) => (
          <div key={lt.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-gray-900">{lt.name}</h4>
                <p className="text-xs text-gray-500 font-mono">{lt.code}</p>
              </div>
              <span className={`badge ${lt.is_active ? "badge-success" : "badge-gray"}`}>{lt.is_active ? "Active" : "Inactive"}</span>
            </div>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>Default Days: <span className="font-medium">{lt.default_days}</span></p>
              <p>Paid: <span className="font-medium">{lt.is_paid ? "Yes" : "No"}</span></p>
              <p>Carry Forward: <span className="font-medium">{lt.carry_forward ? `Yes (max ${lt.max_carry_forward_days})` : "No"}</span></p>
              <p>Requires Doc: <span className="font-medium">{lt.requires_document ? "Yes" : "No"}</span></p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
