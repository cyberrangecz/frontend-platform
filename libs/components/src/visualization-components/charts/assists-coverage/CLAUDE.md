# Hints & solutions taken (F6)

**Per-level bar breakdown** for the **trainee feedback dashboard**. One section per training level,
headed by the level name with its order as a subtitle; inside, the level's hints in order and then
its solution render as horizontal bars inside an **outlined card**, with the level name and order
sitting **above** the card. A bar's length is how common that assist was among the cohort. The
**assist name sits in a left gutter (max 240px)** and the **coverage % at the bar end** — never on
the fill — so text is always legible. The assists this run opened fill with the **primary** colour
and carry a matching **green check** (before the %); the rest fill with a **neutral accent**. Answers
"which hints/solutions did I open, and how usual was that compared to everyone who got through the level?"

Lives under `charts/` (shared convention) and is imported by the feedback dashboard, alongside
`overall-speed-vs-score`, `scoreboard`, and the score/time charts. Unlike its siblings it uses
**no ECharts** — the levels are ragged (different hint counts) and the encoding is plain CSS bars,
which flex/grid handles natively while a rectangular ECharts heatmap does not.

## Data

- **Levels + hint lists**: resolve the instance's training levels to their ordered hint list
  (`hint id`, `title`, `order`) and solution/penalty info. TRAINING levels only carry hints and a
  solution; INFO / ACCESS / ASSESSMENT levels are excluded from the grid.
- **Assist events**: `hintTakenTable` (`hint_id`, `hint_title`, `hint_penalty_points`,
  `training_run_id`, `level_order`, `user_ref_id`) and `solutionDisplayedTable` (`penalty_points`,
  `training_run_id`, `level_order`, `user_ref_id`), scoped to the instance, via a live query source.
- **Completion signal**: distinct trainees who **completed** each level (not merely started) form the
  per-level denominator — mirror the level-completion rule used by the trainee-overview source.
- **This run's opens**: assist events filtered to `training_run_id === runId`.

## Coverage math

- **Denominator (per level)** = count of distinct trainees who **completed that level**.
- **Numerator (per assist)** = count of distinct trainees, **among that level's completers**, who
  opened that specific hint (`hint_id`) or the solution.
- **% = numerator / denominator × 100**, clamped 0–100. Scoping both to completers keeps every cell
  a coherent 0–100% (an opener who abandoned before completing is not counted, so % never exceeds 100).
- Every hint the level defines is shown even at **0%**, so the trainee sees assists that existed but
  nobody used. A level with zero completers reports its cards at 0% (denominator 0 → 0%, no divide).

## Encoding (locked spec)

| Aspect | Decision |
|---|---|
| Medium | Plain **CSS bars** inside `ChartPanelShell`. No ECharts — ragged levels and a bar-per-assist encoding are native to flex/grid. |
| Sections | One per **TRAINING level**, ascending `order`, stacked vertically. Header shows the **level name as the title** (prominent) with **`Level {order+1}` as the subtitle** (muted) — the inverse of the earlier order-first label. |
| Bar order | Within a section, each hint in level order then the **Solution** bar last. |
| Section frame | Each level is a `section`: the **title + subtitle sit above** an **`<mat-card appearance="outlined">`** (`mat-card-content` wraps the rows) — the Material outlined card, not a hand-rolled bordered box. |
| Layout | Four-column grid per row: **name gutter** `minmax(0, 240px)` · **track+fill** `minmax(33%, 1fr)` · **check** · **% value** (check before the %). Label caps at 240px (ellipsis past it); the bar keeps **≥ 33%** and takes all remaining width, because for a length bar the width is the reading. Text lives only in the gutter and value columns, never on the fill. |
| Bar length | **Global coverage %** = share of the level's completers who opened the assist (`coveragePercent`), drawn as a fill over a faint neutral **track** (`--mat-sys-surface-variant`), pill-rounded. Every authored hint shows even at 0%. |
| Bar fill | **`PALETTE.emerald`** (green, `--assists-used`) for an assist this run opened; **`#3E8ABD`** (neutral accent, `--assists-unused`) for one it did not. Length alone carries magnitude; membership is the hue swap plus the check. |
| This run opened it | `openedByThisRun` assists get the **emerald** fill and a **matching-green `check_circle`** (also `--assists-used`) in the column **before the %**. Redundant (hue + icon), colourblind-safe. |
| Name + value | Authored `hint_title` (`"Solution"` for the solution) in the **left gutter** at **font-weight 600** (dark on panel surface); coverage **%** at the **row end**. Both `--mat-sys-on-surface`, always ≥ AA contrast regardless of fill. |
| Tooltip | Shared **`RichTooltipDirective`** (`crczpRichTooltip`, CDK-overlay common used by the other charts) — **assist name as the header**, then rows **`Used by: x of y`** (y = level completers) and **`Penalty: z`** (omitted when unpenalized). Not the plain Material tooltip. |
| Scroll offset | The scrolling section list carries a right-side `padding-right` so bars clear the scrollbar. |
| Empty / degenerate | No training levels → panel `empty`. A level with no completers → its bars read 0% (empty fill). |
| CSV export | None. No download button (`ChartPanelShell` `exportable` left null) — trainee charts never export. |

