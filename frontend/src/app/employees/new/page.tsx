"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import type { Department, Location, Designation } from "@/types";

export default function NewEmployeePage() {
  const { isRole, loading: authLoading } = useAuth();
  const router = useRouter();

  const { data: departments } = useApi<Department[]>("/admin/departments");
  const { data: locations } = useApi<Location[]>("/admin/locations");
  const { data: designations } = useApi<Designation[]>("/admin/designations");

  useEffect(() => {
    if (!authLoading && !isRole("super_admin", "hr_admin")) {
      router.replace("/employees");
    }
  }, [authLoading, isRole, router]);

  if (!authLoading && !isRole("super_admin", "hr_admin")) return null;

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    department_id: "", designation_id: "", location_id: "",
    employment_type: "full_time", joining_date: "", password: "changeme123",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      };
      await api.post("/employees", payload);
      router.push("/employees");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  return (
    <DashboardLayout title="Add Employee">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} className="input-field" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={form.department_id} onChange={(e) => update("department_id", e.target.value)} className="input-field">
                <option value="">Select</option>
                {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <select value={form.designation_id} onChange={(e) => update("designation_id", e.target.value)} className="input-field">
                <option value="">Select</option>
                {designations?.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select value={form.location_id} onChange={(e) => update("location_id", e.target.value)} className="input-field">
                <option value="">Select</option>
                {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
              <select value={form.employment_type} onChange={(e) => update("employment_type", e.target.value)} className="input-field">
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contractor">Contractor</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
              <input type="date" value={form.joining_date} onChange={(e) => update("joining_date", e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Password</label>
              <input value={form.password} onChange={(e) => update("password", e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? "Creating..." : "Create Employee"}</button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
