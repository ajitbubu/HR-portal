"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Certification } from "@/types";

export default function CertificationsPage() {
  const { data: certs } = useApi<Certification[]>("/training/certifications");

  return (
    <DashboardLayout title="Certifications">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead><tr className="text-left text-gray-500 border-b">
            <th className="pb-3">Name</th><th className="pb-3">Issuing Body</th><th className="pb-3">Validity</th>
          </tr></thead>
          <tbody>
            {certs?.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-3 font-medium">{c.name}</td>
                <td className="text-gray-500">{c.issuing_body || "-"}</td>
                <td>{c.validity_months > 0 ? `${c.validity_months} months` : "No expiry"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
