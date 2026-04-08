"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Employee, LeaveBalance, EmployeeList } from "@/types";

interface Delegation {
  id: number;
  delegate_id: number;
  delegate_name: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  is_active: boolean;
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-gray-900 capitalize truncate">{value || "-"}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: emp, refetch } = useApi<Employee>(`/employees/${user?.employee_id}`, [user?.employee_id]);
  const { data: balances } = useApi<LeaveBalance[]>("/leave/balance?year=2026");
  const { data: myDelegations, refetch: refetchDelegations } = useApi<Delegation[]>("/delegations/my");
  const { data: allEmployees } = useApi<EmployeeList>("/employees?per_page=100");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Delegation form state
  const [showDelegForm, setShowDelegForm] = useState(false);
  const [delegForm, setDelegForm] = useState({ delegate_id: "", start_date: "", end_date: "", reason: "" });
  const [delegSaving, setDelegSaving] = useState(false);
  const [delegError, setDelegError] = useState("");

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    setDelegSaving(true);
    setDelegError("");
    try {
      await api.post("/delegations", {
        delegate_id: parseInt(delegForm.delegate_id),
        start_date: delegForm.start_date,
        end_date: delegForm.end_date,
        reason: delegForm.reason || null,
      });
      setShowDelegForm(false);
      setDelegForm({ delegate_id: "", start_date: "", end_date: "", reason: "" });
      refetchDelegations?.();
    } catch (err: unknown) {
      setDelegError(err instanceof Error ? err.message : "Failed to create delegation");
    } finally {
      setDelegSaving(false);
    }
  };

  const handleCancelDelegation = async (id: number) => {
    try {
      await api.delete(`/delegations/${id}`);
      refetchDelegations?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel delegation");
    }
  };

  if (!emp) return (
    <DashboardLayout title="My Profile">
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-5xl mx-auto">
        {/* Cover + Avatar */}
        <div className="relative mb-20">
          <div className="h-44 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-purple-700 overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
            </div>
          </div>
          <div className="absolute -bottom-16 left-8 flex items-end gap-5">
            <ProfileAvatar
              firstName={emp.first_name}
              lastName={emp.last_name}
              photoUrl={photoUrl || emp.profile_photo}
              size="2xl"
              editable
              onPhotoUpdated={(url) => { setPhotoUrl(url); refetch(); }}
            />
            <div className="pb-2">
              <h2 className="text-2xl font-bold text-gray-900">{emp.first_name} {emp.last_name}</h2>
              <p className="text-gray-500 text-sm">
                {emp.designation?.title || "No Designation"} &middot; {emp.department?.name || "No Department"}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`badge ${emp.status === "active" ? "badge-success" : "badge-gray"}`}>{emp.status}</span>
                <span className="badge badge-info">{emp.employment_type?.replace("_", " ")}</span>
                {emp.band && <span className="badge badge-purple">Band {emp.band}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Personal + Contact */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-1">Contact Information</h4>
              <p className="text-xs text-gray-400 mb-3">Personal and contact details</p>
              <div className="divide-y divide-gray-50">
                <InfoRow label="Email" value={emp.email} icon="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                <InfoRow label="Phone" value={emp.phone} icon="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                <InfoRow label="Gender" value={emp.gender} icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                <InfoRow label="Date of Birth" value={emp.date_of_birth} icon="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37" />
              </div>
            </div>

            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-1">Address</h4>
              <p className="text-xs text-gray-400 mb-3">Residential address</p>
              <div className="divide-y divide-gray-50">
                <InfoRow label="Street" value={emp.address} icon="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                <InfoRow label="City" value={emp.city} />
                <InfoRow label="State" value={emp.state} />
                <InfoRow label="Country" value={emp.country} />
                <InfoRow label="Zip Code" value={emp.zip_code} />
              </div>
            </div>
          </div>

          {/* Right Column: Work Info + Manager + Leave */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-1">Work Information</h4>
              <p className="text-xs text-gray-400 mb-3">Employment and organizational details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y md:divide-y-0 divide-gray-50">
                <div className="divide-y divide-gray-50">
                  <InfoRow label="Employee ID" value={emp.employee_id} icon="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  <InfoRow label="Department" value={emp.department?.name} icon="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  <InfoRow label="Designation" value={emp.designation?.title} icon="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                  <InfoRow label="Band" value={emp.band || emp.designation?.band} />
                </div>
                <div className="divide-y divide-gray-50">
                  <InfoRow label="Location" value={emp.location?.name} icon="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  <InfoRow label="Employment Type" value={emp.employment_type?.replace("_", " ")} icon="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25" />
                  <InfoRow label="Joining Date" value={emp.joining_date} icon="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  <InfoRow label="Status" value={emp.status} />
                </div>
              </div>
            </div>

            {/* Manager Card */}
            {emp.manager && (
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-3">Reporting Manager</h4>
                <Link href={`/employees/${emp.manager.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                    {emp.manager.first_name[0]}{emp.manager.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{emp.manager.first_name} {emp.manager.last_name}</p>
                    <p className="text-xs text-gray-500">{emp.manager.employee_id}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            )}

            {/* Out of Office Delegation */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">Out of Office Delegation</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Delegate your approvals when you&apos;re away</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDelegForm(!showDelegForm)}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Set Delegation
                </button>
              </div>

              {/* Create form */}
              {showDelegForm && (
                <form onSubmit={handleCreateDelegation} noValidate className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-4">
                  <p className="text-sm font-semibold text-gray-800">New Delegation</p>
                  {delegError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs">
                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      {delegError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="deleg-to" className="block text-xs font-medium text-gray-600 mb-1.5">
                        Delegate To <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="deleg-to"
                        value={delegForm.delegate_id}
                        onChange={(e) => setDelegForm({ ...delegForm, delegate_id: e.target.value })}
                        className="input-field w-full text-sm"
                        required
                      >
                        <option value="">Select employee…</option>
                        {allEmployees?.items?.filter((e) => e.id !== emp?.id).map((e) => (
                          <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.employee_id}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="deleg-reason" className="block text-xs font-medium text-gray-600 mb-1.5">Reason</label>
                      <input
                        id="deleg-reason"
                        value={delegForm.reason}
                        onChange={(e) => setDelegForm({ ...delegForm, reason: e.target.value })}
                        className="input-field w-full text-sm"
                        placeholder="e.g. Annual leave, Conference…"
                      />
                    </div>
                    <div>
                      <label htmlFor="deleg-start" className="block text-xs font-medium text-gray-600 mb-1.5">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input id="deleg-start" type="date" value={delegForm.start_date} onChange={(e) => setDelegForm({ ...delegForm, start_date: e.target.value })} className="input-field w-full text-sm" required />
                    </div>
                    <div>
                      <label htmlFor="deleg-end" className="block text-xs font-medium text-gray-600 mb-1.5">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input id="deleg-end" type="date" value={delegForm.end_date} onChange={(e) => setDelegForm({ ...delegForm, end_date: e.target.value })} className="input-field w-full text-sm" required />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={delegSaving} className="btn-primary text-sm flex items-center gap-2">
                      {delegSaving ? (
                        <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />Saving…</>
                      ) : "Create Delegation"}
                    </button>
                    <button type="button" onClick={() => setShowDelegForm(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              )}

              {/* Existing delegations */}
              {myDelegations && myDelegations.length > 0 ? (
                <div className="space-y-2">
                  {myDelegations.map((d) => {
                    const today = new Date().toISOString().slice(0, 10);
                    const isCurrentlyActive = d.is_active && d.start_date <= today && d.end_date >= today;
                    return (
                      <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl border ${isCurrentlyActive ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{d.delegate_name}</p>
                            {isCurrentlyActive && <span className="badge badge-success text-[10px]">Active Now</span>}
                            {!d.is_active && <span className="badge badge-gray text-[10px]">Cancelled</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{d.start_date} → {d.end_date}{d.reason ? ` · ${d.reason}` : ""}</p>
                        </div>
                        {d.is_active && (
                          <button
                            type="button"
                            onClick={() => handleCancelDelegation(d.id)}
                            className="ml-3 text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No delegations set. Create one if you&apos;ll be out of office.</p>
              )}
            </div>

            {/* Leave Balance */}
            {balances && balances.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Leave Balance</h4>
                    <p className="text-xs text-gray-400">Current year allocation</p>
                  </div>
                  <Link href="/leave" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View details</Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {balances.map((b) => {
                    const total = b.entitled + b.carried_forward + b.adjusted;
                    const usedPct = total > 0 ? Math.round((b.used / total) * 100) : 0;
                    return (
                      <div key={b.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-2">{b.leave_type.name}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-gray-900">{b.remaining}</span>
                          <span className="text-xs text-gray-400">/ {total}</span>
                        </div>
                        <div className="flex gap-0.5 mt-2">
                          {Array.from({ length: Math.min(total, 20) }).map((_, i) => {
                            const segTotal = Math.min(total, 20);
                            const segUsed = Math.round((b.used / total) * segTotal);
                            return (
                              <div
                                key={i}
                                className={`flex-1 h-1.5 rounded-full transition-colors ${
                                  i < segUsed
                                    ? usedPct > 80 ? "bg-red-400" : usedPct > 50 ? "bg-amber-400" : "bg-emerald-400"
                                    : "bg-gray-200"
                                }`}
                              />
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{b.used} used &middot; {b.pending} pending</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