## Inputs

- `instanceId: InputSignal<number>` (required)
- `runId: InputSignal<number>` (required) — identifies the run whose opens get the gold border.

Follows the `TraineePanelInputs` contract, matching sibling charts. The dashboard already passes both.

## Reuse (no reinvention)

- `crczp-chart-panel-shell` — card chrome + loading/empty/error state machine (heading
  "Hints & solutions taken").
- The shared **query-source** helper (`charts/shared/data-source`) — live instance-scoped event
  query + status, participating in the pause gate. Do not hand-roll polling.
- Level/hint resolution via `EntityResolverService` — mirror the trainee-overview source's resolve
  chain; do not re-fetch definitions ad hoc.
- The level-completion rule from the trainee-overview source — reuse it for the completer
  denominator rather than inventing a second definition of "completed".
- `PALETTE` — `green` for the this-run-opened `check_circle` (`--assists-check`). Opened bars fill with
  the theme token **`var(--primary-40)`**; the rest with a chart-local `#3E8ABD` (`--assists-unused`).
- **`RichTooltipDirective`** (`crczpRichTooltip`, from `../shared`) — the shared CDK-overlay tooltip
  common the other DOM charts use, fed a `RichTooltipModel` (`title` = assist name, `rows` = usage /
  penalty). Do **not** hand-roll a Material tooltip string here — this is the shared tooltip surface.
- Angular Material `mat-icon` (`MatIconModule`) for the `check_circle` glyph on opened assists.
- Angular Material `mat-card` (`MatCardModule`), `appearance="outlined"`, as the per-level card frame —
  do not hand-roll a bordered box.

---

## Remarks log

Append every new instruction or course-correction the user gives about this chart here, so the spec
above stays the single source of truth. Update the table above when a remark supersedes a locked decision.

- _(initial spec locked via grill-me — render medium, denominator, cell encoding, label, you-opened
  mark, heat hue, tooltip, solution treatment.)_
- Denominator refined by user to trainees who **completed** the level (not merely started); numerator
  scoped to that same completer population for 0–100% coherence.
- Cell layout refined by user: the **card background** is the heat surface; **all text sits in chips
  layered on top** of the heat-colored card.
