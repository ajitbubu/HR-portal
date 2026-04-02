"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Enrollment } from "@/types";

export default function MyLearningPage() {
  const { data: enrollments } = useApi<Enrollment[]>("/training/enrollments/my");

  return (
    <DashboardLayout title="My Learning">
      <div className="space-y-4">
        {enrollments?.map((e) => (
          <div key={e.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">Course #{e.course_id}</h4>
                <p className="text-sm text-gray-500">Enrolled: {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "-"}</p>
              </div>
              <span className={`badge ${e.status === "completed" ? "badge-success" : e.status === "in_progress" ? "badge-warning" : "badge-gray"}`}>{e.status}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${e.progress}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{e.progress}% complete</span>
              {e.score && <span>Score: {e.score}</span>}
            </div>
          </div>
        ))}
        {(!enrollments || enrollments.length === 0) && (
          <div className="card text-center py-12"><p className="text-gray-500">No enrollments yet. Browse the course catalog to get started.</p></div>
        )}
      </div>
    </DashboardLayout>
  );
}
