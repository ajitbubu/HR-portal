"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import type { Employee } from "@/types";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: emp } = useApi<Employee>(`/employees/${user?.employee_id}`, [user?.employee_id]);

  if (!emp) return <DashboardLayout title="My Profile"><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div></DashboardLayout>;

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-4xl">
        <div className="card mb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-3xl font-bold">
              {emp.first_name[0]}{emp.last_name[0]}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{emp.first_name} {emp.last_name}</h3>
              <p className="text-gray-500">{emp.designation?.title} &middot; {emp.department?.name}</p>
              <p className="text-sm text-gray-400 mt-1">{emp.employee_id} &middot; {emp.location?.name}</p>
              <span className={`badge mt-2 ${emp.status === "active" ? "badge-success" : "badge-gray"}`}>{emp.status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h4 className="font-semibold text-gray-900 mb-4">Personal Information</h4>
            <div className="space-y-3">
              {[
                ["Email", emp.email], ["Phone", emp.phone], ["Gender", emp.gender],
                ["Date of Birth", emp.date_of_birth], ["Address", emp.address],
                ["City", emp.city], ["Country", emp.country],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium capitalize">{(value as string) || "-"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h4 className="font-semibold text-gray-900 mb-4">Work Information</h4>
            <div className="space-y-3">
              {[
                ["Department", emp.department?.name], ["Designation", emp.designation?.title],
                ["Band", emp.band || emp.designation?.band], ["Employment Type", emp.employment_type?.replace("_", " ")],
                ["Joining Date", emp.joining_date],
                ["Manager", emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : "None"],
                ["Location", emp.location?.name],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium capitalize">{(value as string) || "-"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
