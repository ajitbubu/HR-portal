"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";

export default function OnboardingPage() {
  return (
    <DashboardLayout title="Onboarding & Offboarding">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-4">Onboarding Workflow</h4>
          <p className="text-sm text-gray-500 mb-4">Manage new hire onboarding tasks and checklists.</p>
          <div className="space-y-3">
            {["IT Setup & Equipment", "HR Documentation", "Team Introduction", "Training Schedule", "System Access Setup"].map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  <span className="text-xs text-gray-400">{i + 1}</span>
                </div>
                <span className="text-sm text-gray-700">{task}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-4">Offboarding Workflow</h4>
          <p className="text-sm text-gray-500 mb-4">Manage employee exit tasks and checklists.</p>
          <div className="space-y-3">
            {["Exit Interview", "Knowledge Transfer", "Equipment Return", "Access Revocation", "Final Settlement"].map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  <span className="text-xs text-gray-400">{i + 1}</span>
                </div>
                <span className="text-sm text-gray-700">{task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
