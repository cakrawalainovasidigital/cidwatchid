import { jsx } from "hono/jsx"

export const Layout = (props: { title: string; children: any }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{props.title}</title>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.tailwind = window.tailwind || {};
            window.tailwind.config = { darkMode: "class" };
          `,
        }}
      />
      {/* Tailwind CDN (simple) */}
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body data-theme="light" class="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div >{props.children}</div>
    </body>
  </html>
)
