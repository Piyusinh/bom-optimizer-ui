# BOM Optimizer UI — Phase 0

Enterprise AI Decision Platform for Manufacturing — React Frontend

## Quick Start

Requires **Node 18+** (tested with Node 24). Start the API first (repo `bom-optimizer-api`, `python run.py`, http://127.0.0.1:8001).

```bash
npm ci            # or npm install
npm run dev       # http://localhost:5173, proxies /api and /health to http://localhost:8001
npm run build     # type-check + production build into dist/
```

Demo logins are shown on the login page (for example superadmin@bom.local).

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | KPI overview of ingested data & decisions |
| `/analyze` | Analyze BOM | Input material/params → get ranked recommendations |
| `/decisions` | Decision History | List of all computed analyses |
| `/data` | Data Management | Ingest Excel files or upload new data |

## Tech Stack

- **React 18** + TypeScript
- **Vite 5** (build tool)
- **Tailwind CSS 3** (styling)
- **React Router 6** (navigation)
- **Zustand** (state management - ready for expansion)
- **Axios** (HTTP client)
- **Recharts** (charting - ready for expansion)

## Architecture (mirrors BluePlus-Admin-Portal patterns)

```
src/
├── App.tsx                 # Router setup
├── main.tsx                # Entry point
├── index.css               # Tailwind + custom component classes
├── components/
│   ├── layout/             # PageLayout, Sidebar, TopNav
│   └── common/             # KpiCard, LoadingSpinner
├── pages/                  # Route-level page components
├── services/               # API client (axios)
├── hooks/                  # useApiQuery, useApiMutation
└── types/                  # TypeScript interfaces
```

## Development

The Vite dev server proxies `/api/*` to `http://localhost:8000` (the FastAPI backend).
Make sure the API is running before using the UI.
