# BOM Optimizer UI — Phase 0

Enterprise AI Decision Platform for Manufacturing — React Frontend

## Quick Start

```bash
# Install dependencies
npm install

# Run dev server (proxies API calls to localhost:8000)
npm run dev
```

UI available at **http://localhost:5173**

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
