import { useState, useRef } from "react";

const RESULT_TYPES = ["UNIVERSITY", "AUTONOMOUS"];

export default function RTMNUChecker() {
  const [form, setForm] = useState({
    resultType: "",
    session: "",
    faculty: "",
    degree: "",
    course: "",
    rollStart: "",
    rollEnd: "",
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRoll, setCurrentRoll] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const required = ["resultType", "session", "faculty", "degree", "course", "rollStart", "rollEnd"];
    for (const k of required) {
      if (!form[k].trim()) return `Please fill in "${k.replace(/([A-Z])/g, " $1")}".`;
    }
    const s = parseInt(form.rollStart), e = parseInt(form.rollEnd);
    if (isNaN(s) || isNaN(e)) return "Roll numbers must be numeric.";
    if (s > e) return "Start roll must be ≤ end roll.";
    if (e - s > 199) return "Max 200 roll numbers at once to avoid overload.";
    return null;
  };

  const fetchResult = async (roll) => {
    const payload = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a web scraping assistant. Fetch the result from RTMNU university result portal (https://rtmnuresults.uonex.in/) for the following student details and return the result data in JSON format only. No explanation.

Details:
- Result Type: ${form.resultType}
- Session: ${form.session}
- Faculty: ${form.faculty}
- Degree: ${form.degree}
- Course: ${form.course}
- Roll Number: ${roll}

Use web search or fetching to get the result from https://rtmnuresults.uonex.in/ and return a JSON object with these fields:
{
  "rollNo": "${roll}",
  "studentName": "...",
  "result": "PASS/FAIL/NOT FOUND/etc",
  "sgpa": "...",
  "cgpa": "...",
  "percentage": "...",
  "subjects": [{"name":"...","marks":"...","grade":"..."}],
  "remarks": "..."
}
If data is not found, return: {"rollNo":"${roll}","studentName":"Not Found","result":"NOT FOUND","remarks":"No record found for this roll number"}
Return ONLY valid JSON, nothing else.`,
        },
      ],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        },
      ],
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const text = data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    try {
      const clean = text?.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch {
      return {
        rollNo: roll,
        studentName: "Parse Error",
        result: "ERROR",
        remarks: text?.slice(0, 100) || "Unknown error",
      };
    }
  };

  const handleFetch = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setResults([]);
    setLoading(true);
    abortRef.current = false;

    const start = parseInt(form.rollStart);
    const end = parseInt(form.rollEnd);
    const total = end - start + 1;
    let done = 0;

    for (let roll = start; roll <= end; roll++) {
      if (abortRef.current) break;
      const rollStr = String(roll).padStart(form.rollStart.length, "0");
      setCurrentRoll(rollStr);
      try {
        const result = await fetchResult(rollStr);
        setResults((prev) => [...prev, result]);
      } catch (e) {
        setResults((prev) => [...prev, { rollNo: rollStr, studentName: "Error", result: "ERROR", remarks: e.message }]);
      }
      done++;
      setProgress(Math.round((done / total) * 100));
    }

    setLoading(false);
    setCurrentRoll("");
  };

  const handleStop = () => { abortRef.current = true; };

  const exportCSV = () => {
    if (!results.length) return;
    const headers = ["Roll No", "Student Name", "Result", "SGPA", "CGPA", "Percentage", "Remarks"];
    const rows = results.map((r) => [
      r.rollNo, r.studentName, r.result, r.sgpa || "-", r.cgpa || "-", r.percentage || "-", r.remarks || "-"
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `RTMNU_Results_${form.rollStart}-${form.rollEnd}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (result) => {
    if (!result) return "#94a3b8";
    const r = result.toUpperCase();
    if (r.includes("PASS")) return "#22c55e";
    if (r.includes("FAIL")) return "#ef4444";
    if (r.includes("NOT FOUND") || r.includes("ERROR")) return "#f59e0b";
    return "#3b82f6";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      fontFamily: "'Georgia', serif",
      color: "#e2e8f0",
      padding: "2rem",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          borderRadius: "12px",
          padding: "0.5rem 1.5rem",
          fontSize: "0.75rem",
          fontFamily: "monospace",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          marginBottom: "1rem",
          color: "#fff",
        }}>
          RTMNU · Result Automation
        </div>
        <h1 style={{
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: "700",
          background: "linear-gradient(90deg, #a5b4fc, #e879f9, #38bdf8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: "0 0 0.5rem",
          lineHeight: 1.2,
        }}>
          Bulk Result Checker
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "1rem", margin: 0 }}>
          Rashtrasant Tukadoji Maharaj Nagpur University
        </p>
      </div>

      {/* Form Card */}
      <div style={{
        maxWidth: "760px",
        margin: "0 auto 2rem",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px",
        padding: "2rem",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          {/* Result Type */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Result Type *</label>
            <select name="resultType" value={form.resultType} onChange={handleChange} style={inputStyle}>
              <option value="">-- Select Result Type --</option>
              {RESULT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Session */}
          <div>
            <label style={labelStyle}>Session *</label>
            <input name="session" value={form.session} onChange={handleChange}
              placeholder="e.g. WINTER 2024 / 2024-25"
              style={inputStyle} />
          </div>

          {/* Faculty */}
          <div>
            <label style={labelStyle}>Faculty *</label>
            <input name="faculty" value={form.faculty} onChange={handleChange}
              placeholder="e.g. ENGINEERING"
              style={inputStyle} />
          </div>

          {/* Degree */}
          <div>
            <label style={labelStyle}>Degree *</label>
            <input name="degree" value={form.degree} onChange={handleChange}
              placeholder="e.g. B.TECH"
              style={inputStyle} />
          </div>

          {/* Course */}
          <div>
            <label style={labelStyle}>Course *</label>
            <input name="course" value={form.course} onChange={handleChange}
              placeholder="e.g. COMPUTER SCIENCE"
              style={inputStyle} />
          </div>

          {/* Roll Range */}
          <div>
            <label style={labelStyle}>Roll No. From *</label>
            <input name="rollStart" value={form.rollStart} onChange={handleChange}
              placeholder="e.g. 110101"
              style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Roll No. To *</label>
            <input name="rollEnd" value={form.rollEnd} onChange={handleChange}
              placeholder="e.g. 110150"
              style={inputStyle} />
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: "10px",
            color: "#fca5a5",
            fontSize: "0.9rem",
          }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
          <button onClick={handleFetch} disabled={loading} style={{
            flex: 1,
            padding: "0.85rem",
            background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "1rem",
            fontFamily: "'Georgia', serif",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity 0.2s",
          }}>
            {loading ? `⏳ Fetching... ${progress}%` : "🔍 Fetch Results"}
          </button>

          {loading && (
            <button onClick={handleStop} style={{
              padding: "0.85rem 1.5rem",
              background: "rgba(239,68,68,0.2)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: "12px",
              color: "#fca5a5",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}>
              ■ Stop
            </button>
          )}

          {results.length > 0 && !loading && (
            <button onClick={exportCSV} style={{
              padding: "0.85rem 1.5rem",
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: "12px",
              color: "#86efac",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}>
              ↓ Export CSV
            </button>
          )}
        </div>

        {/* Progress bar */}
        {loading && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: "99px",
              height: "6px",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #6366f1, #e879f9)",
                transition: "width 0.4s ease",
                borderRadius: "99px",
              }} />
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.82rem", marginTop: "0.4rem", textAlign: "center" }}>
              Fetching roll no. <strong style={{ color: "#a5b4fc" }}>{currentRoll}</strong> — {results.length} done
            </p>
          </div>
        )}
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#a5b4fc" }}>
              Results — {results.length} record{results.length !== 1 ? "s" : ""}
            </h2>
            <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem" }}>
              {["PASS", "FAIL", "NOT FOUND"].map((s) => (
                <span key={s} style={{ color: statusColor(s) }}>
                  ● {s}: {results.filter((r) => r.result?.toUpperCase().includes(s)).length}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            overflow: "hidden",
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ background: "rgba(99,102,241,0.15)" }}>
                    {["Roll No", "Student Name", "Result", "SGPA", "CGPA", "%", "Remarks"].map((h) => (
                      <th key={h} style={{
                        padding: "0.85rem 1rem",
                        textAlign: "left",
                        fontFamily: "monospace",
                        fontWeight: "600",
                        fontSize: "0.75rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#94a3b8",
                        borderBottom: "1px solid rgba(255,255,255,0.07)",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.rollNo} style={{
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99,102,241,0.08)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"}
                    >
                      <td style={tdStyle}><span style={{ fontFamily: "monospace", color: "#a5b4fc" }}>{r.rollNo}</span></td>
                      <td style={{ ...tdStyle, fontWeight: "500" }}>{r.studentName || "—"}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-block",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "99px",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          letterSpacing: "0.05em",
                          background: statusColor(r.result) + "22",
                          color: statusColor(r.result),
                          border: `1px solid ${statusColor(r.result)}44`,
                        }}>
                          {r.result || "—"}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace" }}>{r.sgpa || "—"}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace" }}>{r.cgpa || "—"}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace" }}>{r.percentage || "—"}</td>
                      <td style={{ ...tdStyle, color: "#94a3b8", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subject details per student */}
          {results.some((r) => r.subjects?.length) && (
            <div style={{ marginTop: "2rem" }}>
              <h3 style={{ color: "#a5b4fc", fontSize: "1rem", marginBottom: "1rem" }}>Subject-wise Details</h3>
              {results.filter((r) => r.subjects?.length).map((r) => (
                <details key={`detail-${r.rollNo}`} style={{ marginBottom: "1rem" }}>
                  <summary style={{
                    cursor: "pointer",
                    padding: "0.75rem 1rem",
                    background: "rgba(99,102,241,0.1)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "10px",
                    color: "#a5b4fc",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                  }}>
                    <span>📋 {r.rollNo} — {r.studentName}</span>
                    <span style={{ color: statusColor(r.result) }}>{r.result}</span>
                  </summary>
                  <div style={{
                    padding: "1rem",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "0 0 10px 10px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderTop: "none",
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr>
                          {["Subject", "Marks", "Grade"].map((h) => (
                            <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "#64748b", fontFamily: "monospace", fontSize: "0.75rem" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {r.subjects.map((s, i) => (
                          <tr key={i}>
                            <td style={{ padding: "0.4rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)" }}>{s.name}</td>
                            <td style={{ padding: "0.4rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)", fontFamily: "monospace" }}>{s.marks}</td>
                            <td style={{ padding: "0.4rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)", fontFamily: "monospace", color: "#6366f1" }}>{s.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      {!results.length && !loading && (
        <div style={{ textAlign: "center", color: "#334155", fontSize: "0.9rem", marginTop: "3rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📊</div>
          Fill in the form above and click "Fetch Results" to begin
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "3rem", color: "#334155", fontSize: "0.78rem" }}>
        Data fetched from rtmnuresults.uonex.in · For educational use only
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "0.4rem",
  fontSize: "0.78rem",
  fontFamily: "monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#94a3b8",
};

const inputStyle = {
  width: "100%",
  padding: "0.7rem 0.9rem",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  color: "#e2e8f0",
  fontSize: "0.92rem",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'Georgia', serif",
};

const tdStyle = {
  padding: "0.8rem 1rem",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  verticalAlign: "middle",
};
