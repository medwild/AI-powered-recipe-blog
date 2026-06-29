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
├ README.md                            # This file
├ image-prompt-optimizer/              # Complex skill with references
│   SKILL.md                           #   Main definition (frontmatter + rules)
│   references/                        #   Specialized reference documents
│       art_direction.md
│       art_styles.md
│       common_mistakes.md
│       composition.md
│       glossary.md
│       lighting.md
│       model_specs.md
│       photography.md
│       quality_checklist.md
│       templates_and_palettes.md
├ agent-strategist.md          # Super-skill Agent 1 (SEO Strategist)
├ agent-writer.md              # Super-skill Agent 2 (Writer)
├ agent-auditor.md             # Super-skill Agent 3 (Auditor)
├ agent-editor.md              # Super-skill Agent 4 (Editor)
└ self-improvement.md          # Continuous self-improvement
```

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