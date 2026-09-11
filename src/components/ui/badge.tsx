import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline";
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-primary text-primary-foreground":
            variant === "default",

          "bg-secondary text-secondary-foreground":
            variant === "secondary",

          "border border-border bg-transparent":
            variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}