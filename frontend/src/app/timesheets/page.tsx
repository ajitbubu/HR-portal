"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { TimesheetEntry, WeeklyTimesheet } from "@/types";

export default function TimesheetsPage() {
  const { data: entries, refetch } = useApi<TimesheetEntry[]>("/timesheets/my-entries");
  const { data: weekly } = useApi<{ items: WeeklyTimesheet[] }>("/timesheets/weekly/my-timesheets");
  const [activeTab, setActiveTab] = useState<"entries" | "weekly">("entries");
  const [form, setForm] = useState({ project_id: "", date: "", hours: "", description: "", is_billable: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/timesheets/entries", {
        project_id: parseInt(form.project_id),
        date: form.date,
        hours: parseFloat(form.hours),
        description: form.description,
        is_billable: form.is_billable,
      });
      setForm({ project_id: "", date: "", hours: "", description: "", is_billable: true });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create entry");
    }
  };

  return (
    <DashboardLayout title="Timesheets">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          <button onClick={() => setActiveTab("entries")} className={`px-4 py-2 text-sm rounded-lg ${activeTab === "entries" ? "bg-primary-600 text-white" : "bg-white text-gray-600 border"}`}>
            Daily Entries
          </button>
          <button onClick={() => setActiveTab("weekly")} className={`px-4 py-2 text-sm rounded-lg ${activeTab === "weekly" ? "bg-primary-600 text-white" : "bg-white text-gray-600 border"}`}>
            Weekly Timesheets
          </button>
        </div>
        <div className="flex gap-2">
          <Link href="/timesheets/projects" className="btn-secondary">Projects</Link>
          <Link href="/timesheets/reports" className="btn-secondary">Reports</Link>
        </div>
      </div>

      {activeTab === "entries" && (
        <>
          <div className="card mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Log Time</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-5 gap-3">
              <input type="number" placeholder="Project ID" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="input-field" required />
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
              <input type="number" step="0.5" placeholder="Hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className="input-field" required />
              <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
              <button type="submit" className="btn-primary">Add Entry</button>
            </form>
          </div>

          <div className="card">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-3">Date</th><th className="pb-3">Project</th><th className="pb-3">Hours</th><th className="pb-3">Billable</th><th className="pb-3">OT</th><th className="pb-3">Status</th>
              </tr></thead>
              <tbody>
                {entries?.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="py-3">{e.date}</td>
                    <td>#{e.project_id}</td>
                    <td>{e.hours}h</td>
                    <td>{e.is_billable ? "Yes" : "No"}</td>
                    <td>{e.is_overtime ? <span className="badge badge-warning">OT</span> : "-"}</td>
                    <td><span className={`badge ${e.status === "approved" ? "badge-success" : e.status === "submitted" ? "badge-warning" : "badge-gray"}`}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "weekly" && (
        <div className="card">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-3">Week</th><th className="pb-3">Total Hours</th><th className="pb-3">Overtime</th><th className="pb-3">Status</th>
            </tr></thead>
            <tbody>
              {weekly?.items?.map((w) => (
                <tr key={w.id} className="border-b border-gray-50">
                  <td className="py-3">{w.week_start} - {w.week_end}</td>
                  <td>{w.total_hours}h</td>
                  <td>{w.overtime_hours}h</td>
                  <td><span className={`badge ${w.status === "approved" ? "badge-success" : w.status === "submitted" ? "badge-warning" : "badge-gray"}`}>{w.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
