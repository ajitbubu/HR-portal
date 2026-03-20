"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import type { SalaryRecord } from "@/types";

export default function SalaryPage() {
  const { user } = useAuth();
  const { data: records } = useApi<SalaryRecord[]>(`/salary/history/${user?.employee_id}`, [user?.employee_id]);

  return (
    <DashboardLayout title="Salary History">
      <div className="max-w-4xl">
        {records && records.length > 0 ? (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {records.map((r, i) => (
                <div key={r.id} className="relative flex gap-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${i === 0 ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className={`card flex-1 ${i === 0 ? "border-primary-200" : ""}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{r.currency} {r.total.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Effective: {r.effective_date}</p>
                      </div>
                      {i === 0 && <span className="badge badge-success">Current</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                      <div><p className="text-gray-400 text-xs">Base Pay</p><p className="font-medium">{r.currency} {r.base_pay.toLocaleString()}</p></div>
                      <div><p className="text-gray-400 text-xs">Bonus</p><p className="font-medium">{r.currency} {r.bonus.toLocaleString()}</p></div>
                      <div><p className="text-gray-400 text-xs">Allowance</p><p className="font-medium">{r.currency} {r.allowance.toLocaleString()}</p></div>
                      <div><p className="text-gray-400 text-xs">Deduction</p><p className="font-medium">{r.currency} {r.deduction.toLocaleString()}</p></div>
                    </div>
                    {r.reason && <p className="text-xs text-gray-500 mt-3">Reason: {r.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card text-center py-12"><p className="text-gray-500">No salary history available</p></div>
        )}
      </div>
    </DashboardLayout>
  );
}
