"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Announcement } from "@/types";

const priorityColors: Record<string, string> = {
  urgent: "badge-danger", high: "badge-warning", normal: "badge-info", low: "badge-gray",
};

export default function AnnouncementsPage() {
  const { data: announcements } = useApi<Announcement[]>("/announcements");

  return (
    <DashboardLayout title="Announcements">
      <div className="max-w-3xl space-y-4">
        {announcements?.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between">
              <h4 className="font-semibold text-gray-900">{a.title}</h4>
              <span className={`badge ${priorityColors[a.priority] || "badge-info"}`}>{a.priority}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{a.content}</p>
            <div className="flex items-center gap-3 mt-4 text-xs text-gray-400">
              <span>By {a.author_name || "System"}</span>
              <span>{a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</span>
            </div>
          </div>
        ))}
        {(!announcements || announcements.length === 0) && (
          <div className="card text-center py-12"><p className="text-gray-500">No announcements</p></div>
        )}
      </div>
    </DashboardLayout>
  );
}
