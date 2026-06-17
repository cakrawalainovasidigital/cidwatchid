/**
 * Universal Database Adapter
 * Uses Prisma with bun:sqlite for native SQLite
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBunSqlite } from "prisma-adapter-bun-sqlite";
import type { Context } from "hono";
import { getEnv } from "./envAdapter";

// Singleton Prisma instance
let prismaInstance: PrismaClient | null = null;

/**
 * Get database URL based on environment
 */
export function getDatabaseUrl(c?: Context): string | undefined {
	return getEnv(c || null, "DATABASE_URL");
}

/**
 * Initialize Prisma client (singleton)
 * Uses prisma-adapter-bun-sqlite for native Bun SQLite
 */
export function initPrismaVPS(): PrismaClient {
	if (prismaInstance) return prismaInstance;

	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
	  throw new Error("DATABASE_URL is not set in environment");
	}

	const adapter = new PrismaBunSqlite({ url: databaseUrl });

	prismaInstance = new PrismaClient({
		adapter,
		log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
	});

	console.log(`[DB] Connected to SQLite: ${databaseUrl}`);

	return prismaInstance;
}

/**
 * Get database client
 * Returns Prisma client for all environments
 */
export function getDB(c?: Context) {
	return {
		type: "prisma" as const,
		prisma: initPrismaVPS(),
		isPrisma: true,
	};
}

/**
 * Execute raw query via Prisma
 */
export async function executeQuery<T = any>(
	c: Context | null,
	query: string,
	params?: any[]
): Promise<T[]> {
	const prisma = initPrismaVPS();
	const result = await prisma.$queryRawUnsafe<T[]>(query, ...(params || []));
	return result;
}

/**
 * Hono middleware to attach database client
 */
export function dbAdapterMiddleware() {
	return async (c: Context, next: () => Promise<void>) => {
		c.set("db", getDB());
		await next();
	};
}

/**
 * Test database connection
 */
export async function testConnection(c?: Context): Promise<{
	success: boolean;
	message: string;
	type: string;
}> {
	try {
		const prisma = initPrismaVPS();
		await prisma.$queryRaw`SELECT 1`;
		return { success: true, message: "SQLite connected (bun:sqlite)", type: "prisma" };
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
			type: "prisma",
		};
	}
}

/**
 * Graceful shutdown for database
 */
export async function disconnectDB(): Promise<void> {
	if (prismaInstance) {
		await prismaInstance.$disconnect();
		prismaInstance = null;
		console.log("[DB] Disconnected");
	}
}

// Extend Hono Context types
declare module "hono" {
	interface ContextVariableMap {
		db: ReturnType<typeof getDB>;
	}
}

// Helper type guard
export function isPrismaDB(
	db: ReturnType<typeof getDB>
): db is { type: "prisma"; prisma: PrismaClient; isPrisma: true } {
	return db.type === "prisma";
}
