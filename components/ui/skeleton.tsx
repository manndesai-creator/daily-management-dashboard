import { cn } from "@/lib/utils";

/**
 * Plain shimmer block used for loading states. Three or four of these stacked
 * inside a list region read as "data on the way" without spinner anxiety.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        className
      )}
      {...props}
    />
  );
}
