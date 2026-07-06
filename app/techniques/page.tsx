import type { Metadata } from "next"
import { categoryMetadata, CategoryListing } from "@/components/category-listing"

export const metadata: Metadata = categoryMetadata("techniques")
export const revalidate = 300

export default function TechniquesPage() {
  return <CategoryListing category="techniques" />
}
