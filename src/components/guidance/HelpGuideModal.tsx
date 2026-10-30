"use client";

import React, { useState } from "react";
import { useTour } from "./TourContext";
import { TOURS, type TourDefinition } from "./tour-definitions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HelpCircle, Play, CheckCircle2, Sparkles, BookOpen } from "lucide-react";

interface HelpGuideModalProps {
  role?: string;
  triggerClassName?: string;
}

export function HelpGuideModal({ role = "OWNER", triggerClassName }: HelpGuideModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { replayTour, isTourCompleted } = useTour();

  const applicableTours = Object.values(TOURS).filter(
    (t) => t.role === "ALL" || t.role === role || (role === "SUPERADMIN" && t.role === "OWNER")
  );

  const handleLaunch = (tourId: string) => {
    setIsOpen(false);
    setTimeout(() => {
      replayTour(tourId);
    }, 150);
  };

  return (
    <>
      <button
        type="button"
        data-tour="help-trigger"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ||
          "flex items-center gap-2 px-3 py-2 text-xs font-medium text-charcoal-600 hover:text-bronze hover:bg-canvas-secondary/60 rounded-btn transition-colors"
        }
        title="Interactive Guides & Help"
        aria-label="Interactive Guides & Help"
      >
        <HelpCircle className="w-4 h-4 text-bronze" />
        <span>Help & Guides</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Interactive Guides & Quick Help"
        description="Select a short guided walkthrough to master important workflows with real visual spotlights."
        size="md"
      >
        <div className="space-y-3">
          {applicableTours.map((tour) => {
            const completed = isTourCompleted(tour.id);
            return (
              <div
                key={tour.id}
                className="p-4 rounded-card border border-border-default hover:border-bronze bg-canvas-surface transition-all flex items-center justify-between gap-4 group"
              >
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-serif font-semibold text-charcoal-900 group-hover:text-bronze transition-colors">
                      {tour.title}
                    </h4>
                    {completed ? (
                      <Badge variant="success" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                      </Badge>
                    ) : (
                      <Badge variant="bronze" className="text-[10px] py-0 px-1.5">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-charcoal-500 font-light leading-relaxed">
                    {tour.description}
                  </p>
                  <span className="text-[10px] text-charcoal-400 font-mono block">
                    {tour.steps.length} interactive steps (~30 seconds)
                  </span>
                </div>

                <Button
                  variant={completed ? "outline" : "primary"}
                  size="sm"
                  onClick={() => handleLaunch(tour.id)}
                  className="h-8 px-3 text-xs shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{completed ? "Replay" : "Start"}</span>
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-5 p-3 rounded-card bg-canvas-secondary/40 border border-border-subtle flex items-center justify-between text-xs text-charcoal-600">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-bronze" />
            <span>Tours are non-destructive and can be skipped anytime.</span>
          </div>
          <span className="text-[11px] text-charcoal-400 font-mono">Press Esc to exit</span>
        </div>
      </Modal>
    </>
  );
}
