import type { Metadata } from "next"
import { categoryMetadata, CategoryListing } from "@/components/category-listing"

export const metadata: Metadata = categoryMetadata("guides")
export const revalidate = 300

export default function GuidesPage() {
  return <CategoryListing category="guides" />
}
