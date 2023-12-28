import db from "../../db.ts";
import { DiscordSuggestion } from "../discord-suggestion.ts";
import { Suggestion as DbSuggestion } from "../../schemas/suggestion.ts";
import { and, eq, sql } from "drizzle-orm";
import type { Message } from "discord.js";

const FIND_BY_ID_STATEMENT = db.query.Suggestion.findMany({
	where: eq(DbSuggestion.id, sql.placeholder("id")),
}).prepare();

const FIND_BY_MESSAGE_STATEMENT = db.query.Suggestion.findMany({
	where: and(eq(DbSuggestion.channelId, sql.placeholder("channelId")), eq(DbSuggestion.messageId, sql.placeholder("messageId"))),
}).prepare();

/** Get a {@link DiscordSuggestion} by its ID. */
export const getFromId = async (id: number): Promise<DiscordSuggestion> => {
	const foundSuggestion = (await FIND_BY_ID_STATEMENT.all({ id })).at(0);

	if (!foundSuggestion)
		throw new Error(`Could not fetch suggestion with ID ${id}`);

	return new DiscordSuggestion(foundSuggestion.id);
}

/** Get a {@link DiscordSuggestion} from the associated {@link Message}. */
export const getFromMessage = async ({ id, channelId, url }: Message): Promise<DiscordSuggestion> => {
	const foundSuggestion = (await FIND_BY_MESSAGE_STATEMENT.all({ channelId: channelId, messageId: id })).at(0);

	if (!foundSuggestion)
		throw new Error(
			`Could not find a suggestion associated with message ${url}`,
		);

	return new DiscordSuggestion(foundSuggestion.id);
}

