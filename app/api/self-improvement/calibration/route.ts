import { NextResponse } from "next/server"
import { getCalibrationStats } from "@/lib/queries"

export const maxDuration = 15

/**
 * GET /api/self-improvement/calibration
 *
 * Returns AI Score calibration statistics for the dashboard.
 * Tracks: data points collected, AI Score trends, per-criterion averages,
 * per-tag averages, and calibration readiness status.
 *
 * Calibration is "ready" when 50+ articles have been scored — at that
 * point, a v2.0 weighted formula can be derived via regression.
 */
export async function GET() {
  try {
    const stats = await getCalibrationStats()

    return NextResponse.json({
      calibration: {
        readiness: stats.calibrationReady
          ? "ready"
          : `${stats.totalDataPoints}/50 data points collected`,
        progressPercent: Math.min(
          100,
          Math.round((stats.totalDataPoints / 50) * 100),
        ),
      },
      aiScore: {
        average: stats.averageAiScore,
        min: stats.minAiScore,
        max: stats.maxAiScore,
        recentAverage: stats.recentAverageAiScore,
        trend:
          stats.recentAverageAiScore > 0 && stats.averageAiScore > 0
            ? stats.recentAverageAiScore < stats.averageAiScore
              ? "improving"
              : stats.recentAverageAiScore > stats.averageAiScore
                ? "degrading"
                : "stable"
            : "insufficient_data",
        dataPoints: stats.totalDataPoints,
      },
      criteria: stats.criteriaAverages.map((c) => ({
        criterion: c.criterion,
        averageScore: c.averageScore,
        count: c.count,
        // Scores are /20; flag weak criteria (< 12 avg)
        status:
          c.averageScore < 8
            ? "critical"
            : c.averageScore < 12
              ? "weak"
              : c.averageScore < 16
                ? "acceptable"
                : "strong",
      })),
      byTag: stats.tagAverages.map((t) => ({
        tag: t.tag,
        averageAiScore: t.averageAiScore,
        count: t.count,
        // Lower AI score = better (less detectable)
        riskLevel:
          t.averageAiScore < 25
            ? "low"
            : t.averageAiScore < 50
              ? "medium"
              : "high",
      })),
      sourceBreakdown: stats.sourceBreakdown,
    })
  } catch (err) {
    console.error("[calibration] Failed to fetch stats:", err)
    return NextResponse.json(
      { error: "Failed to fetch calibration stats" },
      { status: 500 },
    )
  }
}
