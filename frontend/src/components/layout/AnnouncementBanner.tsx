"use client";

import { useBanner } from "@/contexts/BannerContext";

const TYPE_STYLES = {
  info:     { bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-200",   icon: "ℹ" },
  warning:  { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-200",  icon: "⚠" },
  critical: { bg: "bg-red-100",    text: "text-red-800",    border: "border-red-200",    icon: "✕" },
  success:  { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-200",  icon: "✓" },
} as const;

export default function AnnouncementBanner() {
  const { bannerHeight, type, message, dismiss } = useBanner();

  if (bannerHeight === 0) return null;

  const styles = TYPE_STYLES[type];

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] h-10 flex items-center justify-between px-4 border-b text-sm font-medium ${styles.bg} ${styles.text} ${styles.border}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0 font-bold text-base leading-none">{styles.icon}</span>
        <span className="truncate">{message}</span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className={`flex-shrink-0 ml-4 p-1 rounded hover:opacity-70 transition-opacity ${styles.text}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
