import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { LogMode } from "../types/logging.ts";

export const GuildSchema = sqliteTable("guild", {
	id: text("guildId").primaryKey().notNull(),
	gatewayChannel: text("gatewayChannel"),

	gatewayJoinTitle: text("gatewayJoinTitle"),
	gatewayJoinContent: text("gatewayJoinContent"),

	gatewayLeaveTitle: text("gatewayLeaveTitle"),
	gatewayLeaveContent: text("gatewayLeaveContent"),

	loggingMode: integer("loggingMode", { mode: "number" }).$type<LogMode>().notNull().default(LogMode.NONE),
	loggingChannel: text("loggingChannel").default(""),

	suggestionChannel: text("suggestionChannel"),
	suggestionManagerRole: text("suggestionManagerRole"),
	suggestionUpvoteEmoji: text("suggestionUpvoteEmoji").default("👍"),
	suggestionDownvoteEmoji: text("suggestionDownvoteEmoji").default("👎"),
});

export type GuildSelect = InferSelectModel<typeof GuildSchema>;
export type GuildInsert = InferInsertModel<typeof GuildSchema>;
