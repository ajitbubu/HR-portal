"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/tables/DataTable";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import type { EmployeeList, Employee } from "@/types";

export default function EmployeesPage() {
  const router = useRouter();
  const { isRole } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({ page: String(page), per_page: "20" });
  if (search) queryParams.set("q", search);
  if (statusFilter) queryParams.set("status", statusFilter);

  const { data, loading } = useApi<EmployeeList>(`/employees?${queryParams}`, [search, statusFilter, page]);

  const columns = [
    { key: "employee_id", label: "ID", render: (e: Employee) => <span className="font-mono text-xs">{e.employee_id}</span> },
    { key: "name", label: "Name", render: (e: Employee) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-medium">
          {e.first_name[0]}{e.last_name[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900">{e.first_name} {e.last_name}</p>
          <p className="text-xs text-gray-500">{e.email}</p>
        </div>
      </div>
    )},
    { key: "department", label: "Department", render: (e: Employee) => e.department?.name || "-" },
    { key: "designation", label: "Designation", render: (e: Employee) => e.designation?.title || "-" },
    { key: "location", label: "Location", render: (e: Employee) => e.location?.name || "-" },
    { key: "status", label: "Status", render: (e: Employee) => (
      <span className={`badge ${e.status === "active" ? "badge-success" : e.status === "on_leave" ? "badge-warning" : "badge-gray"}`}>
        {e.status}
      </span>
    )},
    { key: "employment_type", label: "Type", render: (e: Employee) => (
      <span className="text-xs capitalize">{e.employment_type.replace("_", " ")}</span>
    )},
  ];

  return (
    <DashboardLayout title="Employees">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field max-w-[150px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
        {isRole("super_admin", "hr_admin") && (
          <button onClick={() => router.push("/employees/new")} className="btn-primary">
            Add Employee
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <>
          <DataTable
            columns={columns as never}
            data={(data?.items || []) as never}
            onRowClick={(e) => router.push(`/employees/${(e as {id: number}).id}`)}
          />
          {data && data.total > data.per_page && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-500">Showing {data.items.length} of {data.total} employees</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary text-xs">Previous</button>
                <button onClick={() => setPage(page + 1)} disabled={page * data.per_page >= data.total} className="btn-secondary text-xs">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
