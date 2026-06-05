# Performance Review - Thinking Labs (2026-06-04)

**Reviewer:** Performance · **Branch:** feat-design-v2 @ 1e73fd0

---

## Executive summary

The build pipeline is well-structured for a personal knowledge site of its current size (~58 content files across 11 kinds), and several good practices are already in place: the index builder uses a single wrapped SQLite transaction with prepared statements, the OG image pipeline uses a persistent disk cache keyed by content hashes, and the shader gradient islands are lazily loaded behind an IntersectionObserver with a 2.5 s delay. The most actionable build-time issues are the O(N) synchronous `git log` spawn per file in the index builder and claims/thoughts detail pages, and the sequential `getKindCollection` calls inside the OG `getStaticPaths`. On the client side, one `new SphereGeometry(baseSize, 24, 18)` allocation per graph node (no instancing, no geometry sharing) and an unthrottled `pointermove` raycaster will degrade as the knowledge graph grows. Three entity presets have debug `axesHelper: "on"` shipped to production. Overall build-time health is **Good** (no blocking issues at current corpus size) and client-time health for the 3D islands is **Fair** (degrades with graph size, no instancing, debug overhead).

---

## Scope & method

Static source reading, `grep`, `wc`, `git log`, `du`, and `find` only. No build was run (per instructions; concurrent reviewers would conflict on `dist/`). All conclusions are from reading source code; actual timings were not measured. Content corpus at review time: 7 claims, 11 thoughts, 15 inputs, 6 predictions, 6 projects, 3 observations, 2 posts, 1 decision, 7 provenance, 0 questions, 0 changed-my-mind (58 total indexable files). The OG cache had 68 entries on disk at review time. Lines are referenced by the files read.

---

## Findings

### [High] Per-file synchronous `git log` spawn in the index builder - O(N) processes

**Location:** `src/index/builder.ts:72-75` → calls `resolvedLastTouchedSync` → `src/lib/git.ts:57-69`

**Observation:** `collectObjects` calls `lastTouched(absPath, repoRoot)` for each of the N content files. `lastTouchedSync` shells out to `execFileSync("git", ["log", "-1", "--format=%cI", "--", filePath])` for each file individually. With 58 files today that is 58 blocking child-process spawns; child-process fork overhead on macOS is ~10–20 ms per call, so this step already costs ~0.6–1.2 s of pure process-fork overhead, will scale linearly, and blocks the Node event loop because it uses `execFileSync`.

**Impact:** Adds O(N × fork-overhead) latency to every CI build and local `pnpm build:index`. At 500 files this would be 5–10 s from git spawns alone.

**Recommendation:** Replace N individual `git log -1 -- <file>` calls with a single `git log --format="%H %cI" --name-only -- content/` (or `--diff-filter=AM`) pass and build a `Map<filePath, isoDate>` in one subprocess. Fall back to mtime for untracked files as today. The async variant (`lastTouched`) already memoizes per path, but the index builder uses the sync variant which has no such cross-file accumulation.

**Effort:** M

---

### [High] Per-file `git show <sha> <path>` spawn inside `walkFileHistory` - O(N × H) processes

**Location:** `src/lib/git.ts:116-148` (`walkFileHistory`), called from `src/pages/claims/[...slug].astro:21` and `src/pages/thoughts/[...slug].astro:30`

**Observation:** `walkFileHistory` first runs `git log --reverse --format=%H%x09%cI%x09%s -- <path>` to get all commit SHAs, then for each commit calls `showAt` which spawns `execFileSync("git", ["show", "<sha>:<path>"])`. For a claim with 20 commits this is 1 + 20 = 21 child processes per claim detail page. With 7 claims at build time that is ~147 git processes. As claims accumulate and are revised, this compounds.

**Impact:** Direct build-time latency for every claims and thoughts detail page. If a thought has 30 commits, `getStaticPaths` rendering that page will block for ~300–600 ms in process overhead alone.

**Recommendation:** Replace the per-commit `git show` loop with a single `git log -p --follow -- <path>` or `git log --format=... -p` invocation that yields all commit content in one output stream. Parse the unified diff output to reconstruct file state at each revision. This trades many spawns for one larger I/O operation, which is almost always faster.

**Effort:** M

---

### [Medium] Sequential `getKindCollection` calls in OG `getStaticPaths`

**Location:** `src/pages/og/[...slug].png.ts:350-381`

