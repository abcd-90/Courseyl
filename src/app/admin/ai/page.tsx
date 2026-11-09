"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CourseItLogo } from "@/components/CourseItLogo";

export default function AdminAiConfigPage() {
  const [provider, setProvider] = useState("NVIDIA_NEMOTRON");
  const [model, setModel] = useState("nvidia/nemotron-4-340b-instruct");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/ai-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setProvider(data.config.provider);
          setModel(data.config.model);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model }),
      });
      if (res.ok) {
        setMsg("AI configuration updated successfully!");
      }
    } catch {
      setMsg("Failed to save AI configuration.");
    } finally {
      setSaving(false);
    }
  };

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

      <main className="flex-1 max-w-2xl mx-auto px-6 py-12 w-full">
        <h1 className="text-3xl font-display font-bold text-[#0f1611]">AI Provider Configuration</h1>
        <p className="text-xs sm:text-sm text-[#4c4c3d] mt-1">
          Configure the LLM generation pipeline for video segmentation, notes, and quiz generation.
        </p>

        <form onSubmit={handleSave} className="mt-8 bg-white rounded-3xl border border-[#0f1611]/10 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <label className="block text-xs font-semibold text-[#4c4c3d] uppercase tracking-wider mb-2">
              Primary AI Engine
            </label>
            <div className="space-y-3">
              {[
                { id: "NVIDIA_NEMOTRON", title: "NVIDIA Nemotron 4 (Recommended)", desc: "High-accuracy educational summarization and quiz generation" },
                { id: "OPENAI_COMPATIBLE", title: "OpenAI-Compatible Endpoint", desc: "Generic endpoint compatible with GPT-4o, vLLM, or Ollama" },
                { id: "HEURISTIC_MOCK", title: "Deterministic Heuristic Parser", desc: "Local fast fallback without external network API calls" },
              ].map((p) => (
                <label
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    provider === p.id
                      ? "border-[#4b5e1e] bg-[#e4e9c6]/40"
                      : "border-[#0f1611]/15 hover:bg-black/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    checked={provider === p.id}
                    onChange={() => setProvider(p.id)}
                    className="mt-1"
                  />
                  <div>
                    <strong className="text-sm font-semibold text-[#0f1611] block">{p.title}</strong>
                    <span className="text-xs text-[#4c4c3d]">{p.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4c4c3d] uppercase tracking-wider mb-2">
              Model Name / Tag
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#0f1611]/15 text-sm outline-none focus:border-[#4b5e1e]"
            />
          </div>

          {msg && <p className="text-xs font-semibold text-[#4b5e1e]">{msg}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-full bg-[#4b5e1e] text-[#f6f8ec] text-sm font-semibold hover:bg-[#3c4c16]"
          >
            {saving ? "Saving..." : "Save AI Configuration"}
          </button>
        </form>
      </main>
    </div>
  );
}
