import { Hono } from 'hono';
import type { Context } from 'hono';


import authRoutes from './auth.route'
import userRoutes from './user.routes'
import userFeedbackRoutes from './userFeedback.routes'
import animeRoute from './anime/index'
import mangaRoute from './manga/index'
import moviesRoute from './movies/index'
import { getHomepageData } from '../controllers/home.controller';
import { singleFlightCacheLong } from '../middleware/singleFlightCache';
import dramaRoute from './drama/index'
import catalogRoute from './catalog/index'
import v2Routes from './v2/index'
import { contentCache, getMemoryCacheStats, clearMemoryCache, cleanExpiredCache } from '../middleware/cacheHelper';
import { isVPS, isWorkers, getEnvironmentInfo } from '../lib/envAdapter';

// Universal cache for homepage (works on both Workers and VPS)
const homeCache = contentCache.homepage;

const routes = new Hono()

routes.route('/drama', dramaRoute)
routes.route('/auth', authRoutes)
routes.route('/user', userRoutes)
routes.route('/feedback', userFeedbackRoutes)
routes.route('/anime', animeRoute)
routes.route('/manga', mangaRoute)
routes.route('/movies', moviesRoute)
routes.route('/catalog', catalogRoute)
routes.route('/v2', v2Routes)
routes.get('/home', homeCache, getHomepageData)

// Cache management endpoints (admin only - add auth as needed)
routes.get('/cache/stats', (c: Context) => {
  const envInfo = getEnvironmentInfo();

  if (isWorkers()) {
    return c.json({
      environment: 'workers',
      cacheType: 'Cache API (Cloudflare)',
      message: 'Cache stats not available in Workers (use CF Dashboard)',
      envInfo,
    });
  }

  // VPS: Return memory cache stats
  const stats = getMemoryCacheStats();
  return c.json({
    environment: 'vps',
    cacheType: 'Memory Cache',
    stats: {
      entries: stats.size,
      totalSizeBytes: stats.totalSize,
      totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
    },
    sampleKeys: stats.keys.slice(0, 10),
    envInfo,
  });
});

routes.post('/cache/clear', (c: Context) => {
  if (isWorkers()) {
    return c.json({
      success: false,
      message: 'Cannot clear cache programmatically in Workers. Use CF Dashboard or set new cache keys.',
    }, 400);
  }

  clearMemoryCache();
  return c.json({
    success: true,
    message: 'Memory cache cleared successfully',
  });
});

routes.post('/cache/clean', (c: Context) => {
  if (isWorkers()) {
    return c.json({
      success: false,
      message: 'Not applicable in Workers environment',
    }, 400);
  }

  const cleaned = cleanExpiredCache();
  return c.json({
    success: true,
    message: `Cleaned ${cleaned} expired cache entries`,
    cleaned,
  });
});

export default routes
