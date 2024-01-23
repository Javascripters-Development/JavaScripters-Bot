import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as Suggestion from "./schemas/suggestion.ts";

const sqlite = new Database("main.db");

sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA optimize");

const db = drizzle(sqlite, {
	logger: process.env.ORM_DEBUG === "true",
	schema: { ...Suggestion },
});

export default db;
