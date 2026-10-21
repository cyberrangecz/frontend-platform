export const PLAYER_STYLE = `
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.4 system-ui, sans-serif; display: grid; grid-template: auto 1fr auto / 340px 1fr; height: 100vh; color: #1d1d1f; }
header { grid-column: 1 / 3; display: flex; gap: 12px; align-items: center; padding: 8px 12px; border-bottom: 1px solid #ccc; background: #f6f6f6; }
header .summary { margin-right: auto; }
nav { overflow-y: auto; border-right: 1px solid #ccc; }
nav h2 { font-size: 13px; margin: 0; padding: 6px 10px; background: #eee; position: sticky; top: 0; }
nav button { display: flex; gap: 8px; width: 100%; text-align: left; border: 0; border-bottom: 1px solid #eee; background: none; padding: 6px 10px; cursor: pointer; font: inherit; }
nav button[aria-current="true"] { background: #dde8ff; }
.status { flex: none; width: 56px; font-size: 12px; font-weight: 600; }
.status-passed { color: #1a7f37; } .status-failed { color: #cf222e; } .status-skipped { color: #6e7781; }
main { overflow-y: auto; padding: 12px 16px; }
main h1 { font-size: 16px; margin: 0 0 4px; overflow-wrap: anywhere; }
.meta { color: #57606a; margin-bottom: 8px; overflow-wrap: anywhere; }
.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-width: 1100px; margin: 0 auto; }
.tile { margin: 0; grid-column: span 2; min-width: 0; }
.tile[data-browser="firefox"] { grid-column: 1 / 3; grid-row: 1; }
.tile[data-browser="webkit"] { grid-column: 3 / 5; grid-row: 1; }
.tile[data-browser="chromium"] { grid-column: 2 / 4; grid-row: 2; }
.tiles[data-count="1"] .tile { grid-column: 2 / 4; grid-row: 1; }
.tile video, .tile img, .tile-empty { width: 100%; aspect-ratio: 16 / 9; background: #000; object-fit: contain; display: block; }
.tile-empty { display: grid; place-items: center; color: #aaa; }
.tile figcaption { font-size: 12px; font-weight: 600; color: #1a7f37; padding: 2px 0; }
.tile figcaption.tile-label--unexpected { color: #cf222e; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #fff4f4; border: 1px solid #f5c2c7; padding: 8px; }
h3 { font-size: 13px; margin: 12px 0 4px; }
.gallery { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.gallery figure { margin: 0; width: 220px; }
.gallery img { width: 100%; border: 1px solid #ccc; }
.gallery figcaption { font-size: 12px; color: #57606a; }
table { border-collapse: collapse; margin-top: 8px; font-size: 12px; }
td, th { border: 1px solid #ddd; padding: 2px 6px; text-align: left; vertical-align: top; }
footer { grid-column: 1 / 3; display: flex; gap: 12px; align-items: flex-start; padding: 8px 12px; border-top: 1px solid #ccc; background: #f6f6f6; }
footer button { flex: none; width: 64px; }
.seek { flex: 1; min-width: 0; }
.seek input { width: 100%; margin: 0; }
.seek-markers { position: relative; height: 14px; }
.seek-markers button { position: absolute; top: 0; width: 4px; height: 14px; padding: 0; border: 0; background: #6e7781; cursor: pointer; transform: translateX(-50%); }
.seek-markers button.marker-failed { background: #cf222e; }
#clock { flex: none; font-variant-numeric: tabular-nums; }
`;

