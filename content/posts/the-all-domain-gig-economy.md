---
title: "The all-domain gig economy"
created: 2026-05-31
updated: 2026-05-31
summary: "AI has begun turning professional judgment into intermittent, brokered training signal: an all-domain gig economy for expert feedback, correction, evaluation, and model improvement."
related_claims: []
related_thoughts:
  - agent-surfaces-are-feedback-loop-shaped
inputs:
  - cheap-expertise-expert-data-gig-economy
  - outlier-ai-expert-platform
  - dataannotation-ai-training-domains
  - mercor-expert-ai-training-projects
  - time-ai-gig-workers-fairwork
tags:
  - ai
  - labor
  - expertise
  - agents
---

There is a new kind of job growing in the side streets of the AI economy, not yet named cleanly enough to become visible. "Data annotation" makes it sound like someone drawing boxes around cars, "AI training" sounds too ceremonial, as though the worker has been invited into the laboratory, and "freelance expert work," while closer, still misses the machinery that gives the work its peculiar shape.

The phrase I keep reaching for is the all-domain gig economy: a market in which almost any form of human expertise can be summoned, briefly and remotely, to correct, rank, challenge, or otherwise discipline an AI model.

This is not the old crowdwork story with a little more jargon sprinkled on top, though that older layer still exists and the labor politics around it remain bleak in many places. The newer layer has a different appetite, one that wants lawyers to catch bad legal reasoning, doctors to inspect clinical answers, software engineers to judge generated code, translators to notice the sentence that sounds fluent only to someone who does not really speak the language, mathematicians to test proofs, accountants to flag a misapplied standard, and teachers, scientists, designers, analysts, journalists, and consultants to expose the ways a model can be wrong while sounding uncannily employable.

On the screen, the task may look almost trivial, whether it asks someone to rank two answers, write a prompt that would make the model fail, correct a response, build a rubric, explain why an answer is unsafe or incomplete, or review another worker's judgment. But the purchased commodity is not keystrokes so much as discrimination: the trained ability to say, with reasons, that this answer is not merely awkward but wrong in a way the field recognizes.

That is the quiet economic novelty: AI has not only created a market for data, but a market for intermittent expertise.

## The broker layer {#broker-layer last_verified="2026-05-31"}

The work usually does not appear as a clean contract between an AI lab and a professional, but through brokers. A person creates an account, proves enough competence to enter a pool, waits to be matched, and receives bursts of work when some customer suddenly needs exactly their slice of knowledge.

