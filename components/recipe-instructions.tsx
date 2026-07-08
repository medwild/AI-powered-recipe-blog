import type { Instruction } from "@/lib/db/schema"

export function RecipeInstructions({
  instructions,
}: {
  instructions: Instruction[]
}) {
  if (!instructions || instructions.length === 0) return null

  return (
    <section
      aria-labelledby="instructions-heading"
      className="mx-auto max-w-3xl px-4 pt-12"
    >
      <h2
        id="instructions-heading"
        className="font-serif text-2xl text-foreground"
      >
        Instructions
      </h2>
      <ol className="mt-8 flex flex-col gap-8" role="list">
        {instructions.map((step) => (
          <li key={step.step} className="relative flex gap-5">
            {/* Oversized background number — decorative watermark */}
            <span
              className="absolute -top-8 -left-2 select-none font-serif text-[7rem] leading-none text-primary/[0.04] pointer-events-none hidden sm:block"
              aria-hidden="true"
            >
              {step.step}
            </span>
            {/* Foreground step number */}
            <span
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {step.step}
            </span>
            <p className="relative z-10 pt-1.5 text-base leading-relaxed text-foreground">
              {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
