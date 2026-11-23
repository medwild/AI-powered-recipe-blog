import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Inline SVG blur placeholder for food photography hero images.
 * Warm brand-tone gradient — no external request, ~200 bytes.
 * Use with next/image placeholder="blur" blurDataURL={FOOD_BLUR_PLACEHOLDER}
 */
export const FOOD_BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNzUiIHZpZXdCb3g9IjAgMCAxMDAgNzUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjMjY4M2YiIG9wYWNpdHk9IjAuMyIvPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlOGQ1YzQiIG9wYWNpdHk9IjAuNyIvPjwvc3ZnPg=='
