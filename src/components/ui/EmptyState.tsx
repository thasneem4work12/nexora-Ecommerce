import React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/Button";

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: ButtonProps["variant"];
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-canvas-surface rounded-card border border-dashed border-border-default space-y-4",
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-canvas-secondary border border-border-subtle flex items-center justify-center text-bronze shadow-xs">
        <Icon className="w-7 h-7" />
      </div>

      <div className="max-w-sm space-y-1.5">
        <h4 className="text-base font-serif font-semibold text-charcoal-900">
          {title}
        </h4>
        <p className="text-xs text-charcoal-500 font-light leading-relaxed">
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {action && (
            action.href ? (
              <a href={action.href}>
                <Button
                  variant={action.variant || "primary"}
                  size="sm"
                  className="text-xs flex items-center gap-1.5"
                >
                  {action.icon}
                  <span>{action.label}</span>
                </Button>
              </a>
            ) : (
              <Button
                variant={action.variant || "primary"}
                size="sm"
                onClick={action.onClick}
                className="text-xs flex items-center gap-1.5"
              >
                {action.icon}
                <span>{action.label}</span>
              </Button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <a href={secondaryAction.href}>
                <Button variant="ghost" size="sm" className="text-xs">
                  {secondaryAction.label}
                </Button>
              </a>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={secondaryAction.onClick}
                className="text-xs"
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
