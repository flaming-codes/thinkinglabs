---
title: "Prompting disciplines"
created: 2026-07-01
updated: 2026-07-01
summary: "Prompting is splitting into disciplines: quick chat, stateful research, long-horizon systems work, and fast visual exploration already require different human-agent feedback loops."
related_claims:
  - prompt-is-spec-is-implementation
related_thoughts:
  - agent-surfaces-are-feedback-loop-shaped
  - design-will-be-seed-driven
  - the-work-should-not-stop-when-i-sleep
  - agent-harness-is-the-new-ide
inputs:
  - openai-deep-research
  - anthropic-context-engineering-agents
  - figma-make-ai-design-controls
  - figma-first-draft-style-controls
  - mixed-initiative-generative-ai-interfaces
  - interaction-augmented-instruction
  - adobe-firefly-agentic-creative-control
tags:
  - ai
  - agents
  - prompting
  - interfaces
  - design
---

Prompting is beginning to feel like too small a word for the thing it describes.

It still suggests a fairly narrow scene: a person writes a better instruction into a text box, waits for a better answer, and repeats until the answer feels good enough. That scene still exists, and sometimes it is exactly the right scale. But it is no longer enough to describe what happens when an agent can search, inspect files, call tools, edit artifacts, run tests, generate variants, open browsers, spawn subagents, pause for approval, and return with a record of what changed.

In those settings, the prompt is less like an isolated instruction and more like the first move in a working arrangement. The interesting question is not only what to say to the model. It is what kind of loop the human and the agent are entering together.

That is the shape I have been calling prompting disciplines.

A prompting discipline is a repeatable way of working with an agent that is shaped by the desired outcome, the domain's standards of proof, the speed of the feedback loop, and the interface through which human intent can be expressed. The same person may need to prompt like a casual chat user in one moment, a researcher in the next, a systems designer after that, and an art director later. Those are not merely different phrasings. They are different relationships between human judgment and machine capability.

The distinction matters because the wrong discipline makes the work fail in recognizable ways. Visual work treated like a systems pipeline becomes slow, over-specified, and lifeless. Long-horizon systems work treated like a moodboard drifts into plausible nonsense. Research treated like chat becomes a confident answer without enough evidence.

The practical skill, then, is choosing the right loop for the work.

## The chat discipline {#chat-discipline last_verified="2026-07-01"}

The chat discipline is the simplest and most familiar one.

It is the discipline of stateless or lightly stateful chat apps: open ChatGPT, ask the thing in front of you, get a useful answer, and move on. The task is not deep research, durable automation, or complex delegation. It is everyday assistance for a topic at hand.

"Quick" does not mean the thread has to be short. A chat session can become long, wandering, and full of context. The quickness is in the scope of the work. The user is not asking the agent to operate a harness, maintain a project, run a validation plan, or carry responsibility across a whole workflow. They are asking for a relevant answer, a transformation, a small explanation, a translation, a comparison, a draft, a suggestion, or a second set of eyes.

This is why chat is so natural on mobile. The phone is already the device of passing context: a sign, a menu, a screenshot, a half-remembered question, a message that needs softening, a photo that needs interpreting, a phrase in another language, an image idea that should be made now rather than saved for later. The best chat interactions feel ephemeral in the right way. They resolve the little problem currently occupying attention.

That does not make the chat discipline trivial. It has its own craft. The user has to supply just enough context, ask for the right level of answer, and notice when the question is becoming too large for the medium. The failure mode is scope creep: a small conversation quietly turns into a fake research project or a fake workstream, while the interface still behaves like a chat box.

The chat discipline is useful precisely because it stays close to the surface of life. It is not the discipline for real day-to-day work automation. It is the discipline for getting unstuck, checking a thought, making a quick artifact, analyzing something in front of you, or letting a capable assistant handle a small cognitive errand before the focus shifts.

## The research discipline {#research-discipline last_verified="2026-07-01"}

Research is close to chat, but it has state.

