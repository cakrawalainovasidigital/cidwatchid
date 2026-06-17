import { Scalar } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { openApiDocument } from "../docs/openapi"

const docs = new Hono()

docs.get("/openapi.json", (c) => c.json(openApiDocument))
docs.get("/openapi-public.json", (c) => {
  const filteredPaths = Object.fromEntries(
    Object.entries(openApiDocument.paths).filter(([_, methods]: [string, any]) => {
      const isHidden = Object.values(methods).some((m: any) => m['x-ui-hidden'] === true)
      return !isHidden
    })
  )

  return c.json({
    ...openApiDocument,
    paths: filteredPaths
  })
})

docs.get(
  "/",
  Scalar({
    url: "/openapi-public.json",
    theme: "default",
    layout: "modern",
    cdn: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.44.16',
    persistAuth: false,
    hideDownloadButton: false,
    metaData: {
      title: "CID Watch API Reference",
      description:
        "CID Watch adalah layanan agregasi konten (drama, anime, film, manga) yang berjalan di Hono + Bun pada Cloudflare Workers. " +
        "Sebagian besar endpoint memerlukan tiga header auth: x-api-token, x-api-username, x-api-password. (/api/auth/get-token) " +
        "Gunakan docs ini untuk mencoba rekomendasi, pencarian, detail, streaming, serta otentikasi dan manajemen pengguna. " +
        "Fitur baru: Subscription management (/api/user/subscription/*) dan User Feedback system (/api/feedback/*).",
    },
    authentication: {
      preferredSecurityScheme: [["ApiToken", "ApiUsername", "ApiPassword"]],
      securitySchemes: {
        ApiToken: { in: "header", name: "x-api-token" },
        ApiUsername: { in: "header", name: "x-api-username" },
        ApiPassword: { in: "header", name: "x-api-password" },
      },
    },
    showDeveloperTools: "localhost",
    darkMode: false,
    isEditable: true,
    defaultHttpClient: {
      clientKey: "fetch",
      targetKey: "js",
    },
    hideClientButton: false,
    isLoading: false,
  }),
)

export default docs
