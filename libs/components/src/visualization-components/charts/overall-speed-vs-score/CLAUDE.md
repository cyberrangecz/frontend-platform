# Overall speed vs score (F1)

Scatter-quadrant chart for the **trainee feedback dashboard**. Plots every finished run of one
instance as a point — total time against final score — with the current run highlighted and the
field split into quadrants by the population averages. Answers "was this run fast & high, slow &
high, …?" relative to the rest of the cohort.

Lives under `charts/` (shared convention) and is imported by the feedback dashboard, alongside
`time-vs-score`, `cumulative-score`, and `event-timeline`.

## Data

- **Source**: `createTraineeOverviewSource(instanceId, resolver)` — all runs of the instance, live.
- **Levels**: `resolveInstanceLevels(instanceId, resolver)` → `LevelBasicView.maxScore` for the
  reachable-score denominator.
- **Per point (one finished run)**:
  - `x` = elapsed time in **milliseconds** = `endEndTime − startTimestamp`.
  - `y` = score **%** of max = `(trainingScore + assessmentScore) / Σ LevelBasicView.maxScore × 100`.
- **Population**: finished runs only (`hasEndedRow === true`).
- **Max reachable** = `Σ LevelBasicView.maxScore`; when `0`, the panel reports `empty` (no divide-by-zero).

## Encoding (locked spec)

| Aspect | Decision |
|---|---|
| Population | Finished runs only (`hasEndedRow`). |
| Divider | **Average** (mean) crosshair — dashed lines at mean x and mean y, labeled "average". No "mean"/"median" jargon in the UI. Computed over the plotted (finished) population. |
| X direction | Ascending time — fast on left, so the best corner is **top-left**. |
| Y axis | Score % of max, `value` axis 0–100, title "score %". Integer % in tooltip. |
| X axis | Elapsed **ms** on a `value` axis. Tick + tooltip labels via `formatClock` (`15:00`, `1:30:00`). Axis title "time". Mirrors the event-timeline chart in the same view. |
| Peer identity | Whatever name the source carries (already backend-anonymized) — no client-side masking. Same field the scoreboard uses. |
| Quadrants | Dashed average lines + muted corner labels: top-left "fast & high", top-right "slow & high", bottom-left "fast & low", bottom-right "slow & low". |
| Your run | Circular **avatar** dot — enlarged, drawn on top via `symbol: 'image://…'` (a circular-clipped data URL) with a separate accent ring circle behind it. Fallback when no picture: enlarged accent dot + persistent "you" label. Image color patterns are NOT used — ECharts positions them relative to the canvas, not the marker. |
| Peers | Small muted dots. |
| Tooltip | Rich tooltip: trainee · time (`formatClock`) · score %. Your row flagged "you". |
| Degenerate case | No special handling — the source's natural `empty` status covers zero data; a lone finished run just plots with its crosshair through it. |
| CSV export | None. No download button (panel-shell `exportable` left null). |

## Inputs

- `instanceId: InputSignal<number>` (required)
- `runId: InputSignal<number | null>` (default `null`) — identifies the highlighted run. Explicitly
  nullable for a uniform run-input contract across all charts; on `null` no run is highlighted (no
  avatar/ring), while peers and the quadrant crosshair still render — the chart stays `ready`.

Follows the `TraineePanelInputs` contract, matching sibling charts. The dashboard already passes both.

## Reuse (no reinvention)

- `EchartsChartBase` + `ECHARTS_CORE_PROVIDER` — palette signal, width tracking, tooltip persistence, init hooks.
- `crczp-chart-panel-shell` — card chrome + loading/empty/error state machine (heading "Overall speed vs score").
- `baseValueAxisDefaults(palette)` — both axes.
- `formatClock` — time axis + tooltip labels.
- `renderRichTooltipHtml` + `richTooltipDefaults` + `RichTooltipModel` — tooltip.
- `PALETTE` — `accent` for the highlighted point, `mutedText`/`gray` for peers and lines.
- `loadCircularAvatarImageUrl(base64, diameter)` (`charts/shared/trainee/avatar-canvas`, exported from `../shared`) — decodes a trainee's base64 avatar into a circular-clipped, marker-sized PNG data URL for an `image://` symbol; returns `Observable<string | null>` (null when no picture / decode fails). Do **not** re-implement avatar-to-image loading inline — reuse this.
- No scatter factory exists in `shared/` — the scatter series / axes / markLines are built in this component.

---

## Remarks log

Append every new instruction or course-correction the user gives about this chart here, so the spec
above stays the single source of truth. Update the table above when a remark supersedes a locked decision.

- _(initial spec locked via grill-me — decisions 1–9 above.)_
- Avatar loading extracted to the shared utility `loadCircularAvatarImageUrl` (`charts/shared/trainee/avatar-canvas`) at the user's request, rather than living inline here.
- Avatar rendered via `image://` symbol + a separate accent ring circle after the image color-pattern approach failed (ECharts positions patterns relative to the canvas, not the marker, so the avatar never landed on the point).
