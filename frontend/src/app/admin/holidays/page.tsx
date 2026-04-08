"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { HolidayCalendar } from "@/types";

interface AddHolidayForm {
  calendar_id: number;
  name: string;
  date: string;
  is_optional: boolean;
  holiday_type: string;
}

const BLANK_FORM: Omit<AddHolidayForm, "calendar_id"> = {
  name: "", date: "", is_optional: false, holiday_type: "national",
};

export default function HolidaysPage() {
  const { data: calendars, refetch } = useApi<HolidayCalendar[]>("/holidays/calendars");

  const [showCalForm, setShowCalForm] = useState(false);
  const [calForm, setCalForm] = useState({ name: "", year: String(new Date().getFullYear()) });
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState("");

  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const [deleting, setDeleting] = useState<number | null>(null);

  const handleCreateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalLoading(true);
    setCalError("");
    try {
      await api.post("/holidays/calendars", { name: calForm.name, year: parseInt(calForm.year) });
      setShowCalForm(false);
      setCalForm({ name: "", year: String(new Date().getFullYear()) });
      refetch?.();
    } catch (err: unknown) {
      setCalError(err instanceof Error ? err.message : "Failed to create calendar");
    } finally {
      setCalLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent, calendarId: number) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      await api.post("/holidays", { ...addForm, calendar_id: calendarId });
      setAddingTo(null);
      setAddForm(BLANK_FORM);
      refetch?.();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add holiday");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (holidayId: number, name: string) => {
    if (!confirm(`Remove holiday "${name}"?`)) return;
    setDeleting(holidayId);
    try {
      await api.delete(`/holidays/${holidayId}`);
      refetch?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete holiday");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <DashboardLayout title="Holiday Calendar Management">
      <div className="mb-5">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Admin Panel
        </Link>
      </div>

      {/* New calendar */}
      <div className="mb-6">
        {showCalForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-lg">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <h4 className="text-sm font-semibold text-gray-900">New Holiday Calendar</h4>
            </div>
            <form onSubmit={handleCreateCalendar} noValidate className="px-5 py-4 space-y-4">
              {calError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {calError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label htmlFor="cal-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Calendar Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="cal-name"
                    value={calForm.name}
                    onChange={(e) => setCalForm({ ...calForm, name: e.target.value })}
                    placeholder="e.g. India 2026"
                    className="input-field w-full"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cal-year" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="cal-year"
                    type="number"
                    value={calForm.year}
                    onChange={(e) => setCalForm({ ...calForm, year: e.target.value })}
                    min="2020" max="2030"
                    className="input-field w-full"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={calLoading} className="btn-primary flex items-center gap-2">
                  {calLoading ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Creating…</>
                  ) : "Create Calendar"}
                </button>
                <button type="button" onClick={() => setShowCalForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        ) : (
          <button type="button" onClick={() => setShowCalForm(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Calendar
          </button>
        )}
      </div>

      {/* Calendar list */}
      <div className="space-y-5">
        {calendars?.map((cal) => (
          <div key={cal.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Calendar header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{cal.name}</h4>
                <p className="text-xs text-gray-400 mt-0.5">{cal.year} · {cal.holidays?.length ?? 0} holidays</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddingTo(addingTo === cal.id ? null : cal.id);
                  setAddForm(BLANK_FORM);
                  setAddError("");
                }}
                className={addingTo === cal.id ? "btn-secondary text-sm" : "btn-primary text-sm flex items-center gap-1.5"}
              >
                {addingTo === cal.id ? "Cancel" : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Holiday
                  </>
                )}
              </button>
            </div>

            {/* Add holiday inline form */}
            {addingTo === cal.id && (
              <form onSubmit={(e) => handleAddHoliday(e, cal.id)} noValidate className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-4">
                {addError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {addError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`h-name-${cal.id}`} className="block text-sm font-medium text-gray-700 mb-1.5">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`h-name-${cal.id}`}
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      placeholder="e.g. Republic Day"
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={`h-date-${cal.id}`} className="block text-sm font-medium text-gray-700 mb-1.5">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`h-date-${cal.id}`}
                      type="date"
                      value={addForm.date}
                      onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={`h-type-${cal.id}`} className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                    <select
                      id={`h-type-${cal.id}`}
                      value={addForm.holiday_type}
                      onChange={(e) => setAddForm({ ...addForm, holiday_type: e.target.value })}
                      className="input-field w-full"
                    >
                      <option value="national">National</option>
                      <option value="regional">Regional</option>
                      <option value="restricted">Restricted</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={addForm.is_optional}
                          onChange={(e) => setAddForm({ ...addForm, is_optional: e.target.checked })}
                          className="sr-only peer"
                          aria-label="Optional holiday"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors" />
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
                      </div>
                      <span className="text-sm text-gray-700">Optional holiday</span>
                    </label>
                  </div>
                </div>
                <button type="submit" disabled={addLoading} className="btn-primary flex items-center gap-2">
                  {addLoading ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Adding…</>
                  ) : "Add Holiday"}
                </button>
              </form>
            )}

            {/* Holidays table */}
            {cal.holidays && cal.holidays.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/40">
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Holiday</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider sr-only">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...cal.holidays].sort((a, b) => a.date.localeCompare(b.date)).map((h) => (
                      <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{h.name}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{h.date}</td>
                        <td className="px-5 py-3">
                          <span className={`badge ${h.is_optional ? "badge-warning" : "badge-success"}`}>
                            {h.is_optional ? "Optional" : "Mandatory"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(h.id, h.name)}
                            disabled={deleting === h.id}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-40"
                          >
                            {deleting === h.id ? "…" : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">No holidays yet. Add one above.</p>
              </div>
            )}
          </div>
        ))}

        {(!calendars || calendars.length === 0) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-14">
            <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="text-sm text-gray-500 font-medium">No holiday calendars yet</p>
            <p className="text-xs text-gray-400 mt-1">Create a calendar above to get started.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
