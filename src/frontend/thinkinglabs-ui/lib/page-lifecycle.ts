type PageReadyCallback = () => void;

/** Run component setup on normal page loads and Astro client-router swaps. */
export function onPageReady(callback: PageReadyCallback): void {
  const run = () => callback();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    queueMicrotask(run);
  }

  document.addEventListener("astro:page-load", run);
}

/** Clean up long-lived browser resources before an Astro client-router swap. */
export function onBeforePageSwap(callback: PageReadyCallback): void {
  document.addEventListener("astro:before-swap", callback);
}
