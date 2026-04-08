"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

  /* Shared avatar + info block used in both manager and IC variants */
  const avatar = (
    <div className="relative mb-1">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={node.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow" />
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
  );

  const nameBlock = (
    <>
      <p className="text-blue-600 font-semibold text-sm text-center leading-tight">{node.name}</p>
      {node.designation && (
        <p className="text-gray-500 text-[11px] text-center leading-tight line-clamp-2">{node.designation}</p>
      )}
      {node.location && (
        <div className="flex items-center justify-center gap-0.5 mt-0.5 mb-1">
          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p className="text-[11px] text-gray-400 truncate">{node.location}</p>
        </div>
      )}
    </>
  );

  return (
    <div className="w-[180px] bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      <div className="h-1 w-full bg-blue-500" />

      {hasChildren ? (
        /* Manager: clicking the body expands/collapses the team.
           A small profile link in the top-right corner navigates to the employee page. */
        <div className="relative">
          <button
            type="button"
            onClick={onToggle}
            className="w-full flex flex-col items-center px-3 pt-4 pb-2 gap-1 hover:bg-blue-50 transition-colors text-left"
          >
            {avatar}
            {nameBlock}
          </button>
          {/* Profile navigation — separate from the toggle */}
          <Link
            href={`/employees/${node.id}`}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 p-1 rounded-full text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
            title={`View ${node.name}'s profile`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </Link>
        </div>
      ) : (
        /* Individual contributor: clicking the body navigates to their profile */
        <Link
          href={`/employees/${node.id}`}
          className="flex flex-col items-center px-3 pt-4 pb-2 gap-1 hover:bg-blue-50 transition-colors group"
        >
          {avatar}
          {nameBlock}
        </Link>
      )}

      {/* Chevron — always visible for managers as a secondary expand/collapse affordance */}
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

// Pre-compute the initial subtree width: level 0 starts expanded, level 1+ starts collapsed.
function computeInitialWidth(node: OrgChartNode, level: number): number {
  if (!node.children?.length || level >= 1) return SLOT_W;
  if (node.children.length === 1) return computeInitialWidth(node.children[0], level + 1);
  return node.children.reduce((sum, child) => sum + computeInitialWidth(child, level + 1), 0);
}

/* ── OrgNode — card + children rendered in independent blocks ────────────── */
function OrgNode({
  node,
  level = 0,
  onWidthChange,
}: {
  node: OrgChartNode;
  level?: number;
  onWidthChange?: (width: number) => void;
}) {
  // Start with 1 level expanded — keeps parent cards evenly spaced with no gaps.
  // Clicking any manager card (or its chevron) expands their team on demand.
  const [expanded, setExpanded] = useState(level < 1);

  // Track the actual subtree width of each child (may differ from SLOT_W when children expand)
  const [childWidths, setChildWidths] = useState<Record<number, number>>(() => {
    const widths: Record<number, number> = {};
    for (const child of node.children ?? []) {
      widths[child.id] = computeInitialWidth(child, level + 1);
    }
    return widths;
  });

  const hasChildren = (node.children?.length ?? 0) > 0;
  const childCount = node.children?.length ?? 0;

  // Compute this node's total subtree width from child widths
  const subtreeWidth = useMemo(() => {
    if (!hasChildren || !expanded) return SLOT_W;
    if (childCount === 1) return Math.max(childWidths[node.children[0].id] ?? SLOT_W, SLOT_W);
    const total = node.children.reduce((sum, c) => sum + (childWidths[c.id] ?? SLOT_W), 0);
    return Math.max(total, SLOT_W);
  }, [hasChildren, expanded, childCount, childWidths, node.children]);

  // Use ref so children can always call the latest onWidthChange without re-triggering effects
  const onWidthChangeRef = useRef(onWidthChange);
  useEffect(() => { onWidthChangeRef.current = onWidthChange; });

  // Notify parent when our subtree width changes (e.g. user toggles expand/collapse)
  useEffect(() => {
    onWidthChangeRef.current?.(subtreeWidth);
  }, [subtreeWidth]);

  const handleChildWidthChange = useCallback((childId: number, width: number) => {
    setChildWidths((prev) => {
      if (prev[childId] === width) return prev; // no-op if unchanged
      return { ...prev, [childId]: width };
    });
  }, []);

  // Stable per-child callbacks so children don't re-trigger their width effects unnecessarily
  const childCallbacks = useMemo(() => {
    const cbs: Record<number, (w: number) => void> = {};
    for (const child of node.children ?? []) {
      cbs[child.id] = (w: number) => handleChildWidthChange(child.id, w);
    }
    return cbs;
  }, [node.children, handleChildWidthChange]);

  // Slot widths and bracket geometry based on ACTUAL child subtree widths
  const slotWidths = (node.children ?? []).map((c) => childWidths[c.id] ?? SLOT_W);
  const rowWidth = slotWidths.reduce((s, w) => s + w, 0);
  const bracketLeft = (slotWidths[0] ?? SLOT_W) / 2;
  const bracketWidth = rowWidth - bracketLeft - (slotWidths[slotWidths.length - 1] ?? SLOT_W) / 2;

  // The card must sit above the visual center of the bracket (midpoint of leftmost→rightmost child),
  // NOT at rowWidth/2 — those differ when first and last slots have different widths.
  const cardCenter = (() => {
    if (!hasChildren || !expanded) return SLOT_W / 2;
    if (childCount === 1) return Math.max(childWidths[node.children[0].id] ?? SLOT_W, SLOT_W) / 2;
    return bracketLeft + bracketWidth / 2; // midpoint between first-child-center and last-child-center
  })();
  const CARD_W = 180; // matches w-[180px] on OrgCard
  const cardLeft = Math.max(0, cardCenter - CARD_W / 2);

  return (
    <div
      className={styles.nodeWrapper}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={{ "--node-width": `${subtreeWidth}px`, "--card-left": `${cardLeft}px`, "--card-center": `${cardCenter}px` } as any}
    >
      {/* Offset the card so its centre aligns with the bracket midpoint */}
      <div className={styles.cardOffset}>
        <OrgCard node={node} expanded={expanded} onToggle={() => setExpanded((e) => !e)} />
      </div>

      {hasChildren && expanded && (
        <>
          {/* Vertical connector — must also be at cardCenter, not nodeWrapper centre */}
          <div className={`${styles.vConnector} h-8`} />

          {childCount === 1 ? (
            <OrgNode
              node={node.children[0]}
              level={level + 1}
              onWidthChange={childCallbacks[node.children[0].id]}
            />
          ) : (
            <>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <div className={styles.bracket} style={{ "--row-width": `${rowWidth}px` } as any}>
                <div
                  className={styles.bracketLine}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  style={{ "--bracket-left": `${bracketLeft}px`, "--bracket-width": `${bracketWidth}px` } as any}
                />
              </div>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <div className={styles.childrenRow} style={{ "--row-width": `${rowWidth}px` } as any}>
                {node.children.map((child, index) => (
                  <div
                    key={child.id}
                    className={styles.childSlot}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={{ "--slot-width": `${slotWidths[index]}px` } as any}
                  >
                    <div className="w-px h-8 bg-gray-300" />
                    <OrgNode
                      node={child}
                      level={level + 1}
                      onWidthChange={childCallbacks[child.id]}
                    />
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
