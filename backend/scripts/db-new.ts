// scripts/db-new.ts
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";


function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();

    // remove surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = val;
  }
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function nextMigrationNumber(dir: string) {
  if (!existsSync(dir)) return 1;
  const files = readdirSync(dir);
  const nums = files
    .map((f) => {
      const m = /^(\d{4})_.*\.sql$/.exec(f);
      return m ? Number(m[1]) : null;
    })
    .filter((n): n is number => n !== null);

  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function runPrisma(args: string[]) {
  const proc = Bun.spawnSync(["bunx", "prisma", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = new TextDecoder().decode(proc.stdout);
  const stderr = new TextDecoder().decode(proc.stderr);

  if (proc.exitCode !== 0) {
    console.error(stderr || stdout);
    process.exit(proc.exitCode);
  }

  return stdout;
}

function runPrismaInherit(args: string[]) {
  const proc = Bun.spawnSync(["bunx", "prisma", ...args], {
    stdout: "inherit",
    stderr: "inherit",
  });

  if (proc.exitCode !== 0) process.exit(proc.exitCode);
}

function getDatabaseUrl(): string | null {
  // load .env manually for consistency
  loadDotEnv();
  return process.env.DATABASE_URL ?? null;
}


function getSqliteDbFilePath(): string {
  const url = getDatabaseUrl();

  if (!url) {
    // fallback to root dev.db
    return resolve(process.cwd(), "dev.db");
  }


  if (!url.startsWith("file:")) {
    return resolve(process.cwd(), "dev.db");
  }

  let p = url.slice("file:".length);

  // strip query string
  const q = p.indexOf("?");
  if (q !== -1) p = p.slice(0, q);

  // Sometimes it's like file:./dev.db (relative), or file:/abs/path
  // Normalize odd prefixes
  p = p.replace(/^\/+/, (m) => (p.startsWith("/") ? "/" : m)); // keep leading / for absolute

  // decode uri-encoding if any
  try {
    p = decodeURIComponent(p);
  } catch {
    // ignore
  }


  if (!p) return resolve(process.cwd(), "dev.db");

  if (isAbsolute(p)) return p;
  return resolve(process.cwd(), p);
}

function ensureParentDir(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function listSqlMigrations(migrationsDir: string) {
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort(); // lexicographic works because leading 0001, 0002, ...
}

function hasAnySqlMigration(migrationsDir: string) {
  return listSqlMigrations(migrationsDir).length > 0;
}


function applySqlMigrationsIfNeeded(opts: {
  migrationsDir: string;
  dbFilePath: string;
  schemaPath: string;
}) {
  const { migrationsDir, dbFilePath, schemaPath } = opts;

  const migrations = listSqlMigrations(migrationsDir);
  if (migrations.length === 0) return;

  if (existsSync(dbFilePath)) return;

  console.log(
    `dev DB not found at: ${dbFilePath}\nApplying existing SQL migrations to create it...`
  );

  ensureParentDir(dbFilePath);

  for (const file of migrations) {
    const full = join(migrationsDir, file);
    console.log(`→ Applying ${full}`);
    runPrismaInherit(["db", "execute", "--schema", schemaPath, "--file", full]);
  }

  console.log("✅ dev DB created by applying migrations.\n");
}


function createDbByDbPushIfNeeded(opts: {
  dbFilePath: string;
  schemaPath: string;
}) {
  const { dbFilePath, schemaPath } = opts;

  if (existsSync(dbFilePath)) return;

  console.log(`dev DB not found at: ${dbFilePath}\nCreating it via prisma db push...`);
  ensureParentDir(dbFilePath);

  runPrismaInherit(["db", "push", "--schema", schemaPath]);

  console.log("✅ dev DB created via db push.\n");
}

// ------------------------- main -------------------------

const nameArg = process.argv.slice(2).join(" ").trim();

if (!nameArg) {
  console.log("Usage: bun run db:new <name>");
  console.log('Example: bun run db:new "add products"');
  process.exit(1);
}

const migrationsDir = "migrations";
if (!existsSync(migrationsDir)) mkdirSync(migrationsDir, { recursive: true });

const schemaPath = "prisma/schema.prisma";

const migrationLockfile = join(migrationsDir, "migration_lock.toml");
const hasPrismaMigrationLock = existsSync(migrationLockfile);

const slug = slugify(nameArg);
if (!slug) {
  console.error("Invalid migration name.");
  process.exit(1);
}

const n = nextMigrationNumber(migrationsDir);
const filename = `${String(n).padStart(4, "0")}_${slug}.sql`;
const filepath = join(migrationsDir, filename);

// Detect DB file path from DATABASE_URL (fallback ./dev.db)
const dbFilePath = getSqliteDbFilePath();
const hasDevDb = existsSync(dbFilePath);

const anySql = hasAnySqlMigration(migrationsDir);


if (anySql && !hasDevDb && !hasPrismaMigrationLock) {
  applySqlMigrationsIfNeeded({
    migrationsDir,
    dbFilePath,
    schemaPath,
  });
}

if (!existsSync(dbFilePath) && !anySql && !hasPrismaMigrationLock) {
  createDbByDbPushIfNeeded({
    dbFilePath,
    schemaPath,
  });
}


const diffArgs = hasPrismaMigrationLock
  ? [
    "migrate",
    "diff",
    "--from-migrations",
    migrationsDir,
    "--to-schema",
    schemaPath,
    "--script",
  ]
  : anySql && existsSync(dbFilePath)
    ? [
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      schemaPath,
      "--script",
    ]
    : [
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema",
      schemaPath,
      "--script",
    ];

const sql = runPrisma(diffArgs).trim();

if (!sql || /^--\s*No\s+changes/i.test(sql)) {
  console.log("No schema changes detected. Migration not created.");
  process.exit(0);
}

writeFileSync(filepath, sql + "\n", "utf8");
console.log(`Created migration: ${filepath}`);
console.log(`Next: bun run db:apply`);
