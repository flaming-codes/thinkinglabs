# Storybook for the Astro UI

Storybook is the isolated review surface for `src/frontend/thinkinglabs-ui/`. It renders reusable Astro UI primitives and full page compositions without reading `astro:content` or other runtime-only Astro APIs.

## Current stack

- Storybook: `10.3.6`
- Astro: `6.3.1`
- Astro Storybook framework: `@storybook-astro/framework@1.2.0`
- Builder: `@storybook/builder-vite@10.3.6`

Astro support is provided by the community `@storybook-astro/framework` package. Storybook's initializer does not yet auto-detect Astro projects, so this repository keeps a manual `.storybook/` configuration.

## File map

- `.storybook/main.ts` configures Storybook, serves `public/`, resolves the `@` alias to `src/`, and stubs `astro:toolbar:internal` for Storybook's Vite runtime.
- `.storybook/manager.ts` hides the addon panel so the UI stays focused on component rendering.
- `.storybook/preview.ts` loads the shared UI stylesheet and global preview parameters.
- `.storybook/preview-head.html` loads the same `Geist` and `Linefont` families used by the production UI layout.
- `.storybook/stories/*.stories.ts` are the canonical story files.
- `src/frontend/thinkinglabs-ui/mocks/` holds fixture data for stories.
- `src/frontend/thinkinglabs-ui/pages/*Composition.astro` contains page compositions that accept typed props and avoid content collection reads.
- `src/frontend/thinkinglabs-ui/storybook/` contains Storybook-only Astro fixtures. Keep Astro fixtures that need scoped CSS here rather than under `.storybook/`.
- `src/frontend/thinkinglabs-ui/storybook/styles.ts` eagerly imports Astro style submodules so nested composition stories render with their production scoped CSS.

## Boundaries

Do not import `src/pages/**` into Storybook. Route files are allowed to use `astro:content`, API routes, middleware assumptions, and other Astro features that Storybook Astro does not support.

Instead:

1. Keep shared visual components in `src/frontend/thinkinglabs-ui/components/`.
2. Keep page-level, prop-driven compositions in `src/frontend/thinkinglabs-ui/pages/`.
3. Put data fixtures in `src/frontend/thinkinglabs-ui/mocks/` or a small `.storybook/stories/*Fixtures.ts` file when they are Storybook-only.
4. Import compositions and fixtures from `.storybook/stories/*.stories.ts`.
5. Put Astro fixture components in `src/frontend/thinkinglabs-ui/storybook/`; `.storybook` is for story metadata, not renderable Astro component implementations.

## Story Adapters

Use `.storybook/stories/*.stories.ts` for Storybook titles, args, parameters, and named exports only. When a story needs Astro template behavior that a TypeScript story file cannot express cleanly, create a small Astro adapter under `src/frontend/thinkinglabs-ui/storybook/`.

Name these adapters by role:

- `*Harness.astro` for wrappers that choose between multiple production components, pass slots, or compose a page-level scenario from args.
- `*Fixture.astro` for local DOM scaffolding needed to exercise one component, such as a scrollable row around `ScrollArrows`.

Do not name new adapters `*Story.astro`; the story is the `.stories.ts` file. Existing `*Story.astro` adapters are render harnesses and can be renamed when touched.

## Caveats

- Storybook dev mode supports Astro props, slots, static assets, and `astro:assets`.
- Static Storybook builds pre-render Astro component stories, so changing Controls for Astro args after a static build does not re-render those server-rendered components.
- Content collections (`astro:content`), middleware, API routes, server islands, actions, `astro:env`, and advanced Markdown/MDX runtime features are not supported inside Storybook stories.
- This setup intentionally omits `@storybook/addon-docs` and MDX docs. The repo uses Storybook as a component canvas first; adding docs back would reintroduce Storybook's React-powered docs runtime.
- Storybook Astro only injects scoped CSS reliably for the registered story component. Composition stories render nested components, so `src/frontend/thinkinglabs-ui/storybook/styles.ts` imports the component and page style submodules explicitly.
- Do not put renderable `.astro` fixture components under `.storybook/stories/`; keep them under `src/frontend/thinkinglabs-ui/storybook/` so they use the same Vite/Astro module path as the UI source.
- Keep the `astro:toolbar:internal` stub in `.storybook/main.ts` unless Storybook Astro or Astro removes the transitive dev-toolbar import.

## Commands

```sh
pnpm storybook
pnpm storybook:build
vp check
vp test
```

Run `pnpm storybook:build` after changing Storybook config, stories, page compositions, or shared UI CSS.
