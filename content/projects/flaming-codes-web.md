---
title: flaming.codes
status: alive
started: 2022-07-10
current_question: "How should a long-running personal publishing site keep evolving without losing the speed, searchability, and low-friction archive that made it useful?"
help_welcome: "The useful feedback is editorial and architectural: migration sharp edges, content model mistakes, search quality, and whether the site still feels fast and legible."
links:
  repo: https://github.com/flaming-codes/flaming-codes-web
related_thoughts: []
related_claims: []
tags: [web, writing, react-router, publishing, frontend, ai, internationalization]
---

flaming.codes is my long-running technical publishing surface: articles, tutorials, experiments, project notes, and a public profile wrapped into one site. It is also a web-platform playground, which means the implementation keeps changing as the edge of the frontend stack changes.

The current tracked app is a React Router 7 and React 19 site using TypeScript, Tailwind CSS, Vite, Motion, Fuse.js, Satori/Resvg, and a Markdown pipeline built on Unified, Remark, and Rehype. Content is served from a static-file CMS under locale folders, with Markdown posts plus JSON previews, suggestions, categories, and addenda. The archive is substantial enough to make the system matter: the local English content index contains 125 posts, 21 categories, and the CMS spans 17 locale directories.

The site has accumulated the kind of infrastructure that only appears when a personal site is used for years rather than launched once: fuzzy search, RSS, sitemap generation, generated Open Graph images, locale routing, RTL support, privacy-friendly analytics, and a homepage visual built from animated depth-aware flocking. Some content also records when AI tools were part of the writing or image workflow, because publishing experiments should leave an audit trail.

There is a newer migration sitting beside the current app, aimed at Next.js 16 and PayloadCMS. That work is a sign of the project's present tense. flaming.codes is already shipped, but it is not finished in the museum sense. The question is how to preserve the publishing loop while giving the content model more room to grow.

The site matters because it is not only a place where work is displayed. It is one of the places where the work happens: a durable archive, a testbed for modern web architecture, and a public record of what I was trying to understand at the time.
