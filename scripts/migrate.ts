import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import db from "../src/db.ts";
await migrate(db, {
	migrationsFolder: "migrations",
});
