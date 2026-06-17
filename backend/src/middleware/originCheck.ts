import { createMiddleware } from "hono/factory";

export const originCheck = createMiddleware(async (c, next) => {
  // "Sec-Fetch-Site" is a Forbidden Header, meaning it cannot be modified programmatically by JavaScript 
  // in the browser. It is set by the browser itself.
  // Values:
  // - "same-origin": Request comes from the same domain (e.g. app.com -> app.com/api)
  // - "same-site": Request comes from a subdomain (e.g. web.app.com -> api.app.com)
  // - "none": User typed URL in address bar or clicked a bookmark (Direct navigation)
  // - "cross-site": Request from different domain (e.g. evil.com -> app.com)

  const secFetchSite = c.req.header("Sec-Fetch-Site");

  // Create strict rules:
  // 1. If Sec-Fetch-Site is missing, it's likely a script (curl, python, postman) -> BLOCK
  // 2. If Sec-Fetch-Site is "cross-site" -> BLOCK (unless you want public API)
  // 3. If Sec-Fetch-Site is "none" -> BLOCK (block direct browser navigation to API?) -> optional

  if (!secFetchSite || secFetchSite === "cross-site" || secFetchSite === "none") {
    return c.json({ message: "Sorry, you are not allowed to access this resource." }, 403);
  }

  // Only allow "same-origin" or "same-site"
  if (secFetchSite !== "same-origin" && secFetchSite !== "same-site") {
    return c.json({ message: "Sorry, you are not allowed to access this resource." }, 403);
  }

  await next();
});
