"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import type { Department, Location, Designation, EmployeeList } from "@/types";

export default function NewEmployeePage() {
  const { isRole, loading: authLoading } = useAuth();
  const router = useRouter();

  const { data: departments } = useApi<Department[]>("/admin/departments");
  const { data: locations } = useApi<Location[]>("/admin/locations");
  const { data: designations } = useApi<Designation[]>("/admin/designations");
  const { data: allEmployees } = useApi<EmployeeList>("/employees?per_page=100");

  useEffect(() => {
    if (!authLoading && !isRole("super_admin", "hr_admin")) {
      router.replace("/employees");
    }
  }, [authLoading, isRole, router]);

  if (!authLoading && !isRole("super_admin", "hr_admin")) return null;

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    department_id: "", designation_id: "", location_id: "", manager_id: "",
    employment_type: "full_time", joining_date: "", password: "changeme123",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        department_id: form.department_id ? parseInt(form.department_id) : null,
        designation_id: form.designation_id ? parseInt(form.designation_id) : null,
        location_id: form.location_id ? parseInt(form.location_id) : null,
        manager_id: form.manager_id ? parseInt(form.manager_id) : null,
      };
      await api.post("/employees", payload);
      router.push("/employees");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Add Employee">
      <div className="max-w-2xl mx-auto">

        {/* Back breadcrumb */}
        <div className="mb-5">
          <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Employees
          </Link>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-base font-semibold text-gray-900">New Employee</h2>
              <p className="text-xs text-gray-500 mt-0.5">Fill in the details to create a new employee account</p>
            </div>

            <div className="px-6 py-6 space-y-6">

              {/* Personal details */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.first_name}
                      onChange={(e) => update("first_name", e.target.value)}
                      className="input-field w-full"
                      placeholder="Jane"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.last_name}
                      onChange={(e) => update("last_name", e.target.value)}
                      className="input-field w-full"
                      placeholder="Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className="input-field w-full"
                      placeholder="jane@datasafeguard.us"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone
                      <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      className="input-field w-full"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Role & organisation */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Role & Organisation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="emp-dept" className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                    <select id="emp-dept" value={form.department_id} onChange={(e) => update("department_id", e.target.value)} className="input-field w-full">
                      <option value="">Select department…</option>
                      {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="emp-desig" className="block text-sm font-medium text-gray-700 mb-1.5">Designation</label>
                    <select id="emp-desig" value={form.designation_id} onChange={(e) => update("designation_id", e.target.value)} className="input-field w-full">
                      <option value="">Select designation…</option>
                      {designations?.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="emp-loc" className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                    <select id="emp-loc" value={form.location_id} onChange={(e) => update("location_id", e.target.value)} className="input-field w-full">
                      <option value="">Select location…</option>
                      {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="emp-mgr" className="block text-sm font-medium text-gray-700 mb-1.5">Reporting Manager</label>
                    <select id="emp-mgr" value={form.manager_id} onChange={(e) => update("manager_id", e.target.value)} className="input-field w-full">
                      <option value="">No manager</option>
                      {allEmployees?.items?.map((e) => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.employee_id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="emp-type" className="block text-sm font-medium text-gray-700 mb-1.5">Employment Type</label>
                    <select id="emp-type" value={form.employment_type} onChange={(e) => update("employment_type", e.target.value)} className="input-field w-full">
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contractor">Contractor</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Account setup */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Setup</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="emp-joining" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Joining Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="emp-joining"
                      type="date"
                      value={form.joining_date}
                      onChange={(e) => update("joining_date", e.target.value)}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="emp-password" className="block text-sm font-medium text-gray-700 mb-1.5">Initial Password</label>
                    <input
                      id="emp-password"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      className="input-field w-full font-mono"
                      placeholder="changeme123"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">Employee should change this on first login.</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
              <button type="button" onClick={() => router.back()} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2 px-6"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Creating…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                    Create Employee
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
