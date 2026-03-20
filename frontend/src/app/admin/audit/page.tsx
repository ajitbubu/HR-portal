"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { AuditLog } from "@/types";

export default function AuditPage() {
  const { data: logs } = useApi<AuditLog[]>("/audit");

  return (
    <DashboardLayout title="Audit Logs">
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs?.map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 text-xs text-gray-500">{log.created_at ? new Date(log.created_at).toLocaleString() : "-"}</td>
                  <td className="py-2.5 text-sm">User #{log.user_id}</td>
                  <td className="py-2.5"><span className="badge badge-info">{log.action}</span></td>
                  <td className="py-2.5 text-sm">{log.entity_type} #{log.entity_id}</td>
                  <td className="py-2.5 text-xs text-gray-500 max-w-xs truncate">{log.new_values || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!logs || logs.length === 0) && (
          <p className="text-sm text-gray-500 text-center py-8">No audit logs</p>
        )}
      </div>
    </DashboardLayout>
  );
}
