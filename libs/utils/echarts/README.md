# @crczp/echarts-utils

Framework-agnostic helpers for working with raw [ECharts](https://echarts.apache.org/)
option fragments. Each helper returns plain ECharts option objects and depends only on
echarts types — no Angular, no chart-specific view model — so it is reusable across every
chart in the workspace.

## Helpers

### `verticalScrollbarDataZoom(colors, geometry)`

Builds a pan-locked vertical `dataZoom` (a `slider` with `zoomLock: true`) that turns a
category axis into a scrollable list with a slim, theme-colored scrollbar: light track,
dark thumb with rounded pill ends, and a white data-shape silhouette over the thumb. The
caller supplies resolved colors and the row window (`startIndex`/`endIndex`) plus optional
track insets and `filterMode`.

### `horizontalSliderStyle(colors)`

Returns the style-only keys for a horizontal range slider in the brand-accent glass
treatment — translucent neutral track, translucent accent selected-window fill, solid
accent handles, muted detail labels, hidden data silhouettes. The caller spreads the result
onto its own slider shell carrying the structural keys (`type`, `xAxisIndex`, the window,
`filterMode`, `bottom`, `height`, `labelFormatter`).
