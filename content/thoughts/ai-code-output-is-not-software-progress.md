---
title: "The harness makes agentic code hold up"
created: 2026-05-23
updated: 2026-05-23
tags:
  - agents
  - harness
  - software
  - management
  - startups
claims: []
inputs: []
observations: []
---

I think the hard part of agentic software engineering is not getting an agent to produce code. That part is becoming cheap. The hard part is getting an agent to produce changes that still belong to the same codebase after the fifth, tenth, or fiftieth patch.

The naive workflow is almost designed to fail at that. Write a prompt, let the agent generate a large diff, run one review, maybe skim the tests, then merge if the output looks plausible. This can feel productive because the visible artifact is large. It can also be a near guarantee of many results that are technically impressive and structurally bad.

The problem is that software work is not a factory problem where every additional unit is automatically evidence of health. A codebase is a living constraint system. Every new file, abstraction, dependency, generated helper, and half-understood integration enters that system and starts charging rent. If the process does not preserve the model of the system, agentic coding can create complexity faster than the team can understand it.

This is where I think the agent harness becomes the key factor. The harness is not just a nicer prompt wrapper. It is the operating environment that raises the floor of the work: the standing instructions, the local skills, the repository-specific documentation, the quality gates, the review habits, the shell, the browser, the issue context, the conventions, and the accumulated memory of how this codebase wants to be changed.

A good harness lets agents create a lot of change while keeping the codebase cohesive. It gives the agent more than a task. It gives it a way to behave inside the project. It tells the agent where truth lives, which patterns are local rather than generic, which files are generated, which commands matter, which abstractions are already trusted, and which kinds of cleverness are unwelcome.

Without that environment, the agent is mostly acting from the prompt and its general model of software. That can be enough for isolated tasks. It is not enough for sustained engineering. Sustained engineering requires repeated contact with the local reality of the system. The agent has to learn, or be continuously reminded, that this repository has its own source-of-truth boundaries, naming habits, testing expectations, architectural decisions, and failure modes.

I believe this is where small companies and startups are more exposed, in both directions. If they use a simplistic agent workflow, the over-complexity, drift, and hidden regressions show up quickly. The team is small, the codebase is changing fast, and there are fewer buffers between bad engineering behavior and customer-visible pain. A startup that uses agents to generate impressive piles of code nobody can reason about may not have enough time to discover the problem slowly.

The same exposure can also make them better. If agentic software engineering has to work for the company to survive, the team has a strong reason to discover the process that actually works. It has to learn when to ask for exploration, when to ask for a small patch, when to split work across agents, when to run tests, when to stop and re-plan, when to delete, and when to reject a plausible implementation because it does not fit the system.

Large enterprises often have a different feedback loop. I do not think the issue is that their engineers are worse. The issue is that inefficient agentic workflows can survive longer inside a successful organization. A team can count generated output as progress. A division can reward visible throughput. A platform group can normalize agent-produced complexity. Because the business is still carried by an existing product, platform, distribution advantage, or customer relationship, the cost may propagate slowly through architecture, review culture, dependency graphs, and staffing plans before it becomes impossible to ignore.

The risk, then, is not simply "AI writes bad code." The risk is that an organization adopts a thin process for agentic work and then measures the output of that thin process as success. More pull requests, more generated files, more closed tickets, more prototypes: all of that can look like acceleration from a managerial distance. But if the harness is weak, the output may be weakening the codebase faster than it is improving the product.

Good agentic engineering seems to require almost the opposite instinct. The leverage is not that an agent can write a large amount of code. The leverage is that a disciplined process can use agents to explore, compress, delete, test, document, and validate with less friction. The question is not "how much did the agent produce?" The question is "what burden did the system avoid, remove, or make clearer?"

In my experience, the harness is what makes that bar realistic. A strong prompt matters, but the prompt alone is not the process. Skills matter because they encode repeatable local procedures. Deep integration of local documentation matters because it gives the agent the context that a senior engineer would otherwise carry in memory. Quality gates matter because they turn taste and correctness into recurring pressure rather than occasional hope.

The companies that use agents well may not be the ones that generate the most code. They may be the ones that build the best environment around generation: enough instruction to constrain the work, enough documentation to ground it, enough skills to make good behavior repeatable, enough tests to catch drift, and enough review discipline to reject plausible nonsense.

Startups are pushed toward that discipline by the possibility of vanishing. Enterprises, when they lack that immediate threat, may have to choose the discipline deliberately and earlier than their normal feedback loops require. In both cases, I think the real question is not whether the company is using AI to write code. It is whether the agentic process is strong enough for the code to hold up.
