"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/tables/DataTable";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Team, Department } from "@/types";

export default function TeamsPage() {
  const { data, refetch } = useApi<Team[]>("/admin/teams");
  const { data: departments } = useApi<Department[]>("/admin/departments");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", department_id: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/admin/teams", {
        name: form.name,
        department_id: form.department_id ? parseInt(form.department_id) : null,
      });
      setForm({ name: "", department_id: "" });
      setShowForm(false);
      refetch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this team?")) return;
    await api.delete(`/admin/teams/${id}`);
    refetch();
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Team Name" },
    { key: "department", label: "Department", render: (t: Team & { department?: { name: string } }) => t.department?.name || "—" },
    { key: "actions", label: "Actions", render: (t: Team) => (
      <button type="button" onClick={() => handleDelete(t.id)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Delete</button>
    )},
  ];

  return (
    <DashboardLayout title="Team Management">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Teams</h3>
          <p className="text-xs text-gray-500 mt-0.5">{data?.length ?? 0} teams configured</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className={showForm ? "btn-secondary" : "btn-primary"}
        >
          {showForm ? "Cancel" : "+ Add Team"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
            <h4 className="text-sm font-semibold text-gray-900">New Team</h4>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="team-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="e.g. Frontend"
                  required
                />
              </div>
              <div>
                <label htmlFor="team-dept" className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                <select
                  id="team-dept"
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Select department…</option>
                  {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Saving…</>
                ) : "Save Team"}
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
