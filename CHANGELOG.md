# Changelog - RTMNU Smart Result Portal

All notable changes to this project are documented in this file.

---

## [v1.3] - 2026-07-02
### Refactored
- **Codebase Restructure:** Cleaned up root files, moving styles into `css/style.css`, and core React hooks/components into `js/app.js`.
- **CORS Workers:** Reorganized Cloudflare Worker code into a dedicated `workers/` folder.
- **Branding Update:** Standardized branding to **RTMNU Smart Result Portal** across user-facing HTML title, headings, paragraph labels, and documentation.
- **Documentation:** Added structured reference documents (`docs/project-overview.md`, `docs/architecture.md`, `docs/api_flow.md`), `CONTRIBUTING.md`, `LICENSE`, and `.gitignore`.
- **Repository Clean-up:** Permanently deleted unused temporary data and old HTML/JSX backup files after verifying zero project references.

---

## [v1.2] - 2025-11-10
### Added
- **Bulk Range Queries:** Implemented iteration over contiguous roll numbers.
- **Gazette Parsing Integration:** Added an option to paste Gazette text and automatically match result outcomes (PASS/FAIL/GRACE) on client side.
- **CSV Export:** Enabled educators to export results data offline to spreadsheet formats.

---

## [v1.1] - 2025-06-15
### Added
- **Semester Filter:** Introduced dropdown search filters targeting semesters (`FIRST` through `TENTH`) to refine the degree cascading lists.

---

## [v1.0] - 2025-04-20
### Added
- **Initial Release:** Initial deployment of the single roll result check application.
- **Serverless proxy support:** Added configuration inputs targeting custom Cloudflare CORS workers.
- **Responsive Table UI:** Renders query results with search status indicators and dark space glassmorphic layouts.
