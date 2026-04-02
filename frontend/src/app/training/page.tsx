"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Course } from "@/types";

export default function TrainingPage() {
  const { data } = useApi<{ items: Course[]; total: number }>("/training/courses");

  return (
    <DashboardLayout title="Training - Course Catalog">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500">{data?.total || 0} courses available</p>
        <div className="flex gap-2">
          <Link href="/training/my-learning" className="btn-primary">My Learning</Link>
          <Link href="/training/certifications" className="btn-secondary">Certifications</Link>
          <Link href="/training/compliance" className="btn-secondary">Compliance</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items?.map((course) => (
          <div key={course.id} className="card">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{course.title}</h3>
              {course.is_mandatory && <span className="badge badge-danger">Mandatory</span>}
            </div>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description || "No description"}</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">{course.format}</span>
              <span className="bg-gray-100 px-2 py-1 rounded">{course.duration_hours}h</span>
              {course.category && <span className="bg-gray-100 px-2 py-1 rounded">{course.category}</span>}
              {course.instructor && <span className="bg-gray-100 px-2 py-1 rounded">{course.instructor}</span>}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
