import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import type { AuthUser } from "../types/hono";

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export const authSession = createMiddleware<{
  Variables: {
    user: AuthUser;
  };
}>(async (c, next) => {
  const sid = getCookie(c, "sid");
  if (!sid) return c.json({ message: "Unauthorized" }, 401);

  const tokenHash = hashToken(sid);

  const session = await prisma(c as any).session.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: { 
      user: { 
        select: { 
          id: true, 
          username: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          isActive: true,
          isFree: true,
          subscriptionType: true,
          subscriptionStart: true,
          subscriptionEnd: true,
          createdAt: true,
          updatedAt: true
        } 
      } 
    },
  });

  if (!session) return c.json({ message: "Unauthorized" }, 401);
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma(c as any).session.delete({ where: { refreshTokenHash: tokenHash } }).catch(() => { });
    return c.json({ message: "Session expired" }, 401);
  }

  c.set("user", session.user);
  await next();
});
