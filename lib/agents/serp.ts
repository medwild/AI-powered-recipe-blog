// SERP Agent — fetches Google search data for a keyword via Serper.dev
// v2 — enriched response: captures all available modules (organic, PAA with
// snippet+source, answerBox, knowledgeGraph, videos, recipes, images).
// Used by the workflow and the SERP Data Structurer (Agent 0) to ground
// recipe content in what already ranks.

export type SerpResult = {
  organic: {
    position: number
    title: string
    snippet?: string
    link?: string
  }[]
  relatedQuestions: {
    question: string
    snippet?: string
    sourceUrl?: string
  }[]
  relatedSearches: string[]
  answerBox?: {
    content: string
    source?: string
    type: string
  }
  knowledgeGraph?: {
    title: string
    type: string
    description?: string
    attributes?: Record<string, string>
  }
  videos?: { title: string; link: string; source?: string }[]
  recipes?: { title: string; link: string; source?: string }[]
  images?: { title: string; link: string; source?: string }[]
}

export async function fetchSerp(keyword: string): Promise<SerpResult> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    throw new Error(
      "SERPER_API_KEY is not set. Add it in Project Settings to enable SERP analysis.",
    )
  }

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: keyword,
      gl: process.env.SERP_GL ?? "us",
      hl: process.env.SERP_HL ?? "en",
      num: 10,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Serper request failed (${res.status}): ${text}`)
  }

  const data = await res.json()

  return {
    organic: (data.organic ?? []).slice(0, 10).map((o: any, i: number) => ({
      position: i + 1,
      title: o.title,
      snippet: o.snippet,
      link: o.link,
    })),
    relatedQuestions: (data.peopleAlsoAsk ?? []).map((q: any) => ({
      question: q.question,
      snippet: q.snippet || undefined,
      sourceUrl: q.sourceUrl || q.link || undefined,
    })),
    relatedSearches: (data.relatedSearches ?? []).map((s: any) => s.query),
    answerBox: data.answerBox
      ? {
          content:
            data.answerBox.content ||
            data.answerBox.snippet ||
            data.answerBox.answer ||
            "",
          source: data.answerBox.source || data.answerBox.link,
          type: data.answerBox.type || "featured_snippet",
        }
      : undefined,
    knowledgeGraph: data.knowledgeGraph
      ? {
          title: data.knowledgeGraph.title,
          type: data.knowledgeGraph.type,
          description: data.knowledgeGraph.description,
          attributes: data.knowledgeGraph.attributes,
        }
      : undefined,
    videos: (data.videos ?? []).slice(0, 5).map((v: any) => ({
      title: v.title,
      link: v.link,
      source: v.source,
    })),
    recipes: (data.recipes ?? []).slice(0, 5).map((r: any) => ({
      title: r.title,
      link: r.link,
      source: r.source,
    })),
    images: (data.images ?? []).slice(0, 5).map((img: any) => ({
      title: img.title,
      link: img.link,
      source: img.source,
    })),
  }
}
