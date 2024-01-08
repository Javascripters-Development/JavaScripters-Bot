import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const LoggingWhitelist = sqliteTable("LoggingWhitelist", {
	guildId: text("guildId").primaryKey(),
	roleId: text("roleId").primaryKey(),
});
export type LoggingWhitelistSelect = InferSelectModel<typeof LoggingWhitelist>;
export type LoggingWhitelistInsert = InferInsertModel<typeof LoggingWhitelist>;
