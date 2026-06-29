// Use the same DB connection as the running server
import { Pool } from "@neondatabase/serverless"

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  
  for (const id of [72, 73]) {
    const { rows } = await client.query(
      'SELECT id, title, content_markdown, status FROM recipes WHERE id = $1', [id]
    )
    if (!rows.length) { console.log(`Recipe #${id}: NOT FOUND`); continue }
    const r = rows[0]
    console.log(`\n${'='.repeat(70)}`)
    console.log(`RECIPE #${r.id} — ${r.title}`)
    console.log(`Status: ${r.status}`)
    const words = (r.content_markdown || '').split(/\s+/).filter(Boolean).length
    console.log(`Content words: ${words}`)
    
    const tokens = ['[WARM]', '[SHARP]', '[WINK]', '[GRIT]', '[GLOW]']
    const leaked = tokens.filter(t => (r.content_markdown || '').includes(t))
    console.log(`Token leaks: ${leaked.length ? leaked.join(', ') : 'NONE ✅'}`)
    
    const c = r.content_markdown || ''
    if (c.includes('150°F')) console.log('Temp: 150°F found ⚠️')
    if (c.includes('160°F') || c.includes('170°F') || c.includes('175°F') || c.includes('176°F')) console.log('Temp: safe range ✅')
    
    if (c.toLowerCase().includes('butter the torch')) console.log('Typo: "butter the torch" ❌')
    
    console.log(`\n--- First 500 chars ---`)
    console.log(c.substring(0, 500))
  }
  client.release()
}

main().catch(console.error)
