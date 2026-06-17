import { Context } from "hono";
import { LK21Helper } from "../../lib/utils/lk21-ultrahtml-helper";

export const getLk21Recommendations = async (c: Context) => {
  try {
    const resp = await LK21Helper.getLatest()

    // If failed with 403, return specific error message
    if (!resp.success && resp.error?.includes('403')) {
      return c.json({
        success: false,
        error: "Access blocked by target site (403). Try again later or from different location.",
        data: [],
        _note: "Cloudflare Workers IP may be blocked by LK21. Consider using a proxy or VPN."
      }, 503)
    }

    return c.json({
      success: resp.success,
      count: resp.data?.length || 0,
      error: resp.error,
      data: resp.data?.slice(0, 20)
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const statusCode = errorMsg.includes('403') ? 503 : 500

    return c.json({
      success: false,
      error: errorMsg,
      data: []
    }, statusCode)
  }
}
export const getRaw = async (c: Context) => {
  try {
    const upstream = await fetch("https://tv7.lk21official.cc/", {
      headers: {
        // header yang normal & aman buat server-side fetch
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
        // referer boleh, tapi jangan aneh-aneh
        referer: "https://tv7.lk21official.cc/",
      },
      // optional: jangan cache dulu biar jelas debug
      cf: { cacheTtl: 0 },
    });

    const html = await upstream.text();

    // Deteksi “Cloudflare 1106” lewat konten (soalnya kadang statusnya bukan 1106)
    const looksLike1106 =
      html.includes("Error 1106") ||
      html.toLowerCase().includes("access denied") ||
      html.toLowerCase().includes("your ip address has been banned");

    if (!upstream.ok || looksLike1106) {
      return c.json(
        {
          success: false,
          upstreamStatus: upstream.status,
          blocked: looksLike1106,
          note:
            "Upstream kemungkinan ngeblok request dari Cloudflare Workers (shared egress IP).",
          preview: html.slice(0, 300),
        },
        503
      );
    }

    // kalau kamu mau raw html tetap:
    return c.text(html, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: msg }, 500);
  }
};