[Outlier](https://outlier.ai/) describes itself as a Scale AI-operated platform connecting experts with leading AI companies to provide human feedback that improves language models. [DataAnnotation](https://dataannotation.tech/) advertises AI training domains that now range from coding and general writing to law, medicine, finance, accounting, chemistry, biology, physics, mathematics, and bilingual work. [Mercor](https://www.mercor.com/experts/) tells professionals they can review LLM outputs, create examples that teach models how experts think, and evaluate quality using clear standards.

On the enterprise side, [Scale AI](https://scale.com/generative-ai-data-foundry), [Invisible Technologies](https://invisibletech.ai/ai-training), [Turing](https://www.turing.com/services/llm-frontier-knowledge-processing), [Toloka](https://toloka.ai/ru), [Surge AI](https://www.surgehq.ai/rlhf), and [Appen](https://www.appen.com/generative-ai) all sell versions of the same service: human expertise arranged into training data, evaluation, red-teaming, preference ranking, rubric writing, or benchmark construction.

From the worker's side, this can feel less like a job than like being on a casting list, because a project appears when a lab needs better chemistry reasoning this week, multilingual safety judgments next week, or finance benchmark tasks before a model release. Then, without ceremony, it disappears.

Demand is discontinuous, access is mediated, and the platform may know why a worker has no tasks while the worker knows only that the dashboard is quiet and that a credential can matter enormously one day and not at all the next.

This is why "gig economy" is not merely decorative language: the platforms promise flexibility, remote work, and payment for output. They also inherit the old asymmetries of platform labor, including opaque allocation, unpaid qualification tests, weak recourse, sudden deactivation, inconsistent demand, and quality metrics the worker may never fully see.

TIME's reporting on Oxford Fairwork research found that AI-related cloudwork platforms were still far from basic fair-work standards, with unpaid time spent looking for work, taking tests, and applying for tasks cutting into real wages. That matters because expert work may command higher rates than old microtasking without a better hourly number doing much to repair the structure around it.

## Why this had to become all-domain {#why-all-domain last_verified="2026-05-31"}

This market is expanding because general models have become broad enough to be wrong almost everywhere.

When a model could barely answer a school exercise, generic feedback could carry a surprising amount of the burden, but now the failures are more local and therefore more expensive to see. A model can write a confident legal memo whose conclusion rests on a bad jurisdictional assumption, solve most of a math problem before smuggling in a false step, produce code that looks idiomatic while violating the local architecture, or summarize a medical scenario in a tone of calm usefulness while missing the clinical risk.

The better the model becomes at surface plausibility, the more valuable it becomes to find people who can detect deep wrongness.

That pressure makes the market all-domain almost by necessity, because AI labs do not only want a universal model that chats nicely. They want systems that can operate inside workflows such as coding, research, customer support, medicine, law, finance, education, operations, scientific discovery, logistics, design, and whatever else customers will pay to automate or accelerate.

Each workflow carries local standards, tacit norms, edge cases, and professional failure modes, which means the model needs examples, evaluations, and corrections from people who know those standards from the inside.

This is also why the line between evaluation and training starts to dissolve, since what looks, from the worker's side, like a judgment about one model response may later be folded back into the machinery that produces the next one.

A hard benchmark question, a careful rubric, a correction, a preference ranking, or a red-team note begins as an attempt to measure or repair a failure, yet each can also become part of the material from which future behavior is learned, so the same act of judgment may begin as a test and end as a lesson.

Robert Wolfe and Aayushi Dangol's 2026 paper ["Cheap Expertise"](https://arxiv.org/abs/2605.03295) gives the deeper shift a useful name, an expert data gig economy, and its argument is uncomfortable because it says plainly what the market prefers to keep softened by platform copy.

Human expertise is being treated as an extractable resource, valuable insofar as it can improve the return on AI systems. The platforms are not only buying answers but the residue of professional formation: the ways a trained person notices, doubts, ranks, corrects, and explains.

## The strange middle job {#strange-middle-job last_verified="2026-05-31"}

The all-domain gig job sits in an awkward middle position, since it is not ordinary employment, not quite consulting because the client often does not want advice about its own business, and not teaching because the student is not a person and the lesson may be absorbed invisibly into a model. It is not quality assurance in the ordinary sense, because the thing under test may be a general-purpose system whose eventual uses are unknown, and it is not exactly piecework because the valuable piece is often a sliver of professional judgment that took years to acquire.

For some people, this is genuinely useful work: a retired lawyer can review model answers from home, a programmer between jobs can evaluate generated code, a bilingual professional can turn linguistic judgment into flexible income, and a domain specialist in a low-opportunity region can access global demand without moving.

Some advertised rates for highly credentialed work are high enough to matter even in rich labor markets, which is one reason the category should not be dismissed as merely exploitative or merely marginal.

But the structure is precarious in a way that is not incidental, because the platform wants availability without obligation and the AI company wants expertise without hiring the expert. The worker gets flexibility without much predictability.

Their output may improve systems that later compete with the profession that trained them, their name may not attach to the work, and their judgment becomes valuable precisely because it can be lifted out of the person and made to circulate.

This is why the phenomenon is hard to place in the usual argument about AI and jobs, because it is not simply "AI will take all jobs," and it is not the sunnier counterclaim that "AI will create better jobs."

The sequence is stranger: AI first turns work into evaluable fragments, then buys those fragments from people who still know how the work is supposed to go, then uses those fragments to make the model better at the job-shaped task.

The first effect is not replacement, but decomposition.

## Expertise as a callable resource {#callable-resource last_verified="2026-05-31"}

If this grows, expertise becomes more liquid and less institutionally housed, because a hospital, law firm, university, bank, newsroom, or software company used to hold expertise inside employment, apprenticeship, review processes, archives, and professional norms. The all-domain gig economy pulls pieces of that expertise into a marketplace where they can be invoked by task.

There is a liberating version of this story, because institutions are not always good stewards of talent. Some experts are underused, badly managed, geographically trapped, retired too early, or excluded by credential rituals that only loosely track ability.

A brokered AI-training market can discover useful people and pay them for work that would otherwise have no buyer.

There is also a corrosive version, and it is not hard to imagine. Institutions do not merely store expertise; they help make it through feedback loops, accountability, memory, peer challenge, standards of care, and consequences.

A task platform can ask a doctor to judge a model answer without reproducing the social machinery that made the doctor careful, or ask a lawyer for a rubric while stripping it from the professional obligations that give legal judgment its gravity. It can ask a software engineer to correct generated code while detaching the task from maintenance, ownership, and the future cost of the decision.

The market wants the signal without the institution, which means that sometimes it will be efficient and sometimes it will be a way of laundering institutional expertise into a cheaper, less accountable form.

That is the core tension: the all-domain gig economy may expand access to skilled work while weakening the conditions under which skill remains skill, paying people for judgment while teaching companies to treat judgment as a consumable ingredient.

## What happens next {#what-happens-next last_verified="2026-05-31"}

The near future almost certainly contains more of this, not less, because frontier AI systems need higher-quality feedback as they move into higher-value tasks. Simple labels are not enough for models meant to reason through contracts, debug production systems, plan experiments, tutor students, draft financial analyses, or operate software.

Synthetic data and AI graders will absorb some of the volume, but they do not eliminate the need for humans. They move humans to different points in the loop: auditors of hard cases, designers of environments, writers of rubrics, judges of edge conditions, and suppliers of examples that are difficult to fake.

The work will move up the stack, so that a contributor who today compares two answers may tomorrow design a simulated workflow, specify what success looks like, and judge an agent's performance across multiple steps.

The unit of labor shifts from "label this item" to "encode what competent work in this domain requires," which is a more powerful transaction and a more consequential one.

This will affect more jobs than it currently seems to because most white-collar work contains some evaluable core; not the whole job, not the relationships, politics, trust, taste, liability, institutional memory, or embodied context. But enough of the work can be turned into cases, rubrics, examples, corrections, and pass-fail judgments that AI companies will keep buying expert fragments wherever models need to improve.

The important question is not whether the all-domain gig economy exists, because it does, but whether it becomes a trapdoor under professional labor or a better interface between human judgment and machine capability.

That depends on choices that are still open: whether workers are paid for qualification time, whether platforms explain allocation and quality decisions, whether experts retain any claim over reusable training artifacts, whether sensitive domains demand stronger accountability, whether professional communities notice that their knowledge is being extracted, and whether AI labs treat human feedback as disposable input or as skilled labor with obligations attached.

For now, the market is young enough to look like a side hustle and important enough to be infrastructure, which is the strange part, because somewhere between the unreleased model and the polished product, a statistician is writing a trick question, a nurse is flagging a dangerous answer, a programmer is explaining why the patch is wrong, and a translator is saving a model from the false confidence of fluency.

The future of work is not only being automated, but sampled.
