#!/usr/bin/env bun
/**
 * VPS Server Entry Point
 * Run with: bun server.ts
 * Or: node server.ts (if compiled)
 */

import app from "./src/index";
import { initPrismaVPS, disconnectDB } from "./src/lib/dbAdapter";
import { validateEnv, getEnvironmentInfo } from "./src/lib/envAdapter";

console.log("=".repeat(50));
console.log("🚀 Drama API Server");
console.log("=".repeat(50));

// Validate environment
const envCheck = validateEnv();
if (!envCheck.valid) {
  console.error("❌ Missing required environment variables:");
  envCheck.missing.forEach((key) => console.error(`   - ${key}`));
  console.error("\n📋 Please copy .env.vps.example to .env and fill in the values");
  process.exit(1);
}

// Show environment info
const envInfo = getEnvironmentInfo();
console.log("\n📊 Environment:");
console.log(`   Type: ${envInfo.type}`);
console.log(`   Runtime: ${envInfo.runtime} ${envInfo.version}`);

// Initialize database
console.log("\n💾 Initializing database...");
try {
  initPrismaVPS();
  console.log("✅ Database connected");
} catch (error) {
  console.error("❌ Database connection failed:", error);
  process.exit(1);
}

// Server configuration
const PORT = parseInt(process.env.PORT || "8787", 10);
const HOST = process.env.HOST || "0.0.0.0";

// Start server with Bun
console.log(`\n🌐 Starting server on http://${HOST}:${PORT}`);

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: app.fetch,
  error(error) {
    console.error("❌ Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`✅ Server running at http://${HOST}:${PORT}`);
console.log(`📚 API Documentation: http://${HOST}:${PORT}/docs`);
console.log(`💚 Health Check: http://${HOST}:${PORT}/health`);
console.log("=".repeat(50));

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n🛑 Shutting down gracefully...");
  await disconnectDB();
  server.stop();
  console.log("👋 Goodbye!");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n\n🛑 Shutting down gracefully...");
  await disconnectDB();
  server.stop();
  console.log("👋 Goodbye!");
  process.exit(0);
});
