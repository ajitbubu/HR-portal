"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { ProjectList } from "@/types";

export default function ProjectsPage() {
  const { data } = useApi<ProjectList>("/timesheets/projects");

  return (
    <DashboardLayout title="Projects">
      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b">
            <th className="pb-3">Code</th><th className="pb-3">Name</th><th className="pb-3">Client</th><th className="pb-3">Status</th><th className="pb-3">Budget</th><th className="pb-3">Billable</th>
          </tr></thead>
          <tbody>
            {data?.items?.map((p) => (
              <tr key={p.id} className="border-b border-gray-50">
                <td className="py-3 font-mono text-primary-600">{p.code}</td>
                <td className="font-medium">{p.name}</td>
                <td className="text-gray-500">{p.client || "-"}</td>
                <td><span className={`badge ${p.status === "active" ? "badge-success" : p.status === "completed" ? "badge-gray" : "badge-warning"}`}>{p.status}</span></td>
                <td>{p.budget_hours}h</td>
                <td>{p.is_billable ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
