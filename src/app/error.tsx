"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-destructive">
        Something went wrong
      </p>

      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        We couldn't load this page
      </h1>

      <p className="mt-4 max-w-md text-muted-foreground">
        Something unexpected happened. Please try again.
      </p>

      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Try Again
      </button>
    </main>
  );
}