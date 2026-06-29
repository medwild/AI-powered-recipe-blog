import Link from "next/link"
import { ChefHat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <ChefHat className="h-16 w-16 text-muted-foreground mb-6" aria-hidden="true" />
        <h1 className="font-serif text-4xl md:text-5xl mb-4">Page not found</h1>
        <p className="text-lg text-muted-foreground max-w-md mb-8">
          Oops! This page seems to have disappeared from our kitchen. Maybe the recipe was moved?
        </p>
        <div className="flex gap-3">
          <Button render={<Link href="/" />} nativeButton={false}>
            Back to home
          </Button>
          <Button render={<Link href="/recettes" />} nativeButton={false} variant="outline">
            View recipes
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}