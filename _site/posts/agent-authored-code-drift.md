---
title: How to keep agent-authored code from drifting
type: post
date: 2026-06-22
description: When agents write modules in parallel, the modules stop agreeing with each other. That is a contract-enforcement problem, and you can make CI catch it.
tags: [capability-security, agent-infra, contracts]
target: dev
---
AI agents are good at writing code now. They are much worse at keeping a large codebase consistent with itself while many parts of it change at once. That second problem is where agent-authored projects actually break, and it gets harder as you add more agents and more modules.

## Why codebases split into bounded parts

A healthy codebase grows by splitting. Each good idea becomes its own module with a name, a defined contract, and a clear edge. This matters for agents because a module with a contract is something you can safely scope an agent to. You hand the agent one bounded thing — its inputs, its outputs, the one effect it is allowed to have — and it cannot reach past that. Scope is what makes agent work safe to accept, and contracts are what make scope real.

## Where it goes wrong

Once you have many of these modules and several agents editing them, the modules have to keep agreeing with each other. Module A makes a promise. Module B was written assuming that promise. An agent edits A correctly, within A's own contract, with its tests green, and quietly breaks the assumption B depended on. No test fails, because nothing inside either contract was violated. What broke was the agreement between them, and that agreement lives nowhere a single test can see it.

That gap is where agent-authored code drifts. The question that matters is not whether an agent can write a function. It is whether the agreements between a hundred functions survive a hundred agents rewriting them.

## Making the agreement enforceable

The bet behind {{org}}: **{{thesis}}** Then make two more things true. Bind every privileged effect to a signed owner, checked in CI, so nothing consequential happens without a traceable source. And generate every downstream surface from one source so that when two of them disagree, the build goes red. The agreement between modules stops being something people remember and becomes something the build checks.

The claims here are checked against running code: [prx]({{proof.prx}}), [guest-room]({{proof.guest-room}}), [ocap-provenance]({{proof.ocap-provenance}}). I would rather you read it than take my word for it.

If you are working on this, I would like to compare notes: {{email}}.
