import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-primary text-primary-foreground hover:opacity-90":
            variant === "default",

          "bg-secondary text-secondary-foreground hover:opacity-90":
            variant === "secondary",

          "border border-border bg-transparent hover:bg-muted":
            variant === "outline",

          "hover:bg-muted":
            variant === "ghost",

          "bg-destructive text-destructive-foreground hover:opacity-90":
            variant === "destructive",
        },
        {
          "h-8 px-3 text-sm": size === "sm",
          "h-10 px-4 text-sm": size === "md",
          "h-11 px-6 text-base": size === "lg",
        },
        className
      )}
      {...props}
    />
  );
}