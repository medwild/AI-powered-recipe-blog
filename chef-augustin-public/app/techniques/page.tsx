import type { Metadata } from "next"
import { categoryMetadata, CategoryListing } from "@/components/category-listing"

export const metadata: Metadata = categoryMetadata("techniques")

export default function TechniquesPage() {
  return <CategoryListing category="techniques" />
}
