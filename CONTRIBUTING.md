# Contributing Guidelines - RTMNU Smart Result Portal

Thank you for your interest in contributing to the **RTMNU Smart Result Portal**! We welcome contributions to make student result lookups and administration smoother and faster.

---

## 1. Coding Style Guidelines

To keep the repository clean and manageable, please adhere to these guidelines:
- **Zero-Dependency Architecture:** Keep the portal as a pure static website. Avoid adding build scripts, Webpack/Vite bundlers, or npm dependencies unless absolutely necessary and discussed beforehand.
- **Separation of Concerns:** 
  - Keep layout and mounting in `index.html`.
  - Place visual layouts and styling variables in `css/style.css`.
  - Maintain component states, hooks, and logic in `js/app.js`.
- **Vanilla CSS:** Write clean vanilla CSS. Do not use UI frameworks (like Tailwind or Bootstrap) since the interface utilizes a bespoke dark glassmorphic design system.
- **React & Babel Standalone:** Remember that the app executes React 18 in the browser on-the-fly. Avoid syntax that requires server-side bundlers (e.g. do not write `import React from 'react'`). Use globals like `React.useState` or destructure React fields at the top of scripts.

---

## 2. Commit Message Conventions

We recommend descriptive, prefix-based commit messages:
- `feat:` for new capabilities (e.g., `feat: add bar charts display`)
- `fix:` for bug resolutions (e.g., `fix: mobile iframe reload bug`)
- `docs:` for documentation updates (e.g., `docs: update API mapping guide`)
- `style:` for visual styling or CSS changes (e.g., `style: change glow animation speed`)
- `refactor:` for codebase maintenance without feature changes (e.g., `refactor: extract UI components`)

---

## 3. Pull Request Process

1. **Fork the Repository:** Create your own fork and clone it locally.
2. **Branch naming:** Create a feature branch named `feature/your-feature-name` or `fix/your-fix-name`.
3. **Local Testing:** Test changes by running a local HTTP server (e.g., `python -m http.server 8000`) and ensuring there are no console errors.
4. **Submit PR:** Open a Pull Request referencing the issue or describing the changes clearly.
