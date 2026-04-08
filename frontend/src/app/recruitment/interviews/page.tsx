"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Interview } from "@/types";

export default function InterviewsPage() {
  const { data: interviews } = useApi<Interview[]>("/recruitment/interviews");

  return (
    <DashboardLayout title="Interviews">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead><tr className="text-left text-gray-500 border-b">
            <th className="pb-3">Candidate</th><th className="pb-3">Type</th><th className="pb-3">Scheduled</th><th className="pb-3">Duration</th><th className="pb-3">Status</th><th className="pb-3">Rating</th>
          </tr></thead>
          <tbody>
            {interviews?.map((iv) => (
              <tr key={iv.id} className="border-b border-gray-50">
                <td className="py-3">Candidate #{iv.candidate_id}</td>
                <td className="capitalize">{iv.interview_type}</td>
                <td>{new Date(iv.scheduled_at).toLocaleString()}</td>
                <td>{iv.duration_minutes} min</td>
                <td><span className={`badge ${iv.status === "completed" ? "badge-success" : iv.status === "cancelled" ? "badge-danger" : "badge-warning"}`}>{iv.status}</span></td>
                <td>{iv.rating ? `${iv.rating}/5` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
