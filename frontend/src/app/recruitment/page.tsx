"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { JobPosting } from "@/types";

export default function RecruitmentPage() {
  const { data } = useApi<{ items: JobPosting[]; total: number }>("/recruitment/postings");

  return (
    <DashboardLayout title="Recruitment">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500">{data?.total || 0} job postings</p>
        <div className="flex gap-2">
          <Link href="/recruitment/candidates" className="btn-secondary">All Candidates</Link>
          <Link href="/recruitment/interviews" className="btn-secondary">Interviews</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data?.items?.map((jp) => (
          <div key={jp.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{jp.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{jp.employment_type} | {jp.positions_count} position(s)</p>
                {jp.salary_min && <p className="text-sm text-gray-600 mt-1">${jp.salary_min?.toLocaleString()} - ${jp.salary_max?.toLocaleString()} {jp.salary_currency}</p>}
                {jp.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{jp.description}</p>}
              </div>
              <span className={`badge ${jp.status === "open" ? "badge-success" : jp.status === "closed" ? "badge-danger" : "badge-warning"}`}>{jp.status}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
