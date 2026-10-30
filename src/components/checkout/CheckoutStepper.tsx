"use client";

import React from "react";
import { Check, ShoppingBag, Truck, CreditCard, CheckCircle2 } from "lucide-react";

export type CheckoutStep = "cart" | "shipping" | "payment" | "confirmation";

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
}

const STEPS: { id: CheckoutStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "cart", label: "Shopping Bag", icon: ShoppingBag },
  { id: "shipping", label: "Shipping & Contact", icon: Truck },
  { id: "payment", label: "Payment & Review", icon: CreditCard },
  { id: "confirmation", label: "Confirmation", icon: CheckCircle2 },
];

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full py-4 mb-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle & Label */}
              <div className="flex flex-col items-center relative group">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 font-mono text-xs font-semibold ${
                    isCompleted
                      ? "bg-emerald-600 text-white shadow-xs"
                      : isCurrent
                      ? "bg-bronze text-white ring-4 ring-bronze/20 shadow-xs"
                      : "bg-canvas-secondary border border-border-default text-charcoal-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <span
                  className={`text-[11px] uppercase tracking-luxury mt-2 font-medium transition-colors ${
                    isCurrent
                      ? "text-charcoal-900 font-bold"
                      : isCompleted
                      ? "text-emerald-700"
                      : "text-charcoal-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting Line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-2 sm:mx-4 transition-colors duration-300 ${
                    idx < currentIndex ? "bg-emerald-600" : "bg-border-default"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
