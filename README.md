# CodeCircuit 2D

A visual task and architecture board built on a circuit-board metaphor. Work items are components on a canvas, dependencies are traces between their pins, and Module ICs open into their own nested schematic views.

Built with TypeScript and the Canvas 2D API, bundled with Vite.

> **Status:** experimental. Core placement, connections and status tracking work. Nested Module ICs, multi-select and snap-to-grid have known issues.

## Features

- **Five component types**, dragged from the parts tray:
  - **Power Core** — energy source (user stories, drivers)
  - **Module IC** — container that opens into a nested schematic view
  - **Task Resistor** — an individual task or function
  - **Decision Point** — conditional logic with custom success/failure pins
  - **Gateway** — external integration
- **Typed connections**: click a source pin, then a target pin. Incompatible pin types are refused.
- **Status tracking**: right-click a component to cycle TODO → IN_PROGRESS → DONE, with color-coded states and animated energy flow.
- **Datasheet panel** for editing a component's name and properties.
- **Nested navigation** with a breadcrumb and a Back button.
- **Export and import** of the whole project as JSON, plus autosave to local storage.
- **Undo and redo** (Ctrl+Z / Ctrl+Y), copy and paste (Ctrl+C / Ctrl+V).

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm run serve` | Preview the production build |
| `npm test -- --run` | Run the unit tests once (Vitest + jsdom) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:coverage` | Unit tests with coverage |
| `npm run test:e2e` | End-to-end tests (Playwright, Chromium) |
| `npm run lint` | ESLint over `src/` |
| `npm run format` | Prettier |

Before the first end-to-end run, install the browser once:

```bash
npx playwright install chromium
```

`src/performance-stress.test.ts` measures frame timings and can fail on slower machines.

## Project structure

```
.
├── index.html                 # Application shell and parts tray
├── profiling.html             # Rendering profiler page
├── e2e/                       # Playwright end-to-end tests
├── src/
│   ├── main.ts                # App coordinator (MotherboardApp)
│   ├── core/                  # Managers: state, viewport, input, connections,
│   │                          #   schematic views, autosave, export/import, history
│   ├── components/            # Component registry and component plugins
│   ├── connections/           # Connection model
│   ├── events/                # EventBus and event types
│   ├── rendering/             # Layered canvas renderer and render helpers
│   ├── serialization/         # Project and component serialization
│   ├── ui/                    # UI controllers, parts tray, datasheet, React panels
│   ├── config/                # Feature flags and export config
│   ├── utils/                 # Caches, spatial index, logging, performance helpers
│   ├── test-utils/            # Shared test helpers
│   └── archived/              # Legacy code kept for reference (not imported)
├── motherboard-project-2026-03-15(2).json   # Sample project (used by tests)
└── package.json
```

## Architecture

- **Event-driven core.** Modules coordinate through a central `EventBus` instead of calling each other directly.
- **Managers.** Each concern has its own manager in `src/core/` (application state, viewport and camera, input, connections, schematic views, keyboard shortcuts, notifications, autosave).
- **Plugins.** Component types extend `BaseComponentPlugin` and register once with the component registry, which updates the parts tray and the type list.
- **Layered rendering.** Rendering is separated from application logic and drawn in layers on a single canvas.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for what is planned next.

## License

MIT. See [LICENSE](LICENSE).
