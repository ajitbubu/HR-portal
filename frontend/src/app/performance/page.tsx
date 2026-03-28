"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { EmployeeList } from "@/types";

interface PerformanceReview {
  id: number;
  employee_id: number;
  reviewer_id: number;
  period: string;
  status: string;
  rating: number | null;
  comments: string | null;
  created_at: string | null;
}

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Needs Improvement", color: "text-red-600 bg-red-50" },
  2: { label: "Below Expectations", color: "text-orange-600 bg-orange-50" },
  3: { label: "Meets Expectations", color: "text-yellow-600 bg-yellow-50" },
  4: { label: "Exceeds Expectations", color: "text-blue-600 bg-blue-50" },
  5: { label: "Outstanding", color: "text-green-600 bg-green-50" },
};

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-400 text-xs">No rating</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map((s) => (
          <svg key={s} className={`w-4 h-4 ${s <= rating ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${RATING_LABELS[Math.round(rating)]?.color || ""}`}>
        {RATING_LABELS[Math.round(rating)]?.label}
      </span>
    </div>
  );
}

export default function PerformancePage() {
  const { user, isRole } = useAuth();
  const isHROrManager = isRole("super_admin", "hr_admin", "manager");

  const { data: allEmployees } = useApi<EmployeeList>("/employees?per_page=100");
  const { data: myReviews, refetch } = useApi<PerformanceReview[]>(
    user?.employee_id ? `/performance/${user.employee_id}` : ""
  );

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [viewEmpId, setViewEmpId] = useState<number | null>(null);
  const { data: empReviews, refetch: refetchEmp } = useApi<PerformanceReview[]>(
    viewEmpId ? `/performance/${viewEmpId}` : ""
  );

  const [form, setForm] = useState({
    employee_id: "",
    period: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
    rating: "3",
    comments: "",
    goals: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/performance", {
        employee_id: parseInt(form.employee_id),
        period: form.period,
        rating: parseFloat(form.rating),
        comments: form.comments || null,
        goals: form.goals || null,
      });
      setShowForm(false);
      setForm((f) => ({ ...f, employee_id: "", comments: "", goals: "" }));
      refetch?.();
      if (viewEmpId === parseInt(form.employee_id)) refetchEmp?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  const displayedReviews = viewEmpId ? empReviews : myReviews;
  const displayedName = viewEmpId
    ? allEmployees?.items?.find((e) => e.id === viewEmpId)
        ? `${allEmployees?.items?.find((e) => e.id === viewEmpId)?.first_name} ${allEmployees?.items?.find((e) => e.id === viewEmpId)?.last_name}`
        : "Employee"
    : "My Reviews";

  return (
    <DashboardLayout title="Performance Reviews">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {isHROrManager && (
            <select
              title="View employee reviews"
              value={viewEmpId ?? ""}
              onChange={(e) => setViewEmpId(e.target.value ? parseInt(e.target.value) : null)}
              className="input-field py-1.5 text-sm w-56"
            >
              <option value="">My Reviews</option>
              {allEmployees?.items?.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.employee_id}</option>
              ))}
            </select>
          )}
        </div>
        {isHROrManager && (
          <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Review
          </button>
        )}
      </div>

      {/* New Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h4 className="font-semibold text-gray-900">Create Performance Review</h4>
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
              <select value={form.employee_id} onChange={(e) => update("employee_id", e.target.value)} className="input-field" required>
                <option value="">Select employee</option>
                {allEmployees?.items?.map((e) => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.employee_id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period *</label>
              <input value={form.period} onChange={(e) => update("period", e.target.value)} className="input-field" placeholder="e.g. Q1 2026" required />
            </div>
          </div>

          {/* Star rating picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating *</label>
            <div className="flex gap-3 flex-wrap">
              {[1,2,3,4,5].map((r) => (
                <label key={r} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border-2 transition-colors ${parseInt(form.rating) === r ? "border-primary-500 bg-primary-50" : "border-gray-100 hover:border-gray-200"}`}>
                  <input type="radio" name="rating" value={r} checked={parseInt(form.rating) === r} onChange={(e) => update("rating", e.target.value)} className="sr-only" />
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} className={`w-4 h-4 ${s <= r ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">{RATING_LABELS[r]?.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
            <textarea value={form.comments} onChange={(e) => update("comments", e.target.value)} className="input-field" rows={3} placeholder="Overall performance feedback..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goals for Next Period</label>
            <textarea value={form.goals} onChange={(e) => update("goals", e.target.value)} className="input-field" rows={2} placeholder="Goals and objectives for the next review period..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Review"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="card">
        <h4 className="font-semibold text-gray-900 mb-4">{displayedName}</h4>

        {displayedReviews && displayedReviews.length > 0 ? (
          <div className="space-y-4">
            {displayedReviews.map((r) => {
              const emp = allEmployees?.items?.find((e) => e.id === r.employee_id);
              return (
                <div key={r.id} className="border border-gray-100 rounded-xl p-4 hover:border-primary-200 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      {isHROrManager && !viewEmpId && emp && (
                        <Link href={`/employees/${emp.id}`} className="text-sm font-semibold text-primary-600 hover:underline">
                          {emp.first_name} {emp.last_name}
                        </Link>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{r.period}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "submitted" ? "bg-blue-50 text-blue-600" : r.status === "acknowledged" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                    <StarRating rating={r.rating} />
                  </div>

                  {r.comments && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Feedback</p>
                      <p className="text-sm text-gray-700">{r.comments}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <p className="text-gray-500 font-medium">No reviews yet</p>
            {isHROrManager && <p className="text-sm text-gray-400 mt-1">Click &ldquo;New Review&rdquo; to create one</p>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
