import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const Config = sqliteTable("guildConfig", {
	id: text("guildId").primaryKey().notNull(),
	gatewayChannel: text("gatewayChannel"),
	gatewayContent: text("gatewayContent"),
});
