import type { Metadata } from "next"
import { categoryMetadata, CategoryListing } from "@/components/category-listing"

export const metadata: Metadata = categoryMetadata("histoire")

export default function HistoirePage() {
  return <CategoryListing category="histoire" />
}
