import { Hono } from 'hono'
import routes from './routes'
import type { Context } from 'hono'
import docs from './routes/docs'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import v2Routes from './routes/v2'
// import process from 'node:process'

// import { apikeyCheck } from './middleware/apikeyCheck'
// import { getProxyManager, proxyManagerMiddleware, type Proxy } from './lib/proxyManager'
// import { globalProxyMiddleware, fetchDirect, getEnvironmentInfo, isWorkers } from './lib/proxyFetch'
// import { createRateLimit, rateLimit } from './middleware/rateLimit'
// import { webChat } from './controllers/websocket.controller'
// import { authSession } from './middleware/authSessions'

// Extend Hono Context types
// declare module 'hono' {
//   interface ContextVariableMap {
//     proxyManager: ReturnType<typeof getProxyManager>
//     currentProxy: Proxy
//   }
// }

const app = new Hono()
app.use(logger())

app.use('/api/*', cors({
  origin: [
    'http://localhost:8787',
    'http://localhost:3000',
    // 'https://bun-drama-api.ranzdaffa32.workers.dev',
    // Frontend production domains - ADD YOUR FRONTEND URL HERE
    // ...((typeof process !== 'undefined' && process.env?.FRONTEND_URL) ? [process.env.FRONTEND_URL] : []),
    // '103.247.10.41'
		'https://cidwatch.my.id',
		'https://api.cidwatch.my.id'
  ],
  allowMethods: ['GET', 'POST', 'PUT', "DELETE"],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-token',
    'x-api-username',
    'x-api-password',
    'User-Agent'
  ],
  credentials: true,
  maxAge: 3600
}))

// Rate Limiting Middleware

// app.use('/api/*', rateLimit)  

// Initialize proxy manager middleware
// app.use(proxyManagerMiddleware({
//   refreshIntervalMs: 5 * 60 * 1000, // 5 minutes
// }))

// ============================================
// GLOBAL PROXY MIDDLEWARE UNTUK /api/*
// Semua fetch() di controller /api akan menggunakan proxy secara otomatis
// Tanpa perlu modifikasi file controller
// ============================================

// app.use('/api/*', globalProxyMiddleware({
//   skipPaths: [], // Tidak ada path yang di-skip di /api
//   skipWhenNoProxy: false, // Tetap jalankan meski tidak ada proxy (fallback ke direct)
// }))


app.use('/api/*', async (c, next) => {
  // const path = c.req.path
  // if (path === '/api/auth/get-token' || path === '/api/auth/register-token') {
  //   return next()
  // }
  return next()

  // return apikeyCheck(c, next)
})


// Mount API routes (semua fetch di dalam controller akan otomatis pakai proxy)
app.route('/api', routes)
app.route('/api/v2', v2Routes)


// // Get all proxies
// app.get('/proxies', async (c: Context) => {
//   const manager = c.get('proxyManager')
//   await manager.ensureProxies()

//   return c.json({
//     success: true,
//     count: manager.getProxyCount(),
//     proxies: manager.getAllProxies(),
//   })
// })

// // Get next proxy (rolling)
// app.get('/proxies/next', async (c: Context) => {
//   const manager = c.get('proxyManager')
//   await manager.ensureProxies()

//   const statusBefore = manager.getRollingStatus()
//   const proxy = manager.getNextProxy()

//   if (!proxy) {
//     return c.json({ success: false, message: 'No proxies available' }, 503)
//   }

//   return c.json({
//     success: true,
//     rolling: {
//       index: proxy.index,
//       total: proxy.total,
//       nextIndex: (proxy.index + 1) % proxy.total,
//     },
//     proxy,
//   })
// })

// // Get random proxy
// app.get('/proxies/random', async (c: Context) => {
//   const manager = c.get('proxyManager')
//   await manager.ensureProxies()

//   const proxy = manager.getRandomProxy()
//   if (!proxy) {
//     return c.json({ success: false, message: 'No proxies available' }, 503)
//   }

//   return c.json({
//     success: true,
//     proxy,
//   })
// })

// // Refresh proxy list manually
// app.post('/proxies/refresh', async (c: Context) => {
//   const manager = c.get('proxyManager')

//   try {
//     await manager.refreshProxies()
//     return c.json({
//       success: true,
//       message: 'Proxy list refreshed',
//       count: manager.getProxyCount(),
//     })
//   } catch (error) {
//     return c.json({
//       success: false,
//       message: error instanceof Error ? error.message : 'Failed to refresh proxies',
//     }, 500)
//   }
// })

// // Health check for proxy
// app.get('/proxies/health', async (c: Context) => {
//   const manager = c.get('proxyManager')

//   return c.json({
//     success: true,
//     proxyCount: manager.getProxyCount(),
//     needsRefresh: manager.needsRefresh(),
//   })
// })

// // Legacy endpoint for backward compatibility
// app.get('/hit', async (c: Context) => {
//   const manager = c.get('proxyManager')

//   try {
//     await manager.ensureProxies()
//     const proxies = manager.getAllProxies().map(p => p.url)
//     return c.json({
//       success: true,
//       count: proxies.length,
//       proxies,
//     })
//   } catch (error) {
//     return c.json({
//       success: false,
//       message: error instanceof Error ? error.message : 'Unknown error',
//     }, 500)
//   }
// })



// // ============================================
// // ROLLING PROXY ENDPOINTS
// // ============================================

