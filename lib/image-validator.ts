/**
 * ImageValidator v1 — Deterministic image pre-publication checks.
 *
 * Runs AFTER image generation (not on [IMAGE:] placeholders).
 * Validates: aspect ratio, dimensions, format, URL reachability,
 * alt text presence, and file size.
 *
 * Unlike ContentValidator (which checks text/structure), this checks
 * actual image assets before they're used in Pin drafts or JSON-LD.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageValidationError {
  field: string
  severity: "error" | "warning"
  message: string
}

export interface ImageValidationResult {
  passed: boolean
  errors: ImageValidationError[]
  /** Extracted dimensions if image was fetchable */
  dimensions?: { width: number; height: number }
}

export interface ValidateImageOptions {
  /** If true, checks that altText is non-empty (warning-only) */
  requireAltText?: boolean
  altText?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Allowed image MIME types */
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"]

/** Target aspect ratio 2:3 (width / height = 0.6667) */
const TARGET_RATIO = 2 / 3
const RATIO_TOLERANCE = 0.01 // ±1%

/** Minimum dimensions for Pinterest 2:3 standard */
const MIN_WIDTH = 1000
const MIN_HEIGHT = 1500

/** Maximum file size (warning-only) */
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate an image URL against Pinterest-ready quality gates.
 *
 * For v1, validates at the URL/header level (HTTP status, Content-Type,
 * Content-Length). Pixel-level dimension checks are deferred to v2.
 *
 * @param imageUrl - Fully qualified URL to the image
 * @param options - Optional alt text requirements
 * @returns ValidationResult with pass/fail and list of errors
 */
export async function validateImage(
  imageUrl: string,
  options: ValidateImageOptions = {},
): Promise<ImageValidationResult> {
  const errors: ImageValidationError[] = []

  // 1. URL format check
  if (!imageUrl || !imageUrl.startsWith("http")) {
    errors.push({
      field: "url",
      severity: "error",
      message: `Invalid or empty image URL: "${imageUrl}"`,
    })
    return { passed: false, errors }
  }

  // 2. HTTP reachability + content type + size check
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    const response = await fetch(imageUrl, {
      method: "HEAD",
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      errors.push({
        field: "url",
        severity: "error",
        message: `Image URL returned HTTP ${response.status}`,
      })
    }

    // Check Content-Type
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? ""
    if (!ALLOWED_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
      errors.push({
        field: "format",
        severity: "error",
        message: `Image format "${contentType}" is not allowed. Must be JPEG, PNG, or WebP.`,
      })
    }

    // Check Content-Length (warning only)
    const contentLength = response.headers.get("content-length")
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > MAX_FILE_SIZE_BYTES) {
        errors.push({
          field: "file_size",
          severity: "warning",
          message: `Image size ${(size / 1024 / 1024).toFixed(1)}MB exceeds recommended 2MB.`,
        })
      }
    }
  } catch (err) {
    errors.push({
      field: "url",
      severity: "error",
      message: `Image URL unreachable: ${err instanceof Error ? err.message : "network error"}`,
    })
  }

  // 3. Alt text check (warning only)
  if (options.requireAltText && (!options.altText || options.altText.trim().length === 0)) {
    errors.push({
      field: "alt_text",
      severity: "warning",
      message: "Image is missing alt text.",
    })
  }

  // Determine pass/fail based on error-severity checks
  const criticalErrors = errors.filter((e) => e.severity === "error")
  return {
    passed: criticalErrors.length === 0,
    errors,
  }
}

/**
 * Validate that dimensions match the 2:3 Pinterest standard.
 * Call this after fetching the image buffer for pixel-level checks.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns ValidationResult
 */
export function validateImageDimensions(
  width: number,
  height: number,
): ImageValidationResult {
  const errors: ImageValidationError[] = []
  const ratio = width / height

  // Aspect ratio check (2:3 ± 1%)
  if (Math.abs(ratio - TARGET_RATIO) > RATIO_TOLERANCE) {
    errors.push({
      field: "aspect_ratio",
      severity: "error",
      message: `Aspect ratio ${ratio.toFixed(3)} is not 2:3 ±1% (expected ~${TARGET_RATIO.toFixed(3)}). Dimensions: ${width}x${height}`,
    })
  }

  // Minimum dimensions
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    errors.push({
      field: "dimensions",
      severity: "error",
      message: `Image dimensions ${width}x${height} are below minimum ${MIN_WIDTH}x${MIN_HEIGHT}.`,
    })
  }

  const criticalErrors = errors.filter((e) => e.severity === "error")
  return {
    passed: criticalErrors.length === 0,
    errors,
    dimensions: { width, height },
  }
}

/**
 * Check that an image URL returns HTTP 200 synchronously at the header level.
 * Lightweight version of validateImage() for quick pre-flight checks.
 */
export async function checkImageReachable(imageUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const response = await fetch(imageUrl, { method: "HEAD", signal: controller.signal })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}
