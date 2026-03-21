"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function ReportsPage() {
  const download = (path: string) => {
    const token = localStorage.getItem("access_token");
    window.open(`${API_BASE}${path}?token=${token}`, "_blank");
  };

  const reports = [
    { title: "Employee Report", description: "Export all employee data as CSV", path: "/reports/employees/csv" },
    { title: "Leave Summary", description: "Leave balance summary for all employees", path: "/reports/leave-summary/csv" },
    { title: "Attendance Report", description: "Monthly attendance records", path: "/reports/attendance/csv" },
  ];

  return (
    <DashboardLayout title="Reports">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r) => (
          <div key={r.path} className="card">
            <h4 className="font-semibold text-gray-900">{r.title}</h4>
            <p className="text-sm text-gray-500 mt-1">{r.description}</p>
            <button onClick={() => download(r.path)} className="btn-primary mt-4 text-sm">
              Download CSV
            </button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
