"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { UserPlus, AlertCircle, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await signUp.email({
        name,
        email,
        password,
      });

      if (res.error) {
        setErrorMessage(res.error.message || "Failed to register account.");
        setIsLoading(false);
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setErrorMessage("An unexpected registration error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-canvas-surface border border-border-default p-8 sm:p-10 shadow-editorial">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-3 bg-canvas-secondary border border-border-subtle text-bronze mb-2">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
            Create Client Profile
          </h1>
          <p className="text-xs text-charcoal-500 font-light">
            Register to join the NEXORA private circle for bespoke services and early editions.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-xs uppercase tracking-luxury text-charcoal-900 font-semibold mb-1"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lord / Lady Sterling"
              className="w-full bg-canvas-primary border border-border-default px-4 py-2.5 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none transition-colors"
            />
          </div>

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
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-luxury text-charcoal-900 font-semibold mb-1"
            >
              Password (Min. 8 characters)
            </label>
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

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs uppercase tracking-luxury text-charcoal-900 font-semibold mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-canvas-primary border border-border-default px-4 py-2.5 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none transition-colors"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="w-full mt-4"
          >
            Create Profile <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border-subtle text-center text-xs text-charcoal-500">
          <span>Already registered? </span>
          <Link
            href="/login"
            className="text-bronze font-semibold uppercase tracking-wider hover:underline ml-1"
          >
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