- You-opened mark set by user to a **gold border at 2× normal thickness**.
- Label chip shows the **authored hint title** (not a neutral ordinal).
- Implementation notes (superseded): the original card grid used a `color-mix` heat fill keyed on
  coverage % and a 2×-width gold border to mark this run's opens. Hint penalty comes from the authored
  `HintBasic.penalty`; the solution penalty amount is read from a `solution_displayed` event's
  `penalty_points` (omitted when the level's solution is unpenalized). `runId` is passed from the
  dashboard alongside `instanceId`.
- Reworked at user request ("concepted as one level, one section"): the ragged card grid became
  stacked per-level **sections** with the level name as title and its order as subtitle (inverse of the
  old order-first label); cards became **horizontal bars** whose length is global coverage %, whose hue
  is blue (hint) / gold (solution), and whose **saturation** encodes this run's own usage — full colour
  when opened, `Utils.Color.desaturate(base, 0.72)` when not. Saturation replaces the gold you-opened
  border; the `--assists-heat` / `--assists-gold` host vars and the heat-fill/card CSS were removed.
- Confirmed via question (since superseded on colour): saturation had encoded **this run's own usage**;
  each bar keeps its **% label and tooltip** (used x of y, penalty).
- Superseded by user: **saturation distinction dropped**. Every bar is now **normal-saturation blue**
  (`PALETTE.blue`) for both hints and solution; the this-run-opened mark returned as a **gold outline
  on the bar + gold label/value text** (`PALETTE.gold`). Tooltip switched from the Material tooltip to
  the shared **`RichTooltipDirective`** common, with the **assist name as the tooltip header**. Added a
  right-side `padding-right` on the scroll container to offset from the scrollbar.
- Refined by user: **no outline** — instead the whole bar **fill turns gold** when this run opened the
  assist (blue otherwise). Item names use **font-weight 600**. Bars are **taller**, with the name and %
  seated on **pills inside the bar** (name pill left, % pill right). Opened assists gain a **green
  `check_circle`** icon. Host vars: `--assists-blue`, `--assists-gold`, `--assists-check`.
- Refined by user: pills gained a concentric radius (radius+padding trick), a translucent
  `color-mix(--mat-sys-surface 60%)` background, the **check moved after the hint name**, gold text was
  removed from opened labels, and the fill got a hard split border. **All superseded below.**
- Superseded by user: **no border on the fill div** (plain filler), **no pill backgrounds**, **white
  text** directly on the bar, dark track, blue base fill, deep-amber used fill. **All superseded below.**
- **Redesigned after web research** (four diversified agents: dataviz theory, ECharts idioms, product
  UX, colour/legibility — all converged). Root cause of the circling: text was on the fill and colour
  carried the "mine" binary — both wrong. New form (research Option A, "highlighted gutter bars"): the
  **name moves to a left gutter** and the **% to the bar end** (text never on the fill, so contrast is
  a non-issue in any theme); **one calm hue** (`--assists-fill` = `PALETTE.blue`) with **length** as the
  only magnitude channel; the **"mine" binary rides fill density** (solid vs 30% ghost) **plus a green
  `check_circle`** (redundant, colourblind-safe). Host vars now `--assists-fill`, `--assists-check`.
  Options B (lollipop dot rows) and C (compact heat-strip) were offered and remain easy pivots — the
  gutter/off-fill/marker foundation is shared. Optional future add-on the research surfaced: a per-level
  "you vs cohort" deviation strip answering "do I lean on help more than everyone else?".
- Tried option A (gutter length-bars, solid vs ghost fill), then B (lollipop dot rows — user: "worse
  than A"), then C (heat-swatch shade). **User's final pick: option A.**
- **Final layout rule (supersedes the 66% rule, which applied to the shade forms):** for the length
  bars, the **bar takes ≥ 33% and all remaining width**, the **label caps at 240px** (`minmax(0,240px)`),
  ellipsis past it — because a length bar's width *is* the magnitude reading, so the bar gets the room.
- Refined by user: the **check moves before the %** (grid order name · bar · check · %). The fill swapped
  — **unused bars now use the former used solid `#3E8ABD`**, and **opened bars use `var(--primary-40)`**.
  Each level's rows sit in an outlined card with the **title + subtitle above** the card. Host vars:
  `--assists-unused`, `--assists-check`.
- Refined by user: the per-level card is now a proper **`<mat-card appearance="outlined">`** (Material
  component) rather than a hand-styled bordered `<ul>`.
