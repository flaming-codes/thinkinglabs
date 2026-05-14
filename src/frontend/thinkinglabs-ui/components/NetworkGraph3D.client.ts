import {
  AmbientLight,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Per-node payload the Astro page injects via JSON; coordinates are baked at build time. */
interface PayloadNode {
  id: string;
  kind: string;
  title: string;
  href: string | null;
  degree: number;
  x: number;
  y: number;
  z: number;
}

/** Per-edge payload; endpoints reference PayloadNode ids. */
interface PayloadEdge {
  from: string;
  to: string;
  label: string;
}

/** Full payload shape consumed by the client; mirrors the build-time `PositionedGraph` plus node metadata. */
interface Payload {
  nodes: PayloadNode[];
  edges: PayloadEdge[];
}

const KIND_COLOR_TOKENS: Record<string, string> = {
  thoughts: "--tl-kind-color-thoughts",
  claims: "--tl-kind-color-claims",
  projects: "--tl-kind-color-projects",
  predictions: "--tl-kind-color-predictions",
  "changed-my-mind": "--tl-kind-color-changed-my-mind",
  decisions: "--tl-kind-color-decisions",
  questions: "--tl-kind-color-questions",
  posts: "--tl-kind-color-posts",
  inputs: "--tl-kind-color-inputs",
  provenance: "--tl-kind-color-provenance",
};

/** Read the JSON payload emitted by the Astro page; throws loudly if the page is misconfigured. */
function readPayload(): Payload {
  const tag = document.querySelector<HTMLScriptElement>("#network-graph-data");
  if (!tag) throw new Error("network-graph: payload script tag #network-graph-data missing");
  return JSON.parse(tag.textContent ?? "{}") as Payload;
}

/** Read root container; returns null when the page has rendered without the canvas (e.g. noscript fallback only). */
function readRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-network-graph-root]");
}

function readThemeColor(name: string, fallback: string): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new Color(value || fallback);
}

function readThemeNumber(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = Number(raw);
  return raw && Number.isFinite(value) ? value : fallback;
}

function readKindColor(kind: string): Color {
  const token = KIND_COLOR_TOKENS[kind];
  return token ? readThemeColor(token, "#bbbbbb") : new Color("#bbbbbb");
}

let disposeCurrent: (() => void) | null = null;

