"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { EmployeeList, Employee } from "@/types";

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const { data } = useApi<EmployeeList>(`/employees?q=${search}&per_page=100`, [search]);

  return (
    <DashboardLayout title="Employee Directory">
      <div className="mb-6">
        <input
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.items?.map((emp: Employee) => (
          <div key={emp.id} className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium flex-shrink-0">
              {emp.first_name[0]}{emp.last_name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{emp.first_name} {emp.last_name}</p>
              <p className="text-xs text-gray-500 truncate">{emp.designation?.title || "-"}</p>
              <p className="text-xs text-gray-400 truncate">{emp.department?.name || "-"}</p>
              <p className="text-xs text-gray-400 truncate">{emp.email}</p>
            </div>
          </div>
        ))}
      </div>
      {(!data?.items || data.items.length === 0) && (
        <div className="card text-center py-12"><p className="text-gray-500">No employees found</p></div>
      )}
    </DashboardLayout>
  );
}
