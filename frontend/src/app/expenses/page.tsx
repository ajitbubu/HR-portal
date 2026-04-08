"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { ExpenseClaim } from "@/types";

const statusColors: Record<string, string> = {
  draft: "badge-gray", submitted: "badge-warning", approved: "badge-success",
  rejected: "badge-danger", reimbursed: "badge-success", partially_reimbursed: "badge-warning",
};

export default function ExpensesPage() {
  const { data } = useApi<{ items: ExpenseClaim[]; total: number }>("/expenses/claims/my");

  return (
    <DashboardLayout title="My Expenses">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500">{data?.total || 0} expense claims</p>
        <div className="flex gap-2">
          <Link href="/expenses/new" className="btn-primary">New Claim</Link>
          <Link href="/expenses/approvals" className="btn-secondary">Approvals</Link>
          <Link href="/expenses/reports" className="btn-secondary">Reports</Link>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead><tr className="text-left text-gray-500 border-b">
            <th className="pb-3">Title</th><th className="pb-3">Amount</th><th className="pb-3">Status</th><th className="pb-3">Submitted</th>
          </tr></thead>
          <tbody>
            {data?.items?.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-3 font-medium">{c.title}</td>
                <td>${c.total_amount.toFixed(2)} {c.currency}</td>
                <td><span className={`badge ${statusColors[c.status] || "badge-gray"}`}>{c.status}</span></td>
                <td className="text-gray-500">{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
