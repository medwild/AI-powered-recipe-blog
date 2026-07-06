import type { Metadata } from "next"
import { categoryMetadata, CategoryListing } from "@/components/category-listing"

export const metadata: Metadata = categoryMetadata("equipement")
export const revalidate = 300

export default function EquipementPage() {
  return <CategoryListing category="equipement" />
}