/** Bootstrap the Three.js scene; idempotent guard prevents double-init under HMR. */
function init(): void {
  disposeCurrent?.();
  disposeCurrent = null;

  const root = readRoot();
  if (!root) return;
  if (root.dataset["networkGraphMounted"] === "true") return;
  root.dataset["networkGraphMounted"] = "true";

  const payload = readPayload();
  if (payload.nodes.length === 0) return;

  const width = root.clientWidth;
  const height = root.clientHeight;

  const scene = new Scene();
  const graphBg = readThemeColor("--tl-graph-bg", "#ffffff");
  scene.background = graphBg;

  const camera = new PerspectiveCamera(38, width / height, 0.1, 2000);
  const extents = computeExtents(payload.nodes);
  const fitDistance = Math.max(extents.radius * 2.6, 80);
  camera.position.set(fitDistance * 0.6, fitDistance * 0.25, fitDistance);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(graphBg, 1);
  root.appendChild(renderer.domElement);

  const hoverLabel = root.querySelector<HTMLElement>("[data-graph-hover-label]");

  scene.add(new AmbientLight(0xffffff, 1));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.35;
  controls.zoomSpeed = 0.6;
  controls.minDistance = fitDistance * 0.5;
  controls.maxDistance = fitDistance * 2.2;

  const nodeMeta = new Map<string, PayloadNode>();
  const nodeMeshes: Mesh[] = [];
  const meshToId = new Map<Mesh, string>();

  for (const n of payload.nodes) {
    nodeMeta.set(n.id, n);
    const baseSize = 2.6 + Math.min(n.degree, 8) * 0.55;
    const geom = new SphereGeometry(baseSize, 24, 18);
    const mat = new MeshBasicMaterial({ color: readKindColor(n.kind) });
    const mesh = new Mesh(geom, mat);
    mesh.position.set(n.x, n.y, n.z);
    mesh.userData["id"] = n.id;
    mesh.userData["baseSize"] = baseSize;
    scene.add(mesh);
    nodeMeshes.push(mesh);
    meshToId.set(mesh, n.id);
  }

  const positions: number[] = [];
  for (const e of payload.edges) {
    const a = nodeMeta.get(e.from);
    const b = nodeMeta.get(e.to);
    if (!a || !b) continue;
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const lineGeom = new BufferGeometry();
  lineGeom.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const lineMat = new LineBasicMaterial({
    color: readThemeColor("--tl-graph-line", "#07090d"),
    transparent: true,
    opacity: readThemeNumber("--tl-graph-line-opacity", 0.18),
  });
  const lines = new LineSegments(lineGeom, lineMat);
  scene.add(lines);

  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const syncTheme = (): void => {
    const nextBg = readThemeColor("--tl-graph-bg", "#ffffff");
    scene.background = nextBg;
    renderer.setClearColor(nextBg, 1);
    lineMat.color.copy(readThemeColor("--tl-graph-line", "#07090d"));
    lineMat.opacity = readThemeNumber("--tl-graph-line-opacity", 0.18);
    for (const mesh of nodeMeshes) {
      const id = meshToId.get(mesh);
      const meta = id ? nodeMeta.get(id) : undefined;
      if (meta) (mesh.material as MeshBasicMaterial).color.copy(readKindColor(meta.kind));
    }
  };
  colorSchemeQuery.addEventListener("change", syncTheme);

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let hovered: Mesh | null = null;

  function setHovered(mesh: Mesh | null): void {
    if (hovered === mesh) return;
    if (hovered) {
      hovered.scale.set(1, 1, 1);
    }
    hovered = mesh;
    if (mesh) {
      mesh.scale.set(1.55, 1.55, 1.55);
      const id = meshToId.get(mesh)!;
      const meta = nodeMeta.get(id)!;
      if (hoverLabel) {
        hoverLabel.textContent = meta.title;
        hoverLabel.dataset["kind"] = meta.kind;
        hoverLabel.classList.add("is-visible");
      }
      renderer.domElement.style.cursor = meta.href ? "pointer" : "default";
    } else {
      if (hoverLabel) {
        hoverLabel.classList.remove("is-visible");
      }
      renderer.domElement.style.cursor = "grab";
    }
  }

  renderer.domElement.style.cursor = "grab";

  function updatePointer(ev: PointerEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pick(): Mesh | null {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(nodeMeshes, false);
    return hits.length > 0 ? (hits[0]!.object as Mesh) : null;
  }

  renderer.domElement.addEventListener("pointermove", (ev) => {
    updatePointer(ev);
    setHovered(pick());
  });

  renderer.domElement.addEventListener("pointerleave", () => setHovered(null));

  renderer.domElement.addEventListener("pointerdown", () => {
    renderer.domElement.style.cursor = "grabbing";
  });
  renderer.domElement.addEventListener("pointerup", (ev) => {
    updatePointer(ev);
    const hit = pick();
    if (hit) {
      const id = meshToId.get(hit)!;
      const meta = nodeMeta.get(id);
      if (meta?.href) {
        window.location.href = meta.href;
        return;
      }
    }
    renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
  });

  let driftEnabled = true;
  controls.addEventListener("start", () => {
    driftEnabled = false;
  });

  const driftAxis = new Vector3(0, 1, 0);
  let lastTime = performance.now();

  const rootEl = root;
  function resize(): void {
    const w = rootEl.clientWidth;
    const h = rootEl.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  let rafId = 0;
  let cancelled = false;
  function frame(now: number): void {
    if (cancelled) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    if (driftEnabled) {
      const angle = dt * ((Math.PI * 2) / 80);
      camera.position.applyAxisAngle(driftAxis, angle);
      camera.lookAt(0, 0, 0);
    }
    controls.update();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  disposeCurrent = () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    colorSchemeQuery.removeEventListener("change", syncTheme);
    controls.dispose();
    for (const mesh of nodeMeshes) {
      mesh.geometry.dispose();
      (mesh.material as MeshBasicMaterial).dispose();
    }
    lineGeom.dispose();
    lineMat.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    delete rootEl.dataset["networkGraphMounted"];
  };
}

/** Compute a coarse bounding-sphere radius so the camera fits the scene regardless of pre-baked extents. */
function computeExtents(nodes: ReadonlyArray<PayloadNode>): { radius: number } {
  let maxSq = 0;
  for (const n of nodes) {
    const sq = n.x * n.x + n.y * n.y + n.z * n.z;
    if (sq > maxSq) maxSq = sq;
  }
  return { radius: Math.sqrt(maxSq) };
}

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", () => {
  disposeCurrent?.();
  disposeCurrent = null;
});
