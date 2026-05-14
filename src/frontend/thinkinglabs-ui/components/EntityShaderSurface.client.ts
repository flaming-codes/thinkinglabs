type SurfaceElement = HTMLElement & {
  dataset: HTMLElement["dataset"] & {
    tlShaderEntity?: string;
    tlShaderMounted?: string;
    tlShaderReady?: string;
    tlShaderRegion?: string;
  };
};

const AUTO_LOAD_DELAY_MS = 2500;
const LAZY_LOAD_ROOT_MARGIN = "420px 0px";
const LAZY_LOAD_THRESHOLD = 0.01;
const MOUNTED = "true";

type ReactRoot = ReturnType<typeof import("react-dom/client").createRoot>;

let activeObserver: IntersectionObserver | null = null;
let activeTimer: number | null = null;
const activeRoots = new Set<ReactRoot>();
let rendererPromise:
  | Promise<{
      createElement: typeof import("react").createElement;
      createRoot: typeof import("react-dom/client").createRoot;
      EntityShaderGradient: typeof import("./EntityShaderGradient.ts").default;
    }>
  | undefined;

function shouldSkipShaders(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection as { saveData?: boolean; effectiveType?: string } | undefined;
  if (connection?.saveData) return true;
  if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  return false;
}

function loadRenderer() {
  rendererPromise ??= Promise.all([
    import("react"),
    import("react-dom/client"),
    import("./EntityShaderGradient.ts"),
  ]).then(([react, reactDom, gradient]) => ({
    createElement: react.createElement,
    createRoot: reactDom.createRoot,
    EntityShaderGradient: gradient.default,
  }));
  return rendererPromise;
}

function markReadyWhenCanvasAppears(surface: SurfaceElement, mount: HTMLElement): void {
  if (mount.querySelector("canvas")) {
    surface.dataset.tlShaderReady = "true";
    return;
  }

  const observer = new MutationObserver(() => {
    if (!mount.querySelector("canvas")) return;
    observer.disconnect();
    surface.dataset.tlShaderReady = "true";
  });
  observer.observe(mount, { childList: true, subtree: true });
}

async function mountSurface(surface: SurfaceElement): Promise<void> {
  if (surface.dataset.tlShaderMounted === MOUNTED) return;
  const entity = surface.dataset.tlShaderEntity;
  if (!entity) return;

  surface.dataset.tlShaderMounted = MOUNTED;
  const mount = document.createElement("span");
  mount.className = "tl-shader-mount";
  surface.append(mount);

  const { createElement, createRoot, EntityShaderGradient } = await loadRenderer();
  if (!surface.isConnected) return;
  const reactRoot = createRoot(mount);
  activeRoots.add(reactRoot);
  reactRoot.render(createElement(EntityShaderGradient, { entity }));
  window.requestAnimationFrame(() => {
    markReadyWhenCanvasAppears(surface, mount);
  });
}

function watchLazySurfaces(surfaces: SurfaceElement[]): void {
  if (surfaces.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const surface = entry.target as SurfaceElement;
        observer.unobserve(surface);
        void mountSurface(surface);
      }
    },
    { rootMargin: LAZY_LOAD_ROOT_MARGIN, threshold: LAZY_LOAD_THRESHOLD },
  );

  activeObserver = observer;
  for (const surface of surfaces) observer.observe(surface);
}

function tearDownShaderSurfaces(): void {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  if (activeTimer !== null) {
    window.clearTimeout(activeTimer);
    activeTimer = null;
  }
  for (const root of activeRoots) {
    root.unmount();
  }
  activeRoots.clear();
}

function bootShaderSurfaces(): void {
  if (shouldSkipShaders()) return;

  const surfaces = Array.from(document.querySelectorAll<SurfaceElement>("[data-tl-shader-entity]"));
  if (surfaces.length === 0) return;

  activeTimer = window.setTimeout(() => {
    activeTimer = null;
    watchLazySurfaces(surfaces);
  }, AUTO_LOAD_DELAY_MS);
}

document.addEventListener("astro:before-swap", tearDownShaderSurfaces);
document.addEventListener("astro:page-load", bootShaderSurfaces);
