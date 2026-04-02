"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { OrgChartNode } from "@/types";
import styles from "./OrgChart.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";

// Each child occupies a fixed-width slot so connector math is pixel-accurate
const SLOT_W = 200; // px — card is 180px + 10px padding each side

/* ── Card — fixed width, never stretches ─────────────────────────────────── */
function OrgCard({
  node,
  expanded,
  onToggle,
}: {
  node: OrgChartNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const directReports = node.children?.length ?? 0;
  const nameParts = node.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const photoUrl = node.profile_photo ? `${API_BASE}${node.profile_photo}` : null;
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const hasChildren = directReports > 0;

  return (
    <div className="w-[180px] bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      {/* Blue top accent */}
      <div className="h-1 w-full bg-blue-500" />

      {/* Clickable body */}
      <Link
        href={`/employees/${node.id}`}
        className="flex flex-col items-center px-3 pt-4 pb-2 gap-1 hover:bg-blue-50 transition-colors group"
      >
        {/* Avatar + badge */}
        <div className="relative mb-1">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={node.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 border-2 border-white shadow flex items-center justify-center text-white font-bold text-base">
              {initials}
            </div>
          )}
          {hasChildren && (
            <span className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow border-2 border-white leading-none">
              {directReports}
            </span>
          )}
        </div>

        {/* Name */}
        <p className="text-blue-600 group-hover:text-blue-800 font-semibold text-sm text-center leading-tight">
          {node.name}
        </p>

        {/* Designation */}
        {node.designation && (
          <p className="text-gray-500 text-[11px] text-center leading-tight line-clamp-2">
            {node.designation}
          </p>
        )}

        {/* Location */}
        {node.location && (
          <div className="flex items-center justify-center gap-0.5 mt-0.5 mb-1">
            <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <p className="text-[11px] text-gray-400 truncate">{node.location}</p>
          </div>
        )}
      </Link>

      {/* Chevron */}
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          className="border-t border-gray-100 py-1.5 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      ) : (
        <div className="h-2" />
      )}
    </div>
  );
}

/* ── OrgNode — card + children rendered in independent blocks ────────────── */
function OrgNode({ node, level = 0 }: { node: OrgChartNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;
  const childCount = node.children?.length ?? 0;

  // Total pixel width of the children row
  const rowWidth = childCount * SLOT_W;

  const wrapperWidth = hasChildren && expanded ? Math.max(rowWidth, SLOT_W) : SLOT_W;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <div className={styles.nodeWrapper} style={{ "--node-width": `${wrapperWidth}px` } as any}>
      <div className="flex justify-center w-full">
        <OrgCard node={node} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
      </div>

      {hasChildren && expanded && (
        <>
          <div className="w-px h-8 bg-gray-300" />

          {childCount === 1 ? (
            <OrgNode node={node.children[0]} level={level + 1} />
          ) : (
            <>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <div className={styles.bracket} style={{ "--row-width": `${rowWidth}px` } as any}>
                <div
                  className={styles.bracketLine}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  style={{ "--bracket-left": `${SLOT_W / 2}px`, "--bracket-width": `${(childCount - 1) * SLOT_W}px` } as any}
                />
              </div>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <div className={styles.childrenRow} style={{ "--row-width": `${rowWidth}px` } as any}>
                {node.children.map((child) => (
                  <div
                    key={child.id}
                    className={styles.childSlot}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={{ "--slot-width": `${SLOT_W}px` } as any}
                  >
                    <div className="w-px h-8 bg-gray-300" />
                    <OrgNode node={child} level={level + 1} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function OrgChartPage() {
  const { data: orgTree, loading } = useApi<OrgChartNode[]>("/org-chart");
  const [searchQuery, setSearchQuery] = useState("");

  const filterNodes = (nodes: OrgChartNode[], query: string): OrgChartNode[] => {
    if (!query) return nodes;
    return nodes.reduce<OrgChartNode[]>((acc, node) => {
      const matches =
        node.name.toLowerCase().includes(query.toLowerCase()) ||
        node.designation?.toLowerCase().includes(query.toLowerCase()) ||
        node.email?.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = filterNodes(node.children || [], query);
      if (matches || filteredChildren.length > 0) {
        acc.push({ ...node, children: matches ? node.children : filteredChildren });
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-gray-500">
          {orgTree ? `${totalCount(orgTree)} team members` : "Loading..."}
        </p>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 w-56 sm:w-64"
          />
        </div>
      </div>

      {/* Chart canvas */}
      <div className="card p-0 overflow-auto bg-gray-50 min-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>
        ) : filteredTree.length > 0 ? (
          <div className="p-10 w-max mx-auto">
            {filteredTree.map((root) => (
              <OrgNode key={root.id} node={root} level={0} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-gray-500 font-medium">No organization data</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? "Try a different search term" : "No hierarchy data available"}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
