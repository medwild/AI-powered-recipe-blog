/**
 * Read-only Free Tier quota & consumption monitor for Neon PostgreSQL & Cloudinary.
 *
 * Strictly read-only:
 * - Reads Neon SQL footprint via DATABASE_URL
 * - Reads Neon project metrics via `GET /projects/{project_id}` if NEON_API_KEY + NEON_PROJECT_ID are set
 * - Reads Cloudinary 30-day rolling usage via `GET /v1_1/<cloud>/usage` if CLOUDINARY_* keys are set
 * - Computes alert bands (OK <60%, WARN_60, ACTION_80, CRITICAL_95) without inventing missing values
 * - Never exposes secrets in stdout
 */

import fs from "node:fs"
import path from "node:path"
import { Pool } from "pg"

type AlertBand = "OK" | "WARN_60" | "ACTION_80" | "CRITICAL_95" | "UNAVAILABLE_MISSING_KEY"

function classifyPercent(pct: number | null): AlertBand {
  if (pct === null || Number.isNaN(pct)) return "UNAVAILABLE_MISSING_KEY"
  if (pct >= 95) return "CRITICAL_95"
  if (pct >= 80) return "ACTION_80"
  if (pct >= 60) return "WARN_60"
  return "OK"
}

function loadEnvLocalIfMissing(): void {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = val
    }
  }
}

async function checkNeonSqlStorage(): Promise<{
  bytes: number | null
  percentOf1GB: number | null
  band: AlertBand
}> {
  if (!process.env.DATABASE_URL) {
    return { bytes: null, percentOf1GB: null, band: "UNAVAILABLE_MISSING_KEY" }
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 2000,
    connectionTimeoutMillis: 15000,
  })
  try {
    const res = await pool.query<{ bytes: string }>(
      "SELECT pg_database_size(current_database())::bigint AS bytes",
    )
    const bytes = Number(res.rows[0]?.bytes ?? 0)
    const oneGb = 1024 * 1024 * 1024
    const pct = Number(((bytes / oneGb) * 100).toFixed(2))
    return { bytes, percentOf1GB: pct, band: classifyPercent(pct) }
  } finally {
    await pool.end()
  }
}

async function checkNeonManagementApi(): Promise<{
  status: string
  computeHoursUsed: number | null
  computePercentOf100: number | null
  egressBytesUsed: number | null
  egressPercentOf5GB: number | null
  band: AlertBand
}> {
  const apiKey = process.env.NEON_API_KEY
  const projectId = process.env.NEON_PROJECT_ID
  if (!apiKey || !projectId) {
    return {
      status: "UNAVAILABLE_MISSING_KEY (requires NEON_API_KEY and NEON_PROJECT_ID)",
      computeHoursUsed: null,
      computePercentOf100: null,
      egressBytesUsed: null,
      egressPercentOf5GB: null,
      band: "UNAVAILABLE_MISSING_KEY",
    }
  }

  const res = await fetch(`https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectId)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(`Neon API returned HTTP ${res.status}`)
  }
  const json = (await res.json()) as {
    project?: {
      compute_time_seconds?: number
      data_transfer_bytes?: number
    }
  }
  const computeSec = json.project?.compute_time_seconds ?? 0
  const computeHours = Number((computeSec / 3600).toFixed(2))
  const computePct = Number(((computeHours / 100) * 100).toFixed(2))
  const egressBytes = json.project?.data_transfer_bytes ?? 0
  const fiveGb = 5 * 1024 * 1024 * 1024
  const egressPct = Number(((egressBytes / fiveGb) * 100).toFixed(2))
  const maxPct = Math.max(computePct, egressPct)

  return {
    status: "OK",
    computeHoursUsed: computeHours,
    computePercentOf100: computePct,
    egressBytesUsed: egressBytes,
    egressPercentOf5GB: egressPct,
    band: classifyPercent(maxPct),
  }
}

async function checkCloudinaryUsage(): Promise<{
  status: string
  creditsUsed: number | null
  creditsLimit: number | null
  creditsPercent: number | null
  band: AlertBand
  breakdown: Record<string, unknown> | null
}> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dpgm5gata"
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!apiKey || !apiSecret) {
    return {
      status: "UNAVAILABLE_MISSING_KEY (requires CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)",
      creditsUsed: null,
      creditsLimit: null,
      creditsPercent: null,
      band: "UNAVAILABLE_MISSING_KEY",
      breakdown: null,
    }
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/usage`, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(`Cloudinary Usage API returned HTTP ${res.status}`)
  }
  const usage = (await res.json()) as {
    plan?: string
    credits?: { usage?: number; limit?: number; used_percent?: number }
    storage?: { usage?: number; credits_usage?: number }
    transformations?: { usage?: number; credits_usage?: number }
    bandwidth?: { usage?: number; credits_usage?: number }
  }
  const creditsUsed = usage.credits?.usage ?? null
  const creditsLimit = usage.credits?.limit ?? 25
  const creditsPct =
    usage.credits?.used_percent ??
    (creditsUsed !== null && creditsLimit > 0 ? Number(((creditsUsed / creditsLimit) * 100).toFixed(2)) : null)

  return {
    status: "OK",
    creditsUsed,
    creditsLimit,
    creditsPercent: creditsPct,
    band: classifyPercent(creditsPct),
    breakdown: {
      plan: usage.plan ?? null,
      storage: usage.storage ?? null,
      transformations: usage.transformations ?? null,
      bandwidth: usage.bandwidth ?? null,
    },
  }
}

async function main() {
  loadEnvLocalIfMissing()
  const [neonSql, neonApi, cloudinary] = await Promise.all([
    checkNeonSqlStorage(),
    checkNeonManagementApi(),
    checkCloudinaryUsage(),
  ])

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        thresholds: { warn: "60%", action: "80%", critical: "95%" },
        neon: {
          sqlStorage: neonSql,
          managementApi: neonApi,
        },
        cloudinary,
      },
      null,
      2,
    ),
  )
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[check-free-tier-usage] Failed:", err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
