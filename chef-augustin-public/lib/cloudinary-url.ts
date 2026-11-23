// lib/cloudinary-url.ts
// Transform a Cloudinary URL to serve a resized version directly from the
// CDN edge (f_auto,q_auto/w_{width}/...). Avoids next/image downloading the
// full-size original to re-optimize locally (~80% bandwidth savings).

/**
 * Insert a /w_{width} transformation into a Cloudinary URL path.
 * Cloudinary order: /upload/{transformations}/{version}/{path}
 * Falls back to the original URL if it isn't a recognizable Cloudinary URL.
 */
export function cloudinaryUrl(url: string | null | undefined, width: number): string {
  if (!url) return "/placeholder.svg"
  const parts = url.split("/")
  const uploadIdx = parts.indexOf("upload")
  if (uploadIdx === -1) return url
  // The segment after "upload" is either transformations (f_auto,q_auto, ...)
  // or the version (v123). w_ goes in the transformations group, before version.
  const transformIdx = uploadIdx + 1
  const transforms = parts[transformIdx] ?? ""
  // Already has a width transformation (in this or the next segment) → nothing to do
  if (transforms.includes("w_") || parts[transformIdx + 1]?.startsWith("w_")) return url
  if (transforms.startsWith("v") || transforms === "") {
    // no transformations yet → add f_auto,q_auto + w_
    parts.splice(transformIdx, 0, `f_auto,q_auto/w_${width}`)
  } else {
    // existing transformations → append w_ (f_auto,q_auto/w_800)
    parts[transformIdx] = `${transforms}/w_${width}`
  }
  return parts.join("/")
}
