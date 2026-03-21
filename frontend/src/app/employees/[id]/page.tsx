"use client";

import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Employee } from "@/types";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { data: emp, loading } = useApi<Employee>(`/employees/${id}`);

  if (loading) return <DashboardLayout title="Employee"><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div></DashboardLayout>;
  if (!emp) return <DashboardLayout title="Employee"><p className="text-gray-500">Employee not found</p></DashboardLayout>;

  const fields = [
    { label: "Employee ID", value: emp.employee_id },
    { label: "Full Name", value: `${emp.first_name} ${emp.last_name}` },
    { label: "Email", value: emp.email },
    { label: "Phone", value: emp.phone },
    { label: "Department", value: emp.department?.name },
    { label: "Designation", value: emp.designation?.title },
    { label: "Band", value: emp.band || emp.designation?.band },
    { label: "Location", value: emp.location?.name },
    { label: "Manager", value: emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : "None" },
    { label: "Employment Type", value: emp.employment_type.replace("_", " ") },
    { label: "Status", value: emp.status },
    { label: "Joining Date", value: emp.joining_date },
    { label: "Gender", value: emp.gender },
    { label: "Date of Birth", value: emp.date_of_birth },
    { label: "Address", value: [emp.address, emp.city, emp.state, emp.country].filter(Boolean).join(", ") },
  ];

  return (
    <DashboardLayout title={`${emp.first_name} ${emp.last_name}`}>
      <div className="max-w-4xl">
        <div className="card mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-2xl font-bold">
              {emp.first_name[0]}{emp.last_name[0]}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{emp.first_name} {emp.last_name}</h3>
              <p className="text-gray-500">{emp.designation?.title || "No Designation"} &middot; {emp.department?.name || "No Department"}</p>
              <span className={`badge mt-2 ${emp.status === "active" ? "badge-success" : "badge-gray"}`}>{emp.status}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-4">Employee Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{f.label}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{f.value || "-"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
