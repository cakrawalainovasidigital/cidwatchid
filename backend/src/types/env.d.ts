/**
 * Environment type extensions
 * This file extends the Cloudflare Env type with additional environment variables
 */

declare module "hono" {
  interface Env {
    // Database
    DATABASE_URL?: string
    
    // Hash configuration  
    HASH_SALT?: string
    HASH_SCRET_KEY?: string
    HASH_SECRET_KEY?: string
    
    // External API base URLs
    BASE_URL_V1?: string
    BASE_URL_V2?: string
    BASE_URL_V3?: string
    
    // DramaBox token
    DRAMABOX_TOKEN?: string
    
    // Google OAuth
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    GOOGLE_REDIRECT_URI?: string
    FRONTEND_URL?: string
    
    // Samehadaku cookies
    SAMEHADAKU_COOKIES?: string
    
    // D1 Database (Cloudflare Workers)
    drama?: D1Database
  }
}

// Extend the global Env interface for Cloudflare Workers
declare global {
  namespace Cloudflare {
    interface Env {
      // Google OAuth
      GOOGLE_CLIENT_ID?: string
      GOOGLE_CLIENT_SECRET?: string
      GOOGLE_REDIRECT_URI?: string
      
      // Database (for VPS mode compatibility)
      DATABASE_URL?: string
      
      // Fix typo in original schema - add correct spelling
      HASH_SECRET_KEY?: string
    }
  }
}

export {}
