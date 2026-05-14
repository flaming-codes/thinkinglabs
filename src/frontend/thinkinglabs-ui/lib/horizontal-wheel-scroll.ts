const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getWheelDistance = (event: WheelEvent, scroller: HTMLElement) => {
  const dominantDelta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return dominantDelta * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return dominantDelta * scroller.clientWidth;
  return dominantDelta;
};

/** Bind vertical or horizontal wheel deltas to horizontal scrolling on a rail-like scroller. */
export const bindHorizontalWheelScroll = (scroller: HTMLElement, signal: AbortSignal) => {
  scroller.addEventListener(
    "wheel",
    (event) => {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      if (maxScroll <= 0) return;

      const distance = getWheelDistance(event, scroller);
      if (distance === 0) return;

      const nextScroll = clamp(scroller.scrollLeft + distance, 0, maxScroll);
      if (nextScroll === scroller.scrollLeft) return;

      event.preventDefault();
      scroller.scrollBy({ left: nextScroll - scroller.scrollLeft, behavior: "instant" });
    },
    { passive: false, signal },
  );
};
