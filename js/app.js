/**
 * RTMNU Smart Result Portal - Main Application Logic
 * Powered by React 18, Babel Standalone, and Tailwind-inspired custom styles.
 * 
 * This client-side script fetches exam listings and student roll numbers directly from
 * the RTMNU results portal, using a CORS proxy (Cloudflare Worker or public fallbacks).
 */

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// Base API URL for Rashtrasant Tukadoji Maharaj Nagpur University results portal
const BASE = "https://rtmnuresults.uonex.in";

/**
 * ── CUSTOM CLOUDFLARE PROXY ──
 * Paste your deployed Cloudflare Worker URL here (make sure it ends with "?url=")
 * Example: "https://my-proxy.yourname.workers.dev/?url="
 */
const CUSTOM_PROXY = "https://deploy.gyash8020.workers.dev/?url=";

// Fallback public CORS proxies if no custom worker is set up
const CORS_PROXIES = [
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://proxy.cors.sh/${url}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`,
];

/**
 * Core utility to fetch resources through the CORS proxy layers
 * Resolves CORS blocks on the client-side.
 */
const proxyFetch = async (url, options = {}) => {
  // 1. If you added a custom Cloudflare proxy, use ONLY that (super fast!)
  if (CUSTOM_PROXY) {
    const res = await fetch(CUSTOM_PROXY + encodeURIComponent(url), {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("Custom Proxy Error");
    return res;
  }

  // 2. Try a direct fetch first — works if the server sends CORS headers
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(8000),
      mode: 'cors',
    });
    if (res.ok) return res;
  } catch (_) {
    // Direct fetch failed (CORS blocked) — fall through to proxies
  }

  // 3. Otherwise, fallback to public proxies using Promise.any
  // This ensures we always get the fastest response and don't wait for slow proxies to timeout.
  const fetchPromises = CORS_PROXIES.map(proxyFn =>
    fetch(proxyFn(url), {
      ...options,
      signal: AbortSignal.timeout(12000), // 12s max timeout per proxy
    }).then(res => {
      if (res.ok) return res;
      throw new Error('Proxy returned non-ok status');
    })
  );

  try {
    return await Promise.any(fetchPromises);
  } catch (e) {
    throw new Error("All CORS proxies failed. Please deploy the Cloudflare Worker (see workers/cloudflare-worker.js) and set CUSTOM_PROXY above.");
  }
};

/**
 * Helper function to request JSON data with session-based caching.
 * Caching results in sessionStorage prevents redundant requests to RTMNU server.
 */
const fetchJSON = async (path, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${path}${qs ? '?' + qs : ''}`;
  const cacheKey = `rtmnu_${url}`;

  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { }
  }

  const res = await proxyFetch(url);
  const data = await res.json();
  // Don't cache empty arrays — the API may return [] due to missing params
  if (!Array.isArray(data) || data.length > 0) {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  }
  return data;
};

const fetchRaw = async (path, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${path}${qs ? '?' + qs : ''}`;
  const res = await proxyFetch(url);
  return res;
};

/**
 * ── Particle Background Component ──
 * Renders background particles floating upwards using custom keyframes
 */
