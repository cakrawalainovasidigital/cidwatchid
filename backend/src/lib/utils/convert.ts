

export const Convert = {
  image: {
    toWebp: async (url: string, opts?: { width?: number; quality?: number }) => {
      const image = await fetch(decodeURIComponent(url), {
        cf: {
          image: {
            with: opts?.width ?? 150,
            fit: 'scale-down',
            quality: opts?.quality ?? 85,
            format: 'webp'
          }
        }
      })
      if (image.ok) {
        return await image.arrayBuffer()
      }
      return {
        message: 'failed!'
      }
    },
    toDataUrl: async (url: string, opts?: { width?: number; quality?: number; maxBytes?: number }) => {
      // If running on Cloudflare, we can downscale/compress via cf.image too
      const res = await fetch(decodeURIComponent(url), opts?.width || opts?.quality ? {
        cf: {
          image: {
            with: opts?.width,
            fit: 'scale-down',
            quality: opts?.quality,
            format: 'webp'
          }
        }
      } : undefined)
      if (!res.ok) return { message: 'failed!' }

      const arrayBuffer = await res.arrayBuffer()
      if (opts?.maxBytes && arrayBuffer.byteLength > opts.maxBytes) {
        return { message: 'too_large', size: arrayBuffer.byteLength }
      }

      const contentType = res.headers.get("content-type") ?? "application/octet-stream"

      // Convert ArrayBuffer -> base64 in a runtime‑portable way
      const base64 = (() => {
        if (typeof Buffer !== "undefined") {
          return Buffer.from(arrayBuffer).toString("base64")
        }
        let binary = ""
        const bytes = new Uint8Array(arrayBuffer)
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        return btoa(binary)
      })()

      return `data:${contentType};base64,${base64}`
    }
  }
}
