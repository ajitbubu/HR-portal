"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LeaveBalance {
  leave_type: string;
  leave_code: string;
  entitled: number;
  used: number;
  pending: number;
  carried_forward: number;
  adjusted: number;
  remaining: number;
}

interface OrgLeaveBalance {
  employee_id: string;
  name: string;
  department: string | null;
  designation: string | null;
  manager_name: string | null;
  is_direct_report: boolean;
  balances: LeaveBalance[];
}

// ── Initials avatar ──────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(" ");
  return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

// ── Segment dot bar ──────────────────────────────────────────────────────────
const MAX_DOTS = 20;
function SegmentDots({ used, pending, remaining }: { used: number; pending: number; remaining: number }) {
  const total = used + pending + remaining;
  if (total <= 0) return <span className="text-xs text-gray-300">—</span>;
  const usedDots  = Math.round((used    / total) * MAX_DOTS);
  const pendDots  = Math.round((pending / total) * MAX_DOTS);
  const remDots   = MAX_DOTS - usedDots - pendDots;
  return (
    <div className="flex gap-px flex-wrap">
      {Array.from({ length: usedDots  }).map((_, i) => <div key={`u${i}`} className="w-2 h-2 rounded-sm bg-red-400" />)}
      {Array.from({ length: pendDots  }).map((_, i) => <div key={`p${i}`} className="w-2 h-2 rounded-sm bg-amber-400" />)}
      {Array.from({ length: Math.max(0, remDots) }).map((_, i) => <div key={`r${i}`} className="w-2 h-2 rounded-sm bg-emerald-300" />)}
    </div>
  );
}

// ── Utilisation bar (stacked: used / pending / remaining) ────────────────────
function UtilBar({ used, pending, remaining }: { used: number; pending: number; remaining: number }) {
  const total = used + pending + remaining;
  if (total <= 0) return <span className="text-xs text-gray-300">—</span>;
  return (
    <div className="w-full space-y-1.5">
      <SegmentDots used={used} pending={pending} remaining={remaining} />
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-gray-400">{used}d used</span>
        {pending > 0 && <span className="text-xs text-amber-500">{pending}d pend.</span>}
        <span className="text-xs text-emerald-600 font-medium">{remaining}d left</span>
      </div>
    </div>
  );
}

// ── Expanded balance card ────────────────────────────────────────────────────
function BalanceCard({ b }: { b: LeaveBalance }) {
  const total = b.entitled + b.carried_forward + b.adjusted;
  const criticalRem = b.remaining <= 2 && total > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-700">{b.leave_type}</p>
          <p className="text-xs text-gray-400 font-mono">{b.leave_code}</p>
        </div>
        <span className={`text-lg font-bold ${criticalRem ? "text-red-600" : "text-gray-900"}`}>
          {b.remaining}<span className="text-xs font-normal text-gray-400">d</span>
        </span>
      </div>

      {/* Segment dot bar */}
      {total > 0 && (
        <div className="mb-3">
          <SegmentDots used={b.used} pending={b.pending} remaining={b.remaining} />
        </div>
      )}

      <div className="space-y-1">
        {[
          { label: "Entitled", val: b.entitled, cls: "text-gray-700" },
          { label: "Used",     val: b.used,     cls: "text-red-600" },
          { label: "Pending",  val: b.pending,  cls: "text-amber-600" },
          { label: "Carry fwd",val: b.carried_forward, cls: "text-gray-500" },
          { label: "Adjusted", val: b.adjusted, cls: "text-blue-600" },
        ].map(({ label, val, cls }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-gray-400">{label}</span>
            <span className={`font-medium ${cls}`}>{val}</span>
          </div>
        ))}
        <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5 mt-0.5">
          <span className="font-semibold text-gray-700">Remaining</span>
          <span className={`font-bold ${criticalRem ? "text-red-600" : "text-emerald-600"}`}>{b.remaining}</span>
        </div>
      </div>
    </div>
  );
}

