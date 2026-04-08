"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Employee, Department, Location, Designation, Team } from "@/types";


function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2.5">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 capitalize">{value || "-"}</p>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { isRole } = useAuth();
  const { data: emp, loading, refetch } = useApi<Employee>(`/employees/${id}`);
  const { data: departments } = useApi<Department[]>("/admin/departments");
  const { data: locations } = useApi<Location[]>("/admin/locations");
  const { data: designations } = useApi<Designation[]>("/admin/designations");
  const { data: allEmployees } = useApi<{ items: Employee[] }>("/employees?per_page=100");
  const { data: teams } = useApi<Team[]>("/admin/teams");

  const isHR = isRole("super_admin", "hr_admin");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.upload(`/employees/${id}/profile-photo`, formData);
      refetch?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const openEdit = () => {
    if (!emp) return;
    setForm({
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      email: emp.email || "",
      phone: emp.phone || "",
      gender: emp.gender || "",
      date_of_birth: emp.date_of_birth || "",
      address: emp.address || "",
      city: emp.city || "",
      state: emp.state || "",
      country: emp.country || "",
      zip_code: emp.zip_code || "",
      department_id: emp.department?.id?.toString() || "",
      designation_id: emp.designation?.id?.toString() || "",
      location_id: emp.location?.id?.toString() || "",
      manager_id: emp.manager?.id?.toString() || "",
      team_id: emp.team?.id?.toString() || "",
      employment_type: emp.employment_type || "full_time",
      status: emp.status || "active",
      joining_date: emp.joining_date || "",
    });
    setEditing(true);
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string | number | null> = {};
      Object.entries(form).forEach(([k, v]) => {
        payload[k] = v === "" ? null : v;
      });
      ["department_id", "designation_id", "location_id", "manager_id", "team_id"].forEach((k) => {
        payload[k] = form[k] ? parseInt(form[k]) : null;
      });
      await api.put(`/employees/${id}`, payload);
      setEditing(false);
      refetch?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (loading) return (
    <DashboardLayout title="Employee">
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    </DashboardLayout>
  );

  if (!emp) return (
    <DashboardLayout title="Employee">
      <div className="text-center py-20">
        <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
        <p className="text-gray-500">Employee not found</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title={`${emp.first_name} ${emp.last_name}`}>
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="relative mb-20">
          <div className="h-40 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-purple-700 overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute right-24 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
          </div>
          <div className="absolute -bottom-14 left-8 flex items-end gap-5">
            <div className="relative group">
              <ProfileAvatar firstName={emp.first_name} lastName={emp.last_name} photoUrl={emp.profile_photo} size="xl" />
              {isHR && (
                <>
                  <button
                    type="button"
                    title="Upload photo"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {uploadingPhoto ? (
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                    )}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" title="Upload profile photo" className="hidden" onChange={handlePhotoUpload} />
                </>
              )}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-white">{emp.first_name} {emp.last_name}</h2>
              <p className="text-gray-900 text-sm">{emp.designation?.title || "No Designation"} &middot; {emp.department?.name || "No Department"}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`badge ${emp.status === "active" ? "badge-success" : "badge-gray"}`}>{emp.status}</span>
                <span className="badge badge-info">{emp.employment_type?.replace("_", " ")}</span>
                <span className="badge badge-gray">{emp.employee_id}</span>
              </div>
            </div>
          </div>
          {/* Edit button — HR only */}
          {isHR && !editing && (
            <button
              type="button"
              onClick={openEdit}
              className="absolute bottom-4 right-4 btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {/* Edit Form — HR only */}
        {isHR && editing && (
          <form onSubmit={handleSave} className="card mb-6 space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Edit Employee</h4>
              <button type="button" title="Close" onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

            {/* Personal */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input title="First Name" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input title="Last Name" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input title="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input title="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select title="Gender" value={form.gender} onChange={(e) => update("gender", e.target.value)} className="input-field">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input title="Date of Birth" type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} className="input-field" />
                </div>
              </div>
            </div>

            {/* Hierarchy */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Hierarchy & Work</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select title="Department" value={form.department_id} onChange={(e) => update("department_id", e.target.value)} className="input-field">
                    <option value="">Select</option>
                    {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <select title="Designation" value={form.designation_id} onChange={(e) => update("designation_id", e.target.value)} className="input-field">
                    <option value="">Select</option>
                    {designations?.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager (Reports To)</label>
                  <select title="Manager" value={form.manager_id} onChange={(e) => update("manager_id", e.target.value)} className="input-field">
                    <option value="">None</option>
                    {allEmployees?.items?.filter((e) => e.id !== Number(id)).map((e) => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.designation?.title || e.employee_id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                  <select title="Team" value={form.team_id} onChange={(e) => update("team_id", e.target.value)} className="input-field">
                    <option value="">No Team</option>
                    {teams?.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select title="Location" value={form.location_id} onChange={(e) => update("location_id", e.target.value)} className="input-field">
                    <option value="">Select</option>
                    {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select title="Employment Type" value={form.employment_type} onChange={(e) => update("employment_type", e.target.value)} className="input-field">
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contractor">Contractor</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select title="Status" value={form.status} onChange={(e) => update("status", e.target.value)} className="input-field">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="terminated">Terminated</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                  <input title="Joining Date" type="date" value={form.joining_date} onChange={(e) => update("joining_date", e.target.value)} className="input-field" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Changes"}</button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Contact & Personal */}
          <div className="space-y-6">
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-3">Contact</h4>
              <div className="divide-y divide-gray-50">
                <DetailItem label="Email" value={emp.email} />
                <DetailItem label="Phone" value={emp.phone} />
              </div>
            </div>
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-3">Personal</h4>
              <div className="divide-y divide-gray-50">
                <DetailItem label="Gender" value={emp.gender} />
                <DetailItem label="Date of Birth" value={emp.date_of_birth} />
                <DetailItem label="Address" value={[emp.address, emp.city, emp.state, emp.country].filter(Boolean).join(", ")} />
                <DetailItem label="Zip Code" value={emp.zip_code} />
              </div>
            </div>
            {emp.manager && (
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-3">Reports To</h4>
                <Link href={`/employees/${emp.manager.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {emp.manager.first_name[0]}{emp.manager.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{emp.manager.first_name} {emp.manager.last_name}</p>
                    <p className="text-xs text-gray-500">{emp.manager.employee_id}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            )}
            {emp.direct_reports && emp.direct_reports.length > 0 && (
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-3">Direct Reports ({emp.direct_reports.length})</h4>
                <div className="space-y-2">
                  {emp.direct_reports.map((r) => (
                    <Link key={r.id} href={`/employees/${r.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                        {r.first_name[0]}{r.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{r.first_name} {r.last_name}</p>
                        <p className="text-xs text-gray-500">{r.employee_id}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Work Details */}
          <div className="lg:col-span-2">
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-4">Work Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div className="divide-y divide-gray-50">
                  <DetailItem label="Employee ID" value={emp.employee_id} />
                  <DetailItem label="Department" value={emp.department?.name} />
                  <DetailItem label="Team" value={emp.team?.name} />
                  <DetailItem label="Designation" value={emp.designation?.title} />
                  <DetailItem label="Band" value={emp.band || emp.designation?.band} />
                </div>
                <div className="divide-y divide-gray-50">
                  <DetailItem label="Location" value={emp.location?.name} />
                  <DetailItem label="Employment Type" value={emp.employment_type?.replace("_", " ")} />
                  <DetailItem label="Status" value={emp.status} />
                  <DetailItem label="Joining Date" value={emp.joining_date} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
