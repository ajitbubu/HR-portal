"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Workflow } from "@/types";

export default function WorkflowsPage() {
  const { data: workflows } = useApi<Workflow[]>("/admin/workflows");

  const roleLabels: Record<string, string> = {
    manager: "Reporting Manager",
    department_head: "Department Head",
    hr_admin: "HR Admin",
    specific: "Specific Person",
  };

  return (
    <DashboardLayout title="Approval Workflows">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Approval Workflow Configuration</h3>
      </div>

      <div className="space-y-4">
        {workflows?.map((wf) => (
          <div key={wf.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">{wf.name}</h4>
                <div className="flex gap-2 mt-1">
                  {wf.is_default && <span className="badge badge-info">Default</span>}
                  <span className={`badge ${wf.is_active ? "badge-success" : "badge-gray"}`}>{wf.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <span className="text-sm text-gray-500">{wf.steps.length} step(s)</span>
            </div>

            <div className="flex items-center gap-2">
              {wf.steps.sort((a, b) => a.step_order - b.step_order).map((step, i) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div className="bg-primary-50 border border-primary-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-primary-500">Step {step.step_order}</p>
                    <p className="text-sm font-medium text-primary-700">{roleLabels[step.approver_role] || step.approver_role}</p>
                  </div>
                  {i < wf.steps.length - 1 && (
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!workflows || workflows.length === 0) && (
          <div className="card text-center py-12"><p className="text-gray-500">No workflows configured</p></div>
        )}
      </div>
    </DashboardLayout>
  );
}
