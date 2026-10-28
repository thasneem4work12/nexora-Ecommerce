"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, KeyRound, AlertCircle, ArrowRight } from "lucide-react";

function PilotAccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pilot/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: accessKey.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Redirection to return URL or home
        router.push(returnUrl);
        router.refresh();
      } else {
        setError(data.error || "Authentication failed. Invalid invitation key.");
      }
    } catch {
      setError("Network or server connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-200 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-[#1c1917] border border-stone-800 rounded-none shadow-2xl p-8 sm:p-10">
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex p-3 bg-stone-900 border border-stone-800 text-amber-500 rounded-full mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <p className="text-xs font-mono tracking-widest text-amber-500/80 uppercase">
            Private Technical Pilot
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-100 tracking-wider">
            NEXORA Atelier
          </h1>
          <div className="h-0.5 w-16 bg-amber-600/50 mx-auto" />
          <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto">
            This staging deployment is restricted to authorized testers and invited patrons. Enter your assigned pilot passkey.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-6">
          <div>
            <label
              htmlFor="pilot-key"
              className="block text-xs font-medium uppercase tracking-wider text-stone-400 mb-2"
            >
              Invitation Passkey
            </label>
            <input
              id="pilot-key"
              type="password"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="e.g. nxr_pilot_..."
              required
              disabled={loading}
              className="w-full bg-[#0c0a09] border border-stone-800 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !accessKey.trim()}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-semibold py-3 px-6 text-xs tracking-widest uppercase flex items-center justify-center space-x-2 transition-all shadow-md"
          >
            {loading ? (
              <span>Verifying Passkey...</span>
            ) : (
              <>
                <span>Enter Atelier</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-800/80 text-center text-[11px] text-stone-500 space-y-1">
          <div className="flex items-center justify-center space-x-1.5 text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500/80" />
            <span>Cryptographically Verified Staging Gate</span>
          </div>
          <p>DEMO ENVIRONMENT • No real financial payments processed</p>
        </div>
      </div>
    </div>
  );
}

export default function PilotAccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0a09]" />}>
      <PilotAccessForm />
    </Suspense>
  );
}
