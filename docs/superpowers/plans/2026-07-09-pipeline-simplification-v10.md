# Pipeline Simplification v10 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the AI pipeline from 12 steps (6 agents) to 4 steps (1 agent) while preserving all deterministic validators.

**Architecture:** New unified agent (chef-augustin.ts) calls DeepSeek v4 Pro with a single system prompt (~300 lines). Existing SERP phase, image phase, pin phase, and all validators are preserved.

**Tech Stack:** TypeScript, Inngest, DeepSeek v4 Pro, Serper.dev, Cloudflare Workers AI (FLUX-1), Cloudinary

## Global Constraints

- `npx tsc --noEmit` must pass after every task
- Never rename Inngest step names
- Never change pipeline step order without understanding dependencies
- Commit after each task
- Conserved files must NOT be modified: geo-validator.ts, content-validator.ts, citation-readiness.ts, external-sources.ts, pin-phase.ts, serp-phase.ts, image-phase.ts, anthropic.ts, cloudflare.ts, persist-phase.ts

---
