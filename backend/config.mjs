import { join, resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const distDir = join(rootDir, "frontend", "dist");
const dbPath = join(rootDir, "data", "mat_scraper.sqlite3");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || "3001");

export { dbPath, distDir, host, port, rootDir };
