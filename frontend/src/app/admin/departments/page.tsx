"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/tables/DataTable";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Department } from "@/types";

export default function DepartmentsPage() {
  const { data, refetch } = useApi<Department[]>("/admin/departments");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/admin/departments", form);
      setForm({ name: "", code: "", description: "" });
      setShowForm(false);
      refetch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this department?")) return;
    await api.delete(`/admin/departments/${id}`);
    refetch();
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "description", label: "Description", render: (d: Department) => d.description || "—" },
    { key: "actions", label: "Actions", render: (d: Department) => (
      <button type="button" onClick={() => handleDelete(d.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
        Delete
      </button>
    )},
  ];

  return (
    <DashboardLayout title="Department Management">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Departments</h3>
          <p className="text-xs text-gray-500 mt-0.5">{data?.length ?? 0} departments configured</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className={showForm ? "btn-secondary" : "btn-primary"}
        >
          {showForm ? "Cancel" : "+ Add Department"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
            <h4 className="text-sm font-semibold text-gray-900">New Department</h4>
          </div>
          <form onSubmit={handleCreate} noValidate className="px-5 py-4">
            {error && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="col-span-1">
                <label htmlFor="dept-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="dept-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="e.g. Engineering"
                  required
                />
              </div>
              <div>
                <label htmlFor="dept-code" className="block text-sm font-medium text-gray-700 mb-1.5">Code</label>
                <input
                  id="dept-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="input-field w-full font-mono uppercase"
                  placeholder="ENG"
                />
              </div>
              <div>
                <label htmlFor="dept-desc" className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <input
                  id="dept-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field w-full"
                  placeholder="Optional…"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Saving…</>
                ) : "Save Department"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <DataTable columns={columns as never} data={(data || []) as never} />
    </DashboardLayout>
  );
}