**Observation:** The `for (const kind of LISTING_KINDS)` loop at line 350 `await`s `getKindCollection(kind)` serially inside the loop body (line 367). With 10 listing kinds this serializes 10 `getCollection` calls that could run in parallel. Astro's `getCollection` does disk I/O and frontmatter parsing per kind.

**Impact:** Adds latency to the OG `getStaticPaths` phase proportional to the number of kinds. At current corpus the effect is modest, but each additional kind adds another serial wait.

**Recommendation:** Hoist all collection fetches above the loop and `await Promise.all([...LISTING_KINDS.map(k => getKindCollection(k))])`, then iterate the resolved array. This mirrors the existing parallel pattern in `src/pages/graph.astro:22-34`.

**Effort:** S

---

### [Medium] Redundant cross-kind `getCollection` calls on every detail page instance

**Location:** Multiple detail pages, e.g. `src/pages/claims/[...slug].astro:18`, `src/pages/thoughts/[...slug].astro:24-27`, `src/pages/decisions/[...slug].astro:19-21`

**Observation:** Each detail page body (the part that runs once per generated static route, not `getStaticPaths`) independently calls `getCollection` for cross-referenced kinds. For `thoughts/[...slug].astro`, 4 collections (`claims`, `inputs`, `observations`, `predictions`) are fetched for every single thought being rendered. With 11 thoughts that is 11 × 4 = 44 `getCollection` calls for cross-kind lookups alone, in addition to the primary collection. Astro does memoize `getCollection` per build run, so repeated calls return the cached result, but each call still pays the function invocation overhead and the pattern is fragile if Astro ever changes its caching semantics.

**Impact:** Currently acceptable due to Astro's per-process memoization, but the pattern couples page rendering to a non-obvious global cache rather than explicit data passing.

**Recommendation:** Move shared cross-kind lookups into `getStaticPaths` and pass them as props alongside `entry`. This is already the pattern recommended in Astro docs for data needed by all instances of a dynamic route. The detail page body then receives pre-fetched data without repeating lookups.

**Effort:** M

---

### [Medium] Index builder re-parses `frontmatter_json` for FTS insertion

**Location:** `src/index/builder.ts:179`

**Observation:** Inside the transaction loop, the FTS insertion (`insertFts.run`) parses `o.frontmatter_json` back from JSON at line 179 via `JSON.parse(o.frontmatter_json)`. This is the same data that was just serialized with `JSON.stringify(data)` a few lines above in `readObject` (line 125). The round-trip serialization is unnecessary; the original `data` object is available in the calling frame.

**Impact:** N × (serialization + deserialization) overhead. Negligible at 58 objects, but trivially eliminated.

**Recommendation:** Pass the original parsed `data` object through `IndexedObject` or compute the FTS title before serialization. A simpler fix is to keep `data` on the struct alongside `frontmatter_json` and only use `frontmatter_json` for the SQL column.

**Effort:** S

---

### [Medium] `resolveHeroSource` calls `existsSync` 4 times per entity in `getStaticPaths`

**Location:** `src/pages/og/[...slug].png.ts:99-105`

**Observation:** For every entity's detail OG route, `resolveHeroSource(folder, entry.id)` iterates `HERO_EXTENSIONS = ["png", "jpg", "jpeg", "webp"]` and calls `existsSync` for each. With N entries across all kinds and 4 extension probes per entry, this performs up to 4N synchronous filesystem stats during `getStaticPaths`. This is the synchronous, main-thread variant.

**Impact:** ~4N synchronous stat syscalls during the `getStaticPaths` phase. Currently ~58 × 4 = 232 stats. Will grow with corpus.

**Recommendation:** Precompute a Set of existing asset paths once at module load time (using `readdirSync` on each `src/assets/<folder>/`) and use O(1) Set lookup per entry, or convert to `fs.stat` checks batched with `Promise.all`.

**Effort:** S

---

### [Medium] No instanced mesh rendering in NetworkGraph3D - one `SphereGeometry` per node

**Location:** `src/frontend/thinkinglabs-ui/components/NetworkGraph3D.client.ts:144`

**Observation:** `new SphereGeometry(baseSize, 24, 18)` is called for every node in the graph. With 58 nodes today that creates 58 separate geometry objects and 58 draw calls per frame. The `24 × 18` segment counts (432 triangles per sphere) are high for a knowledge-graph node visualization where sub-8px spheres are common. There is no `InstancedMesh`, no geometry sharing by degree bucket, and no level-of-detail reduction.

