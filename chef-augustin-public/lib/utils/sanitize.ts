/**
 * Sanitize user-generated markdown content before rendering.
 * Removes dangerous HTML tags (<script>, <style>) and LLM artifacts.
 */
export function sanitizeMarkdown(md: string): string {
  return md
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?meta\s[^>]*\/?>/gi, "")
    .replace(/<\/?link\s[^>]*\/?>/gi, "")
    .replace(/<img\s[^>]*\/?>/gi, "")
    .replace(/<(?:br|hr|input|source|col|area|base|embed|wbr)\s*\/?>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
