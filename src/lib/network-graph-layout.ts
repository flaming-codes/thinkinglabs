import { forceCenter, forceLink, forceManyBody, forceSimulation, forceCollide } from "d3-force-3d";
import type { NetworkGraph } from "./network-graph.ts";

/** One positioned node: id plus baked 3D coordinates from the force simulation. */
export interface PositionedNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Graph payload augmented with baked 3D coordinates for every node. */
export interface PositionedGraph {
  readonly nodes: ReadonlyArray<PositionedNode>;
  readonly edges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly label: string;
  }>;
}

/** Run the d3-force-3d simulation to convergence at build time so the client opens instantly without a settling animation. */
export function layoutNetworkGraph(
  graph: NetworkGraph,
  options: { ticks?: number } = {},
): PositionedGraph {
  const ticks = options.ticks ?? 300;
  const simNodes = graph.nodes.map((n) => ({ id: n.id })) as Array<{
    id: string;
    x?: number;
    y?: number;
    z?: number;
  }>;
  const simLinks = graph.edges.map((e) => ({ source: e.from, target: e.to }));

  const linkForce = (
    forceLink as unknown as (links: typeof simLinks) => {
      id: (fn: (n: { id: string }) => string) => unknown;
      distance: (d: number) => unknown;
      strength: (s: number) => unknown;
    }
  )(simLinks);
  (linkForce.id as (fn: (n: { id: string }) => string) => unknown)((n) => n.id);
  (linkForce.distance as (d: number) => unknown)(28);
  (linkForce.strength as (s: number) => unknown)(0.45);

  const sim = (
    forceSimulation as unknown as (
      nodes: typeof simNodes,
      numDimensions: number,
    ) => {
      force: (name: string, force: unknown) => unknown;
      stop: () => void;
      tick: (n?: number) => void;
    }
  )(simNodes, 3);

  sim.force("link", linkForce);
  sim.force(
    "charge",
    (forceManyBody as unknown as () => { strength: (n: number) => unknown })().strength(-90),
  );
  sim.force(
    "center",
    (forceCenter as unknown as (x: number, y: number, z: number) => unknown)(0, 0, 0),
  );
  sim.force("collide", (forceCollide as unknown as (r: number) => unknown)(6));
  sim.stop();
  sim.tick(ticks);

  const positioned: PositionedNode[] = simNodes.map((n) => ({
    id: n.id,
    x: typeof n.x === "number" ? n.x : 0,
    y: typeof n.y === "number" ? n.y : 0,
    z: typeof n.z === "number" ? n.z : 0,
  }));

  return {
    nodes: positioned,
    edges: graph.edges.map((e) => ({ from: e.from, to: e.to, label: e.label })),
  };
}
