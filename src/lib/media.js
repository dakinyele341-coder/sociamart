import imageCompression from 'browser-image-compression'

/** Compress an image File client-side before upload. Falls back to the original on error. */
export async function compressImage(file, onProgress) {
  if (!file?.type?.startsWith('image/')) return file
  try {
    return await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      onProgress, // 0..100
    })
  } catch {
    return file
  }
}

/** Read a video File's duration (seconds) from its metadata. */
export function getVideoDuration(file) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(v.duration || 0)
      }
      v.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(0)
      }
      v.src = url
    } catch {
      resolve(0)
    }
  })
}
