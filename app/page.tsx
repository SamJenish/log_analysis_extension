"use client";

import { FormEvent, useState } from "react";

export default function HomePage() {
  const [logText, setLogText] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log: logText }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze logs");
      }

      const data = await response.json();
      setAnalysis(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <h1>Log Failure Analyzer</h1>
        <p>Analyze deployment logs, detect failures, and get actionable remediation guidance.</p>
      </section>

      <form onSubmit={handleSubmit} className="analyze-form">
        <label htmlFor="log-input">Paste deployment log output</label>
        <textarea
          id="log-input"
          value={logText}
          onChange={(event) => setLogText(event.target.value)}
          placeholder="Paste CI/CD or container logs here"
          rows={12}
        />

        <button type="submit" disabled={loading || !logText.trim()}>
          {loading ? "Analyzing..." : "Analyze Log"}
        </button>
      </form>

      {error ? <div className="status-card error">{error}</div> : null}
      {analysis ? <div className="status-card result"><pre>{analysis}</pre></div> : null}
    </main>
  );
}