// /**
//  * Demo Rolling Proxy - Melihat proxy yang digunakan dalam setiap request
//  * Setiap kali di-refresh akan menggunakan proxy berikutnya (round-robin)
//  */
// app.get('/rolling-demo', async (c: Context) => {
//   const manager = c.get('proxyManager')
//   await manager.ensureProxies()

//   // Get rolling status before getting next proxy
//   const statusBefore = manager.getRollingStatus()

//   // Get next proxy (this advances the index)
//   const currentProxy = manager.getNextProxy()

//   // Get rolling status after
//   const statusAfter = manager.getRollingStatus()

//   return c.json({
//     success: true,
//     message: 'Rolling proxy demo - refresh untuk melihat proxy berikutnya',
//     rolling: {
//       before: statusBefore,
//       after: statusAfter,
//     },
//     currentProxy: currentProxy ?? 'No proxy available',
//     timestamp: new Date().toISOString(),
//   })
// })

// /**
//  * Test Rolling Proxy dengan Multiple Requests
//  * Melihat bagaimana proxy berotasi dalam batch request
//  */
// app.get('/rolling-test/:count', async (c: Context) => {
//   const manager = c.get('proxyManager')
//   await manager.ensureProxies()

//   const count = parseInt(c.req.param('count') || '5', 10)
//   const startStatus = manager.getRollingStatus()
//   const results: Array<{ 
//     requestNumber: number; 
//     proxyIndex: number;
//     proxy: string | null;
//   }> = []

//   // Simulate multiple requests to see rolling behavior
//   for (let i = 0; i < count; i++) {
//     const proxy = manager.getNextProxy()
//     results.push({
//       requestNumber: i + 1,
//       proxyIndex: proxy?.index ?? -1,
//       proxy: proxy?.url ?? null,
//     })
//   }

//   const endStatus = manager.getRollingStatus()

//   return c.json({
//     success: true,
//     message: `Rolling ${count} proxies`,
//     rolling: {
//       startIndex: startStatus.currentIndex,
//       endIndex: endStatus.currentIndex,
//       totalAvailable: manager.getProxyCount(),
//     },
//     requests: results,
//   })
// })

// /**
//  * Fetch dengan Rolling Proxy Manual
//  * Demonstrasi penggunaan rolling proxy pada fetch request
//  */
// app.get('/rolling-fetch', async (c: Context) => {
//   const manager = c.get('proxyManager')
//   await manager.ensureProxies()

//   const statusBefore = manager.getRollingStatus()
//   const proxy = manager.getNextProxy()

//   if (!proxy) {
//     return c.json({
//       success: false,
//       message: 'No proxy available',
//     }, 503)
//   }

//   try {
//     // Fetch melalui proxy
//     const response = await fetch('https://httpbin.org/ip', {
//       headers: {
//         'X-Forwarded-For': proxy.host,
//       },
//       // @ts-ignore
//       cf: {
//         resolveOverride: proxy.url,
//       },
//     })

//     const data = await response.json()

//     return c.json({
//       success: true,
//       rolling: {
//         proxyIndex: proxy.index,
//         totalProxies: proxy.total,
//         nextIndex: statusBefore.nextIndex,
//       },
//       proxyUsed: proxy.url,
//       response: data,
//       timestamp: new Date().toISOString(),
//     })
//   } catch (error) {
//     return c.json({
//       success: false,
//       rolling: {
//         proxyIndex: proxy.index,
//         totalProxies: proxy.total,
//       },
//       proxyAttempted: proxy.url,
//       error: error instanceof Error ? error.message : 'Unknown error',
//     }, 500)
//   }
// })

// // ============================================
// // CONTOH: Fetch dengan dan tanpa proxy
// // ============================================

// // Contoh endpoint yang menggunakan proxy (jika global proxy enabled)
// app.get('/example-fetch-with-proxy', async (c: Context) => {
//   try {
//     // Fetch ini akan menggunakan proxy jika globalProxyMiddleware aktif
//     const response = await fetch('https://httpbin.org/ip')
//     const data = await response.json()

//     return c.json({
//       success: true,
//       data,
//       proxyUsed: c.get('currentProxy')?.url ?? 'direct',
//     })
//   } catch (error) {
//     return c.json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     }, 500)
//   }
// })

// // Contoh endpoint yang SELALUS direct (tanpa proxy)
// app.get('/example-fetch-direct', async (c: Context) => {
//   try {
//     // Menggunakan fetchDirect untuk bypass proxy
//     const response = await fetchDirect('https://httpbin.org/ip')
//     const data = await response.json()

//     return c.json({
//       success: true,
//       data,
//       proxyUsed: 'direct (forced)',
//     })
//   } catch (error) {
//     return c.json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     }, 500)
//   }
// })

// Check environment and proxy support
// app.get('/environment', (c: Context) => c.json({
//   ...getEnvironmentInfo(),
//   timestamp: new Date().toISOString(),
// }, 200))

// app.get('/debug-env', (c) => c.json({ keys: Object.keys(c.env as any) }))
app.get('/health', (c: Context) => c.json({
  message: 'OK!',
  version: '1.0.0',
  // isCloudflareWorkers: isWorkers(),
  // proxySupport: !isWorkers(),
  date: new Date
}, 200))

// app.get('/ws/chat', authSession, webChat)


app.route('/', docs)

export default app
