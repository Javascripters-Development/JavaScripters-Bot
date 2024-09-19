import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const LoggingWhitelist = sqliteTable(
	"LoggingWhitelist",
	{
		guildId: text("guildId"),
		roleId: text("roleId"),
	},
	(table) => ({
		pk: primaryKey(table.guildId, table.roleId),
	}),
);
export type LoggingWhitelistSelect = InferSelectModel<typeof LoggingWhitelist>;
export type LoggingWhitelistInsert = InferInsertModel<typeof LoggingWhitelist>;
