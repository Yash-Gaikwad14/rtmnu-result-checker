# System Architecture - RTMNU Smart Result Portal

This document outlines the directory structure, file roles, and component interaction flows of the **RTMNU Smart Result Portal**.

---

## 1. Project Directory Layout

The refactored repository is organized logically into specific, dedicated directories:

```
├── index.html               # Main entry point (loads CDNs, mounts React)
├── LICENSE                  # MIT License
├── .gitignore               # Ignored local temporary files
├── CHANGELOG.md             # Project milestones and version records
├── CONTRIBUTING.md          # Developer code styles and pull request guides
├── css/
│   └── style.css            # Stylesheet containing variables, transitions, layouts
├── js/
│   └── app.js               # Main React engine (hooks, API fetchers, rendering)
├── workers/
│   └── cloudflare-worker.js # CORS Serverless proxy utility
├── images/
│   └── screenshot.png       # Real browser screenshot showing active portal UI
└── docs/
    ├── project-overview.md  # Core business problem, solution, tech stack
    ├── architecture.md      # Detailed folder layout and component system (this file)
    └── api_flow.md          # Endpoint structures and parameters query flow
```

---

## 2. Component System Diagram

The React application uses a flat, declarative hierarchy:

```
[RTMNUChecker (Main App State)]
   ├── ParticlesBg (Animation)
   ├── StatCard (Dashboard Metrics)
   └── Form Controls
         ├── SelectField (Department selector)
         ├── SelectField (Session selector)
         ├── SelectField (Faculty selector)
         ├── SelectField (Degree selector)
         └── SelectField (Course selector)
   ├── Results Table
         ├── ActionButtons (View marksheet / Auto-Grade via Gazette)
         └── ModalViewer (Iframe PDF render)
```

---

## 3. Data Storage & Caching Layer

To avoid overloading university servers and optimize client performance, the portal implements a **Session Cache Layer**:
- **Cache Targets:** Cascading dropdown values (`/Auth/GetDegreesBySession`, `/Auth/GetDegreesByFaculty`, `/Auth/GetCoursesByFacultyDegree`).
- **Storage Type:** `window.sessionStorage` (valid for the lifetime of the browser tab).
- **Cache Keys:** Formatted as `rtmnu_<full_requested_url>`.
- **Validation:** If cached items are found, they are immediately parsed and loaded, bypassing network requests entirely. If empty arrays are returned from the server (which indicates a transient error or missing parameters), the app explicitly skips caching that result.
