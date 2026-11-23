import type { Metadata } from "next"
import { categoryMetadata, CategoryListing } from "@/components/category-listing"

export const metadata: Metadata = categoryMetadata("idees")

export default function IdeesPage() {
  return <CategoryListing category="idees" />
}
