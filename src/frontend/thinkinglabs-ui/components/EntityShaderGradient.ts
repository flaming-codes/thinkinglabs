import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { createElement } from "react";
import { ENTITY_SHADER_GRADIENTS, hasEntityShaderGradient } from "../entity-shader-presets";

interface Props {
  entity: string;
}

/** Renders the lazily mounted React shadergradient for a canonical entity. */
export default function EntityShaderGradient({ entity }: Props) {
  if (!hasEntityShaderGradient(entity)) return null;

  const { fov, pixelDensity, ...gradientProps } = ENTITY_SHADER_GRADIENTS[entity];

  return createElement(ShaderGradientCanvas, {
    children: createElement(ShaderGradient, gradientProps),
    className: "tl-shader-canvas",
    envBasePath: "/shadergradient/hdr/",
    fov,
    lazyLoad: false,
    pixelDensity,
    pointerEvents: "none",
    style: { position: "absolute", inset: 0 },
  });
}
