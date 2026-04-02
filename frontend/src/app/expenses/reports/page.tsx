"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";

interface ExpenseSummary {
  category: string;
  total_amount: number;
  claim_count: number;
}

export default function ExpenseReportsPage() {
  const { data: summary } = useApi<ExpenseSummary[]>("/expenses/reports/summary");

  return (
    <DashboardLayout title="Expense Reports">
      <div className="card">
        <h3 className="font-medium mb-4">Expense Summary by Category</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b">
            <th className="pb-3">Category</th><th className="pb-3">Total Amount</th><th className="pb-3">Claims</th>
          </tr></thead>
          <tbody>
            {summary?.map((s, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-3 font-medium">{s.category}</td>
                <td>${s.total_amount.toFixed(2)}</td>
                <td>{s.claim_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!summary || summary.length === 0) && (
          <p className="text-center text-gray-500 py-8">No expense data available</p>
        )}
      </div>
    </DashboardLayout>
  );
}
