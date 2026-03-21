"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Avatar from "@/components/ui/Avatar";
import { useApi } from "@/hooks/useApi";
import type { OrgChartNode } from "@/types";

function OrgNode({ node, level = 0 }: { node: OrgChartNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="animate-fade-in">
      <div className="flex items-start gap-2">
        {/* Expand/collapse button */}
        <div className="pt-3 w-5 flex-shrink-0">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-5 h-5 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <svg className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            </div>
          )}
        </div>

        {/* Node card */}
        <Link
          href={`/employees/${node.id}`}
          className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group flex-1 min-w-0"
        >
          <Avatar
            firstName={node.name.split(" ")[0] || ""}
            lastName={node.name.split(" ").slice(1).join(" ") || ""}
            photoUrl={node.profile_photo}
            size="md"
            gradient={level === 0 ? "from-primary-500 to-purple-600" : level === 1 ? "from-primary-400 to-indigo-500" : "from-primary-200 to-indigo-200"}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">{node.name}</p>
              {hasChildren && (
                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0">
                  {node.children.length}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {node.designation}{node.department ? ` \u00b7 ${node.department}` : ""}
            </p>
          </div>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-6 pl-4 border-l-2 border-gray-100 mt-1 space-y-0.5">
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: orgTree } = useApi<OrgChartNode[]>("/org-chart");
  const [searchQuery, setSearchQuery] = useState("");

  const filterNodes = (nodes: OrgChartNode[], query: string): OrgChartNode[] => {
    if (!query) return nodes;
    return nodes.reduce<OrgChartNode[]>((acc, node) => {
      const matchesSearch = node.name.toLowerCase().includes(query.toLowerCase()) ||
        node.designation?.toLowerCase().includes(query.toLowerCase()) ||
        node.department?.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = filterNodes(node.children || [], query);
      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({ ...node, children: matchesSearch ? node.children : filteredChildren });
      }
      return acc;
    }, []);
  };

  const filteredTree = orgTree ? filterNodes(orgTree, searchQuery) : [];

  const totalCount = (nodes: OrgChartNode[]): number =>
    nodes.reduce((sum, n) => sum + 1 + totalCount(n.children || []), 0);

  return (
    <DashboardLayout title="Organization Chart">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">
            {orgTree ? `${totalCount(orgTree)} team members` : "Loading..."}
          </p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 w-64"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="card">
        {filteredTree.length > 0 ? (
          <div className="space-y-0.5">
            {filteredTree.map((node) => (
              <OrgNode key={node.id} node={node} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            <p className="text-gray-500 font-medium">No organization data</p>
            <p className="text-sm text-gray-400 mt-1">{searchQuery ? "Try a different search term" : "No hierarchy data available"}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
