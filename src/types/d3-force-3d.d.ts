/** Minimal ambient typing for `d3-force-3d`; the package ships untyped, so we expose just the surface the layout helper uses. */
declare module "d3-force-3d" {
  /** Force simulation; subset of the d3-force API extended to N dimensions. */
  export function forceSimulation(nodes?: unknown, numDimensions?: number): unknown;
  /** Link force; configurable with `.id()`, `.distance()`, `.strength()`. */
  export function forceLink(links?: unknown): unknown;
  /** Charge force; configurable with `.strength()`. */
  export function forceManyBody(): unknown;
  /** Centering force; signature varies by dimensionality (1D/2D/3D). */
  export function forceCenter(x?: number, y?: number, z?: number): unknown;
  /** Collision-avoidance force; configurable with `.radius()`. */
  export function forceCollide(radius?: number): unknown;
  /** Radial constraint force; configurable with strength and radius. */
  export function forceRadial(...args: unknown[]): unknown;
  /** Positional force along the X axis. */
  export function forceX(...args: unknown[]): unknown;
  /** Positional force along the Y axis. */
  export function forceY(...args: unknown[]): unknown;
  /** Positional force along the Z axis. */
  export function forceZ(...args: unknown[]): unknown;
}
