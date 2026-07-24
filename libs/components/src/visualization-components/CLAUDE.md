# Visualization components

Reusable chart building blocks for training dashboards — scatter/quadrant, timelines, scoreboards,
score-attainment, assessment views, KPI cards, live feeds, the run selector, and the shared chart
infrastructure they stand on. Each chart is self-standing (inputs + DI, owns its own `vm`/`status`) and
composes into a dashboard by its host.

Everything here is surfaced under `@crczp/components` (via `libs/components/src/index.ts`). Consumers
import from that entry point, never through deep `charts/*` or `dashboard-layout/*` paths.

```ts
import { OverallSpeedVsScoreComponent, ChartRowComponent } from '@crczp/components';
```

## Public surface — how `index.ts` is assembled

- **Charts** — each chart re-exported directly from its own component file under `charts/<chart>/`;
  there is no per-chart barrel. `charts/progress` is the exception, re-exported through its own barrel.
  Some charts also export data-source factories and view-model / CSV types alongside the component
  (e.g. `createAssessmentSource`, `assessmentCsvColumns`, `createTraineeOverviewSource`).
- **`charts/run-selector`**, **`charts/shared`**, **`dashboard-layout`** — curated barrels, each
  re-exported with `export *`. `shared` carries the chart infrastructure (panel shell, echarts base,
  theme/palette, tooltip, CSV, `Status` union); `dashboard-layout` carries the layout primitives
  (`DashboardSectionComponent`, `ChartRowComponent`).

Per-chart API (import path, inputs, encoding, data wiring) lives in each chart's own node under
`charts/<chart>/`, not here.

## Page dashboards live elsewhere

This library holds chart building blocks only — no page-level dashboard. The two instructor/trainee
dashboards that host these charts moved out to their training-agenda homes:

- `AnalysisDashboardComponent` → `@crczp/training-agenda/instance-results`.
- `TraineeFeedbackDashboardComponent` → `@crczp/training-agenda/run-results`.

## Wiring a graph to data

Before wiring any chart to the local event cache, read the data-wiring standard at
`.docs/dashboard/data-wiring-standard.md` — it defines the shared pause gate and the live / one-shot
query helpers every graph builds on, and the self-standing graph contract.

## Non-negotiables

- Import charts from `@crczp/components`, never via deep `charts/*` paths.
- Add a new chart as its own `charts/<chart>/` folder with a direct re-export line in `index.ts`; keep
  shared infrastructure in `charts/shared` and layout in `dashboard-layout`.
- Follow the data-wiring standard for any chart that reads the event cache.
