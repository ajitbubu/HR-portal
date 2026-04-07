"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFeatures } from "@/contexts/FeaturesContext";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface ModuleDef {
  key: string;
  label: string;
  description: string;
  icon: string;
  critical?: boolean;
}

const MODULE_GROUPS: { group: string; modules: ModuleDef[] }[] = [
  {
    group: "Workspace",
    modules: [
      { key: "timesheets",  label: "Timesheets",   description: "Time tracking, weekly submissions, and approval flow", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
      { key: "leave",       label: "Leave",         description: "Leave requests, approvals, and balance tracking", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" },
      { key: "resignation", label: "Resignation",   description: "Employee resignation workflows and offboarding", icon: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" },
      { key: "attendance",  label: "Attendance",    description: "Clock-in/out and attendance tracking", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
      { key: "documents",   label: "Documents",     description: "Document storage and management", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
      { key: "expenses",    label: "Expenses",      description: "Expense submissions and reimbursement approvals", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" },
      { key: "approvals",   label: "Approvals",     description: "Multi-level approval management hub", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    ],
  },
  {
    group: "People",
    modules: [
      { key: "employees",  label: "Employees",    description: "Employee records and HR management", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", critical: true },
      { key: "directory",  label: "Directory",    description: "Company-wide employee directory", icon: "M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" },
      { key: "org_chart",  label: "Org Chart",    description: "Visual organizational hierarchy", icon: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" },
      { key: "onboarding", label: "Onboarding",   description: "New employee onboarding task management", icon: "M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5z" },
    ],
  },
  {
    group: "Talent",
    modules: [
      { key: "recruitment", label: "Recruitment",  description: "Job postings, candidates, and interviews", icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" },
      { key: "training",    label: "Training",     description: "Learning paths, courses, and certifications", icon: "M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5z" },
      { key: "performance", label: "Performance",  description: "Performance reviews, goals, and ratings", icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
    ],
  },
  {
    group: "Insights",
    modules: [
      { key: "salary",         label: "Salary",         description: "Payroll, salary bands, and compensation", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5z" },
      { key: "reports",        label: "Reports",         description: "Analytics, charts, and HR reports", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
      { key: "announcements",  label: "Announcements",   description: "Company-wide announcements and notices", icon: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535" },
    ],
  },
];

export default function AdminConfigPage() {
  const { features, isEnabled, reload } = useFeatures();
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ key: string; enabled: boolean } | null>(null);

  // ── System Banner ────────────────────────────────────────────────────────
  const { isRole } = useAuth();
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerType, setBannerType] = useState<"info" | "warning" | "critical" | "success">("info");
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerToast, setBannerToast] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    fetch(`${apiBase}/admin/banner`)
      .then((r) => r.json())
      .then((d) => {
        setBannerEnabled(d.enabled ?? false);
        setBannerType(d.type ?? "info");
        setBannerMessage(d.message ?? "");
      })
      .catch(() => {});
  }, []);

  const saveBanner = async () => {
    setBannerSaving(true);
    try {
      await Promise.all([
        api.post("/admin/settings", { key: "banner.enabled", value: bannerEnabled ? "true" : "false", category: "banner", description: "Banner enabled state" }),
        api.post("/admin/settings", { key: "banner.type",    value: bannerType,                        category: "banner", description: "Banner type" }),
        api.post("/admin/settings", { key: "banner.message", value: bannerMessage,                     category: "banner", description: "Banner message" }),
      ]);
      setBannerToast("Banner settings saved");
      setTimeout(() => setBannerToast(null), 2500);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save banner settings");
    } finally {
      setBannerSaving(false);
    }
  };

  const toggleFeature = async (mod: ModuleDef) => {
    const newVal = !isEnabled(mod.key);
    setSaving(mod.key);
    try {
      await api.post("/admin/settings", {
        key:         `feature.${mod.key}`,
        value:       newVal ? "true" : "false",
        category:    "features",
        description: mod.description,
      });
      reload();
      setToast({ key: mod.key, enabled: newVal });
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update setting");
    } finally {
      setSaving(null);
    }
  };

  const totalModules   = MODULE_GROUPS.flatMap((g) => g.modules).length;
  const enabledModules = MODULE_GROUPS.flatMap((g) => g.modules).filter((m) => isEnabled(m.key)).length;

  return (
    <DashboardLayout title="Module Configuration">

      {/* Header stats */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 mt-1">
            Enable or disable application modules. Changes take effect immediately across the sidebar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-indigo-600">{enabledModules}</p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-400">{totalModules - enabledModules}</p>
            <p className="text-xs text-gray-400">Disabled</p>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold ${toast.enabled ? "bg-emerald-600 text-white" : "bg-gray-700 text-white"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={toast.enabled ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
          </svg>
          {toast.key} {toast.enabled ? "enabled" : "disabled"}
        </div>
      )}

      {/* Banner toast */}
      {bannerToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold bg-emerald-600 text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {bannerToast}
        </div>
      )}

      {/* System Banner section */}
      {(isRole("super_admin") || isRole("hr_admin")) && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">System Banner</h3>

          {/* Enable toggle */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Show banner to all users</p>
              <p className="text-xs text-gray-400 mt-0.5">Displays a fixed bar at the top of every page</p>
            </div>
            <button
              type="button"
              onClick={() => isRole("super_admin") && setBannerEnabled((v) => !v)}
              disabled={!isRole("super_admin")}
              aria-label={bannerEnabled ? "Disable banner" : "Enable banner"}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${bannerEnabled ? "bg-indigo-600" : "bg-gray-200"} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${bannerEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Type selector */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Banner Type</p>
            <div className="flex flex-wrap gap-2">
              {(["info", "warning", "critical", "success"] as const).map((t) => {
                const selected = bannerType === t;
                const colorMap = {
                  info:     { pill: "bg-blue-100 text-blue-800 border-blue-300",    active: "border-2 border-blue-600" },
                  warning:  { pill: "bg-amber-100 text-amber-800 border-amber-300", active: "border-2 border-amber-600" },
                  critical: { pill: "bg-red-100 text-red-800 border-red-300",       active: "border-2 border-red-600" },
                  success:  { pill: "bg-green-100 text-green-800 border-green-300", active: "border-2 border-green-600" },
                };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => isRole("super_admin") && setBannerType(t)}
                    disabled={!isRole("super_admin")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize transition-all disabled:opacity-50 disabled:cursor-not-allowed ${colorMap[t].pill} ${selected ? colorMap[t].active : "opacity-60"}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message textarea */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</p>
              <span className="text-xs text-gray-400">{bannerMessage.length} / 300</span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={bannerMessage}
              onChange={(e) => isRole("super_admin") && setBannerMessage(e.target.value)}
              readOnly={!isRole("super_admin")}
              placeholder="Enter announcement message..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none read-only:bg-gray-50 read-only:cursor-default"
            />
          </div>

          {/* Live preview */}
          {bannerEnabled && bannerMessage.trim() !== "" && (() => {
            const previewStyles = {
              info:     "bg-blue-100 text-blue-800 border-blue-200",
              warning:  "bg-amber-100 text-amber-800 border-amber-200",
              critical: "bg-red-100 text-red-800 border-red-200",
              success:  "bg-green-100 text-green-800 border-green-200",
            };
            const previewIcon = { info: "ℹ", warning: "⚠", critical: "✕", success: "✓" };
            return (
              <div className={`mb-5 h-10 flex items-center justify-between px-4 rounded-lg border text-sm font-medium ${previewStyles[bannerType]}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-base leading-none">{previewIcon[bannerType]}</span>
                  <span className="truncate">{bannerMessage}</span>
                </div>
                <span className="text-xs opacity-60 flex-shrink-0 ml-4">preview</span>
              </div>
            );
          })()}

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveBanner}
              disabled={bannerSaving || !isRole("super_admin")}
              title={!isRole("super_admin") ? "Only Super Admins can change the banner." : undefined}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {bannerSaving && <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
              Save Banner Settings
            </button>
            {!isRole("super_admin") && (
              <p className="text-xs text-gray-400">Only Super Admins can change the banner.</p>
            )}
          </div>
        </div>
      )}

      {/* Module groups */}
      <div className="space-y-8">
        {MODULE_GROUPS.map((group) => (
          <div key={group.group}>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">{group.group}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.modules.map((mod) => {
                const enabled = isEnabled(mod.key);
                const isSaving = saving === mod.key;

                return (
                  <div
                    key={mod.key}
                    className={`bg-white border rounded-xl p-4 shadow-sm flex items-start gap-4 transition-all ${enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${enabled ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{mod.label}</p>
                          {mod.critical && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Core</span>
                          )}
                        </div>

                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => toggleFeature(mod)}
                          disabled={isSaving}
                          aria-label={`${enabled ? "Disable" : "Enable"} ${mod.label}`}
                          title={`${enabled ? "Disable" : "Enable"} ${mod.label}`}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                            enabled ? "bg-indigo-600" : "bg-gray-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isSaving ? (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            </span>
                          ) : (
                            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{mod.description}</p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
        <strong>Note:</strong> Disabling a module hides it from the sidebar navigation. Existing data is preserved and the module can be re-enabled at any time. Core modules (marked as <strong>Core</strong>) should be disabled with caution.
      </div>
    </DashboardLayout>
  );
}
