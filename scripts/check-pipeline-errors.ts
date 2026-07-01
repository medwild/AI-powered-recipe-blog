import { config } from "dotenv"
config({ path: ".env.local" })
import { db } from "../lib/db/index"
import { pipelineErrors } from "../lib/db/schema"

async function main() {
  const allRows = await db.select().from(pipelineErrors)
  console.log(`Total rows in pipeline_errors: ${allRows.length}`)
  if (allRows.length > 0) {
    for (const row of allRows) {
      console.log(`  - [${row.severity}] ${row.step_name}: ${(row.message ?? '').substring(0, 150)}`)
    }
  } else {
    console.log("✅ Table pipeline_errors is empty — no operational errors recorded")
  }
  process.exit(0)
}
main()
