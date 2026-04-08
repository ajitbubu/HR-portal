"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";

interface Policy {
  id: number;
  mode: string;
  fixed_approver_id: number | null;
  fixed_approver_name: string | null;
  department_id: number | null;
  department_name: string | null;
  name: string | null;
  is_active: boolean;
}

interface Department {
  id: number;
  name: string;
}

interface EligibleApprover {
  id: number;
  name: string;
  designation: string | null;
  department: string | null;
}

const MODES = [
  {
    value: "employee_choice",
    label: "Employee's Choice",
    description: "Employee picks an optional first approver from a dropdown on each leave request.",
    icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  },
  {
    value: "disabled",
    label: "Disabled",
    description: "First approver field is hidden. Requests go directly to the standard approval chain.",
    icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  },
  {
    value: "fixed",
    label: "Fixed Person",
    description: "All requests always route to a specific person as first approver — no employee choice.",
    icon: "M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z",
  },
  {
    value: "manager",
    label: "Reporting Manager",
    description: "First step is always the employee's reporting manager (auto-resolved, no selection needed).",
    icon: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  },
  {
    value: "department_head",
    label: "Department Head",
    description: "First step routes to the head of the employee's department (must be configured per department).",
    icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21",
  },
];

const emptyForm = {
  mode: "employee_choice",
  fixed_approver_id: "",
  department_id: "",
  name: "",
};

