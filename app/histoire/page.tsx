import type { Metadata } from "next"
import { categoryMetadata, CategoryListing } from "@/components/category-listing"

export const metadata: Metadata = categoryMetadata("histoire")
export const revalidate = 300

export default function HistoirePage() {
  return <CategoryListing category="histoire" />
}
