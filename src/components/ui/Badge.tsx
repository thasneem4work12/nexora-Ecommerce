import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-medium tracking-luxury uppercase select-none transition-colors",
  {
    variants: {
      variant: {
        default: "bg-canvas-secondary text-charcoal-700 border border-border-subtle",
        bronze: "bg-bronze/10 text-bronze border border-bronze/20",
        charcoal: "bg-charcoal-900 text-canvas-primary",
        success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
        warning: "bg-amber-50 text-amber-800 border border-amber-200",
        danger: "bg-rose-50 text-rose-800 border border-rose-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
