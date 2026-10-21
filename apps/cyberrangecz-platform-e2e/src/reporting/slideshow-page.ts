import { PLAYER_SCRIPT, PLAYER_STYLE } from './slideshow-player';
import type { SlideshowSegment } from './slideshow-segments';

/** Escapes JSON for embedding inside a script element. */
function embeddable(value: unknown): string {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** Renders the self-contained player page over the given segments; the player builds every test-derived string through DOM text APIs. */
export function renderSlideshowPage(segments: SlideshowSegment[]): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>E2E run player</title>
<style>${PLAYER_STYLE}</style>
</head>
<body>
<header>
  <span class="summary" id="summary"></span>
  <label>Speed <select id="speed"><option>0.5</option><option selected>1</option><option>1.5</option><option>2</option><option>4</option></select></label>
</header>
<nav aria-label="Tests" id="index"></nav>
<main>
  <h1 id="title"></h1>
  <div class="meta" id="meta"></div>
  <div class="tiles" id="tiles"></div>
  <div id="errors"></div>
  <div class="gallery" id="gallery"></div>
  <div id="diagnostics"></div>
</main>
<footer>
  <button id="toggle" type="button">Play</button>
  <div class="seek">
    <input type="range" id="seek" min="0" max="0" step="1" value="0" aria-label="Position in the run">
    <div class="seek-markers" id="markers"></div>
  </div>
  <span id="clock">0:00 / 0:00</span>
</footer>
<script type="application/json" id="manifest">${embeddable(segments)}</script>
<script>${PLAYER_SCRIPT}</script>
</body>
</html>
`;
}
