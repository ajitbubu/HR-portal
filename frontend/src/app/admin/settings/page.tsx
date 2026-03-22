"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";

interface Setting { id: number; key: string; value: string | null; category: string | null; description: string | null }

export default function SettingsPage() {
  const { data: settings } = useApi<Setting[]>("/admin/settings");

  const categories = Array.from(new Set(settings?.map((s) => s.category || "general")));

  return (
    <DashboardLayout title="Company Settings">
      {categories.map((cat) => (
        <div key={cat} className="card mb-6">
          <h4 className="font-semibold text-gray-900 mb-4 capitalize">{cat} Settings</h4>
          <div className="space-y-3">
            {settings?.filter((s) => (s.category || "general") === cat).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">{s.key}</p>
                  {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                </div>
                <p className="text-sm text-gray-900 font-mono">{s.value || "-"}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {(!settings || settings.length === 0) && (
        <div className="card text-center py-12"><p className="text-gray-500">No settings configured</p></div>
      )}
    </DashboardLayout>
  );
}