export const PLAYER_SCRIPT = `
const segments = JSON.parse(document.getElementById('manifest').textContent);
const STILL_SECONDS = 3;
const MINIMUM_CLIP_SECONDS = 0.5;
const DRIFT_SECONDS = 0.4;
const PROBE_WORKERS = 4;
const PROBE_TIMEOUT_MILLISECONDS = 8000;
const UNKNOWN_DURATION_SEEK = 1e101;

const indexElement = document.getElementById('index');
const tilesElement = document.getElementById('tiles');
const markersElement = document.getElementById('markers');
const seekElement = document.getElementById('seek');
const toggleElement = document.getElementById('toggle');
const clockElement = document.getElementById('clock');
const speedElement = document.getElementById('speed');

let totalSeconds = 0;
let runTime = 0;
let currentIndex = -1;
let activeTiles = [];
let playing = false;
let rate = 1;
let timelineDirty = false;
let lastFrame = performance.now();

const isUnexpected = (clip) => clip.status !== clip.expectedStatus && clip.status !== 'skipped';

function outcomeOf(segment) {
  if (segment.clips.some(isUnexpected)) return 'failed';
  return segment.clips.every((clip) => clip.status === 'skipped') ? 'skipped' : 'passed';
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
}

function computeTimeline() {
  let start = 0;
  for (const segment of segments) {
    const longest = Math.max(0, ...segment.clips.map((clip) => clip.seconds));
    segment.duration = longest > 0 ? longest : STILL_SECONDS;
    segment.start = start;
    start += segment.duration;
  }
  totalSeconds = start;
}

function renderTimeline() {
  seekElement.max = String(Math.round(totalSeconds * 1000));
  markersElement.replaceChildren(...segments.map((segment) => {
    const marker = element('button', undefined, 'marker-' + outcomeOf(segment));
    marker.type = 'button';
    marker.title = segment.title;
    marker.setAttribute('aria-label', segment.title);
    marker.style.left = (segment.start / totalSeconds * 100) + '%';
    marker.addEventListener('click', () => seekTo(segment.start));
    return marker;
  }));
}

function refreshTimeline() {
  timelineDirty = false;
  const offset = currentIndex >= 0 ? runTime - segments[currentIndex].start : 0;
  computeTimeline();
  if (currentIndex >= 0) runTime = segments[currentIndex].start + Math.min(offset, segments[currentIndex].duration);
  renderTimeline();
  updateSeekState();
}

function recordDuration(clip, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0 || Math.abs(clip.seconds - seconds) < 0.01) return;
  clip.seconds = seconds;
  timelineDirty = true;
}

function locate(time) {
  for (let index = segments.length - 1; index > 0; index--) {
    if (time >= segments[index].start) return index;
  }
  return 0;
}

function buildTile(clip) {
  const tile = element('figure', undefined, 'tile');
  tile.dataset.browser = clip.browser;
  const label = clip.browser + ' · ' + clip.status + ' · ' + (clip.status === clip.expectedStatus ? 'as expected' : 'not expected');
  const caption = element('figcaption', label, isUnexpected(clip) ? 'tile-label--unexpected' : '');
  let video;
  let media;
  if (clip.videos.length > 0) {
    video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = clip.videos[0].path;
    video.addEventListener('loadedmetadata', () => {
      recordDuration(clip, video.duration);
      syncTiles(true);
    });
    media = video;
  } else if (clip.screenshots.length > 0) {
    media = document.createElement('img');
    media.src = clip.screenshots[clip.screenshots.length - 1].path;
    media.alt = 'Final screenshot, ' + clip.browser;
  } else {
    media = element('div', 'No video', 'tile-empty');
  }
  tile.append(media, caption);
  return { clip, video, tile };
}

function renderDetails(segment) {
  document.getElementById('title').textContent = segment.title;
  const place = segment.stage + (segment.area ? ' / ' + segment.area : '');
  document.getElementById('meta').textContent = place + ' · ' + segment.file + ':' + segment.line;

  document.getElementById('errors').replaceChildren(...segment.clips.filter((clip) => clip.error).flatMap((clip) =>
    [element('h3', clip.browser + ' · ' + clip.status), element('pre', clip.error)]));

  document.getElementById('gallery').replaceChildren(...segment.clips.flatMap((clip) => clip.screenshots.map((shot) => {
    const figure = element('figure');
    const link = element('a');
    link.href = shot.path;
    link.target = '_blank';
    const image = element('img');
    image.src = shot.path;
    image.alt = shot.label;
    image.loading = 'lazy';
    link.append(image);
    figure.append(link, element('figcaption', clip.browser + ' · ' + shot.label));
    return figure;
  })));

  document.getElementById('diagnostics').replaceChildren(...segment.clips.filter((clip) => Array.isArray(clip.diagnostics) && clip.diagnostics.length > 0).flatMap((clip) => {
    const body = element('tbody');
    for (const problem of clip.diagnostics) {
      const row = element('tr');
      row.append(element('td', problem.page), element('td', problem.kind), element('td', problem.text));
      body.append(row);
    }
    const table = element('table');
    table.append(body);
    return [element('h3', clip.browser + ' · diagnostics'), table];
  }));

  for (const button of indexElement.querySelectorAll('button')) {
    const isCurrent = Number(button.dataset.index) === segment.index;
    button.setAttribute('aria-current', String(isCurrent));
    if (isCurrent) button.scrollIntoView({ block: 'nearest' });
  }
}

function enterSegment(index) {
  currentIndex = index;
  const segment = segments[index];
  activeTiles = segment.clips.map(buildTile);
  tilesElement.dataset.count = String(activeTiles.length);
  tilesElement.replaceChildren(...activeTiles.map((entry) => entry.tile));
  renderDetails(segment);
}

function syncTiles(force) {
  if (currentIndex < 0) return;
  const offset = runTime - segments[currentIndex].start;
  for (const { clip, video } of activeTiles) {
    if (!video || video.readyState < 1) continue;
    const length = Number.isFinite(video.duration) ? video.duration : clip.seconds;
    if (offset >= length) {
      video.pause();
      if (!video.seeking && (force || !video.ended)) video.currentTime = length;
      continue;
    }
    if (force || Math.abs(video.currentTime - offset) > DRIFT_SECONDS) video.currentTime = offset;
    video.playbackRate = rate;
    if (playing && video.paused) video.play().catch(() => {});
    if (!playing && !video.paused) video.pause();
  }
}

function updateSeekState() {
  seekElement.value = String(Math.round(runTime * 1000));
  clockElement.textContent = formatTime(runTime) + ' / ' + formatTime(totalSeconds);
}

function apply(force) {
  const index = locate(runTime);
  if (index !== currentIndex) {
    enterSegment(index);
    force = true;
  }
  syncTiles(force);
  updateSeekState();
}

function setPlaying(value) {
  if (value && runTime >= totalSeconds) runTime = 0;
  playing = value;
  toggleElement.textContent = value ? 'Pause' : 'Play';
  apply(true);
}

function seekTo(seconds) {
  runTime = Math.max(0, Math.min(seconds, totalSeconds));
  apply(true);
}

function seekToSegment(index) {
  const target = segments[Math.max(0, Math.min(index, segments.length - 1))];
  if (target) seekTo(target.start);
}

function tick(now) {
  const elapsed = (now - lastFrame) / 1000;
  lastFrame = now;
  if (timelineDirty) refreshTimeline();
  if (playing) {
    runTime += elapsed * rate;
    if (runTime >= totalSeconds) {
      runTime = totalSeconds;
      playing = false;
      toggleElement.textContent = 'Play';
    }
    apply(false);
  }
  requestAnimationFrame(tick);
}

function probeDuration(path) {
  return new Promise((resolve) => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.muted = true;
    const finish = (seconds) => {
      clearTimeout(timer);
      probe.removeAttribute('src');
      probe.load();
      resolve(seconds);
    };
    const timer = setTimeout(() => finish(undefined), PROBE_TIMEOUT_MILLISECONDS);
    probe.addEventListener('error', () => finish(undefined));
    probe.addEventListener('durationchange', () => {
      if (Number.isFinite(probe.duration)) finish(probe.duration);
    });
    probe.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(probe.duration)) finish(probe.duration);
      else probe.currentTime = UNKNOWN_DURATION_SEEK;
    });
    probe.src = path;
  });
}

async function probeAllClips() {
  const queue = segments.flatMap((segment) => segment.clips).filter((clip) => clip.videos.length > 0);
  const worker = async () => {
    for (let clip = queue.shift(); clip; clip = queue.shift()) {
      const seconds = await probeDuration(clip.videos[0].path);
      if (seconds !== undefined) recordDuration(clip, seconds);
    }
  };
  await Promise.all(Array.from({ length: PROBE_WORKERS }, worker));
}

function renderIndex() {
  let group;
  for (const segment of segments) {
    const heading = segment.stage + (segment.area ? ' / ' + segment.area : '');
    if (heading !== group) {
      group = heading;
      indexElement.append(element('h2', heading));
    }
    const outcome = outcomeOf(segment);
    const button = element('button');
    button.type = 'button';
    button.dataset.index = String(segment.index);
    button.append(element('span', outcome, 'status status-' + outcome), element('span', segment.title));
    button.addEventListener('click', () => seekToSegment(segment.index));
    indexElement.append(button);
  }
}

function renderSummary() {
  const counts = {};
  for (const segment of segments) {
    const outcome = outcomeOf(segment);
    counts[outcome] = (counts[outcome] || 0) + 1;
  }
  document.getElementById('summary').textContent =
    segments.length + ' tests · ' + Object.entries(counts).map(([outcome, count]) => count + ' ' + outcome).join(' · ');
}

toggleElement.addEventListener('click', () => setPlaying(!playing));
seekElement.addEventListener('input', () => seekTo(Number(seekElement.value) / 1000));
speedElement.addEventListener('change', () => { rate = Number(speedElement.value); syncTiles(true); });
document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === 'ArrowRight' || event.key === 'n') seekToSegment(currentIndex + 1);
  if (event.key === 'ArrowLeft' || event.key === 'p') seekToSegment(currentIndex - 1);
  if (event.key === ' ') { event.preventDefault(); setPlaying(!playing); }
});

for (const segment of segments) {
  for (const clip of segment.clips) {
    clip.seconds = clip.videos.length > 0 ? Math.max(MINIMUM_CLIP_SECONDS, clip.durationMilliseconds / 1000) : 0;
  }
}
renderSummary();
renderIndex();
if (segments.length > 0) {
  computeTimeline();
  renderTimeline();
  apply(true);
  setPlaying(true);
  probeAllClips();
  requestAnimationFrame(tick);
}
`;
