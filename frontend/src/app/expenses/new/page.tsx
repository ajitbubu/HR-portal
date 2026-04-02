"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";

export default function NewExpensePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/expenses/claims", { title, description });
      router.push("/expenses");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create claim");
    }
  };

  return (
    <DashboardLayout title="New Expense Claim">
      <div className="card max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field w-full" placeholder="e.g., March Travel Expenses" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field w-full" rows={3} placeholder="Brief description..." />
          </div>
          <button type="submit" className="btn-primary w-full">Create Claim</button>
        </form>
      </div>
    </DashboardLayout>
  );
}
