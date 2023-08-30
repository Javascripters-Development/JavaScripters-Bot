import { sqliteTable, text, int, unique } from "drizzle-orm/sqlite-core";
import {
	sql,
	type InferInsertModel,
	type InferSelectModel,
	relations,
} from "drizzle-orm";
import { Suggestion } from "./suggestion.ts";

export const SuggestionVotes = sqliteTable(
	"suggestionVotes",
	{
		id: int("id").primaryKey({ autoIncrement: true }).notNull(),

		suggestionId: int("suggestionId").notNull(),
		userId: text("userId").notNull(),
		isUpvote: int("isUpvote", { mode: "boolean" }).default(true).notNull(),

		updatedAt: int("updatedAt", { mode: "timestamp" })
			.default(sql`(strftime('%s', 'now'))`)
			.notNull(),
		createdAt: int("createdAt", { mode: "timestamp" })
			.default(sql`(strftime('%s', 'now'))`)
			.notNull(),
	},
	(table) => ({
		unq: unique().on(table.suggestionId, table.userId),
	}),
);

export const SuggestionVotesRelations = relations(
	SuggestionVotes,
	({ one }) => ({
		suggestion: one(Suggestion, {
			fields: [SuggestionVotes.suggestionId],
			references: [Suggestion.id],
		}),
	}),
);

export type SuggestionVotesSelect = InferSelectModel<typeof SuggestionVotes>;
export type SuggestionVotesInsert = InferInsertModel<typeof SuggestionVotes>;
