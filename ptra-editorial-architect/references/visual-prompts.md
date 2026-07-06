# Visual Prompt System (Reference)

Read this file during **Phase 10 (Visual Direction)** of the PTRA workflow, when generating the `visual_direction` field for each Pin variant.

## Mandatory Technical Specs (append to EVERY visual prompt, all content types)

```text
Aspect ratio 2:3 (1000x1500px), vertical orientation, safe zone respected (no critical text or focal subject within the outer 8% margin — feed crops and UI overlays cut this area on mobile).
```

- Never generate square, horizontal, or arbitrary-ratio prompts for standard Pins — off-spec ratios are cropped or deprioritized in the feed.
- Text overlay must remain legible at thumbnail size on a mobile screen (large, high-contrast type, not placed near edges).

Select the template below that matches the content type. **Never default to food photography** just because it's Type 6 — pick based on the actual `content_type` / `micro_niche`.

## Type 1 — Product / Object
```text
Vertical Pinterest product photography, [object/product] in [realistic context], clean composition, natural light, mobile-first framing, clear focal point, space for readable text overlay, cohesive color palette, no misleading elements.
```

## Type 2 — Home / Decor / Lifestyle
```text
Vertical Pinterest lifestyle photography, [space or lifestyle subject], [style direction], realistic setting, natural light, clean composition, aspirational but achievable, mobile-first layout, space for readable text overlay.
```

## Type 3 — Infographic / Checklist
```text
Vertical Pinterest infographic, [topic], clear hierarchy, step-by-step structure, high readability on mobile, large headings, clean spacing, useful visual icons, no clutter, designed for saves.
```

## Type 4 — Fashion / Beauty / Portrait
```text
Vertical Pinterest lifestyle photography, [fashion/beauty subject], [setting], natural pose, cohesive outfit or styling, realistic lighting, clear visual focus, mobile-first composition, space for readable overlay.
```

## Type 5 — DIY / Tutorial / Fitness
```text
Vertical Pinterest tutorial image, [DIY/fitness subject], visible materials or body position, clear step-focused composition, practical and achievable style, natural light, mobile-first framing, space for short instructional overlay.
```

## Type 6 — Food / Recipes
```text
Vertical Pinterest food photography, [recipe name], visible texture, realistic homemade style, appetizing composition, natural light, mobile-first framing, space for readable text overlay, no misleading ingredients.
```

## Type 7 — Business / Planning / Productivity / Finance
```text
Vertical Pinterest productivity visual, [topic], clean workspace or digital planning context, organized layout, professional but approachable style, mobile-first composition, readable overlay area, no fake data claims.
```

---

## Video Pin Consideration (Mandatory Check — Phase 10bis)

For every cluster, evaluate whether at least one Pin variant should be a video Pin. Video Pins consistently outperform static images on engagement.

**When to prefer a video Pin:**
- The content asset is a step-by-step process, transformation, or before/after (naturally sequential).
- The cluster's `pinterest_intent` is `step-by-step`, `before-after transformation`, or `quick solution`.

**Video Pin technical constraints** (add to `pin_variants` when `format: "video"`):
```json
{
  "format": "video",
  "duration_seconds": "6-15",
  "aspect_ratio": "9:16 (1080x1920px)",
  "resolution_minimum": "720p",
  "thumbnail_note": "Static thumbnail for feed preview must be 2:3 ratio with safe zone, same specs as standard Pin"
}
```

**Rule:** Do not force video where the content genuinely doesn't benefit from motion (e.g., a single static inspiration image) — a bad video Pin scores worse than a good static one. This is a recommendation gate, not a quota.
