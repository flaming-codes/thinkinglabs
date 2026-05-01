import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { KIND_SCHEMAS } from "./schemas/index.ts";

/** Wires every `content/<kind>/` directory to its Zod schema; literal object so per-kind types stay inferable in `getCollection`. */
export const collections = {
  thoughts: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/thoughts" }),
    schema: KIND_SCHEMAS.thoughts.schema,
  }),
  claims: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/claims" }),
    schema: KIND_SCHEMAS.claims.schema,
  }),
  projects: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/projects" }),
    schema: KIND_SCHEMAS.projects.schema,
  }),
  predictions: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/predictions" }),
    schema: KIND_SCHEMAS.predictions.schema,
  }),
  "changed-my-mind": defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/changed-my-mind" }),
    schema: KIND_SCHEMAS["changed-my-mind"].schema,
  }),
  decisions: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/decisions" }),
    schema: KIND_SCHEMAS.decisions.schema,
  }),
  questions: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/questions" }),
    schema: KIND_SCHEMAS.questions.schema,
  }),
  posts: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/posts" }),
    schema: KIND_SCHEMAS.posts.schema,
  }),
  inputs: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/inputs" }),
    schema: KIND_SCHEMAS.inputs.schema,
  }),
};
