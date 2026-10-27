"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Shield, AlertCircle, ArrowRight } from "lucide-react";
import { getSafeCallbackUrl } from "@/lib/redirect-utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rawCallbackUrl = searchParams.get("callbackUrl");
  const targetUrl = getSafeCallbackUrl(rawCallbackUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res.error) {
        setErrorMessage(res.error.message || "Invalid credentials provided.");
        setIsLoading(false);
        return;
      }

      router.push(targetUrl);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected authentication error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-canvas-surface border border-border-default p-8 sm:p-10 shadow-editorial">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-3 bg-canvas-secondary border border-border-subtle text-bronze mb-2">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
            Client Authentication
          </h1>
          <p className="text-xs text-charcoal-500 font-light">
            Sign in to access your private orders, addresses, and bespoke preferences.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs uppercase tracking-luxury text-charcoal-900 font-semibold mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@domain.com"
              className="w-full bg-canvas-primary border border-border-default px-4 py-2.5 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="password"
                className="block text-xs uppercase tracking-luxury text-charcoal-900 font-semibold"
              >
                Password
              </label>
              <span className="text-[11px] text-bronze hover:underline cursor-pointer">
                Forgot?
              </span>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-canvas-primary border border-border-default px-4 py-2.5 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none transition-colors"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            Authenticate <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border-subtle text-center text-xs text-charcoal-500">
          <span>New to NEXORA? </span>
          <Link
            href="/register"
            className="text-bronze font-semibold uppercase tracking-wider hover:underline ml-1"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center py-16 px-4">
          <div className="text-center text-charcoal-500 font-light text-sm">
            Loading authentication portal...
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