// ── Custom tooltip for recharts ──────────────────────────────────────────────
const SERIES_DOT_CLASS: Record<string, string> = {
  Used:      "bg-red-400",
  Pending:   "bg-amber-400",
  Remaining: "bg-emerald-400",
};
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg px-3 py-2.5 text-xs min-w-[130px]">
      <p className="font-semibold text-gray-800 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className={`inline-block w-2 h-2 rounded-full ${SERIES_DOT_CLASS[p.name] ?? "bg-gray-400"}`} />
            {p.name}
          </span>
          <span className="font-semibold text-gray-800">{p.value}d</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function OrgLeaveBalancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [filter, setFilter] = useState<"all" | "direct">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chartLeaveCode, setChartLeaveCode] = useState("AL");

  const { data, loading, error } = useApi<OrgLeaveBalance[]>(
    `/leave/org-balance?year=${year}`,
    [year],
  );

  const filtered = useMemo(() => data?.filter((e) => {
    if (filter === "direct" && !e.is_direct_report) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.employee_id.toLowerCase().includes(q) ||
        (e.department?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  }), [data, filter, search]);

  const directCount = data?.filter((e) => e.is_direct_report).length ?? 0;
  const totalCount = data?.length ?? 0;

  // Aggregate stats across all employees
  const { totalUsed, totalRemaining, avgUtil, leaveCodes } = useMemo(() => {
    if (!data || data.length === 0) return { totalUsed: 0, totalRemaining: 0, avgUtil: 0, leaveCodes: [] };
    let used = 0, remaining = 0;
    const codesSet = new Set<string>();
    data.forEach((e) => e.balances.forEach((b) => {
      used += b.used;
      remaining += b.remaining;
      codesSet.add(b.leave_code);
    }));
    const total = used + remaining;
    return {
      totalUsed: used,
      totalRemaining: remaining,
      avgUtil: total > 0 ? Math.round((used / total) * 100) : 0,
      leaveCodes: Array.from(codesSet).sort(),
    };
  }, [data]);

  // Chart data: top 15 employees, for selected leave code
  const chartData = useMemo(() => {
    if (!data) return [];
    return data
      .map((e) => {
        const b = e.balances.find((x) => x.leave_code === chartLeaveCode);
        return { name: e.name.split(" ")[0], used: b?.used ?? 0, pending: b?.pending ?? 0, remaining: b?.remaining ?? 0 };
      })
      .filter((d) => d.used + d.pending + d.remaining > 0)
      .slice(0, 15);
  }, [data, chartLeaveCode]);

  return (
    <DashboardLayout title="Org Leave Balances">

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Direct Reports", value: directCount,
            icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
            color: "bg-primary-50 text-primary-600",
          },
          {
            label: "Org Members", value: totalCount,
            icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
            color: "bg-violet-50 text-violet-600",
          },
          {
            label: "Days Used (All)", value: totalUsed,
            icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
            color: "bg-red-50 text-red-600",
          },
          {
            label: "Avg Utilisation", value: `${avgUtil}%`,
            icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
            color: "bg-emerald-50 text-emerald-600",
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Utilisation chart ──────────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Leave Utilisation by Employee</h3>
              <p className="text-xs text-gray-400 mt-0.5">{year} · stacked by status</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Leave type:</span>
              <select
                title="Leave type for chart"
                value={chartLeaveCode}
                onChange={(e) => setChartLeaveCode(e.target.value)}
                className="input-field py-1 text-xs w-auto"
              >
                {leaveCodes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-4 mb-3 text-xs">
              {[
                { color: "bg-red-400",     label: "Used"      },
                { color: "bg-amber-400",   label: "Pending"   },
                { color: "bg-emerald-400", label: "Remaining" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-gray-500">
                  <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />
                  {label}
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="used"      stackId="a" fill="#f87171" name="Used"      radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending"   stackId="a" fill="#fbbf24" name="Pending"   radius={[0, 0, 0, 0]} />
                <Bar dataKey="remaining" stackId="a" fill="#34d399" name="Remaining" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(["all", "direct"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === v ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              {v === "all" ? `All (${totalCount})` : `Direct (${directCount})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search name, ID, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pl-9"
          />
        </div>
        <select
          title="Year"
          value={year}
          onChange={(e) => setYear(+e.target.value)}
          className="input-field w-auto"
        >
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── Error / Loading ─────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{error}</div>
      )}
      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
        </div>
      )}

      {/* ── Employee table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Department</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Reports To</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Annual Leave</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered?.map((emp) => {
                const al = emp.balances.find((b) => b.leave_code === "AL" || b.leave_code === "EL") ?? emp.balances[0];
                const isExpanded = expandedId === emp.employee_id;
                return (
                  <>
                    <tr
                      key={emp.employee_id}
                      className={`hover:bg-gray-50/70 transition-colors cursor-pointer ${isExpanded ? "bg-primary-50/30" : ""}`}
                      onClick={() => setExpandedId(isExpanded ? null : emp.employee_id)}
                    >
                      {/* Employee */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(emp.name)}`}>
                            {initials(emp.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-400">{emp.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      {/* Department */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-gray-700">{emp.department ?? "—"}</p>
                        <p className="text-xs text-gray-400">{emp.designation ?? ""}</p>
                      </td>
                      {/* Manager */}
                      <td className="px-5 py-3.5 hidden lg:table-cell text-sm text-gray-500">{emp.manager_name ?? "—"}</td>
                      {/* AL utilisation bar */}
                      <td className="px-5 py-3.5 min-w-[180px]">
                        {al ? (
                          <UtilBar used={al.used} pending={al.pending} remaining={al.remaining} />
                        ) : (
                          <span className="text-xs text-gray-300">No data</span>
                        )}
                      </td>
                      {/* Badge */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`badge ${emp.is_direct_report ? "badge-success" : "badge-gray"}`}>
                          {emp.is_direct_report ? "Direct" : "Indirect"}
                        </span>
                      </td>
                      {/* Expand toggle */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                          onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : emp.employee_id); }}
                        >
                          {isExpanded ? "Hide" : "Details"}
                          <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      </td>
                    </tr>

                    {/* Expanded balance cards */}
                    {isExpanded && (
                      <tr key={`${emp.employee_id}-detail`}>
                        <td colSpan={6} className="px-5 py-4 bg-gray-50/60 border-t border-gray-100">
                          {emp.balances.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-3">No leave balances recorded for {year}.</p>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                              {emp.balances.map((b) => <BalanceCard key={b.leave_code} b={b} />)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}

              {(!filtered || filtered.length === 0) && !loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <p className="text-sm text-gray-500 font-medium">
                      {data?.length === 0 ? "No employees in your org hierarchy." : "No employees match your filters."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
