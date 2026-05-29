import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Compact icon-only button with a guaranteed ≥ 40 × 40 hit area.
 *
 * The visual icon stays small; we expand the tap target with padding +
 * negative margin so layout doesn't shift. Use this in place of raw
 * `<button className="p-0.5 hover:bg-secondary">` chrome on every
 * card-row action (edit, delete, view, etc).
 *
 * Variants:
 *  - default  : muted text, secondary hover
 *  - active   : primary tint, used when the button represents an open state
 *  - danger   : rose hover, for destructive actions
 */
type IconButtonVariant = "default" | "active" | "danger";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
}

const variantClasses: Record<IconButtonVariant, string> = {
  default:
    "text-muted-foreground hover:bg-secondary hover:text-foreground",
  active: "bg-primary/10 text-primary hover:bg-primary/20",
  danger: "text-muted-foreground hover:bg-rose-50 hover:text-rose-700",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", type = "button", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          // 40 × 40 hit area on every viewport; negative margin keeps layout tight
          "inline-flex items-center justify-center w-10 h-10 -m-1.5 rounded-md transition-colors",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
