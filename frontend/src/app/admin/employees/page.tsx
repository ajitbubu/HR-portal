"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { EmployeeList, Employee } from "@/types";

export default function AdminEmployeesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deactivating, setDeactivating] = useState<number | null>(null);
  const [error, setError] = useState("");

  const queryParams = new URLSearchParams({ page: String(page), per_page: "20" });
  if (search) queryParams.set("q", search);
  if (statusFilter) queryParams.set("status", statusFilter);

  const { data, refetch } = useApi<EmployeeList>(`/employees?${queryParams}`, [search, statusFilter, page]);

  const handleDeactivate = async (emp: Employee) => {
    if (!confirm(`Deactivate ${emp.first_name} ${emp.last_name} (${emp.employee_id})? This will revoke their access.`)) return;
    setDeactivating(emp.id);
    setError("");
    try {
      await api.delete(`/employees/${emp.id}`);
      refetch?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setDeactivating(null);
    }
  };

  const employees = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const ET_LABEL: Record<string, string> = {
    full_time: "Full Time", part_time: "Part Time", contractor: "Contractor", intern: "Intern",
  };

  return (
    <DashboardLayout title="Employee Management">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-primary-600 hover:underline">← Admin Panel</Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <input
            type="text"
            placeholder="Search by name, email, or ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field max-w-xs"
          />
          <select
            title="Filter by status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-36"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/employees/import" className="btn-secondary text-sm">Bulk Import CSV</Link>
          <Link href="/employees/new" className="btn-primary text-sm">+ Add Employee</Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase">Manager</th>
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-medium flex-shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{emp.employee_id} &middot; {emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-600">{emp.department?.name || <span className="text-gray-300">—</span>}</td>
                <td className="py-3 pr-4 text-gray-600">
                  {emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-4 text-gray-600">{ET_LABEL[emp.employment_type] || emp.employment_type}</td>
                <td className="py-3 pr-4 text-gray-500 text-xs">{emp.joining_date}</td>
                <td className="py-3 pr-4">
                  <span className={`badge ${
                    emp.status === "active" ? "badge-success" :
                    emp.status === "on_leave" ? "badge-warning" : "badge-gray"
                  }`}>{emp.status}</span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/employees/${emp.id}`} className="text-xs text-primary-600 hover:underline font-medium">Edit</Link>
                    {emp.status !== "inactive" && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(emp)}
                        disabled={deactivating === emp.id}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        {deactivating === emp.id ? "…" : "Deactivate"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No employees found</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-500">{total} total employees</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Previous</button>
            <span className="px-3 py-1.5 text-gray-600">Page {page} of {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
