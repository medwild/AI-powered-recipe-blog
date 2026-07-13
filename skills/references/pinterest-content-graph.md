# Pinterest Content Graph Research Reference

> Extracted from `skills/agent-chef-augustin.md` §12 (v1.3). Kept as research documentation — the actionable rules derived from this research are in `skills/agent-chef-augustin.md` §4.2.

## 1. Topic Relevance (Board-First Signal)

The FIRST board a pin is saved to is a strong topic-classification signal (US Patent 11256747). Generic/diverse boards get PRUNED from the Content Graph entirely. Pinterest uses: LDA topic models for offline graph pruning, PinSage graph neural networks for embedding, Pinterest Lens for visual classification, and an LLM-based semantic classifier (added 2025).

## 2. Domain Quality (Behavior-Based Trust)

Pinterest measures domain quality through: saves-to-clicks ratio, time-on-page (in-app browser), bounce-back rate, pin-page match (Topic Cohesion Score, US Patent 20230388261A1), page speed, mobile responsiveness, AND publishing freshness. It is behavior-based — NOT tied to server IP/location.

## 3. Engagement (Saves > Clicks)

Saves are Pinterest's strongest engagement signal — confirmed by the Pixie paper (WWW 2018, +50% Homefeed improvement), TransAct V2 (CIKM 2025, +6.35% repin volume as primary metric). Pinterest uses an engagement-RATE model (ratios, not raw counts). 90%+ of traffic comes from newly created Pins (Creates), not repins.

## 4. Visual Understanding (Pinterest Lens)

Pinterest Lens reads images for objects, colors, and on-image text. The LLM classifier (2025) combines visual features with text metadata. Image signatures are used for content deduplication at the retrieval stage.

## 5. Language Geo-Targeting (Pixie)

Pinterest's Pixie system uses `PersonalizedNeighbor` edge biasing to prefer the user's local language. Local-language biasing produced +48-75% lift in local-language pins shown. There is NO organic geo-targeting toggle — language in pin titles/descriptions is the only lever.

## 6. Pinner Quality & Posting Cadence

- **Cadence**: 3-5 fresh Pins per day. Gaps of >1 week trigger re-evaluation.
- **Original content**: Pinterest prioritizes accounts that create new content over repins.
- **Responsiveness**: Active accounts get priority distribution.

## 7. Indexation Latency & Maturation Timeline

| Phase | Timeline | What happens |
|---|---|---|
| Initial indexation | 2-4 weeks | Pin enters Content Graph, starts appearing in search |
| Traction building | 1-3 months | Engagement signals accumulate |
| Peak visibility | 1-2 years | Maximum distribution — Pinterest is a long-game platform |

## Sources

Pixie paper (WWW 2018, arXiv 1711.07601), TransAct V2 (CIKM 2025, arXiv 2506.02267), US Patents 11256747/11227014B2/20230388261A1/9164985B1, PostEverywhere (Apr 2026), Tailwind (2025), MACCUS (Feb 2026), PinClicks, Eat Blog Talk Ep 797.
