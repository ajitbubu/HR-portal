"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { OrgChartNode } from "@/types";

function OrgNode({ node, level = 0 }: { node: OrgChartNode; level?: number }) {
  return (
    <div className={`${level > 0 ? "ml-8 border-l-2 border-gray-200 pl-4" : ""}`}>
      <div className="flex items-center gap-3 py-2">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-sm font-medium flex-shrink-0">
          {node.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{node.name}</p>
          <p className="text-xs text-gray-500">{node.designation} {node.department ? `\u00b7 ${node.department}` : ""}</p>
        </div>
      </div>
      {node.children?.map((child) => (
        <OrgNode key={child.id} node={child} level={level + 1} />
      ))}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: orgTree } = useApi<OrgChartNode[]>("/org-chart");

  return (
    <DashboardLayout title="Organization Chart">
      <div className="card">
        {orgTree && orgTree.length > 0 ? (
          <div className="space-y-2">
            {orgTree.map((node) => (
              <OrgNode key={node.id} node={node} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-12">No organization data available</p>
        )}
      </div>
    </DashboardLayout>
  );
}
