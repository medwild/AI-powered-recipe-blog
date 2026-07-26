---
id: ideogram-prompt
version: "1.0.0"
description: "Ideogram 4 prompt engineering reference — compiled from Ideogram docs, PixelDojo guide, and food photography best practices. Used to optimize Chef Augustin mega-skill §6 image prompts."
source: "https://docs.ideogram.ai/using-ideogram/getting-started/prompting-guide/"
last_updated: "2026-07-26"
---

# Ideogram 4 — Prompt Engineering for Food Photography

## Core Principles

1. **Subject-first positioning** — most important subject at the beginning
2. **Real camera models** — Canon EOS R5 anchors quality better than Sony
3. **Directional lighting** — Ideogram's "studio lighting" default produces dry/matte food
4. **Surface specificity** — rendering resources scale with descriptive precision
5. **Mandatory negative constraints** — Ideogram adds text/logos/hands by default
6. **Moisture vocabulary** — present participles ("glistening", "pooling", "steaming") force gloss
7. **Micro-detail trick** — "a single [x] clinging" signals texture rendering
8. **45° preference** — Ideogram renders angled shots better than overhead
9. **~150 word cap** — Ideogram prompt limit is ~200 tokens

## Prompt Template

```
[Specific dish name]. [3 visual anchors, comma-separated]. [Surface with material + texture]. [Angle + composition]. [Directional lighting setup]. [Moisture/texture descriptors with present participles]. [Micro-detail]. [Canon EOS R5 + lens + aperture + ISO]. [Color palette with hex codes]. No text, no labels, no logos, no watermarks, no hands, no fingers, no human limbs, no silverware visible.
```

## Common Pitfalls

| Problem | Cause | Fix |
|---------|-------|-----|
| Food looks dry/plasticky | Studio lighting default | "overhead kitchen spotlight + side rim light" |
| Unwanted text on image | Ideogram default behavior | Always append negative tail |
| Flat/matte look | White background | "dark walnut countertop with subtle grain" |
| Floating hands | Model fills gaps | "no hands, no fingers" |
| Overhead looks lifeless | Ideogram renders 45° better | Default to 45° for everything except pizza |