const ParticlesBg = () => {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${2 + Math.random() * 3}px`,
      duration: `${8 + Math.random() * 15}s`,
      delay: `${Math.random() * 10}s`,
      opacity: 0.15 + Math.random() * 0.25,
    })), []
  );
  return (
    <div className="particles">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          left: p.left,
          width: p.size, height: p.size,
          animationDuration: p.duration,
          animationDelay: p.delay,
          opacity: p.opacity,
          background: p.id % 3 === 0 ? '#6366f1' : p.id % 3 === 1 ? '#8b5cf6' : '#38bdf8',
        }} />
      ))}
    </div>
  );
};

/**
 * ── Animated Counter Component ──
 * Smoothly increments numbers to provide a high-fidelity dashboard feel
 */
const AnimatedNumber = ({ value, duration = 600 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
};

/**
 * ── Spinner Component ──
 */
const Spinner = ({ size = 16, color = "#a5b4fc" }) => (
  <div style={{
    width: size, height: size,
    border: `2px solid rgba(255,255,255,0.1)`,
    borderTopColor: color,
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
    display: "inline-block",
  }} />
);

/**
 * ── Custom SelectField Component ──
 * Renders glassmorphic dropdown list with dynamic status feedback
 */
const SelectField = ({ label, value, onChange, options, loading, disabled, id, icon }) => (
  <div style={{ position: "relative" }}>
    <label style={{
      display: "flex", alignItems: "center", gap: "0.4rem",
      marginBottom: "0.4rem",
      fontSize: "0.65rem",
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "#64748b",
      fontWeight: 500,
    }}>
      {icon && <span style={{ fontSize: "0.8rem" }}>{icon}</span>}
      {label}
    </label>
    <div style={{ position: "relative" }}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        style={{
          width: "100%",
          padding: "0.7rem 2.5rem 0.7rem 0.9rem",
          background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          color: value ? "#e2e8f0" : "#64748b",
          fontSize: "0.85rem",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "'Inter', sans-serif",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
          appearance: "none",
        }}
      >
        <option value="">
          {loading ? "⏳ Loading..." : `Select ${label.replace(" *", "")}`}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div style={{
        position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)",
        pointerEvents: "none", color: "#475569", fontSize: "0.7rem",
        transition: "transform 0.2s",
      }}>
        {loading ? <Spinner size={14} /> : "▾"}
      </div>
    </div>
  </div>
);

/**
 * ── Stat Card Component ──
 * Displays summary cards with hover effects and animations
 */
const StatCard = ({ icon, label, value, color, delay = 0 }) => (
  <div style={{
    background: `linear-gradient(135deg, ${color}08, ${color}03)`,
    border: `1px solid ${color}20`,
    borderRadius: "16px",
    padding: "1.2rem 1rem",
    textAlign: "center",
    animation: `fadeInUp 0.5s ease-out ${delay}s both`,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "default",
    position: "relative",
    overflow: "hidden",
  }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.borderColor = color + "40";
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}15`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.borderColor = color + "20";
      e.currentTarget.style.boxShadow = "none";
    }}>
    <div style={{ fontSize: "1.6rem", marginBottom: "0.3rem" }}>{icon}</div>
    <div style={{
      fontSize: "1.8rem", fontWeight: "800", color,
      fontFamily: "'JetBrains Mono', monospace",
      lineHeight: 1,
      marginBottom: "0.2rem",
    }}>
      <AnimatedNumber value={value} />
    </div>
    <div style={{
      fontSize: "0.6rem", color: "#64748b",
      fontFamily: "'JetBrains Mono', monospace",
      textTransform: "uppercase",
      letterSpacing: "0.12em",
    }}>{label}</div>
  </div>
);

/**
 * ── Main Portal Component ──
 * Holds the cascading state hooks, validator, fetch controllers, and rendering engine
 */