The research discipline begins with not knowing the answer. The human may know the question, the suspicion, the decision they are trying to support, or the shape of the uncertainty, but the outcome is not yet clear. In that sense it is closer to the visual discipline than the systems discipline: the work is exploratory, and the result has to be discovered rather than executed from a known spec.

The loop is search, inspect, validate, reframe. The agent searches, brings back candidate sources, extracts claims, notices conflicts, and proposes a provisional map. The human reads enough of the evidence to challenge it, asks for missing views, rejects weak sources, changes the question, or pushes into a subtopic. The important motion is not "go away and return with the answer." It is a tighter sequence of evidence-gathering and evidence-critique.

That makes research more durable than chat, but less autonomous than the systems discipline. A research thread should remember what has already been checked, which sources were trusted or rejected, what definitions are in play, and which uncertainties remain open. But orchestration still belongs to the human. The agent can suggest next searches, but the human decides whether the inquiry should broaden, narrow, stop, or change direction.

[Deep research-style products](https://openai.com/index/introducing-deep-research/) point at this discipline, but the important feature is not only that the model can spend longer searching. It is that the work is evidence-shaped. The agent should expose what it found, where it found it, why it believes it, what might contradict it, and which parts still need manual inspection.

The failure mode of research prompting is premature synthesis. The agent turns a messy evidence field into a clean answer too early, and the human receives fluency instead of understanding. A good research discipline keeps critique alive on both sides. The agent critiques the human's framing by surfacing counterexamples and missing distinctions. The human critiques the agent's evidence by inspecting sources, checking provenance, and refusing to let the answer outrun the material.

Research is for market scans, technical comparisons, literature reviews, product exploration, policy questions, purchasing decisions, and any inquiry where the path matters because the answer is not self-validating. It can take five minutes or five hours, but its characteristic shape is not duration. It is stateful exploration under human orchestration.

## The systems discipline {#systems-discipline last_verified="2026-07-01"}

The systems discipline is the easiest one for me to trust with long horizons.

It is also the least glamorous, because its natural rhythm is preparation rather than conversation. Before the agent does the important work, someone has to understand the state, create the inventory, clean the inputs, name the entities, define the fields, write the acceptance criteria, and build the validation surface. The work improves when the human stops trying to hold the whole system in their head and turns the domain into something inspectable.

This is why systems-shaped agent work can run for hours when the harness is good. The agent is not being asked to find a pleasing answer by improvisation. It is being asked to operate inside a bounded system: read these sources, normalize these records, refactor these modules, migrate these files, derive these candidates, check them against this schema, produce this diff, run these tests, report these anomalies, and ask for help only at defined thresholds. The prompt launches the run, but the discipline lives in the preparation around it. During the run itself, orchestration mostly belongs to the agent.

[Anthropic's context-engineering framing](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) is useful here because it makes the shift explicit. As agents move into longer time horizons, prompt engineering becomes the management of the whole context state: instructions, tools, external data, message history, and the repeated pruning of what should remain visible. The important work is not only phrasing. It is custody over the context the agent is allowed to reason from.

Validation and verification are central in this mode. A long-running agent should not return with a confident story about what it probably did. It should return with changed files, inventories, test output, failed cases, uncertain cases, assumptions it refused to make, and the exact places where human judgment is needed. The stronger the validation surface, the less the human needs to supervise moment by moment.

Periodic review through subagents fits naturally here. A reviewer agent can inspect the current diff while the main agent continues, audit the plan against the requirements, or search for drift, regressions, and missing tests. Trust comes less from the model being careful in the abstract and more from a system that keeps pushing the work back through checks.

This discipline covers software, data pipelines, migrations, indexing, knowledge bases, schemas, test suites, generated artifacts, agent state, and the harness itself. It is for any work where a large stateful system has to be changed under validation. The visible result can be surprisingly large, but the result is credible only when every step has somewhere to be verified.

## The visual discipline {#visual-discipline last_verified="2026-07-01"}

Visual work wants almost the opposite rhythm.

If the systems discipline is slow, passive, and verification-heavy, the visual discipline is fast, tactile, and taste-heavy. The familiar pattern of "prompt, wait, inspect, prompt again" is still too thin for this kind of work. It treats visual intent as though it were a paragraph-shaped substance, when much of it is spatial, comparative, referential, and pre-verbal. Often I do not know what I want until I can see the version that is almost right.

This is where the interface matters as much as the model. A useful visual agent should not only accept text. It should let me create four variants at once, pin a promising direction, drag a slider for spacing, lock typography, select only the hero section, brush over the part that feels wrong, fork a version, compare branches, blend two references, and keep the design system seed visible as a constraint. The text prompt becomes one channel in a richer control surface.

The tools are already moving this way. [Figma Make](https://www.figma.com/make/) emphasizes prompt-to-prototype work with design context, canvas edits, annotations, version history, point-and-edit, Make kits, connectors, and plan mode. Figma's [First Draft controls](https://help.figma.com/hc/en-us/articles/23955143044247-Use-First-Draft-with-Figma-AI) make the same idea concrete: after a prompt creates a design, the user can preview themes and adjust color, border radius, spacing, and typography through controls. [Adobe Firefly's agentic creative direction](https://news.adobe.com/news/2026/04/adobe-new-creative-agent) points in the same direction, where conversation sits alongside precision adjustments, reference material, models, and persistent control.

The visual discipline needs the shortest possible loop between human taste and agent generation. Not because taste is mystical, but because taste is high-bandwidth and hard to serialize. A designer can reject a direction in half a second for reasons that would take several weak paragraphs to explain. A slider, selection, thumbnail, or side-by-side comparison can carry intent more efficiently than another sentence. Research on [interaction-augmented instruction](https://arxiv.org/html/2510.26069v2) makes a related point in formal terms: text prompts are convenient, but fine-grained and referential intent often needs GUI interaction too.

The failure mode of visual prompting is not only ugliness. It is premature convergence. One result arrives, the human adapts to it, and the design space collapses around whatever the model happened to sample first. A better visual discipline keeps alternatives alive longer and lets the human steer through a space of possibilities before committing to one artifact.

The human role here is not spec owner. It is closer to art director, curator, editor, or taste filter. The agent's job is not to obey one perfect instruction, but to keep the design space cheap enough to explore.

## Four loops, not one skill {#four-loops last_verified="2026-07-01"}

These four disciplines are enough to show why "good prompting" is starting to feel too generic.

In the chat discipline, the human keeps the task small and situated. The feedback loop is conversational because the artifact is often temporary: an answer, an interpretation, a small draft, a generated image, or a useful next thought. Progress is measured by whether the immediate situation becomes clearer.

In the research discipline, the human keeps the inquiry honest. The feedback loop is search, inspect, validate, and reframe because the artifact is an evolving understanding. Progress is measured by whether the evidence field becomes clearer without collapsing too early into a polished answer.

In the systems discipline, the human earns distance by front-loading structure. The better the inventory, spec, schema, validation plan, and review harness, the longer the agent can work without continuous steering. The feedback loop is slow because the artifact is cumulative. Progress has to be checked against durable constraints.

In the visual discipline, the human earns quality by staying close. The shorter the loop between seeing, selecting, adjusting, and regenerating, the more precisely taste can enter the system. The feedback loop is fast because the artifact is exploratory. Progress depends on keeping possibilities alive long enough for judgment to sharpen.

That contrast is the useful core of the concept for now. Prompting disciplines are not mainly about how to talk to the model. They are about arranging the conditions under which the model's work can become useful.

Sometimes that means a chat that lasts two minutes and disappears from attention. Sometimes it means a research thread where the human keeps pulling the inquiry back to the evidence. Sometimes it means a careful spec and a machine that runs for hours. Sometimes it means a canvas that updates in seconds. The same word, prompting, covers all four, but the work underneath is already diverging.
