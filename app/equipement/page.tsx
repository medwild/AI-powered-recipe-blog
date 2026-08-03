import type { Metadata } from "next"
import { categoryMetadata, CategoryListing } from "@/components/category-listing"

export const metadata: Metadata = categoryMetadata("equipement")

export default function EquipementPage() {
  return <CategoryListing category="equipement" />
}
