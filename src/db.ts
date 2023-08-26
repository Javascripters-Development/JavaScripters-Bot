import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

const sqlite = new Database("main.db");
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA optimize");
const db: BunSQLiteDatabase = drizzle(sqlite, {
	logger: process.env.ORM_DEBUG === "true",
});
export default db;
