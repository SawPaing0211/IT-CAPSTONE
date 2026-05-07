import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function StudentCodeModal({ submissionId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/api/instructor/submissions/${submissionId}/code`)
      .then((res) => setData(res))
      .catch(() => setError("Failed to load submission."))
      .finally(() => setLoading(false));
  }, [submissionId]);

  const handleCopy = () => {
    if (!data?.code) return;
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = (status) => {
    if (status === "accepted") return "#4ade80";
    if (status === "wrong_answer") return "#f87171";
    if (status === "timeout") return "#fb923c";
    return "#94a3b8";
  };

  const langLabel = (lang) => {
    if (lang === "python") return "🐍 Python";
    if (lang === "java") return "☕ Java";
    if (lang === "csharp") return "🔷 C#";
    return lang;
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>Student Code Viewer</div>
            {data && (
              <div style={styles.headerSub}>
                {data.student?.username} · {data.problem?.title} ·{" "}
                <span style={{ color: statusColor(data.status) }}>
                  {data.status?.replace("_", " ").toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {loading && <div style={styles.center}>Loading submission...</div>}
          {error && <div style={styles.center}>{error}</div>}

          {data && (
            <>
              {/* Meta row */}
              <div style={styles.metaRow}>
                <span style={styles.badge}>{langLabel(data.language)}</span>
                <span style={styles.badge}>
                  Score: {data.score} XP
                </span>
                <span style={styles.badge}>
                  {new Date(data.submitted_at).toLocaleString()}
                </span>
                <button onClick={handleCopy} style={styles.copyBtn}>
                  {copied ? "✓ Copied" : "Copy Code"}
                </button>
              </div>

              {/* Code block */}
              <div style={styles.codeWrapper}>
                <pre style={styles.codeBlock}>{data.code}</pre>
              </div>

              {/* Test results */}
              {data.test_results?.length > 0 && (
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    Test Case Results ({data.test_results.filter((r) => r.passed).length}/
                    {data.test_results.length} passed)
                  </div>
                  <div style={styles.testGrid}>
                    {data.test_results.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          ...styles.testCard,
                          borderLeft: `3px solid ${r.passed ? "#4ade80" : "#f87171"}`,
                        }}
                      >
                        <div style={styles.testHeader}>
                          <span>{r.passed ? "✅" : "❌"} Test {i + 1}</span>
                          <span style={styles.runtime}>{r.runtime}</span>
                        </div>
                        <div style={styles.testRow}>
                          <span style={styles.testLabel}>Input:</span>
                          <code style={styles.testCode}>{r.test_case || "(none)"}</code>
                        </div>
                        <div style={styles.testRow}>
                          <span style={styles.testLabel}>Expected:</span>
                          <code style={styles.testCode}>{r.expected}</code>
                        </div>
                        {!r.passed && (
                          <div style={styles.testRow}>
                            <span style={styles.testLabel}>Got:</span>
                            <code style={{ ...styles.testCode, color: "#f87171" }}>
                              {r.output || r.message}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    width: "min(900px, 95vw)",
    maxHeight: "90vh",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "20px 24px",
    borderBottom: "1px solid #1e293b",
    background: "#0f172a",
  },
  headerTitle: {
    fontSize: "18px", fontWeight: 700, color: "#f1f5f9",
  },
  headerSub: {
    fontSize: "13px", color: "#94a3b8", marginTop: "4px",
  },
  closeBtn: {
    background: "none", border: "none",
    color: "#94a3b8", fontSize: "20px",
    cursor: "pointer", padding: "0 4px",
  },
  body: {
    overflowY: "auto", padding: "20px 24px", flex: 1,
  },
  center: {
    textAlign: "center", color: "#94a3b8", padding: "40px",
  },
  metaRow: {
    display: "flex", flexWrap: "wrap", gap: "8px",
    alignItems: "center", marginBottom: "16px",
  },
  badge: {
    background: "#1e293b", color: "#94a3b8",
    borderRadius: "6px", padding: "4px 10px",
    fontSize: "12px",
  },
  copyBtn: {
    marginLeft: "auto",
    background: "#3b82f6", color: "#fff",
    border: "none", borderRadius: "6px",
    padding: "5px 14px", fontSize: "12px",
    cursor: "pointer",
  },
  codeWrapper: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    overflow: "auto",
    marginBottom: "20px",
    maxHeight: "340px",
  },
  codeBlock: {
    margin: 0, padding: "16px 20px",
    color: "#e2e8f0",
    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
    fontSize: "13px",
    lineHeight: "1.6",
    whiteSpace: "pre",
  },
  section: { marginTop: "8px" },
  sectionTitle: {
    fontSize: "14px", fontWeight: 600,
    color: "#f1f5f9", marginBottom: "12px",
  },
  testGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "10px",
  },
  testCard: {
    background: "#1e293b",
    borderRadius: "8px",
    padding: "12px",
  },
  testHeader: {
    display: "flex", justifyContent: "space-between",
    fontSize: "13px", fontWeight: 600,
    color: "#f1f5f9", marginBottom: "8px",
  },
  runtime: { fontSize: "11px", color: "#64748b" },
  testRow: {
    display: "flex", gap: "6px",
    alignItems: "flex-start", marginTop: "4px",
  },
  testLabel: {
    fontSize: "11px", color: "#64748b",
    minWidth: "54px", paddingTop: "2px",
  },
  testCode: {
    fontSize: "12px", color: "#7dd3fc",
    wordBreak: "break-all",
    fontFamily: "monospace",
  },
};