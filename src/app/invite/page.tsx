"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setLoading(false);
      return;
    }

    async function accept() {
      try {
        const res = await fetch("/api/admin/members/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.status === 401) {
          setRequiresAuth(true);
          setLoading(false);
          return;
        }

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to accept invitation.");
        }

        setBusinessName(data.businessName);
        setRole(data.role);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error accepting invitation.");
      } finally {
        setLoading(false);
      }
    }

    accept();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-primary flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-bronze border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs uppercase tracking-wider text-charcoal-600">
            Validating Atelier Invitation...
          </p>
        </div>
      </div>
    );
  }

  if (requiresAuth) {
    return (
      <div className="min-h-screen bg-canvas-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-canvas-surface border border-border-default rounded-card p-8 text-center space-y-6 shadow-xl">
          <div className="w-14 h-14 bg-bronze/10 rounded-full flex items-center justify-center mx-auto text-bronze">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-charcoal-900">Sign In to Accept</h1>
            <p className="text-xs text-charcoal-500 mt-2 leading-relaxed">
              Please sign in to your NEXORA account or register to accept your team invitation and access the administration suite.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Link
              href={`/login?returnTo=${encodeURIComponent(`/invite?token=${token}`)}`}
              className="block w-full"
            >
              <Button variant="primary" size="md" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link
              href={`/register?returnTo=${encodeURIComponent(`/invite?token=${token}`)}`}
              className="block w-full"
            >
              <Button variant="outline" size="md" className="w-full">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-canvas-surface border border-rose-200 rounded-card p-8 text-center space-y-6 shadow-xl">
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-charcoal-900">Invitation Unavailable</h1>
            <p className="text-xs text-charcoal-600 mt-2">{error}</p>
          </div>
          <Link href="/login" className="inline-block">
            <Button variant="outline" size="md">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-canvas-surface border border-border-default rounded-card p-8 text-center space-y-6 shadow-2xl">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Invitation Accepted
          </span>
          <h1 className="text-2xl font-serif text-charcoal-900 mt-1">
            Welcome to {businessName}
          </h1>
          <p className="text-xs text-charcoal-600 mt-2 leading-relaxed">
            Your privileges have been activated as <strong>{role}</strong>. You now have authorized access to manage products, orders, and storefront operations for this business.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/admin" className="block w-full">
            <Button variant="primary" size="md" className="w-full flex items-center justify-center">
              Enter Store Administration <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas-primary flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-bronze border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
