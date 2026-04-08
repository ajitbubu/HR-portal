"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";

interface ComplianceAssignment {
  id: number;
  employee_id: number;
  course_id: number;
  due_date: string;
  status: string;
  completed_at?: string;
}

export default function CompliancePage() {
  const { data: assignments } = useApi<ComplianceAssignment[]>("/training/compliance/report");

  return (
    <DashboardLayout title="Compliance Training">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead><tr className="text-left text-gray-500 border-b">
            <th className="pb-3">Employee</th><th className="pb-3">Course</th><th className="pb-3">Due Date</th><th className="pb-3">Status</th>
          </tr></thead>
          <tbody>
            {assignments?.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="py-3">Employee #{a.employee_id}</td>
                <td>Course #{a.course_id}</td>
                <td>{a.due_date}</td>
                <td><span className={`badge ${a.status === "completed" ? "badge-success" : a.status === "overdue" ? "badge-danger" : "badge-warning"}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
