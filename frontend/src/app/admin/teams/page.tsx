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
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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
    { key: "department", label: "Department", render: (t: Team & { department?: { name: string } }) => t.department?.name || "-" },
    { key: "actions", label: "Actions", render: (t: Team) => (
      <button type="button" onClick={() => handleDelete(t.id)} className="text-xs text-red-600 hover:underline">Delete</button>
    )},
  ];

  return (
    <DashboardLayout title="Team Management">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Teams</h3>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary">Add Team</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 flex gap-4 items-end">
          {error && <p className="text-red-600 text-sm w-full">{error}</p>}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
            <input title="Team Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select title="Department" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="input-field">
              <option value="">Select Department</option>
              {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary">Save</button>
          <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
        </form>
      )}

      <DataTable columns={columns as never} data={(data || []) as never} />
    </DashboardLayout>
  );
}