**Impact:** Each additional node is a new geometry allocation and a new draw call. At 200+ nodes the per-frame GPU submission overhead becomes visible, especially on mobile. The 24/18 segment count also inflates vertex buffer size unnecessarily for small spheres.

**Recommendation:** Group nodes into degree buckets (e.g. 4 buckets: degree 0-1, 2-4, 5-9, 10+), create one `SphereGeometry` per bucket (with reduced segments, e.g. `12, 10`), and share the geometry across nodes. For the best result, use `InstancedMesh` (one draw call for all nodes of the same kind+size). This is the standard Three.js pattern for graph visualizations.

**Effort:** M

---

### [Medium] Unthrottled `pointermove` raycaster on every mouse move

**Location:** `src/frontend/thinkinglabs-ui/components/NetworkGraph3D.client.ts:229-232`

**Observation:** Every `pointermove` event updates the pointer coordinates and synchronously calls `pick()`, which calls `raycaster.intersectObjects(nodeMeshes, false)`. This raycasts against all N meshes on the main thread on every pointer movement event, which can fire at 60–120 Hz. There is no `requestAnimationFrame` deferral, throttle, or debounce.

**Impact:** Main-thread CPU spike on pointer movement, proportional to node count. At 200 nodes on a mid-range device this starts to compete with the render loop.

**Recommendation:** Set the pointer coordinates on every `pointermove` but defer the `pick()` call to the next animation frame: set a dirty flag on move, then run `pick()` once at the start of `frame()`. This eliminates raycasting overhead between frames.

**Effort:** S

---

### [Low] Debug `axesHelper: "on"` shipped to production in three entity presets

**Location:** `src/frontend/thinkinglabs-ui/entity-shader-presets.ts:313, 356, 399`

**Observation:** The `questions`, `posts`, and `inputs` shader gradient presets have `axesHelper: "on"`. This causes `@shadergradient/react` to render the XYZ axis gizmo inside the gradient canvas. It is a visual debug aid, not an intended production element.

**Impact:** Minor render overhead (extra geometry draw calls for the axis lines per active shader surface). More importantly it is a visual bug: the axis gizmo is visible to users on those entity landing pages.

**Recommendation:** Set `axesHelper: "off"` in all three presets.

**Effort:** S

---

### [Low] Font files re-read from disk per OG route when cache is cold

**Location:** `src/pages/og/[...slug].png.ts:438-448`

**Observation:** `loadFont` memoizes font `ArrayBuffer` instances in a module-level `fontCache` Map (line 322). This is correct within a single Astro worker, but the cache is module-scoped and will be empty at the start of a build (or if Astro spawns worker threads). Three font weight files (~200 KB each) are read from disk for the first uncached OG route. The `createOgImageCacheEntry` call also hashes the three font files on every route even when cached (via `hashFiles` at line 32-33 of `og-image-cache.ts`), though `fileHashCache` in `og-image-cache.ts` memoizes these.

**Impact:** First cold-cache OG render pays 3 × disk read overhead. This is mitigated by the module-level `fontCache` after the first read, so the total extra cost is one read at build start.

**Recommendation:** Current memoization is adequate. As a minor enhancement, pre-read fonts during `getStaticPaths` before the per-route `GET` handlers fire, so the first route does not pay the cold-read penalty inline.

**Effort:** S

---

### [Low] OG `getStaticPaths` builds route list sequentially for each listing kind

**Location:** `src/pages/og/[...slug].png.ts:350-384`

**Observation:** The outer `for (const kind of LISTING_KINDS)` loop sequentially awaits each `getKindCollection(kind)` and then synchronously calls `resolveHeroSource` and `existsSync` per entry before moving to the next kind. See also the Medium finding above on sequential collection fetching.

**Impact:** Compound with the sequential collection issue: the whole `getStaticPaths` runs in series rather than fan-out by kind.

**Recommendation:** Already covered by the parallel `getKindCollection` recommendation above.

**Effort:** S (same fix as the Medium finding)

---

### [Low] Network graph payload inlined as JSON in a `<script type="application/json">` tag

**Location:** `src/frontend/thinkinglabs-ui/components/NetworkGraph3D.astro:42`

**Observation:** The full `{ nodes, edges }` payload (N nodes with id, kind, title, href, degree, x, y, z + all edges) is serialized via `JSON.stringify` and emitted as an inline `<script id="network-graph-data" type="application/json">` in the HTML. At 58 nodes and ~50 edges with string titles this is modest (~8–15 KB), but will grow with the corpus.

