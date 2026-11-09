"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CourseItLogo } from "@/components/CourseItLogo";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] text-[#0f1611]">
      <header className="h-16 px-6 bg-white border-b border-[#0f1611]/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CourseItLogo size="default" />
          <Link href="/admin" className="text-xs font-semibold text-[#4c4c3d] hover:underline">
            ← Admin Console
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        <h1 className="text-3xl font-display font-bold text-[#0f1611]">User Management</h1>
        <p className="text-xs sm:text-sm text-[#4c4c3d] mt-1">
          Registered accounts, roles, subscription tiers, and study streaks.
        </p>

        <div className="mt-8 bg-white rounded-3xl border border-[#0f1611]/10 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#4c4c3d]">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#f6f7f1] border-b border-[#0f1611]/10 text-[#4c4c3d] font-semibold">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Streak</th>
                    <th className="p-4">Daily Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f1611]/10">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-black/5">
                      <td className="p-4">
                        <strong className="block text-[#0f1611]">{u.name}</strong>
                        <span className="text-xs text-[#4c4c3d]">{u.email}</span>
                      </td>
                      <td className="p-4 font-semibold">{u.role}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-[#e4e9c6] text-[#4b5e1e] font-bold text-xs">
                          {u.plan}
                        </span>
                      </td>
                      <td className="p-4 font-semibold">{u.streak}d</td>
                      <td className="p-4">{u.dailyStudyTime} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
