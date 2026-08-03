export default function Home() {
  return (
    <section style={{ padding: "60px 24px", textAlign: "center" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
        Welcome to{" "}
        <span
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AnimeKun
        </span>
      </h1>
      <p style={{ marginTop: "16px", color: "var(--text-secondary)", fontSize: "1.1rem" }}>
        Your anime journey starts here.
      </p>
    </section>
  );
}
