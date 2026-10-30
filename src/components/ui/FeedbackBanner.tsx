import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export interface FeedbackBannerProps {
  type?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function FeedbackBanner({
  type = "info",
  title,
  message,
  onDismiss,
  className,
}: FeedbackBannerProps) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };
  const Icon = icons[type];

  const variantStyles = {
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    error: "bg-rose-50 text-rose-900 border-rose-200",
    warning: "bg-amber-50 text-amber-900 border-amber-200",
    info: "bg-blue-50 text-blue-900 border-blue-200",
  }[type];

  const iconColors = {
    success: "text-emerald-600",
    error: "text-rose-600",
    warning: "text-amber-600",
    info: "text-blue-600",
  }[type];

  return (
    <div
      role="status"
      className={cn(
        "p-4 rounded-card border flex items-start gap-3 transition-all duration-200 text-xs",
        variantStyles,
        className
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", iconColors)} />
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="font-semibold text-charcoal-900">{title}</h5>}
        <p className="font-normal leading-relaxed">{message}</p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 -mr-1 -mt-1 text-inherit opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
