"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { LeaveType } from "@/types";

interface EditForm {
  name: string; code: string; default_days: number; is_paid: boolean;
  carry_forward: boolean; max_carry_forward_days: number;
  requires_document: boolean; min_days_notice: number; description: string;
}

const emptyForm: EditForm = {
  name: "", code: "", default_days: 0, is_paid: true,
  carry_forward: false, max_carry_forward_days: 0,
  requires_document: false, min_days_notice: 0, description: "",
};

function toEditForm(lt: LeaveType): EditForm {
  return {
    name: lt.name, code: lt.code, default_days: lt.default_days,
    is_paid: lt.is_paid, carry_forward: lt.carry_forward,
    max_carry_forward_days: lt.max_carry_forward_days,
    requires_document: lt.requires_document,
    min_days_notice: 0, description: "",
  };
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" aria-label={label} />
        <div className="w-9 h-5 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export default function LeavePoliciesPage() {
  const { data: leaveTypes, refetch } = useApi<LeaveType[]>("/admin/leave-types");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const startEdit = (lt: LeaveType) => { setEditingId(lt.id); setForm(toEditForm(lt)); setSaveError(""); };
  const cancelEdit = () => { setEditingId(null); setSaveError(""); };

  const handleSave = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      await api.put(`/admin/leave-types/${id}`, form);
      setEditingId(null);
      refetch();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      await api.post("/admin/leave-types", form);
      setShowCreate(false);
      setForm(emptyForm);
      refetch();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string, onCancel: () => void) => (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {saveError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {saveError}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lt-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="lt-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field w-full"
            placeholder="e.g. Annual Leave"
            required
          />
        </div>
        <div>
          <label htmlFor="lt-code" className="block text-sm font-medium text-gray-700 mb-1.5">
            Code <span className="text-red-500">*</span>
          </label>
          <input
            id="lt-code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="input-field w-full font-mono"
            placeholder="AL"
            required
            maxLength={6}
          />
        </div>
        <div>
          <label htmlFor="lt-days" className="block text-sm font-medium text-gray-700 mb-1.5">Default Days / Year</label>
          <input
            id="lt-days"
            type="number"
            step="0.5"
            min="0"
            value={form.default_days}
            onChange={(e) => setForm({ ...form, default_days: parseFloat(e.target.value) })}
            className="input-field w-full"
          />
        </div>
        <div>
          <label htmlFor="lt-notice" className="block text-sm font-medium text-gray-700 mb-1.5">Min Notice (days)</label>
          <input
            id="lt-notice"
            type="number"
            min="0"
            value={form.min_days_notice}
            onChange={(e) => setForm({ ...form, min_days_notice: parseInt(e.target.value) })}
            className="input-field w-full"
          />
        </div>
        <div className={form.carry_forward ? "" : "opacity-40 pointer-events-none"}>
          <label htmlFor="lt-cf" className="block text-sm font-medium text-gray-700 mb-1.5">Max Carry-Forward Days</label>
          <input
            id="lt-cf"
            type="number"
            step="0.5"
            min="0"
            value={form.max_carry_forward_days}
            onChange={(e) => setForm({ ...form, max_carry_forward_days: parseFloat(e.target.value) })}
            className="input-field w-full"
            disabled={!form.carry_forward}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <Toggle label="Paid Leave" checked={form.is_paid} onChange={(v) => setForm({ ...form, is_paid: v })} />
        <Toggle label="Carry Forward" checked={form.carry_forward} onChange={(v) => setForm({ ...form, carry_forward: v })} />
        <Toggle label="Requires Document" checked={form.requires_document} onChange={(v) => setForm({ ...form, requires_document: v })} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? (
            <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Saving…</>
          ) : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );

  return (
    <DashboardLayout title="Leave Policies">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Leave Types & Policies</h3>
          <p className="text-xs text-gray-500 mt-0.5">{leaveTypes?.length ?? 0} leave types configured</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreate(!showCreate); setForm(emptyForm); setSaveError(""); }}
          className={showCreate ? "btn-secondary" : "btn-primary"}
        >
          {showCreate ? "Cancel" : "+ Add Leave Type"}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h4 className="text-sm font-semibold text-gray-900">New Leave Type</h4>
          </div>
          <div className="px-6 py-5">
            {renderForm(handleCreate, "Create Leave Type", () => setShowCreate(false))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaveTypes?.map((lt) => (
          <div key={lt.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {editingId === lt.id ? (
              <>
                <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                  <h4 className="text-sm font-semibold text-gray-900">Editing: {lt.name}</h4>
                </div>
                <div className="px-5 py-4">
                  {renderForm((e) => handleSave(e, lt.id), "Save Changes", cancelEdit)}
                </div>
              </>
            ) : (
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{lt.name}</h4>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{lt.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${lt.is_active ? "badge-success" : "badge-gray"}`}>
                      {lt.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(lt)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Default days</span>
                    <span className="font-medium text-gray-800">{lt.default_days}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Paid</span>
                    <span className={`font-medium ${lt.is_paid ? "text-green-600" : "text-gray-500"}`}>{lt.is_paid ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Carry forward</span>
                    <span className="font-medium text-gray-800">{lt.carry_forward ? `Yes (max ${lt.max_carry_forward_days}d)` : "No"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Requires doc</span>
                    <span className={`font-medium ${lt.requires_document ? "text-amber-600" : "text-gray-500"}`}>{lt.requires_document ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
