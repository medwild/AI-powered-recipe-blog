# Skills — AI Prompt Architecture

This directory centralizes all **skills** (system prompts and business rules) used by the AI agents in the recipe generation workflow.

## Philosophy

Each skill is a standalone Markdown file that defines:
- The **objective** of the skill
- The **role** of the agent
- The **rules and constraints** (business rules)
- The expected **output format**
- The **integrations** with other skills

## Benefits

- ✅ **Separation of prompt / code** — prompts evolve without touching TypeScript
- ✅ **Clear versioning** — every prompt change is tracked in Git
- ✅ **Reusability** — a skill can be loaded by multiple agents
- ✅ **Extensibility** — adding a new agent = adding a `.md` file
- ✅ **Living documentation** — the `skills/` directory is the source of truth for AI behavior

## Usage

Skills are loaded dynamically via `lib/skills.ts`:

```typescript
import { loadSkill, optimizeImagePrompt } from "@/lib/skills"

// Load a complete skill
const strategistSkill = await loadSkill("agent-strategist")

// Optimize an image prompt (guarantees non-empty result)
const prompt = optimizeImagePrompt(recipe)
```

## Structure

```
skills/
├ README.md                              # This file
├ agent-chef-augustin.md                 # Agent unique — Writer
├ agent-strategist.md                    # Agent — Content Strategist
├ agent-judge.md                         # Agent — Quality Evaluator
├ agent-science-enricher.md              # Agent — Food Science Enricher (Sonnet 5)
├ agent-pin-designer.md                  # Agent — Pin Designer (PTRA framework)
├ references/                            # Reference documents (loaded by agents)
└ archive/                               # Archived agents (pre-v11 multi-agent pipeline)
    ├ agent-aor-writer.md
    ├ agent-auditor.md
    ├ agent-editor.md
    ├ agent-qa.md
    ├ agent-strategist.md
    ├ agent-writer.md
    ├ content-gap-strategist.md
    ├ food-photography.md
    ├ self-improvement.md
    └ writing-samples.md                 # Archived: patterns now in agent-chef-augustin
```

## Active Agents (v12 — Human-First Pipeline)

| Skill | Agent | Model | Role |
|---|---|---|---|
| `agent-chef-augustin` | Chef Augustin | Claude Sonnet 4.6 | Writer — full article + image prompt + JSON-LD |
| `agent-strategist` | Strategist | Claude Sonnet 4.6 | Content strategy — SERP analysis + H2 planning |
| `agent-judge` | Judge v2.0 | Claude Sonnet 4.6 | Quality evaluation — 5 dimensions + Voice Authenticity |
| `agent-science-enricher` | Science Enricher | Claude Sonnet 5 | Food science gap analysis — 6 enrichment types |
| `agent-pin-designer` | Pin Designer | Claude Sonnet 4.6 | 5 Pinterest Pins — PTRA scoring + Content Graph |

## Supported Formats

### Simple format (flat file)
For skills without external references:
```
skills/<name>.md
```

### Advanced format (subdirectory)
For complex skills requiring reference documents:
```
skills/<name>/
  SKILL.md       # Main definition (frontmatter + rules)
  references/    # Optional reference documents
```

The loader `lib/skills.ts` automatically detects the format:
1. Looks for `skills/<name>/SKILL.md` first
2. Falls back to `skills/<name>.md`

## Naming Convention

- `agent-<name>.md` — skills tied to a workflow agent
- `image-prompt-optimizer.md` — utility skill (optimization)
- `self-improvement.md` — cross-cutting skill (self-improvement)

## Skill Format

```markdown
---
id: "agent-xxx"
version: "1.0.0"
description: "Brief description of role and scope"
---

# Skill Title

## Purpose

[Skill objective]

## Role

[System instructions — the agent's "system prompt"]

## Rules

[Constraints and business rules — bullet list]

## Output

[Expected output format — JSON template if applicable]

## Integration

[How this skill integrates with others]