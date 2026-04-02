"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { ExpenseClaim } from "@/types";

export default function ExpenseApprovalsPage() {
  const { data: pending, refetch } = useApi<ExpenseClaim[]>("/expenses/claims/pending-approval");

  const handleAction = async (id: number, action: string) => {
    try {
      await api.post(`/expenses/claims/${id}/action`, { action });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    }
  };

  return (
    <DashboardLayout title="Expense Approvals">
      {pending && pending.length > 0 ? (
        <div className="space-y-4">
          {pending.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{c.title}</h4>
                  <p className="text-sm text-gray-500">Employee #{c.employee_id} | ${c.total_amount.toFixed(2)} {c.currency}</p>
                  {c.description && <p className="text-sm text-gray-600 mt-1">{c.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(c.id, "approve")} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Approve</button>
                  <button onClick={() => handleAction(c.id, "reject")} className="btn-danger">Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12"><p className="text-gray-500">No pending expense approvals</p></div>
      )}
    </DashboardLayout>
  );
}
