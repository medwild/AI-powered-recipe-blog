import { v2 as cloudinary } from "cloudinary"

let configured = false

function configure() {
  if (configured) return
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set to upload images.",
    )
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })
  configured = true
}

export async function uploadImage(
  buffer: Buffer,
  publicId: string,
): Promise<string> {
  configure()
  const UPLOAD_TIMEOUT_MS = 30_000

  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Cloudinary upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`))
    }, UPLOAD_TIMEOUT_MS)

    cloudinary.uploader
      .upload_stream(
        { folder: "recipes", public_id: publicId, overwrite: true },
        (error, result) => {
          clearTimeout(timer)
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload returned no result."))
            return
          }
          resolve(result.secure_url)
        },
      )
      .end(buffer)
  })
}
