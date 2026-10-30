"use client";

import React from "react";
import { useTour } from "./TourContext";
import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

interface GuidedTourTriggerProps {
  tourId: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function GuidedTourTrigger({
  tourId,
  label = "Take a 30s Tour",
  variant = "outline",
  size = "sm",
  className,
}: GuidedTourTriggerProps) {
  const { replayTour } = useTour();

  return (
    <Button
      variant={variant}
      size={size}
      type="button"
      onClick={() => replayTour(tourId)}
      className={className}
    >
      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-bronze" />
      <span>{label}</span>
    </Button>
  );
}
