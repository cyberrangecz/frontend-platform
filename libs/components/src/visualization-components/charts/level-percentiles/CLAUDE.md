# Score & time percentile per level (F2)

Horizontal grouped-bar chart for the **trainee feedback dashboard**. For each graded level of the
instance, places the highlighted run against the cohort on two 0–100 percentiles where **higher is
always better**: how its per-level score ranks, and how its per-level speed ranks. The per-level
counterpart to the overall speed-vs-score scatter (F1) — that chart reads the whole run, this one
reads level by level.

Lives under `charts/` (shared convention) beside `overall-speed-vs-score`, `time-vs-score`,
`cumulative-score`, and `event-timeline`; imported by the feedback dashboard.

## Data

- **Source**: `createTraineeOverviewSource(instanceId, resolver)` — all runs of the instance, live.
  Everything is computed client-side from `TraineeRawRow.levels[]`; no percentile query exists.
- **Levels**: `resolveInstanceLevels(instanceId, resolver)` for level order/title and the graded filter.
- **Per graded level, one grouped pair (score bar + time bar)** for the highlighted run:
  - **Score bar** = strictly-beat percentile of `TraineeLevelRaw.completedScore` (higher is better).
  - **Time bar** = strictly-beat percentile of per-level time `completedTimestamp − startedTimestamp`
    (lower is better → inverted so faster ranks higher).

## Encoding (locked spec)

| Aspect | Decision |
|---|---|
| Layout | Horizontal grouped bars, two per level (score + time), levels top-down in defined order, per-bar percentile number label. |
| Graded levels | Only graded levels appear: **Training**, or **Assessment** whose `assessmentType === Test`. Info, Access, and Questionnaire assessments are excluded. Predicate keys on `LevelBasicView.type` + `assessmentType` (see Reuse). |
| Cohort (per level) | Every run that **completed that level** (has `completedScore` + `completedTimestamp`). Sample varies per level; a run that didn't finish a level is not in that level's distribution. |
| Percentile | **Strictly-beat, exclusive**: `count(other completers strictly out-performed) / (number of other completers) × 100`. Self excluded from both numerator and denominator. Ties never count. Score: higher beats; time: faster beats. Rounded to an integer. |
| Sole completer | When there are no other completers (empty comparison set), percentile is **100** — leads the field by default — never a divide-by-zero. |
| Not completed (this run) | A level the highlighted run did not complete is plotted at an **explicit 0** on both bars, set ahead of the percentile math (never routed through the formula over a set the run isn't part of). The bar carries a muted "not completed" note (on the score series only) and the tooltip flags the status, so it is distinguishable from a genuine low completer. |
| Thin cohort | Every level always plots; the tooltip always discloses `Completed by N runs` so coarse/small samples are visible rather than hidden. |
| Reference line | None. Bars run 0–100 against the plain axis. |
| X axis | `value` 0–100, title "percentile". |
| Y axis | `category`, level titles in order (`inverse: true` so the first level sits on top), truncated to the room each label has via `categoryLabelWidth`. |
| Colors | Score bar `PALETTE.blue`; time bar `PALETTE.emerald`. Legend top-right. |
| Tooltip | Rich (`renderRichTooltipHtml`), axis-trigger with shadow pointer: level title · score X/max + score percentile · time (`formatClock`) + time percentile · cohort size. Not-completed shows status + cohort only. |
| CSV export | None. No download button (`exportable` left null) — standing rule for trainee charts. |

## Inputs

- `instanceId: InputSignal<number>` (required)
- `runId: InputSignal<number | null>` (default `null`) — the run to rank. Explicitly nullable for a
  uniform run-input contract across all charts; when no run is selected (`isRunSelected` false) the
  panel reports `empty` with a "Select a run to rank its levels" message rather than a misleading
  all-zero chart. In the feedback dashboard a run is always present, so this is a defensive path.

Implements `ChartPanelInputs`, matching sibling charts. The dashboard passes both.

## Reuse (no reinvention)

- `EchartsChartBase` + `ECHARTS_CORE_PROVIDER` — palette signal, host-width tracking, tooltip persistence, init hooks.
- `crczp-chart-panel-shell` — card chrome + loading/empty/error state machine.
- `resolveInstanceLevels` / `LevelBasicView` — level order, title, and the graded filter. **`assessmentType`
  was added to `LevelBasicView`** (optional field, populated in `resolveInstanceLevels`) so the graded
  filter can be type-accurate (Training ∪ Assessment/Test) rather than a `maxScore > 0` proxy —
  `AbstractLevelTypeEnum` alone cannot tell a scored Test assessment from an ungraded Questionnaire.
  This is a shared change; other `LevelBasicView` consumers are unaffected (purely additive).
- `createTraineeOverviewSource` / `TraineeRawRow` / `TraineeLevelRaw` — per-run, per-level aggregates.
- `formatClock` — per-level time in the tooltip.
- `renderRichTooltipHtml` + `richTooltipDefaults` + `RichTooltipRow` — tooltip.
- `categoryLabelWidth` — responsive truncation of the level-title axis labels.
- `PALETTE` — `blue` (score) and `emerald` (time).
- No grouped-bar factory exists in `shared/` — each chart builds its own bar series; this one follows suit.

---

## Remarks log

Append every new instruction or course-correction the user gives about this chart here, so the spec
above stays the single source of truth. Update the table above when a remark supersedes a locked decision.

- Initial spec locked via grill-me: cohort = per-level completers (A); graded levels only = Training ∪
  Assessment/Test; not-completed plotted as explicit 0 (C); strictly-beat exclusive percentile (B);
  thin cohorts always plot with `n` disclosed (A); no reference line; horizontal grouped bars (A).
- Graded filter must key on the assessment level's `assessmentType` (`Test` vs `Questionnaire`), not the
  top-level `AbstractLevelTypeEnum`; `assessmentType` was carried through `LevelBasicView` to enable this.
- `runId` relaxed from `input.required<number>` to `input<number | null>(null)` to unify the run-input
  contract across every chart; a null run yields an `empty` "Select a run…" state via the shared
  `isRunSelected` predicate (`charts/shared/data-source/run-selection`).
