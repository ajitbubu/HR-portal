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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/admin/departments", form);
    setForm({ name: "", code: "", description: "" });
    setShowForm(false);
    refetch();
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
    { key: "description", label: "Description", render: (d: Department) => d.description || "-" },
    { key: "actions", label: "Actions", render: (d: Department) => (
      <button onClick={() => handleDelete(d.id)} className="text-xs text-red-600 hover:underline">Delete</button>
    )},
  ];

  return (
    <DashboardLayout title="Department Management">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Departments</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">Add Department</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-field" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
          </div>
          <button type="submit" className="btn-primary">Save</button>
        </form>
      )}

      <DataTable columns={columns} data={data || []} />
    </DashboardLayout>
  );
}
