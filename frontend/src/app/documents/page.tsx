"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";

interface Doc { id: number; name: string; document_type: string | null; file_size: number | null; created_at: string | null }

export default function DocumentsPage() {
  const { user } = useAuth();
  const { data: docs } = useApi<Doc[]>(`/documents/${user?.employee_id}`, [user?.employee_id]);

  return (
    <DashboardLayout title="Documents">
      <div className="card">
        <h4 className="font-semibold text-gray-900 mb-4">My Documents</h4>
        {docs && docs.length > 0 ? (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.document_type || "other"} {d.file_size ? `\u00b7 ${Math.round(d.file_size / 1024)}KB` : ""}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No documents uploaded</p>
        )}
      </div>
    </DashboardLayout>
  );
}
