import { describe, it, expect } from "vitest"
import { checkCitability } from "@/lib/geo-validator"

describe("checkCitability", () => {
  it("detects numbered facts as claims", () => {
    const content = "Bake at 375°F for 25 minutes. Use a 3:1 ratio of flour to butter. ".repeat(20)
    const report = checkCitability(content, 500)
    expect(report.claims.count).toBeGreaterThan(0)
  })

  it("detects causal claims", () => {
    const content = "Resting the dough relaxes gluten because the proteins need time to realign, which means less shrinkage during baking. ".repeat(20)
    const report = checkCitability(content, 500)
    expect(report.claims.count).toBeGreaterThan(0)
  })

  it("detects named authority attributions", () => {
    const content = "Chef Augustin Lefèvre recommends searing at 450°F because the high heat creates a deeper crust. ".repeat(20)
    const report = checkCitability(content, 500)
    expect(report.attributions.count).toBeGreaterThan(0)
  })

  it("detects first-person testing attributions", () => {
    const content = "I've tested this recipe 8 times and found that 375°F produces the most even browning. ".repeat(20)
    const report = checkCitability(content, 500)
    expect(report.attributions.count).toBeGreaterThan(0)
  })

  it("detects answer nuggets (H2 question + answer)", () => {
    const content = `## Can I make this ahead of time?

Yes, you can prepare this up to 24 hours in advance. Store the assembled dish at 40°F or below then bake at 375°F for 30 minutes from chilled.

## What temperature should I use?

375°F is the ideal temperature for this dish because it provides even browning without burning while maintaining a safe internal temperature of 165°F as required by USDA guidelines.

## How should I store leftovers?

Store in an airtight container in the refrigerator at 40°F for up to 3 days according to Chef Augustin Lefèvre who recommends reheating at 350°F for best results.`
    const report = checkCitability(content, 500)
    expect(report.nuggets.count).toBeGreaterThan(0)
  })

  it("validates attribution-claim co-occurrence", () => {
    // Attribution without a claim in the same paragraph should NOT count
    const content = `Chef Augustin recommends this dish. No specific claim here.

For the sauce, use a 3:1 ratio of cream to butter because the fat content creates a stable emulsion at 165°F.`.repeat(10)
    const report = checkCitability(content, 500)
    // The first paragraph has attribution but no claim → shouldn't count
    // The second paragraph has a claim but no attribution → shouldn't count either for attribution
    expect(report.attributions.count).toBeLessThanOrEqual(1)
  })

  it("scores high for well-cited content", () => {
    const content = `
Chef Augustin Lefèvre recommends searing at 450°F because the Maillard reaction begins at 300°F.

I've tested this technique 12 times — the sweet spot is exactly 3 minutes per side at 425°F.

## Can I use a different protein?

You can substitute chicken thighs for breasts. Thighs contain 11% fat compared to breasts at 3.5%, which means they stay juicier at higher temperatures. Cook to 175°F for optimal texture.

According to the USDA Food Safety and Inspection Service, poultry must reach 165°F internal temperature.

The sauce thickens at exactly 180°F because egg proteins coagulate between 149-158°F, which creates the custard-like texture.`.repeat(5)
    const report = checkCitability(content, 800)
    expect(report.score).toBeGreaterThanOrEqual(60)
    expect(report.passed).toBe(true)
  })
})
