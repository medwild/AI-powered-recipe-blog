import type { Metadata } from "next"
import { categoryMetadata, CategoryListing } from "@/components/category-listing"

export const metadata: Metadata = categoryMetadata("idees")
export const revalidate = 300

export default function IdeesPage() {
  return <CategoryListing category="idees" />
}
