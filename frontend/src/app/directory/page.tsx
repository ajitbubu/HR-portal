"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Avatar from "@/components/ui/Avatar";
import { useApi } from "@/hooks/useApi";
import type { EmployeeList, Employee } from "@/types";

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const { data } = useApi<EmployeeList>(`/employees?q=${search}&per_page=100`, [search]);

  return (
    <DashboardLayout title="Employee Directory">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{data?.total || 0} team members</p>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-80"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.items?.map((emp: Employee) => (
          <Link
            key={emp.id}
            href={`/employees/${emp.id}`}
            className="card-interactive flex flex-col items-center text-center py-6 group"
          >
            <div className="transition-transform group-hover:scale-105 mb-3">
              <Avatar firstName={emp.first_name} lastName={emp.last_name} photoUrl={emp.profile_photo} size="xl" rounded="2xl" />
            </div>
            <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{emp.first_name} {emp.last_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{emp.designation?.title || "No designation"}</p>
            <p className="text-xs text-gray-400 mt-0.5">{emp.department?.name || "No department"}</p>
            <div className="flex items-center gap-1.5 mt-3">
              <span className={`badge text-[10px] ${emp.status === "active" ? "badge-success" : "badge-gray"}`}>{emp.status}</span>
              {emp.location?.name && <span className="badge badge-gray text-[10px]">{emp.location.name}</span>}
            </div>
            <p className="text-[11px] text-gray-400 mt-2 truncate w-full px-2">{emp.email}</p>
          </Link>
        ))}
      </div>

      {(!data?.items || data.items.length === 0) && (
        <div className="text-center py-20">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-gray-500 font-medium">No employees found</p>
          <p className="text-sm text-gray-400 mt-1">{search ? "Try a different search term" : "No employees in the system yet"}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
