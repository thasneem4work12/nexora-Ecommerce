"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTour } from "./TourContext";
import { Button } from "@/components/ui/Button";
import { Sparkles, ArrowRight, ArrowLeft, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTour() {
  const { activeTour, currentStepIndex, nextStep, prevStep, skipTour, finishTour } =
    useTour();

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = activeTour ? activeTour.steps[currentStepIndex] : null;

  const updatePositions = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(step.target);
    if (!el) {
      // If target element is not found on page, center the dialog
      setTargetRect(null);
      setPopoverPos({
        top: window.innerHeight / 2 - 120,
        left: Math.max(16, window.innerWidth / 2 - 180),
      });
      return;
    }

    el.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
      inline: "center",
    });

    const rect = el.getBoundingClientRect();
    const padding = 8;
    const computedRect: TargetRect = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
    setTargetRect(computedRect);

    // Compute popover placement
    const popoverWidth = 360;
    const popoverHeight = 180;
    const margin = 16;

    let top = rect.bottom + margin;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;

    // Boundary checks
    if (top + popoverHeight > window.innerHeight) {
      // Place above target if bottom overflows
      top = rect.top - popoverHeight - margin;
    }
    if (top < margin) {
      top = margin;
    }
    if (left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    setPopoverPos({ top, left });
  }, [step]);

  // Handle resize and scroll
  useEffect(() => {
    if (!activeTour) return;

    updatePositions();
    const timer = setTimeout(updatePositions, 300); // Wait for scroll animation to settle

    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [activeTour, currentStepIndex, updatePositions]);

  // Keyboard navigation
  useEffect(() => {
    if (!activeTour) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTour, nextStep, prevStep, skipTour]);

  if (!activeTour || !step) return null;

  const isLastStep = currentStepIndex === activeTour.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
      className="fixed inset-0 z-[100] pointer-events-auto"
    >
      {/* SVG Spotlight Mask */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none transition-all duration-300"
        style={{ fillRule: "evenodd" }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout over target element */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="6"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark overlay with masked hole */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 14, 13, 0.75)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Target Highlight Ring */}
      {targetRect && (
        <div
          className="fixed pointer-events-none border-2 border-bronze rounded-lg transition-all duration-300 ring-4 ring-bronze/20 animate-pulse"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          }}
        />
      )}

      {/* Popover Card */}
      {popoverPos && (
        <div
          ref={popoverRef}
          className={cn(
            "fixed z-10 w-[360px] max-w-[calc(100vw-32px)] bg-canvas-surface rounded-card border border-border-default shadow-editorial-lg p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200"
          )}
          style={{
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-bronze/10 text-bronze">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="text-[10px] uppercase tracking-luxury text-bronze font-bold block">
                  Step {currentStepIndex + 1} of {activeTour.steps.length}
                </span>
                <h4 className="text-sm font-serif font-semibold text-charcoal-900 leading-tight">
                  {step.title}
                </h4>
              </div>
            </div>

            <button
              onClick={skipTour}
              className="p-1 text-charcoal-400 hover:text-charcoal-800 transition-colors rounded-sm"
              title="Skip Tour (Esc)"
              aria-label="Skip tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content - One simple sentence */}
          <p className="text-xs text-charcoal-700 font-light leading-relaxed">
            {step.content}
          </p>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <button
              onClick={skipTour}
              className="text-[11px] uppercase tracking-wider text-charcoal-400 hover:text-charcoal-700 transition-colors"
            >
              Skip
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  className="h-8 px-2.5 text-xs text-charcoal-600 hover:text-charcoal-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={isLastStep ? finishTour : nextStep}
                className="h-8 px-3 text-xs flex items-center gap-1.5 shadow-sm"
              >
                {isLastStep ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Got it!</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
