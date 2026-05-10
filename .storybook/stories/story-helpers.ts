const fullscreen = {
  layout: "fullscreen",
} as const;

const paddedCanvas = {
  layout: "centered",
  backgrounds: {
    default: "studio",
  },
} as const;

const htmlSlot = (body: string): { slots: { default: string } } => ({
  slots: {
    default: body,
  },
});

export { fullscreen, htmlSlot, paddedCanvas };
