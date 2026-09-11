"use client";
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"
        aria-label="Loading"
      />
    </main>
  );
}