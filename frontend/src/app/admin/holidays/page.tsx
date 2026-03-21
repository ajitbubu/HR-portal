"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { HolidayCalendar } from "@/types";

export default function HolidaysPage() {
  const { data: calendars } = useApi<HolidayCalendar[]>("/holidays/calendars");

  return (
    <DashboardLayout title="Holiday Calendar Management">
      <div className="space-y-6">
        {calendars?.map((cal) => (
          <div key={cal.id} className="card">
            <h4 className="font-semibold text-gray-900 mb-4">{cal.name} - {cal.year}</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Holiday</th>
                    <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cal.holidays?.map((h) => (
                    <tr key={h.id}>
                      <td className="py-2.5 text-sm">{h.name}</td>
                      <td className="py-2.5 text-sm text-gray-500">{h.date}</td>
                      <td className="py-2.5">
                        <span className={`badge ${h.is_optional ? "badge-info" : "badge-success"}`}>
                          {h.is_optional ? "Optional" : "Mandatory"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {(!calendars || calendars.length === 0) && (
          <div className="card text-center py-12"><p className="text-gray-500">No holiday calendars</p></div>
        )}
      </div>
    </DashboardLayout>
  );
}