**Impact:** The payload is part of the HTML document byte count rather than a separately cacheable asset. At 500+ nodes this could add 50–100 KB to the HTML payload.

**Recommendation:** At current corpus size this is not an issue. When the corpus grows past ~200 nodes, consider externalizing the payload to a `/api/graph.json` route (which would also be independently cacheable).

**Effort:** M (low priority; not needed now)

---

### [Low] d3-force-3d simulation runs 320 ticks at build time synchronously on main thread

**Location:** `src/pages/graph.astro:50`, `src/lib/network-graph-layout.ts:69`

**Observation:** `layoutNetworkGraph(graph, { ticks: 320 })` runs a synchronous d3-force-3d simulation with `sim.tick(320)` during the Astro SSG rendering phase. At 58 nodes this is fast (force simulation ticks are O(N log N) per tick with the Barnes-Hut approximation). However this runs synchronously in the Astro build worker.

**Impact:** Negligible at 58 nodes. At 500 nodes, 320 ticks × O(N log N) could add ~1–2 s to the graph page's build time. The build-time computation is the right design choice (vs client-side settling) and currently well within tolerance.

**Recommendation:** No action needed now. If corpus grows past 300 nodes, consider reducing ticks to 200 or adding a build-time check that prints a warning when tick time exceeds a threshold. The current architecture (bake layout at build, ship static coordinates) is the right long-term approach.

**Effort:** S (monitoring only)

---

### [Info] Index builder correctly uses a single transaction and prepared statements

**Location:** `src/index/builder.ts:153-186`

**Observation:** `writeIndex` prepares `insertObject`, `insertLink`, `insertTag`, `insertFts` once, then runs all inserts inside a single `db.transaction(...)` call. `VACUUM INTO` writes directly to the output path rather than a temp file, which is atomic on modern filesystems. `journal_mode = MEMORY` and `synchronous = OFF` eliminate I/O during the in-memory build phase.

**Impact:** Positive. The builder is as fast as better-sqlite3 allows for sequential inserts.

---

### [Info] OG image disk cache is content-addressed and evicts stale variants per route

**Location:** `src/lib/og-image-cache.ts:28-86`

**Observation:** Cache filenames include a hash of route slug, props, render inputs, font file hashes, and hero asset hash. `removeStaleOgImageVariants` deletes old variants for the same route when a new one is written. `fileHashCache` memoizes font and asset hashes within a build run.

**Impact:** Positive. Cold builds pay full satori + resvg cost; warm builds for unchanged routes are near-zero (one file read). This is the dominant OG image performance mechanism.

---

### [Info] Shader gradient islands use lazy loading, reduced-motion guard, and save-data guard

**Location:** `src/frontend/thinkinglabs-ui/components/EntityShaderSurface.client.ts:10-51, 87-131`

**Observation:** Shaders are dynamically imported (`import("./EntityShaderGradient.ts")`) only when an `IntersectionObserver` fires after a 2.5 s delay, and only when `prefers-reduced-motion` is not set and `navigator.connection.saveData` is false. The React + ShaderGradient bundle is thus never loaded on page load.

**Impact:** Positive. Three.js (for `@shadergradient`) is not part of the initial page bundle. The HDR files (1.4–1.5 MB each) are fetched lazily by the library only when a gradient is mounted.

---

### [Info] Feed builder and llms.txt use `loadContent` (direct markdown walk) rather than Astro collections

**Location:** `scripts/build-feeds.ts:70-155`, `scripts/build-llms-txt.ts`

**Observation:** `buildFeeds` uses `loadContent(kind)` from `src/lib/content-repo.ts` which walks `content/` directly without Astro's collection machinery. This is correct for the prebuild step. `loadContent` is called three times independently (claims, decisions, predictions) meaning three separate walks of the content directory, but these are pre-build scripts not part of the Astro SSG phase.

**Impact:** Minor redundancy. At current corpus size each `loadContent` call is fast. No action needed.

---

## Quick wins (ranked)

