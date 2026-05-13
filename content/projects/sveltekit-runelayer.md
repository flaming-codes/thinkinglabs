---
title: SvelteKit RuneLayer
status: alive
started: 2026-03-28
current_question: "Can a SvelteKit app get a useful CMS without adopting a separate runtime, framework, or admin server?"
help_welcome: "Useful pressure here is practical: Payload parity gaps that matter, SvelteKit integration edge cases, admin workflows that feel underpowered, and storage/auth boundaries that should be sharper before v1."
links:
  repo: https://github.com/flaming-codes/sveltekit-runelayer
related_thoughts: []
related_claims: []
tags: [sveltekit, svelte, cms, typescript, drizzle, libsql, better-auth, admin-ui, open-source]
---

SvelteKit RuneLayer is a CMS-as-a-package for SvelteKit apps. Instead of running as a separate service or asking the host app to move into a new framework, it lives inside the existing Node process and exposes the pieces a content-heavy app needs: schema-driven collections and globals, request-scoped query APIs, auth, persistence, file storage, hooks, and an admin UI.

The project is published as `@flaming-codes/sveltekit-runelayer` and is still pre-v1. That matters because the package is already usable and tested, but the API should be expected to move while the platform hardens. The current work is less about proving that a Svelte admin can exist and more about deciding which CMS guarantees belong in the core contract.

The architecture keeps the source of truth in TypeScript collection definitions. Those definitions drive generated Drizzle table shape, libsql-backed storage, access-controlled CRUD, admin rendering, globals, versions, uploads, and the host application's drizzle-kit migrations. Better Auth handles authentication, while RuneLayer wraps it in SvelteKit request handling, role checks, anti-spoofing headers, and deny-by-default access behavior.

The example app in `apps/web` is part of the product, not a throwaway demo. It runs a marketing site and its package-owned admin on the same content model, with public pages, site chrome, pricing, docs, changelog content, seeded data, and admin editing all exercising the same runtime path. That keeps the package honest: authoring and rendering have to stay aligned.

The interesting tension is Payload-shaped ambition inside a SvelteKit-native package boundary. RuneLayer intentionally borrows the useful CMS vocabulary: collections, globals, fields, access control, hooks, uploads, drafts, versions, and admin screens. But it has to translate that vocabulary into Svelte, SvelteKit, Drizzle, libsql, Better Auth, and host-managed migrations without quietly becoming a second application framework.

What I want from RuneLayer is a boringly embeddable CMS layer for SvelteKit: enough structure that real content products can trust it, enough restraint that the host app remains the host app, and enough parity with established CMS patterns that choosing Svelte does not mean rebuilding the same authoring machinery from scratch.
