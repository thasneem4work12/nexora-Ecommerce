import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-bronze hover:bg-bronze-dark text-white shadow-sm hover:shadow active:scale-[0.99]",
        secondary:
          "bg-canvas-secondary text-charcoal-900 border border-border-default hover:bg-canvas-primary active:scale-[0.99]",
        charcoal:
          "bg-charcoal-900 text-canvas-primary hover:bg-black shadow-sm active:scale-[0.99]",
        outline:
          "border border-border-strong text-charcoal-900 hover:border-bronze hover:text-bronze bg-transparent",
        ghost:
          "text-charcoal-700 hover:text-charcoal-900 hover:bg-canvas-secondary/60 bg-transparent",
        link:
          "text-bronze hover:text-bronze-dark underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-3 text-xs tracking-wider uppercase",
        md: "h-11 px-6 text-sm tracking-wider uppercase",
        lg: "h-13 px-8 text-base tracking-wider uppercase",
        icon: "h-10 w-10",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      rounded: "none", // Luxury editorial aesthetic favors sharp, clean corners
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      rounded,
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
