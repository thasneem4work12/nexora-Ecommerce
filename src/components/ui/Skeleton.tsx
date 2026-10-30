import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rectangular" | "circular";
}

export function Skeleton({
  className,
  variant = "rectangular",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-canvas-secondary/80",
        variant === "text" && "h-4 rounded-sm w-full my-1",
        variant === "rectangular" && "rounded-card",
        variant === "circular" && "rounded-full aspect-square",
        className
      )}
      {...props}
    />
  );
}