export default function FirstApproverConfigPage() {
  const { data: policies, refetch } = useApi<Policy[]>("/admin/first-approver-policies");
  const { data: departments } = useApi<Department[]>("/admin/departments");
  const { data: approvers } = useApi<EligibleApprover[]>("/leave/eligible-first-approvers");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSaveError("");
    setShowForm(true);
  };

  const openEdit = (p: Policy) => {
    setEditingId(p.id);
    setForm({
      mode: p.mode,
      fixed_approver_id: p.fixed_approver_id ? String(p.fixed_approver_id) : "",
      department_id: p.department_id ? String(p.department_id) : "",
      name: p.name ?? "",
    });
    setSaveError("");
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setSaveError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const payload = {
      mode: form.mode,
      fixed_approver_id: form.fixed_approver_id ? parseInt(form.fixed_approver_id) : null,
      department_id: form.department_id ? parseInt(form.department_id) : null,
      name: form.name || null,
    };
    try {
      if (editingId) {
        await api.put(`/admin/first-approver-policies/${editingId}`, payload);
      } else {
        await api.post("/admin/first-approver-policies", payload);
      }
      setShowForm(false);
      setEditingId(null);
      refetch();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string | null) => {
    if (!confirm(`Delete policy "${name ?? "this policy"}"?`)) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/first-approver-policies/${id}`);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const modeLabel = (mode: string) => MODES.find((m) => m.value === mode)?.label ?? mode;
  const modeIcon = (mode: string) => MODES.find((m) => m.value === mode)?.icon ?? "";

  const modeBadgeClass = (mode: string) => {
    switch (mode) {
      case "disabled": return "badge-gray";
      case "employee_choice": return "badge-primary";
      case "fixed": return "badge-warning";
      case "manager": return "badge-success";
      case "department_head": return "badge-success";
      default: return "badge-gray";
    }
  };

  const globalPolicy = policies?.find((p) => !p.department_id);
  const deptPolicies = policies?.filter((p) => !!p.department_id) ?? [];

  return (
    <DashboardLayout title="First Approver Configuration">
      <div className="mb-5">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Admin Panel
        </Link>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">First Approver Policies</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Control how the optional first-level approver is determined on leave requests.
          </p>
        </div>
        <button
          type="button"
          onClick={showForm ? cancelForm : openCreate}
          className={showForm ? "btn-secondary" : "btn-primary"}
        >
          {showForm ? "Cancel" : "+ Add Policy"}
        </button>
      </div>

      {/* Mode legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {MODES.map((m) => (
          <div key={m.value} className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-gray-100 shadow-xs">
            <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">{m.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{m.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h4 className="text-sm font-semibold text-gray-900">
              {editingId ? "Edit Policy" : "New Policy"}
            </h4>
          </div>
          <form onSubmit={handleSave} noValidate className="px-6 py-5 space-y-5">
            {saveError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {saveError}
              </div>
            )}

            {/* Mode selector */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Mode <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {MODES.map((m) => (
                  <label
                    key={m.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                      form.mode === m.value
                        ? "border-primary-400 bg-primary-50 ring-1 ring-primary-300"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={m.value}
                      checked={form.mode === m.value}
                      onChange={() => setForm({ ...form, mode: m.value, fixed_approver_id: "" })}
                      className="sr-only"
                    />
                    <svg className={`w-4 h-4 flex-shrink-0 ${form.mode === m.value ? "text-primary-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                    </svg>
                    <span className={`text-xs font-medium ${form.mode === m.value ? "text-primary-700" : "text-gray-600"}`}>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Policy name */}
              <div>
                <label htmlFor="policy-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Policy Name <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <input
                  id="policy-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="e.g. Engineering Global Policy"
                />
              </div>

              {/* Department scope */}
              <div>
                <label htmlFor="policy-dept" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Scope to Department <span className="text-gray-400 text-xs font-normal">(blank = global)</span>
                </label>
                <select
                  id="policy-dept"
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Global (all departments)</option>
                  {departments?.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fixed approver — only shown when mode=fixed */}
            {form.mode === "fixed" && (
              <div>
                <label htmlFor="policy-approver" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fixed Approver <span className="text-red-500">*</span>
                </label>
                <select
                  id="policy-approver"
                  value={form.fixed_approver_id}
                  onChange={(e) => setForm({ ...form, fixed_approver_id: e.target.value })}
                  className="input-field w-full"
                  required
                >
                  <option value="">Select approver…</option>
                  {approvers?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.designation ? ` — ${a.designation}` : ""}{a.department ? ` (${a.department})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Saving…</>
                ) : (editingId ? "Save Changes" : "Create Policy")}
              </button>
              <button type="button" onClick={cancelForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Global policy card */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Global Policy</h4>
        {globalPolicy ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={modeIcon(globalPolicy.mode)} />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{globalPolicy.name ?? "Global Policy"}</p>
                  <span className={`badge mt-1 ${modeBadgeClass(globalPolicy.mode)}`}>{modeLabel(globalPolicy.mode)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {globalPolicy.fixed_approver_name && (
                  <span className="text-xs text-gray-500">
                    Approver: <span className="font-medium text-gray-700">{globalPolicy.fixed_approver_name}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(globalPolicy)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(globalPolicy.id, globalPolicy.name)}
                  disabled={deleting === globalPolicy.id}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-40"
                >
                  {deleting === globalPolicy.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 text-center py-8">
            <svg className="w-9 h-9 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No global policy set</p>
            <p className="text-xs text-gray-400 mt-1">
              Without a policy, employees can optionally pick a first approver on each leave request.
            </p>
          </div>
        )}
      </div>

      {/* Department-specific overrides */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Department Overrides ({deptPolicies.length})
        </h4>
        {deptPolicies.length > 0 ? (
          <div className="space-y-3">
            {deptPolicies.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={modeIcon(p.mode)} />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{p.name ?? p.department_name ?? "Department Policy"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge ${modeBadgeClass(p.mode)}`}>{modeLabel(p.mode)}</span>
                        {p.department_name && (
                          <span className="badge badge-gray">{p.department_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {p.fixed_approver_name && (
                      <span className="text-xs text-gray-500">
                        Approver: <span className="font-medium text-gray-700">{p.fixed_approver_name}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deleting === p.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-40"
                    >
                      {deleting === p.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">
            No department-specific overrides. The global policy (or default employee choice) applies to all departments.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
