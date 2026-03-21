"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Employee } from "@/types";

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2.5">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 capitalize">{value || "-"}</p>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { data: emp, loading } = useApi<Employee>(`/employees/${id}`);

  if (loading) return (
    <DashboardLayout title="Employee">
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    </DashboardLayout>
  );
  if (!emp) return (
    <DashboardLayout title="Employee">
      <div className="text-center py-20">
        <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
        <p className="text-gray-500">Employee not found</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title={`${emp.first_name} ${emp.last_name}`}>
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="relative mb-20">
          <div className="h-40 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-purple-700 overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute right-24 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
          </div>
          <div className="absolute -bottom-14 left-8 flex items-end gap-5">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-purple-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white">
              {emp.first_name[0]}{emp.last_name[0]}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-gray-900">{emp.first_name} {emp.last_name}</h2>
              <p className="text-gray-500 text-sm">{emp.designation?.title || "No Designation"} &middot; {emp.department?.name || "No Department"}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`badge ${emp.status === "active" ? "badge-success" : "badge-gray"}`}>{emp.status}</span>
                <span className="badge badge-info">{emp.employment_type?.replace("_", " ")}</span>
                <span className="badge badge-gray">{emp.employee_id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Contact & Personal */}
          <div className="space-y-6">
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-3">Contact</h4>
              <div className="divide-y divide-gray-50">
                <DetailItem label="Email" value={emp.email} />
                <DetailItem label="Phone" value={emp.phone} />
              </div>
            </div>

            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-3">Personal</h4>
              <div className="divide-y divide-gray-50">
                <DetailItem label="Gender" value={emp.gender} />
                <DetailItem label="Date of Birth" value={emp.date_of_birth} />
                <DetailItem label="Address" value={[emp.address, emp.city, emp.state, emp.country].filter(Boolean).join(", ")} />
                <DetailItem label="Zip Code" value={emp.zip_code} />
              </div>
            </div>

            {/* Manager */}
            {emp.manager && (
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-3">Reports To</h4>
                <Link href={`/employees/${emp.manager.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {emp.manager.first_name[0]}{emp.manager.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{emp.manager.first_name} {emp.manager.last_name}</p>
                    <p className="text-xs text-gray-500">{emp.manager.employee_id}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Right: Work Details */}
          <div className="lg:col-span-2">
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-4">Work Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div className="divide-y divide-gray-50">
                  <DetailItem label="Employee ID" value={emp.employee_id} />
                  <DetailItem label="Department" value={emp.department?.name} />
                  <DetailItem label="Designation" value={emp.designation?.title} />
                  <DetailItem label="Band" value={emp.band || emp.designation?.band} />
                </div>
                <div className="divide-y divide-gray-50">
                  <DetailItem label="Location" value={emp.location?.name} />
                  <DetailItem label="Employment Type" value={emp.employment_type?.replace("_", " ")} />
                  <DetailItem label="Status" value={emp.status} />
                  <DetailItem label="Joining Date" value={emp.joining_date} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
