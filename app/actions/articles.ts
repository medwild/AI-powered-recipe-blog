"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

async function checkAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get("dashboard_auth")?.value
  if (!token || token !== process.env.DASHBOARD_SECRET_TOKEN) {
    throw new Error("Unauthorized")
  }
}

export async function publishArticle(slug: string) {
  await checkAuth()
  await db
    .update(recipes)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(recipes.slug, slug), eq(recipes.content_type, "article")))
}

export async function deleteArticle(slug: string) {
  await checkAuth()
  await db
    .delete(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.content_type, "article")))
  redirect("/dashboard")
}
