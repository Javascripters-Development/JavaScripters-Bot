import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const Config = sqliteTable("guildConfig", {
	id: text("guildId").primaryKey().notNull(),
	gatewayChannel: text("gatewayChannel"),
	gatewayEnabled: integer("gatewayEnabled", { mode: "boolean" }).default(false),
	gatewayContent: text("gatewayContent"),
});
