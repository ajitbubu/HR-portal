"use client";

import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import type { AttendanceRecord } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";

export default function AttendancePage() {
  const { user } = useAuth();
  const { data: records, refetch } = useApi<AttendanceRecord[]>("/attendance/my-records");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "warn">("success");
  const [showQR, setShowQR] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setMsg = (text: string, type: "success" | "error" | "warn" = "success") => {
    setMessage(text);
    setMsgType(type);
  };

  const checkIn = async () => {
    try {
      const res = await api.post<{ message: string; time: string; late_minutes: number }>("/attendance/check-in");
      setMsg(res.message, res.late_minutes > 0 ? "warn" : "success");
      refetch();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed", "error");
    }
  };

  const checkOut = async () => {
    try {
      const res = await api.post<{ message: string; hours_worked: number }>("/attendance/check-out");
      setMsg(`Checked out. Hours worked: ${res.hours_worked}h`);
      refetch();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed", "error");
    }
  };

  const startScan = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setMsg("Camera access denied", "error");
      setScanning(false);
    }
  };

  const stopScan = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const qrUrl = user?.employee_id
    ? `${API_BASE}/api/attendance/qr-code/${user.employee_id}?token=${localStorage.getItem("access_token")}`
    : null;

  const msgColor = msgType === "error" ? "text-red-600" : msgType === "warn" ? "text-amber-600" : "text-green-600";

  return (
    <DashboardLayout title="Attendance">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button type="button" onClick={checkIn} className="btn-primary">
          <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Check In
        </button>
        <button type="button" onClick={checkOut} className="btn-secondary">
          <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Check Out
        </button>
        {/* QR Code button hidden temporarily */}
        {message && <span className={`self-center text-sm font-medium ${msgColor}`}>{message}</span>}
      </div>

      {/* QR Code Panel hidden temporarily */}

      {/* Attendance Records */}
      <div className="card">
        <h4 className="font-semibold text-gray-900 mb-4">Attendance Records</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Punctuality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records?.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 text-sm">{r.date}</td>
                  <td className="py-2.5 text-sm font-mono">{r.check_in ? r.check_in.slice(0, 5) : "-"}</td>
                  <td className="py-2.5 text-sm font-mono">{r.check_out ? r.check_out.slice(0, 5) : "-"}</td>
                  <td className="py-2.5 text-sm">{r.hours_worked ? `${r.hours_worked}h` : "-"}</td>
                  <td className="py-2.5">
                    <span className={`badge ${r.status === "present" ? "badge-success" : r.status === "absent" ? "badge-danger" : "badge-info"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {(r.late_minutes ?? 0) > 0 ? (
                      <span className="badge badge-warning">Late {r.late_minutes}m</span>
                    ) : r.check_in ? (
                      <span className="badge badge-success">On time</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!records || records.length === 0) && <p className="text-sm text-gray-500 text-center py-8">No records</p>}
      </div>
    </DashboardLayout>
  );
}
