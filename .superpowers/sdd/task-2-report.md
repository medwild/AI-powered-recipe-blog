# Task 2 Report — Integrate GEO Validator into ContentValidator

**Status:** Done

## Changes

- **File:** `lib/content-validator.ts`
- **Import:** Added `import { checkCitability } from "@/lib/geo-validator"` after the INTERNAL_TOKENS constant definition.
- **Check:** Added GEO citability check as section `// 3.5` in `validateContent()` — runs after the word count block and before metadata length checks. Non-blocking (warning) for scores 60-69; blocking (error) for scores below 60.

## Commit

```
a0a9731 feat: integrate GEO citability check into ContentValidator
```

## Verification

- `npx tsc --noEmit` — passed with no errors.
- No `// @ts-ignore`, `as any`, or `eslint-disable` added.
- Matches existing code style (error/warning severity pattern, same `errors.push(...)` convention).

## Concerns

- None. The integration is a clean additive change — the citability check appends to the existing `errors` array and follows the same severity pattern used by all other validation rules.
