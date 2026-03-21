"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";

interface ProfileAvatarProps {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  editable?: boolean;
  onPhotoUpdated?: (newUrl: string) => void;
  className?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-24 h-24 text-3xl",
  "2xl": "w-28 h-28 text-4xl",
};

export default function ProfileAvatar({
  firstName,
  lastName,
  photoUrl,
  size = "md",
  editable = false,
  onPhotoUpdated,
  className = "",
}: ProfileAvatarProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
  const displayPhoto = localPhoto || (photoUrl ? `${API_BASE}${photoUrl}` : null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate client-side
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, or GIF images allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setError("");
    setUploading(true);

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setLocalPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.upload<{ profile_photo: string }>("/employees/profile-photo/upload", formData);
      onPhotoUpdated?.(res.profile_photo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLocalPhoto(null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const isLarge = size === "xl" || size === "2xl";

  return (
    <div className={`relative inline-flex ${className}`}>
      <div className={`${sizeClasses[size]} rounded-2xl flex items-center justify-center font-bold flex-shrink-0 overflow-hidden shadow-lg ring-4 ring-white ${
        displayPhoto ? "" : "bg-gradient-to-br from-primary-400 to-purple-500 text-white"
      }`}>
        {displayPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayPhoto} alt={`${firstName} ${lastName}`} className="w-full h-full object-cover" />
        ) : (
          initials
        )}

        {/* Upload overlay */}
        {editable && !uploading && (
          <button
            onClick={() => fileRef.current?.click()}
            className={`absolute inset-0 bg-black/0 hover:bg-black/40 flex items-center justify-center transition-all duration-200 rounded-2xl group ${
              isLarge ? "cursor-pointer" : ""
            }`}
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
              <svg className={`text-white ${isLarge ? "w-6 h-6" : "w-4 h-4"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              {isLarge && <span className="text-white text-[10px] font-medium mt-1">Change photo</span>}
            </div>
          </button>
        )}

        {/* Loading spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
            <div className={`border-2 border-white/30 border-t-white rounded-full animate-spin ${isLarge ? "w-6 h-6" : "w-4 h-4"}`} />
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleUpload}
        className="hidden"
      />

      {error && (
        <div className="absolute top-full left-0 mt-2 bg-red-50 text-red-700 text-xs px-3 py-1.5 rounded-lg ring-1 ring-red-100 whitespace-nowrap z-10 animate-fade-in">
          {error}
        </div>
      )}
    </div>
  );
}
