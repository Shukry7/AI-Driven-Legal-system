# AI-Driven Legal Document Analysis Platform (Sri Lanka)

## Overview

This repository contains a legal document analysis web application built with React + Vite + TypeScript. The frontend provides multiple analysis workspaces (e.g., translation, clause comparison, classification, and legal lineage) and a UI built with shadcn/ui components.

## Workflow (How We Work)

- Create a branch from `main`: `feature/<short-name>` or `fix/<short-name>`
- Keep commits small and descriptive (e.g., "Add clause upload UI")
- Open a PR to `main` and include:
  - What changed
  - How to test
  - Screenshots (if UI changes)
- Before requesting review, run lint and make sure the app starts locally

## Repository Structure

```text
.
├─ README.md
├─ Supreme-Court-Judgements-2024_judgment_14.txt
└─ frontend/
   ├─ package.json
   ├─ index.html
   ├─ public/
   └─ src/
      ├─ components/
      │  ├─ classification/
      │  ├─ clause/
      │  ├─ legalLineage/
      │  ├─ translation/
      │  └─ ui/
      ├─ pages/
      └─ main.tsx
```

Notes:

- `frontend/src/components/` contains the main feature modules (classification, clause tools, legal lineage, translation) and reusable UI components.
- `frontend/src/pages/` contains page-level routes.

## Setup & Run

### Prerequisites

- Node.js 18+ (recommended)
- npm (ships with Node), or pnpm/bun if you prefer

### Run the frontend (recommended: npm)

From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Vite will print the local URL (commonly `http://localhost:5173`).

### Alternative package managers

pnpm:

```powershell
cd frontend
pnpm install
pnpm run dev
```

Bun:

```powershell
cd frontend
bun install
bun run dev
```

### Build, preview, and lint

```powershell
cd frontend
npm run build
npm run preview
npm run lint
```

## Scripts

The frontend scripts live in `frontend/package.json`:

- `dev` — start Vite dev server
- `build` — production build
- `preview` — preview production build locally
- `lint` — run ESLint

## Notes

- Per project instructions, this README focuses on workflow, repository structure, and setup/run steps (merge-record tracking intentionally omitted).
