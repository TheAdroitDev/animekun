import type { DialogHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type DialogProps = DialogHTMLAttributes<HTMLDialogElement>;

export function Dialog({
  className,
  ...props
}: DialogProps) {
  return (
    <dialog
      className={cn(
        "rounded-lg border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/50",
        className
      )}
      {...props}
    />
  );
}