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
          <li key={step.step} className="flex gap-5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {step.step}
            </span>
            <p className="pt-1.5 text-base leading-relaxed text-foreground">
              {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
