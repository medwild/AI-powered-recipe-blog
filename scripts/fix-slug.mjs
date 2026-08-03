// Fix slug via @neondatabase/serverless (HTTP, works everywhere)
import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

const before = await sql`SELECT id, slug FROM recipes WHERE slug LIKE ${'%4-ingredient%'}`
console.log("Before:", before)

await sql`UPDATE recipes SET slug = ${'easy-4-ingredient-chicken-breast-recipes'} WHERE slug = ${'easy-4-ingredient-chicken-breast-recipes-2'}`

const after = await sql`SELECT id, slug FROM recipes WHERE slug LIKE ${'%4-ingredient%'}`
console.log("After:", after)

console.log("✅ Slug fixed")
process.exit(0)
