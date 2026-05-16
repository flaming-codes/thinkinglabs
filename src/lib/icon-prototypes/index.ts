import { cartographerMinimalIcons } from "./cartographer-minimal";
import type { IconPrototype } from "./types";

/** A named creative batch of prototype SVG icons. */
export interface IconPrototypeAgent {
  name: string;
  style: string;
  icons: IconPrototype[];
}

/** Creative-agent groupings for the one-off icon prototype page. */
export const iconPrototypeAgents: IconPrototypeAgent[] = [
  {
    name: "The Restrained Cartographer",
    style: "Monochrome map glyphs",
    icons: cartographerMinimalIcons,
  },
];

/** Flat list of all generated thinkinglabs icon prototypes. */
export const iconPrototypes = iconPrototypeAgents.flatMap((agent) => agent.icons);