1. **Parallel OG `getStaticPaths` collection fetching** (`src/pages/og/[...slug].png.ts:350`) - one-line change from serial `await` in a loop to `Promise.all`, mirrors the pattern already used in `graph.astro:22-34`.
2. **Turn off debug `axesHelper`** in `questions`, `posts`, `inputs` presets (`entity-shader-presets.ts:313, 356, 399`) - three one-line changes, removes production debug artifacts.
3. **Defer raycaster to animation frame** (`NetworkGraph3D.client.ts:229`) - set a dirty flag on `pointermove`, call `pick()` once at top of `frame()`. ~10 lines.
4. **Eliminate FTS JSON round-trip** (`builder.ts:179`) - pass original `data` through `IndexedObject` and use it for FTS instead of re-parsing `frontmatter_json`.
5. **Precompute hero-asset existence set** for OG `resolveHeroSource` - replace per-entry `existsSync × 4` with a pre-built path Set from one `readdirSync` per kind folder.

---

## Larger optimizations (ranked)

1. **Batch git `last_touched` lookup** - replace N synchronous `git log -1 -- <file>` spawns in the index builder with a single `git log --name-only` pass building a date map. Requires refactoring `resolvedLastTouchedSync` contract.
2. **Batch `git show` in `walkFileHistory`** - replace N `git show <sha>:<path>` calls per claim/thought with a single `git log -p` pass. Most impactful when claims accumulate many revisions.
3. **Instanced mesh rendering for NetworkGraph** - replace per-node `new SphereGeometry` + per-node `Mesh` with `InstancedMesh` per kind (or per degree bucket). Required before corpus reaches ~200 nodes for smooth 60 fps on mobile.
4. **Move cross-kind `getCollection` into `getStaticPaths` props** - eliminates repeated collection fetches per detail page instance and removes coupling to Astro's implicit global memoization.

---

## What's already good (keep)

- **SQLite index builder**: single transaction, prepared statements, in-memory build + `VACUUM INTO` for atomic write, `synchronous = OFF` + `journal_mode = MEMORY`. This is well-optimized.
- **OG image disk cache**: content-addressed filenames, stale-variant eviction, module-level font and hero URI memoization. Cold-to-warm ratio will be very high in practice.
- **Shader gradient lazy loading**: IntersectionObserver + 2.5 s delay + `dynamic import()` + `prefers-reduced-motion` + `saveData` guard. The full Three.js stack for shaders is never on the critical path.
- **Build-time network graph layout**: baking d3-force-3d coordinates at build time means the client graph opens pre-settled with no janky simulation animation. This is the right tradeoff.
- **NetworkGraph3D disposal lifecycle**: `disposeCurrent` properly disposes all Three.js resources (geometries, materials, renderer, controls) and removes all event listeners on Astro `before-swap`. No leaks under View Transitions navigation.
- **`git.ts` async memoization**: `lastTouched` (async variant) memoizes per `cwd+filePath` key, so render-time callers that hit the same file multiple times only spawn one git process.
- **`lineGeom` single buffer for all edges**: all edges are collapsed into one `LineSegments` geometry with a flat `positions` array rather than one object per edge. This is correct.
- **Markdown pipeline plugins are no-ops on plain content**: both `remarkSectionFreshness` and `rehypeSectionFreshness` short-circuit early (`return` on no match) so they add negligible overhead to posts without freshness annotations.

---

## Open questions for the maintainer

1. **CI environment**: does the CI runner have the `.cache/og-images` directory persisted across builds? Without it, every CI run pays full satori + resvg cost for all ~80+ OG images. A cache-restore step keyed on the content hash would be high value.
2. **Three.js bundle splitting**: `NetworkGraph3D.client.ts` imports from `three` and `three/examples/jsm/controls/OrbitControls.js`. Is Vite/Rolldown splitting the `three` chunk away from the main bundle? If `graph.astro` is the only page using it, the Three.js chunk should only be fetched on `/graph`. Worth confirming in the built `dist/`.
3. **`@shadergradient/react` HDR fetch**: the three `.hdr` files (1.4–1.5 MB each) are fetched lazily by the library from `/shadergradient/hdr/`. Does the library fetch only the required preset's HDR (e.g. `city.hdr` for most entities, `dawn.hdr` for `observations`) or all three? Fetching all 4.3 MB on first gradient mount would be costly on mobile.
4. **`walkFileHistory` at scale**: are claims expected to accumulate many revisions over time? If yes, the O(N × H) git-show pattern will become the dominant build-time cost for the `/claims/[...slug]` route family. Worth instrumenting now before the corpus grows.
5. **`getCollection` Astro memoization guarantee**: the current pattern of calling `getCollection` once per detail page instance relies on Astro's per-build memoization. Is this guaranteed across Astro 6 minor versions? Moving to `getStaticPaths` props would remove the dependency on this implicit contract.