function RTMNUChecker() {
  const [department, setDepartment] = useState("");
  const [session, setSession] = useState("");
  const [faculty, setFaculty] = useState("");
  const [degree, setDegree] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [course, setCourse] = useState("");
  const [rollStart, setRollStart] = useState("");
  const [rollEnd, setRollEnd] = useState("");
  const [isSingleMode, setIsSingleMode] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [rollNumbers, setRollNumbers] = useState([]);

  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingRolls, setLoadingRolls] = useState(false);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRoll, setCurrentRoll] = useState("");
  const [error, setError] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [gazetteText, setGazetteText] = useState("");
  const abortRef = useRef(false);

  // ── Prefetch Core Data on Mount ──
  useEffect(() => {
    fetchJSON("/Auth/GetDegreesBySession", { department: "U" }).catch(() => { });
    fetchJSON("/Auth/GetDegreesBySession", { department: "A" }).catch(() => { });
  }, []);

  // ── Cascading Dropdown Loader: Department -> Sessions ──
  useEffect(() => {
    if (!department) { setSessions([]); return; }
    setLoadingSessions(true);
    setSession(""); setFaculty(""); setDegree(""); setCourse("");
    setFaculties([]); setDegrees([]); setCourses([]); setRollNumbers([]);
    fetchJSON("/Auth/GetDegreesBySession", { department })
      .then(data => {
        const uniqueSessions = [...new Set(data.map(d => d.sessionYear || d.SessionYear))].filter(Boolean);
        setSessions(uniqueSessions.map(s => ({ value: s, label: s })));
      })
      .catch(() => setError("Failed to load sessions"))
      .finally(() => setLoadingSessions(false));
  }, [department]);

  // ── Cascading Dropdown Loader: Session -> Faculty ──
  useEffect(() => {
    if (!session || !department) { setFaculties([]); return; }
    setLoadingFaculties(true);
    setFaculty(""); setDegree(""); setCourse("");
    setDegrees([]); setCourses([]); setRollNumbers([]);

    const targetUrl = BASE + "/Auth/GetFacultyName?department=" + encodeURIComponent(department) + "&session=" + encodeURIComponent(session);
    const proxyUrl = CUSTOM_PROXY + encodeURIComponent(targetUrl);

    console.log("[FACULTY-DEBUG] Fetching:", proxyUrl);

    fetch(proxyUrl, { signal: AbortSignal.timeout(15000) })
      .then(res => {
        console.log("[FACULTY-DEBUG] Response status:", res.status);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(data => {
        console.log("[FACULTY-DEBUG] Got data, count:", data.length);
        if (!data || data.length === 0) {
          setError("No faculties found for this session.");
          return;
        }
        const mapped = data.map(d => ({ value: d.id, label: d.name }));
        console.log("[FACULTY-DEBUG] Setting faculties:", mapped.map(m => m.label).join(", "));
        setFaculties(mapped);
        setError("");
      })
      .catch(err => {
        console.error("[FACULTY-DEBUG] Error:", err);
        setError("Faculty load error: " + err.message);
      })
      .finally(() => setLoadingFaculties(false));
  }, [session, department]);

  // ── Cascading Dropdown Loader: Faculty -> Degree ──
  useEffect(() => {
    if (!faculty || !department) { setDegrees([]); return; }
    setLoadingDegrees(true);
    setDegree(""); setCourse("");
    setCourses([]); setRollNumbers([]);
    fetchJSON("/Auth/GetDegreesByFaculty", { faculty, session, department })
      .then(data => {
        const uniqueDegrees = [...new Set(data.map(d => d.degree))].filter(Boolean);
        setDegrees(uniqueDegrees.map(deg => ({ value: deg, label: deg })));
      })
      .catch(() => setError("Failed to load degrees"))
      .finally(() => setLoadingDegrees(false));
  }, [faculty]);

  // ── Cascading Dropdown Loader: Degree -> Course ──
  useEffect(() => {
    if (!degree || !faculty || !department) { setCourses([]); return; }
    setLoadingCourses(true);
    setCourse("");
    setRollNumbers([]);
    fetchJSON("/Auth/GetCoursesByFacultyDegree", { faculty, coursecode: degree, session, department })
      .then(data => setCourses(data.map(d => ({ value: d.courseCode, label: d.courseName }))))
      .catch(() => setError("Failed to load courses"))
      .finally(() => setLoadingCourses(false));
  }, [degree]);

  const filteredCourses = useMemo(() => {
    if (!semesterFilter) return courses;
    return courses.filter(c => c.label.toUpperCase().includes(semesterFilter));
  }, [courses, semesterFilter]);

  // ── Cascading Dropdown Loader: Course -> Roll Numbers ──
  useEffect(() => {
    if (!course || !department) { setRollNumbers([]); return; }
    setLoadingRolls(true);
    fetchJSON("/Auth/GetRollNumbers", { coursecode: course, department })
      .then(data => {
        const rolls = data.map(d => d.crollno).sort();
        setRollNumbers(rolls);
        if (rolls.length > 0) {
          setRollStart(rolls[0]);
          setRollEnd(rolls[rolls.length - 1]);
        }
      })
      .catch(() => setError("Failed to load roll numbers"))
      .finally(() => setLoadingRolls(false));
  }, [course]);

  // ── Form Input Validator ──
  const validate = () => {
    if (!department) return "Please select Result Type.";
    if (!session) return "Please select Session.";
    if (!faculty) return "Please select Faculty.";
    if (!degree) return "Please select Degree.";
    if (!course) return "Please select Course.";
    if (!rollStart) return "Please enter a roll number.";
    if (!isSingleMode && !rollEnd) return "Please enter roll number range.";
    return null;
  };

  // ── Fetch Roll Results Range Logic ──
  const handleFetch = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setResults([]);
    setLoading(true);
    setProgress(0);
    setSuccessCount(0);
    setShowResults(false);
    abortRef.current = false;

    const s = parseInt(rollStart), e = isSingleMode ? parseInt(rollStart) : parseInt(rollEnd);
    const registeredSet = new Set(rollNumbers.map(r => String(r)));

    // Only include registered roll numbers within the selected range
    let rollList = [];
    for (let i = s; i <= e; i++) {
      const roll = String(i).padStart(rollStart.length, "0");
      if (registeredSet.has(roll)) {
        rollList.push(roll);
      }
    }

    const total = rollList.length;

    if (total === 0) {
      setError("No registered students found in this roll number range.");
      setLoading(false);
      return;
    }

    const allResults = [];

    // Loop through rolls in range to map status
    for (let i = 0; i < rollList.length; i++) {
      if (abortRef.current) break;
      const roll = rollList[i];

      allResults.push({
        rollNo: roll,
        studentName: "✓ Registered",
        result: "REGISTERED",
        isRegistered: true,
      });

      if (i % 10 === 0 || i === rollList.length - 1) {
        setResults([...allResults]);
        setProgress(Math.round(((i + 1) / total) * 100));
        setSuccessCount(allResults.length);
        setCurrentRoll(roll);
        await new Promise(r => setTimeout(r, 0));
      }
    }

    setResults(allResults);
    setProgress(100);
    setSuccessCount(allResults.length);
    setLoading(false);
    setCurrentRoll("");
    setTimeout(() => setShowResults(true), 100);
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 768);

  const [marksheetLoading, setMarksheetLoading] = useState(false);

  /**
   * Fetches marksheets by constructing a cache-busted direct URL targeting the PDF iframe viewer
   */
  const fetchMarksheetPdf = async (rollNo) => {
    setError("");
    setExpandedRow(null);

    const timestamp = Date.now();
    const qs = new URLSearchParams({
      rollno: rollNo,
      session,
      courseCode: course,
      faculty,
      degree,
      department,
      _t: timestamp, // Aggressive cache-buster for mobile browsers
      rand: Math.random().toString(36).substring(7)
    }).toString();

    const directUrl = `${BASE}/GetMarkSheet_report?${qs}`;

    // Small delay ensures iframe context cleans up fully on mobile devices
    setTimeout(() => {
      setResults(prev => prev.map(r =>
        r.rollNo === rollNo ? { ...r, pdfUrl: directUrl, pdfHtml: null, lastViewed: timestamp } : r
      ));
      setExpandedRow(rollNo);
    }, 150);
  };

  const handleStop = () => { abortRef.current = true; };

  // ── CSV Exporter ──
  const exportCSV = () => {
    if (!results.length) return;
    const headers = ["Roll No", "Status", "Registered"];
    const rows = results.map(r => [r.rollNo, r.result, r.isRegistered ? "Yes" : "No"]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `RTMNU_Smart_Result_Portal_${rollStart}-${rollEnd}.csv`;
    a.click();
  };

  // Status mapping colors
  const statusColor = (result) => {
    const r = (result || "").toUpperCase();
    if (r.includes("REGISTERED") || r.includes("PASS")) return "#22c55e";
    if (r.includes("FAIL") || r.includes("ATKT")) return "#ef4444";
    if (r.includes("NOT IN LIST") || r.includes("NOT FOUND") || r.includes("ABSENT") || r.includes("UNKNOWN")) return "#475569";
    if (r.includes("ERROR")) return "#f59e0b";
    return "#8b5cf6";
  };

  /**
   * ── Auto-Grade via Gazette Text Parsing ──
   * Parsers lines of pasted Gazette text to match roll numbers to PASS/FAIL tags
   */
  const applyGazetteData = () => {
    if (!gazetteText.trim()) { setError("Please paste the Gazette text first."); return; }
    const lines = gazetteText.split('\n');
    const statuses = new Map();
    let currentGroup = "UNKNOWN";

    for (let line of lines) {
      const l = line.toUpperCase().trim();
      if (l.includes("PASS BY GRACE")) currentGroup = "PASS BY GRACE";
      else if (l.includes("PASSED") || (l.includes("PASS") && !l.includes("GRACE"))) currentGroup = "PASS";
      else if (l.includes("FAIL")) currentGroup = "FAIL";
      else if (l.includes("ABSENT")) currentGroup = "ABSENT";
      else if (l.includes("W/D")) currentGroup = "W/D";

      const rollLength = String(results[0]?.rollNo || "").length || 6;
      const regex = new RegExp("\\b\\d{" + rollLength + "}\\b", "g");
      const matches = line.match(regex);
      if (matches) {
        for (let m of matches) statuses.set(m, currentGroup);
      }
    }

    let updated = 0;
    setResults(prev => prev.map(r => {
      if (statuses.has(r.rollNo)) {
        updated++;
        return { ...r, result: statuses.get(r.rollNo) };
      }
      return r;
    }));

    if (updated > 0) {
      setError("");
      setPasteMode(false);
      setGazetteText("");
      alert(`✅ Successfully synced ${updated} results from the Gazette data!`);
    } else {
      setError("❌ Could not find matching roll numbers in the pasted text. Make sure you copied the Gazette text completely.");
    }
  };

  const totalCount = parseInt(rollEnd) - parseInt(rollStart) + 1;
  const registeredCount = results.length;

  const formSteps = [department, session, faculty, degree, course].filter(Boolean).length;

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <div className="mesh-gradient" />
      <ParticlesBg />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "1.5rem" }}>

        {/* ── Header ── */}
        <header className="fade-in-up" style={{ textAlign: "center", marginBottom: "2.5rem", paddingTop: "1rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "99px",
            padding: "0.4rem 1.3rem",
            fontSize: "0.65rem",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "1.2rem",
            color: "#a5b4fc",
            backdropFilter: "blur(10px)",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#22c55e",
              display: "inline-block",
              boxShadow: "0 0 8px rgba(34,197,94,0.5)",
              animation: "glow 2s ease-in-out infinite",
            }} />
            Live · Direct Portal Access
          </div>
          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: "900",
            background: "linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 20%, #c084fc 50%, #38bdf8 80%, #6366f1 100%)",
            backgroundSize: "200% auto",
            animation: "gradientMove 4s ease infinite",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: "0 0 0.5rem",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
          }}>
            RTMNU Smart Result Portal
          </h1>
          <p style={{
            color: "#475569", fontSize: "0.85rem", margin: 0,
            fontWeight: 400,
          }}>
            Rashtrasant Tukadoji Maharaj Nagpur University · Smart Result Portal
          </p>

          {/* Form progress dots */}
          <div style={{
            display: "flex", justifyContent: "center", gap: "0.4rem",
            marginTop: "1.2rem",
          }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: i < formSteps ? "24px" : "8px",
                height: "8px",
                borderRadius: "99px",
                background: i < formSteps
                  ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
                  : "rgba(255,255,255,0.08)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            ))}
          </div>
        </header>

        {/* ── Form Card ── */}
        <div className="fade-in-scale" style={{
          maxWidth: "820px",
          margin: "0 auto 2rem",
          background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "24px",
          padding: "2rem 2.2rem",
          backdropFilter: "blur(20px)",
          boxShadow: "0 4px 40px rgba(0,0,0,0.2)",
        }}>
          {/* ── Proxy Warning Banner ── */}
          {!CUSTOM_PROXY && (
            <div style={{
              marginBottom: "1.5rem",
              padding: "0.85rem 1.1rem",
              background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.04))",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "14px",
              fontSize: "0.78rem",
              color: "#fcd34d",
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.6,
              animation: "fadeInUp 0.4s ease-out",
            }}>
              <div style={{ fontWeight: 700, marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>⚡</span> For best performance, deploy a Cloudflare Worker
              </div>
              <div style={{ color: "#fbbf24", opacity: 0.85 }}>
                Public CORS proxies are unreliable and often fail. Deploy <code style={{ background: "rgba(0,0,0,0.3)", padding: "0 4px", borderRadius: "4px" }}>cloudflare-worker.js</code> to <a href="https://workers.cloudflare.com" target="_blank" style={{ color: "#38bdf8" }}>workers.cloudflare.com</a> (free), then paste your Worker URL into <code style={{ background: "rgba(0,0,0,0.3)", padding: "0 4px", borderRadius: "4px" }}>CUSTOM_PROXY</code> at the top of this file.
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.3rem" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <SelectField id="result-type" label="Result Type *" icon="🏛️"
                value={department} onChange={e => setDepartment(e.target.value)}
                options={[{ value: "U", label: "UNIVERSITY" }, { value: "A", label: "AUTONOMOUS" }]} />
            </div>

            <SelectField id="session" label="Session *" icon="📅"
              value={session} onChange={e => setSession(e.target.value)}
              options={sessions} loading={loadingSessions} disabled={!department} />

            <SelectField id="faculty" label="Faculty *" icon="🎓"
              value={faculty} onChange={e => setFaculty(e.target.value)}
              options={faculties} loading={loadingFaculties} disabled={!session} />

            <SelectField id="degree" label="Degree *" icon="📜"
              value={degree} onChange={e => setDegree(e.target.value)}
              options={degrees} loading={loadingDegrees} disabled={!faculty} />

            <SelectField id="semester-filter" label="Semester Filter" icon="🔍"
              value={semesterFilter} onChange={e => { setSemesterFilter(e.target.value); setCourse(""); }}
              options={[
                { value: "FIRST", label: "1st Semester" },
                { value: "SECOND", label: "2nd Semester" },
                { value: "THIRD", label: "3rd Semester" },
                { value: "FOURTH", label: "4th Semester" },
                { value: "FIFTH", label: "5th Semester" },
                { value: "SIXTH", label: "6th Semester" },
                { value: "SEVENTH", label: "7th Semester" },
                { value: "EIGHTH", label: "8th Semester" },
                { value: "NINTH", label: "9th Semester" },
                { value: "TENTH", label: "10th Semester" }
              ]}
              disabled={!degree} />

            <SelectField id="course" label="Course *" icon="📚"
              value={course} onChange={e => setCourse(e.target.value)}
              options={filteredCourses} loading={loadingCourses} disabled={!degree} />

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginBottom: "-0.8rem", marginTop: "0.5rem" }}>
              <button onClick={() => setIsSingleMode(!isSingleMode)} style={{
                background: isSingleMode ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)",
                border: isSingleMode ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "0.4rem 0.8rem",
                color: isSingleMode ? "#a5b4fc" : "#94a3b8",
                fontSize: "0.75rem",
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                transition: "all 0.2s"
              }}>
                {isSingleMode ? "⇌ Switch to Bulk Range" : "👤 Check Single Roll No."}
              </button>
            </div>

            <div style={{ gridColumn: isSingleMode ? "1 / -1" : "auto" }}>
              <label style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                marginBottom: "0.4rem", fontSize: "0.65rem",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#64748b", fontWeight: 500,
              }}>🔢 {isSingleMode ? "Roll Number *" : "Roll From *"}</label>
              <div style={{ position: "relative" }}>
                <input id="roll-start" value={rollStart}
                  onChange={e => setRollStart(e.target.value)}
                  placeholder={loadingRolls ? "Loading..." : "e.g. 110101"}
                  disabled={loadingRolls}
                  style={{
                    width: "100%", padding: "0.7rem 0.9rem",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px", color: "#e2e8f0",
                    fontSize: "0.85rem", outline: "none",
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: "all 0.25s",
                  }} />
                {loadingRolls && <div style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)" }}><Spinner size={14} /></div>}
              </div>
            </div>

            {!isSingleMode && (
              <div>
                <label style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  marginBottom: "0.4rem", fontSize: "0.65rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "#64748b", fontWeight: 500,
                }}>🔢 Roll To *</label>
                <input id="roll-end" value={rollEnd}
                  onChange={e => setRollEnd(e.target.value)}
                  placeholder={loadingRolls ? "Loading..." : "e.g. 110150"}
                  disabled={loadingRolls}
                  style={{
                    width: "100%", padding: "0.7rem 0.9rem",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px", color: "#e2e8f0",
                    fontSize: "0.85rem", outline: "none",
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: "all 0.25s",
                  }} />
              </div>
            )}
          </div>

          {/* Roll info banner */}
          {rollNumbers.length > 0 && (
            <div style={{
              marginTop: "1rem", padding: "0.7rem 1rem",
              background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
              border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: "12px",
              fontSize: "0.75rem", color: "#a5b4fc",
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex", alignItems: "center", gap: "0.5rem",
              animation: "fadeInUp 0.3s ease-out",
            }}>
              <span style={{ fontSize: "1rem" }}>📋</span>
              Found <strong>{rollNumbers.length}</strong> roll numbers ({rollNumbers[0]} — {rollNumbers[rollNumbers.length - 1]})
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: "1rem", padding: "0.75rem 1rem",
              background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "12px", color: "#fca5a5",
              fontSize: "0.82rem",
              animation: "fadeInUp 0.3s ease-out",
              display: "flex", alignItems: "flex-start", gap: "0.5rem",
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button id="btn-fetch" onClick={handleFetch} disabled={loading}
              className="btn-ripple"
              style={{
                flex: 1, minWidth: "200px", padding: "0.85rem",
                background: loading
                  ? "rgba(99,102,241,0.2)"
                  : "linear-gradient(135deg, #6366f1, #7c3aed, #8b5cf6)",
                backgroundSize: "200% 200%",
                animation: loading ? "none" : "gradientMove 3s ease infinite",
                border: "none", borderRadius: "14px",
                color: "#fff", fontSize: "0.9rem", fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                fontFamily: "'Inter', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
                boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.3)",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = "translateY(-1px)", e.currentTarget.style.boxShadow = "0 6px 28px rgba(99,102,241,0.4)")}
              onMouseLeave={e => !loading && (e.currentTarget.style.transform = "translateY(0)", e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.3)")}
            >
              {loading ? (<><Spinner size={16} /> <span>Processing... {progress}%</span></>) : "🔍 Check Roll Numbers"}
            </button>

            {loading && (
              <button id="btn-stop" onClick={handleStop} style={{
                padding: "0.85rem 1.5rem",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "14px", color: "#fca5a5",
                fontSize: "0.85rem", fontWeight: "600",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
              >■ Stop</button>
            )}

            {results.length > 0 && !loading && (
              <button id="btn-export" onClick={exportCSV} style={{
                padding: "0.85rem 1.5rem",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "14px", color: "#86efac",
                fontSize: "0.85rem", fontWeight: "600",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: "0.4rem",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,0.15)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,0.08)"}
              >📥 Export CSV</button>
            )}

            {results.length > 0 && !loading && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <a href={`${BASE}/GetGazetteReport_Report?faculty=${faculty}&degree=${degree}&courseCode=${course}&department=${department}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: "0.85rem 1.5rem",
                    background: "rgba(56,189,248,0.1)",
                    border: "1px solid rgba(56,189,248,0.25)",
                    borderRadius: "14px", color: "#38bdf8",
                    fontSize: "0.85rem", fontWeight: "600", textDecoration: "none",
                    fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(56,189,248,0.1)"}
                >📰 View Gazette</a>

                <button onClick={() => setPasteMode(!pasteMode)} style={{
                  padding: "0.85rem 1.5rem",
                  background: pasteMode ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px", color: "#fff",
                  fontSize: "0.85rem", fontWeight: "600",
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s", display: "flex", alignItems: "center", gap: "0.4rem",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background = pasteMode ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}
                >✨ Auto-Grade via Gazette</button>
              </div>
            )}
          </div>

          {/* Gazette Paste Form */}
          {pasteMode && results.length > 0 && !loading && (
            <div style={{
              marginTop: "1.5rem", padding: "1.5rem",
              background: "rgba(15,23,42,0.6)",
              border: "1px solid rgba(56,189,248,0.3)",
              borderRadius: "16px",
              animation: "fadeInUp 0.3s ease-out",
            }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", color: "#38bdf8", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>✨</span> Auto-Assign Pass/Fail
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: "1rem", lineHeight: 1.5 }}>
                1. Click <b>View Gazette</b> to open the official summary.<br />
                2. Press <code>Ctrl+A</code> and <code>Ctrl+C</code> anywhere on that page.<br />
                3. Paste the text below and click <b>Sync Marks</b>. Our tool will instantly match Pass/Fail to every student locally in 5 milliseconds.
              </p>
              <textarea
                value={gazetteText}
                onChange={e => setGazetteText(e.target.value)}
                placeholder="Paste the Gazette text here..."
                style={{
                  width: "100%", height: "120px", padding: "1rem",
                  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px", color: "#e2e8f0", fontSize: "0.75rem",
                  fontFamily: "'JetBrains Mono', monospace", outline: "none", resize: "vertical",
                  marginBottom: "1rem", transition: "border-color 0.2s"
                }}
                onFocus={e => e.currentTarget.style.borderColor = "#38bdf8"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button onClick={() => setPasteMode(false)} style={{
                  padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px", color: "#94a3b8", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600",
                }}>Cancel</button>
                <button onClick={applyGazetteData} style={{
                  padding: "0.6rem 1.2rem", background: "#38bdf8", border: "none",
                  borderRadius: "10px", color: "#0f172a", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700",
                }}>🚀 Sync Marks</button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {loading && (
            <div style={{ marginTop: "1.2rem", animation: "fadeInUp 0.3s ease-out" }}>
              <div style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: "99px", height: "6px", overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #6366f1, #a78bfa, #38bdf8, #6366f1)",
                  backgroundSize: "300% 100%",
                  animation: "shimmer 1.5s linear infinite",
                  transition: "width 0.3s ease",
                  borderRadius: "99px",
                  boxShadow: "0 0 12px rgba(99,102,241,0.4)",
                }} />
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: "0.5rem",
              }}>
                <span style={{ color: "#475569", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>
                  Checking <strong style={{ color: "#a5b4fc" }}>{currentRoll}</strong>
                </span>
                <span style={{ color: "#475569", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>
                  {results.length}/{parseInt(rollEnd) - parseInt(rollStart) + 1} · <strong style={{ color: "#22c55e" }}>{successCount}</strong> found
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Statistics Cards ── */}
        {results.length > 0 && !loading && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1rem",
            maxWidth: "600px",
            margin: "0 auto 2rem",
          }}>
            <StatCard icon="📊" label="Total Checked" value={totalCount || 0} color="#a5b4fc" delay={0} />
            <StatCard icon="✅" label="Found in List" value={registeredCount || 0} color="#22c55e" delay={0.1} />
          </div>
        )}

        {/* ── Results Table ── */}
        {results.length > 0 && (
          <div style={{
            maxWidth: "900px", margin: "0 auto",
            animation: "fadeInUp 0.5s ease-out",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: "1rem",
            }}>
              <h2 style={{
                margin: 0, fontSize: "0.95rem", fontWeight: "700",
                background: "linear-gradient(90deg, #a5b4fc, #c084fc)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Registered Students — {registeredCount} records
              </h2>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>
                {[{ s: "PASS", l: "Passed" }, { s: "FAIL", l: "Failed" }, { s: "PASS BY GRACE", l: "Pass Grace" }, { s: "REGISTERED", l: "Pending Link" }].map(({ s, l }) => {
                  const count = results.filter(r => r.result === s).length;
                  return count > 0 ? (
                    <span key={s} style={{ color: statusColor(s), display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: statusColor(s),
                        display: "inline-block",
                        boxShadow: `0 0 6px ${statusColor(s)}60`,
                      }} />
                      {l}: {count}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 2px 20px rgba(0,0,0,0.15)",
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(99,102,241,0.06)" }}>
                      {["#", "Roll No", "Status", "Action"].map(h => (
                        <th key={h} style={{
                          padding: "0.9rem 1rem",
                          textAlign: "left",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: "600", fontSize: "0.6rem",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "#475569",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.rollNo}
                        style={{
                          background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          animation: showResults ? `rowSlideIn 0.3s ease-out ${Math.min(i * 0.02, 0.5)}s both` : "none",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(99,102,241,0.05)";
                          e.currentTarget.style.transform = "scale(1.001)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        <td style={{ padding: "0.65rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)", color: "#334155", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>
                          {i + 1}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            color: r.isRegistered ? "#c7d2fe" : "#334155",
                            fontSize: "0.82rem",
                            fontWeight: r.isRegistered ? "600" : "400",
                          }}>{r.rollNo}</span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "0.35rem",
                            padding: "0.2rem 0.65rem",
                            borderRadius: "99px",
                            fontSize: "0.65rem", fontWeight: "700",
                            letterSpacing: "0.06em",
                            background: `${statusColor(r.result)}12`,
                            color: statusColor(r.result),
                            border: `1px solid ${statusColor(r.result)}25`,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            <span style={{ fontSize: "0.55rem" }}>{r.isRegistered ? "●" : "○"}</span>
                            {r.result}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          {r.isRegistered ? (
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                              <a href={BASE} target="_blank" rel="noopener noreferrer"
                                style={{
                                  padding: isMobile ? "0.45rem 0.8rem" : "0.25rem 0.6rem",
                                  background: "rgba(99,102,241,0.1)",
                                  border: "1px solid rgba(99,102,241,0.2)",
                                  borderRadius: "8px", color: "#a5b4fc",
                                  fontSize: isMobile ? "0.72rem" : "0.62rem", textDecoration: "none",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontWeight: 600, whiteSpace: "nowrap",
                                  transition: "all 0.2s",
                                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                                  minHeight: isMobile ? "36px" : "auto",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.2)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)"; }}
                              >🌐 Portal</a>
                              <button
                                onClick={(e) => { e.stopPropagation(); fetchMarksheetPdf(r.rollNo); }}
                                style={{
                                  padding: isMobile ? "0.45rem 0.8rem" : "0.25rem 0.6rem",
                                  background: "rgba(34,197,94,0.08)",
                                  border: "1px solid rgba(34,197,94,0.18)",
                                  borderRadius: "8px", color: "#86efac",
                                  fontSize: isMobile ? "0.72rem" : "0.62rem", cursor: "pointer",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontWeight: 600, whiteSpace: "nowrap",
                                  transition: "all 0.2s",
                                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                                  minHeight: isMobile ? "36px" : "auto",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,197,94,0.18)"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.35)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,197,94,0.08)"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.18)"; }}
                              >{r.pdfUrl ? "✅ PDF Ready" : (isMobile ? "📄 View Result" : "📄 Try PDF")}</button>
                            </div>
                          ) : (
                            <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expanded Marksheet Viewer Modal */}
            {expandedRow && (() => {
              const r = results.find(x => x.rollNo === expandedRow);
              if (!r?.pdfUrl) return null;
              return (
                <div style={{
                  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(6, 8, 15, 0.8)",
                  backdropFilter: "blur(8px)",
                  zIndex: 1000,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "fadeInScale 0.2s ease-out",
                  padding: isMobile ? "0" : "2rem"
                }} onClick={() => setExpandedRow(null)}>
                  <div style={{
                    width: "100%", maxWidth: isMobile ? "100%" : "1000px",
                    height: "100%",
                    background: "rgba(15, 23, 42, 0.95)",
                    border: isMobile ? "none" : "1px solid rgba(99,102,241,0.3)",
                    borderRadius: isMobile ? "0" : "20px",
                    overflow: "hidden",
                    display: "flex", flexDirection: "column",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }} onClick={e => e.stopPropagation()}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: isMobile ? "0.7rem 1rem" : "1rem 1.5rem",
                      background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))",
                      borderBottom: "1px solid rgba(99,102,241,0.15)",
                      flexShrink: 0,
                    }}>
                      <span style={{ color: "#a5b4fc", fontWeight: "700", fontSize: isMobile ? "0.85rem" : "1rem" }}>
                        📋 {r.rollNo}
                      </span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" style={{
                          background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)",
                          borderRadius: "10px", color: "#7dd3fc",
                          padding: isMobile ? "0.45rem 0.7rem" : "0.5rem 1rem",
                          fontSize: isMobile ? "0.7rem" : "0.8rem", textDecoration: "none", fontWeight: 600,
                          transition: "all 0.2s",
                          display: "inline-flex", alignItems: "center", gap: "0.3rem",
                        }}>🔗 Open in Browser</a>
                        <button onClick={() => setExpandedRow(null)} style={{
                          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: "10px", color: "#fca5a5",
                          padding: isMobile ? "0.45rem 0.7rem" : "0.5rem 1rem",
                          cursor: "pointer", fontSize: isMobile ? "0.7rem" : "0.8rem", fontWeight: 600,
                          transition: "all 0.2s",
                        }}>✕ Close</button>
                      </div>
                    </div>
                    <iframe
                      key={`${r.rollNo}_${r.lastViewed}`}
                      src={r.pdfUrl}
                      style={{ width: "100%", flexGrow: 1, border: "none", background: "#fff" }}
                      title={`Marksheet ${r.rollNo}`}
                      loading="lazy"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Empty State ── */}
        {!results.length && !loading && (
          <div style={{
            textAlign: "center", marginTop: "3rem",
            animation: "fadeInUp 0.6s ease-out 0.3s both",
          }}>
            <div style={{
              fontSize: "3.5rem", marginBottom: "0.8rem",
              animation: "float 4s ease-in-out infinite",
            }}>📊</div>
            <p style={{
              fontSize: "0.9rem", color: "#334155",
              fontWeight: 500, maxWidth: "300px", margin: "0 auto",
              lineHeight: 1.6,
            }}>
              Select your exam details above and check roll numbers instantly
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <footer style={{
          textAlign: "center", marginTop: "3rem", paddingBottom: "2rem",
          color: "#1e293b", fontSize: "0.65rem",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.05em",
        }}>
          Data from rtmnuresults.uonex.in · For educational use only
          <br />
          <span style={{ color: "#0f172a" }}>
            Built by <a href="https://github.com/Yash-Gaikwad14" target="_blank" rel="noopener" style={{ color: "#1e293b", textDecoration: "none" }}>Yash Gaikwad</a>
          </span>
        </footer>
      </div>
    </div>
  );
}

// Render the entry component using ReactDOM client root
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RTMNUChecker />);
