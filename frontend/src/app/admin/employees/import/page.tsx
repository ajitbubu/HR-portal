"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface ImportResult {
  imported: number;
  errors: number;
  created: { employee_id: string; name: string }[];
  error_details: { row: number; error: string }[];
}

export default function ImportEmployeesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      return;
    }
    setFile(f);
    setResult(null);
    setError("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/reports/employees/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({ detail: res.statusText }));
      if (!res.ok) throw new Error(data.detail || "Import failed");
      setResult(data as ImportResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Import Employees">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-primary-600 hover:underline">← Admin Panel</Link>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Upload card */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">Bulk Employee Import</h3>
          <p className="text-sm text-gray-500 mb-6">
            Upload a CSV file to create multiple employees at once. User accounts are created automatically with the
            default password <span className="font-mono bg-gray-100 px-1 rounded text-xs">Welcome@123</span>. Leave
            balances are pro-rated based on the joining date.
          </p>

          {/* Column guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm">
            <p className="font-medium text-blue-800 mb-2">Required CSV columns</p>
            <code className="text-xs text-blue-700 block">
              first_name, last_name, email, employee_id
            </code>
            <p className="font-medium text-blue-800 mt-3 mb-2">Optional columns</p>
            <code className="text-xs text-blue-700 block">
              department, designation, location, joining_date (YYYY-MM-DD), role, employment_type, phone, gender
            </code>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Drop zone */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              aria-label="CSV file upload"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop zone for CSV file upload"
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary-400 bg-primary-50"
                  : file
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              {file ? (
                <div>
                  <svg className="w-10 h-10 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB — Click to replace</p>
                </div>
              ) : (
                <div>
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="font-medium text-gray-600">Drop your CSV here, or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Only .csv files accepted</p>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

            <button
              type="submit"
              disabled={!file || loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Importing…
                </span>
              ) : "Import Employees"}
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className="card space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-3xl font-bold text-green-600">{result.imported}</p>
                <p className="text-sm text-gray-600 mt-1">Imported</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <p className="text-3xl font-bold text-red-600">{result.errors}</p>
                <p className="text-sm text-gray-600 mt-1">Errors</p>
              </div>
            </div>

            {result.created.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Created Employees</h4>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {result.created.map((emp) => (
                    <div key={emp.employee_id} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="font-mono text-xs text-gray-400 w-20 flex-shrink-0">{emp.employee_id}</span>
                      <span className="text-gray-800">{emp.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.error_details.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2 text-sm">Import Errors</h4>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-red-100 divide-y divide-red-50 bg-red-50">
                  {result.error_details.map((err) => (
                    <div key={err.row} className="flex items-start gap-3 px-4 py-2 text-sm">
                      <span className="font-mono text-xs text-red-400 w-14 flex-shrink-0 mt-0.5">Row {err.row}</span>
                      <span className="text-red-700">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setFile(null); setResult(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="btn-secondary w-full"
            >
              Import Another File
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
