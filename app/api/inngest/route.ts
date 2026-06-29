import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { generateRecipeWorkflow } from "@/lib/inngest/functions/generate-recipe"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateRecipeWorkflow],
})
