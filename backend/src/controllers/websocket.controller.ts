import { Context } from "hono"
import { upgradeWebSocket } from "hono/cloudflare-workers"
import { WSContext } from "hono/ws"

type UserShape = { id: string; email?: string }

const clients = new Map<WSContext, UserShape>()

export const webChat = upgradeWebSocket((c: Context) => {
  const user = (c.get("user") || {}) as UserShape

  // honor upgradeWebSocket contract: return onMessage/onClose only
  return {
    onMessage(event, ws) {
      if (!clients.has(ws)) {
        clients.set(ws, user)
        ws.send(JSON.stringify({ type: "welcome", userId: user.id }))
      }

      const sender = clients.get(ws)
      const text = typeof event.data === "string" ? event.data : ""

      for (const [client, u] of clients.entries()) {
        client.send(
          JSON.stringify({
            type: "chat",
            from: sender?.id ?? "anonymous",
            to: u?.id ?? "all",
            message: text,
            ts: Date.now(),
          }),
        )
      }
    },
    onClose(_event, ws) {
      clients.delete(ws)
    },
  }
})
