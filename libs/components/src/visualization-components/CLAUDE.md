# Visualization components

Dashboard graphs pull data from the local event cache through a shared, lean querying standard.
**Before wiring any graph to data, read the standard:**

@../../../../.docs/dashboard/data-wiring-standard.md

## Non-negotiables

- Use the shared **query helpers** (`shared/`) — `DataBrokerService` → optional
  `EntityResolverService` → `toSignal`. Do not hand-roll `rxResource` or per-graph refresh loops.
- Live graphs participate in the global **pause gate** (`paused` / `pauseAll` / `resumeAll`).
  Static data uses the one-shot helper and does not refresh.
- Graphs are **self-standing**: inputs + DI, own their `vm` + `status`, render with or without
  `ChartPanelShell`.
- Do not reintroduce the trimmed infra (`ChartDataSource`, `combineSources`, RefreshController
  countdown/registration). Compose multiple sources with a plain `computed`.
- **No fallback palettes for theme tokens.**
