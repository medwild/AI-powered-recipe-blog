"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { isSameOriginHeaders, verifyDashboardToken } from "@/lib/auth"

async function checkAuth() {
  const headersList = await headers()
  if (!isSameOriginHeaders(headersList)) {
    throw new Error("Forbidden")
  }
  const cookieStore = await cookies()
  const token = cookieStore.get("dashboard_auth")?.value
  if (!(await verifyDashboardToken(token))) {
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
