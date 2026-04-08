"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Candidate } from "@/types";

const statusColors: Record<string, string> = {
  applied: "badge-gray", screening: "badge-warning", interview: "badge-warning",
  offer: "badge-success", hired: "badge-success", rejected: "badge-danger", withdrawn: "badge-gray",
};

export default function CandidatesPage() {
  const { data } = useApi<{ items: Candidate[]; total: number }>("/recruitment/candidates");

  return (
    <DashboardLayout title="Candidates">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead><tr className="text-left text-gray-500 border-b">
            <th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Source</th><th className="pb-3">Status</th><th className="pb-3">Rating</th>
          </tr></thead>
          <tbody>
            {data?.items?.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-3 font-medium">{c.first_name} {c.last_name}</td>
                <td className="text-gray-500">{c.email}</td>
                <td className="capitalize">{c.source || "-"}</td>
                <td><span className={`badge ${statusColors[c.status] || "badge-gray"}`}>{c.status}</span></td>
                <td>{c.rating ? `${c.rating}/5` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
